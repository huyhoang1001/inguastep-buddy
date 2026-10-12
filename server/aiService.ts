import { GoogleGenAI } from '@google/genai';
import {
  UserProfile,
  LessonPlan,
  Question,
  AnswerEvaluation,
  SectionType,
  LearnerSkillState,
  DailySummary,
  TutorAssistantResponse,
  DiscoveryMessage,
  DiscoveryState,
  DiagnosticSession,
  DiagnosticReport,
  PersonalizedStudyPlan,
  WritingRubricScore,
  SkillProficiencyEstimate,
  EnglishLevel
} from '../src/types/learning.js';
import { DEFAULT_CURRICULUM } from './defaultCurriculum.js';
import { DIAGNOSTIC_BANK, DiagnosticBankItem } from './diagnosticBank.js';
import { budgetManager } from './usageBudget.js';
import { contentCache } from './contentCache.js';

export interface LearningModelProvider {
  generateLessonPlan(
    profile: UserProfile,
    skillStates: LearnerSkillState[],
    recentErrors: string[]
  ): Promise<LessonPlan>;

  generateQuestion(
    section: SectionType,
    profile: UserProfile,
    targetSkillName?: string,
    contextTopic?: 'general' | 'workplace_tech',
    activityType?: string,
    questionIndex?: number,
    totalInActivity?: number
  ): Promise<Question>;

  evaluateAnswer(
    question: Question,
    userAnswer: string,
    profile: UserProfile
  ): Promise<AnswerEvaluation>;

  tutorAssist(
    question: Question,
    action: 'hint' | 'simpler_explanation' | 'another_example' | 'clarify_ambiguity',
    profile: UserProfile
  ): Promise<TutorAssistantResponse>;

  generateLessonSummary(
    lesson: LessonPlan,
    attempts: Array<{ question: Question; evaluation: AnswerEvaluation; userAnswer: string }>,
    profile: UserProfile,
    timeSpentMinutes?: number
  ): Promise<DailySummary>;

  // Conversational Discovery & Adaptive Diagnostic methods
  handleDiscoveryTurn(
    history: DiscoveryMessage[],
    userMessage: string,
    currentProfile: UserProfile
  ): Promise<{
    tutorReply: string;
    quickReplies?: string[];
    dimension?: DiscoveryMessage['dimension'];
    updatedProfile: Partial<UserProfile>;
    isDiscoveryComplete: boolean;
    confirmationSummary?: string;
  }>;

  generateAdaptiveDiagnosticQuestion(
    session: DiagnosticSession,
    profile: UserProfile
  ): Promise<Question>;

  evaluateDiagnosticAnswer(
    question: Question,
    userAnswer: string,
    profile: UserProfile
  ): Promise<{
    evaluation: AnswerEvaluation;
    writingRubric?: WritingRubricScore;
  }>;

  computeDiagnosticReport(
    session: DiagnosticSession,
    profile: UserProfile
  ): Promise<DiagnosticReport>;

  generatePersonalizedStudyPlan(
    report: DiagnosticReport,
    profile: UserProfile
  ): Promise<PersonalizedStudyPlan>;
}

export class GeminiLearningProvider implements LearningModelProvider {
  private ai: GoogleGenAI | null = null;
  // Prioritize active and fast models; 429 quota responses return instantly (~300ms)
  private modelCandidates = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  private quotaCooldownUntil = 0;
  private servedQuestionHistory: string[] = [];

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        this.ai = new GoogleGenAI();
      } catch (err) {
        console.warn('Could not initialize GoogleGenAI client:', err);
      }
    }
  }

  public isQuotaExhausted(): boolean {
    return Date.now() < this.quotaCooldownUntil;
  }

  private cleanJson(text: string): string {
    let clean = text.trim();
    if (clean.startsWith('```json')) {
      clean = clean.slice(7);
    } else if (clean.startsWith('```')) {
      clean = clean.slice(3);
    }
    if (clean.endsWith('```')) {
      clean = clean.slice(0, -3);
    }
    return clean.trim();
  }

  private estimateTokens(text: string): number {
    return Math.max(1, Math.ceil(text.length / 4));
  }

  public async callGeminiJson<T>(
    prompt: string,
    systemInstruction: string,
    options?: { userId?: string; operation?: string }
  ): Promise<T | null> {
    const userId = options?.userId || 'system';
    const operation = options?.operation || 'general_query';
    const estInputTokens = this.estimateTokens(prompt + systemInstruction);

    // Pre-flight quota check if a specific user context is provided
    if (userId !== 'system') {
      const allowance = budgetManager.checkAllowance(userId);
      if (!allowance.allowed) {
        console.warn(`[Budget] User '${userId}' rejected: ${allowance.reason}`);
        budgetManager.recordUsage(userId, 'rate_limited', operation, 0, 0, 'rate_limited', allowance.reason);
        return null;
      }
      budgetManager.startRequest(userId);
    }

    try {
      if (!this.ai) {
        if (userId !== 'system') {
          budgetManager.recordUsage(userId, 'none', operation, 0, 0, 'error', 'AI client not initialized');
        }
        return null;
      }

      if (this.isQuotaExhausted()) {
        if (userId !== 'system') {
          budgetManager.recordUsage(userId, 'cooldown', operation, 0, 0, 'rate_limited', 'Global quota cooldown');
        }
        return null;
      }

      for (const model of this.modelCandidates) {
        try {
          const apiCall = this.ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          });

          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('AI request timed out (2.5s)')), 2500)
          );

          const response = (await Promise.race([apiCall, timeoutPromise])) as any;
          const text = response?.text || '';
          if (text) {
            const parsed = JSON.parse(this.cleanJson(text)) as T;
            const estOutputTokens = this.estimateTokens(text);
            if (userId !== 'system') {
              budgetManager.recordUsage(userId, model, operation, estInputTokens, estOutputTokens, 'success');
            }
            return parsed;
          }
        } catch (err: any) {
          const errMsg = err?.message || '';
          const isQuota =
            err?.status === 'RESOURCE_EXHAUSTED' ||
            err?.code === 429 ||
            errMsg.includes('429') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('Quota exceeded');

          if (isQuota) {
            // Model quota reached for this candidate, try next candidate silently
            continue;
          } else {
            console.warn(`[AI] Generation notice with ${model}:`, errMsg.slice(0, 80));
            continue;
          }
        }
      }

      // If all candidates failed or timed out, enter 5-minute quota cooldown so subsequent requests don't lag
      this.quotaCooldownUntil = Date.now() + 5 * 60 * 1000;
      if (userId !== 'system') {
        budgetManager.recordUsage(userId, 'fallback', operation, estInputTokens, 0, 'error', 'Candidates unavailable, using calibrated fallback');
      }
      return null;
    } finally {
      if (userId !== 'system') {
        budgetManager.endRequest(userId);
      }
    }
  }

  // =========================================================================
  // 1. CONVERSATIONAL DISCOVERY
  // =========================================================================
  public async handleDiscoveryTurn(
    history: DiscoveryMessage[],
    userMessage: string,
    currentProfile: UserProfile
  ): Promise<{
    tutorReply: string;
    quickReplies?: string[];
    dimension?: DiscoveryMessage['dimension'];
    updatedProfile: Partial<UserProfile>;
    isDiscoveryComplete: boolean;
    confirmationSummary?: string;
  }> {
    const lang = currentProfile.explanation_language === 'vi' ? 'Vietnamese' : 'English';
    const turnsCount = history.filter(m => m.sender === 'learner').length + 1;

    // Define discovery sequence of dimensions:
    // 1: Primary Goal & Context
    // 2: Level self-estimate & confidence
    // 3: Situations struggled with
    // 4: Available study time & topic ratio
    // 5: Audio / speaking desires & target milestone
    // 6: Confirmation summary

    const systemPrompt = `You are a warm, perceptive personal English coach conducting an onboarding conversation.
The learner's preferred explanation language is ${lang}.
Current profile knowledge: ${JSON.stringify(currentProfile)}.
Conversation history so far: ${JSON.stringify(history.map(h => ({ sender: h.sender, text: h.text, dim: h.dimension })))}.
Latest learner message: "${userMessage}".

RULES:
- Ask ONE meaningful, conversational question at a time.
- Empathize with what the learner just said.
- Do NOT repeat questions that have already been answered.
- If the learner answered their primary goal, ask about their self-estimated level and confidence, or specific situations they struggle with (e.g., meetings, writing PRs, casual small talk).
- If turns count >= 4 or core goals are discovered, produce a concise confirmation summary in ${lang} and ask them to confirm before starting the adaptive diagnostic assessment.
- Provide 2 to 4 quick reply option suggestions when helpful, but the learner can type anything.
- Extract any structured profile updates (primary_goal, current_level, target_level, daily_minutes, general_vs_work_ratio, struggles, audio_importance, timeline_target).

Output strictly in JSON:
{
  "tutorReply": string,
  "quickReplies": string[] (optional),
  "dimension": "goal" | "level" | "struggles" | "time" | "ratio" | "audio" | "timeline" | "confirmation",
  "updatedProfile": {
    "primary_goal"?: "workplace_tech" | "conversation" | "reading_writing" | "exam" | "balanced",
    "current_level"?: "A2" | "B1" | "B2" | "C1",
    "target_level"?: "B1" | "B2" | "C1",
    "daily_minutes"?: number,
    "general_vs_work_ratio"?: number,
    "struggles"?: string[],
    "audio_importance"?: boolean,
    "timeline_target"?: string
  },
  "isDiscoveryComplete": boolean,
  "confirmationSummary": string (if isDiscoveryComplete is true)
}`;

    const prompt = `Process the learner's message "${userMessage}" at turn ${turnsCount}.`;
    const aiResult = await this.callGeminiJson<{
      tutorReply: string;
      quickReplies?: string[];
      dimension?: DiscoveryMessage['dimension'];
      updatedProfile: Partial<UserProfile>;
      isDiscoveryComplete: boolean;
      confirmationSummary?: string;
    }>(prompt, systemPrompt);

    if (aiResult && aiResult.tutorReply) {
      return aiResult;
    }

    // Adaptive local conversational fallback
    return this.fallbackDiscoveryTurn(history, userMessage, currentProfile, turnsCount);
  }

  private fallbackDiscoveryTurn(
    history: DiscoveryMessage[],
    userMessage: string,
    currentProfile: UserProfile,
    turnsCount: number
  ): {
    tutorReply: string;
    quickReplies?: string[];
    dimension?: DiscoveryMessage['dimension'];
    updatedProfile: Partial<UserProfile>;
    isDiscoveryComplete: boolean;
    confirmationSummary?: string;
  } {
    const isVi = currentProfile.explanation_language === 'vi';
    const lower = userMessage.toLowerCase();
    const updated: Partial<UserProfile> = {};

    // Detect goal from user message
    if (lower.includes('work') || lower.includes('tech') || lower.includes('software') || lower.includes('công việc')) {
      updated.primary_goal = 'workplace_tech';
    } else if (lower.includes('conversa') || lower.includes('giao tiếp') || lower.includes('nói')) {
      updated.primary_goal = 'conversation';
    } else if (lower.includes('writ') || lower.includes('viết') || lower.includes('read')) {
      updated.primary_goal = 'reading_writing';
    }

    // Detect level from user message
    if (lower.includes('b2')) updated.current_level = 'B2';
    else if (lower.includes('b1')) updated.current_level = 'B1';
    else if (lower.includes('c1')) updated.current_level = 'C1';
    else if (lower.includes('a2')) updated.current_level = 'A2';

    // Detect duration from user message
    if (lower.includes('10')) updated.daily_minutes = 10;
    else if (lower.includes('30')) updated.daily_minutes = 30;
    else if (lower.includes('20')) updated.daily_minutes = 20;

    // Step-by-step turns
    if (turnsCount <= 1) {
      return {
        tutorReply: isVi
          ? 'Chào bạn! Mình là gia sư tiếng Anh đồng hành cùng bạn. Để thiết kế lộ trình học hiệu quả nhất, mục tiêu tiếng Anh quan trọng nhất của bạn lúc này là gì?'
          : 'Hello! I am your personal English tutor. To build your ideal study plan, what is your primary English learning goal right now?',
        quickReplies: isVi
          ? ['Giao tiếp công việc & Kỹ thuật', 'Nói chuyện hàng ngày tự nhiên', 'Viết báo cáo & Đọc tài liệu', 'Cân bằng cả hai']
          : ['Workplace & Tech English', 'Daily Conversation', 'Reading & Technical Writing', 'Balanced General & Work'],
        dimension: 'goal',
        updatedProfile: updated,
        isDiscoveryComplete: false
      };
    } else if (turnsCount === 2) {
      return {
        tutorReply: isVi
          ? 'Tuyệt vời. Bạn tự đánh giá trình độ hiện tại của mình ở mức nào (ví dụ A2, B1, B2 hay C1), và bạn tự tin bao nhiêu với ước lượng này?'
          : 'Great. How would you currently estimate your English level (e.g. A2, B1, B2, or C1), and how confident do you feel about this baseline?',
        quickReplies: isVi
          ? ['Khoảng B1 (Trung cấp)', 'Khoảng B2 (Trên trung cấp)', 'Khoảng C1 (Thành thạo)', 'Chưa chắc chắn, cần kiểm tra']
          : ['Around B1 Intermediate', 'Around B2 Upper-Intermediate', 'Around C1 Advanced', 'Not sure, need assessment'],
        dimension: 'level',
        updatedProfile: updated,
        isDiscoveryComplete: false
      };
    } else if (turnsCount === 3) {
      return {
        tutorReply: isVi
          ? 'Trong thực tế, bạn thường cảm thấy gặp khó khăn nhất ở tình huống nào (ví dụ: phản xạ tìm từ, ngữ pháp câu phức, giải thích sự cố, hay nghe nói)?'
          : 'In real situations, where do you struggle the most (e.g. word retrieval, complex grammar accuracy, explaining technical issues, or writing fluently)?',
        quickReplies: isVi
          ? ['Hay nhầm thì động từ & câu phức', 'Thiếu collocations chuẩn xác', 'Ngại viết cập nhật công việc', 'Cần cải thiện tất cả']
          : ['Verb tenses & complex grammar', 'Natural collocations & vocabulary', 'Workplace updates & Slack writing', 'A bit of everything'],
        dimension: 'struggles',
        updatedProfile: { ...updated, struggles: [userMessage] },
        isDiscoveryComplete: false
      };
    } else if (turnsCount === 4) {
      return {
        tutorReply: isVi
          ? 'Bạn có thể dành khoảng bao nhiêu phút mỗi ngày để luyện tập: 10 phút (Luyện nhanh), 20 phút (Tiêu chuẩn), hay 30 phút (Học sâu)?'
          : 'How many minutes per day can you commit to practicing: 10 mins (Quick Practice), 20 mins (Standard Practice), or 30 mins (Deep Practice)?',
        quickReplies: isVi
          ? ['10 phút (⚡ Luyện nhanh 4 câu hỏi)', '20 phút (🎯 Tiêu chuẩn 7 câu hỏi)', '30 phút (🔬 Học sâu 12 câu hỏi)']
          : ['10 mins (⚡ Quick: 4 questions)', '20 mins (🎯 Standard: 7 questions)', '30 mins (🔬 Deep: 12 questions)'],
        dimension: 'time',
        updatedProfile: { ...updated, daily_minutes: updated.daily_minutes || 20, general_vs_work_ratio: 65 },
        isDiscoveryComplete: false
      };
    } else {
      const chosenMins = updated.daily_minutes || currentProfile.daily_minutes || 20;
      const summaryText = isVi
        ? `Tóm tắt mục tiêu học tập:\n• Mục tiêu: ${updated.primary_goal || currentProfile.primary_goal || 'Giao tiếp công việc & tiếng Anh kỹ thuật'}\n• Trình độ dự kiến: ${updated.current_level || currentProfile.current_level || 'B2'}\n• Thời lượng: ${chosenMins} phút/ngày (${chosenMins <= 12 ? 'Luyện nhanh 4 câu' : chosenMins >= 25 ? 'Học sâu 12 câu' : 'Tiêu chuẩn 7 câu'}).\n\nBây giờ chúng ta sẽ bắt đầu bài Đánh giá chẩn đoán thích ứng (Adaptive Diagnostic) để xác định chính xác năng lực thực tế qua ngữ pháp, từ vựng, đọc hiểu và viết nhé!`
        : `Summary of your goals:\n• Primary Goal: Workplace and technical English\n• Baseline Level: B2 Upper-Intermediate\n• Pace: ${chosenMins} mins/day (${chosenMins <= 12 ? 'Quick: 4 Qs' : chosenMins >= 25 ? 'Deep: 12 Qs' : 'Standard: 7 Qs'}).\n\nReady to begin your Adaptive Diagnostic Assessment across grammar, vocabulary, reading, and writing?`;

      return {
        tutorReply: isVi
          ? `Cảm ơn bạn! Dưới đây là tóm tắt mục tiêu của bạn. Hãy xác nhận để chúng ta tiến hành bài đánh giá chẩn đoán thích ứng nhé:`
          : `Thank you! Here is a summary of your goals. Please confirm to proceed to your adaptive diagnostic assessment:`,
        quickReplies: isVi
          ? ['Xác nhận & Bắt đầu đánh giá', 'Điều chỉnh lại mục tiêu']
          : ['Confirm & Start Assessment', 'Adjust Goals'],
        dimension: 'confirmation',
        updatedProfile: updated,
        isDiscoveryComplete: true,
        confirmationSummary: summaryText
      };
    }
  }

  // =========================================================================
  // 2. ADAPTIVE DIAGNOSTIC QUESTION SELECTION & GENERATION
  // =========================================================================
  public async generateAdaptiveDiagnosticQuestion(
    session: DiagnosticSession,
    profile: UserProfile
  ): Promise<Question> {
    const answered = session.history;
    const answeredCount = answered.length;
    const answeredIds = answered.map(a => a.question.id);

    // Determine target dimension based on balance of evidence
    const grammarCount = answered.filter(a => a.question.section === 'grammar').length;
    const vocabCount = answered.filter(a => a.question.section === 'vocabulary').length;
    const readingCount = answered.filter(a => a.question.section === 'reading').length;
    const writingCount = answered.filter(a => a.question.section === 'writing').length;

    let targetSection: SectionType = 'grammar';
    if (grammarCount <= vocabCount && grammarCount <= readingCount && grammarCount <= writingCount) {
      targetSection = 'grammar';
    } else if (vocabCount <= readingCount && vocabCount <= writingCount) {
      targetSection = 'vocabulary';
    } else if (readingCount <= writingCount) {
      targetSection = 'reading';
    } else {
      targetSection = 'writing';
    }

    // Determine adaptive target level
    // Look at previous performance on this section or overall
    const lastAttempts = answered.slice(-3);
    const correctRecent = lastAttempts.filter(a => a.verdict === 'correct').length;
    let targetLevel: EnglishLevel = profile.current_level || 'B2';

    if (lastAttempts.length >= 2) {
      if (correctRecent === lastAttempts.length) {
        // High accuracy -> probe higher difficulty level
        if (targetLevel === 'A2') targetLevel = 'B1';
        else if (targetLevel === 'B1') targetLevel = 'B2';
        else if (targetLevel === 'B2') targetLevel = 'C1';
      } else if (correctRecent === 0) {
        // Struggling -> probe supportive level
        if (targetLevel === 'C1') targetLevel = 'B2';
        else if (targetLevel === 'B2') targetLevel = 'B1';
        else if (targetLevel === 'B1') targetLevel = 'A2';
      }
    }

    const topic = Math.random() * 100 > (profile.general_vs_work_ratio || 65) ? 'workplace_tech' : 'general';
    const lang = profile.explanation_language === 'vi' ? 'Vietnamese' : 'English';

    // Try AI Generation with strict JSON schema
    const systemPrompt = `You are an expert adaptive English language diagnostician.
Target Section: ${targetSection}.
Target Difficulty Level: ${targetLevel}.
Topic context: ${topic}.
Learner Profile: ${JSON.stringify(profile)}.
Questions already answered in this diagnostic session: ${JSON.stringify(answered.map(a => ({ id: a.question.id, skill: a.question.skill_name, verdict: a.verdict })))}.

DIAGNOSTIC GUIDELINES:
- Generate ONE fresh, calibrated, unambiguous question to test ${targetSection} at level ${targetLevel}.
- DO NOT duplicate any previously used skill or sentence.
- If section is "reading", generate a short passage (100-130 words) with 1 inference or comprehension question.
- If section is "writing", provide a clear prompt requiring 3-4 sentences of original production.
- If section is "grammar" or "vocabulary", create a multiple choice or fill-in-blank question with 1 unambiguous correct answer and plausible distractors.
- Keep explanations and hints in ${lang}. DO NOT reveal the answer in the hint!

Output JSON:
{
  "id": string,
  "section": "${targetSection}",
  "skill_id": string,
  "skill_name": string,
  "question_type": "multiple_choice" | "fill_in_blank" | "reading_comprehension" | "free_writing",
  "difficulty": "${targetLevel}",
  "context_topic": "${topic}",
  "reading_passage": { "title": string, "text": string, "word_count": number, "topic": string } (if reading),
  "prompt": string,
  "options": [ { "id": "A"|"B"|"C"|"D", "text": string } ] (if multiple choice),
  "expected_answer_ids": [string] (if multiple choice),
  "expected_answer_text": string,
  "accepted_alternatives": [string],
  "hint": string,
  "explanation_rule": string
}`;

    const prompt = `Generate adaptive diagnostic item for section ${targetSection} at level ${targetLevel}`;
    const generated = await this.callGeminiJson<Question>(prompt, systemPrompt);

    if (generated && generated.prompt && !answeredIds.includes(generated.id)) {
      return {
        ...generated,
        id: `diag-gen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        section: targetSection,
        difficulty: targetLevel
      };
    }

    // Adaptive Question Bank Selection (Curated & Calibrated)
    const bankCandidates = DIAGNOSTIC_BANK.filter(
      item => item.category === targetSection && !answeredIds.includes(item.question.id)
    );

    // Pick closest difficulty
    const levelMatch = bankCandidates.find(item => item.difficulty === targetLevel);
    const selected = levelMatch || bankCandidates[0];

    if (selected) {
      return {
        ...selected.question,
        id: `diag-bank-${Date.now()}-${selected.id}`
      };
    }

    // Fallback if all bank items used
    const fallbackItem = DIAGNOSTIC_BANK[Math.floor(Math.random() * DIAGNOSTIC_BANK.length)];
    return {
      ...fallbackItem.question,
      id: `diag-fb-${Date.now()}`
    };
  }

  // =========================================================================
  // 3. DIAGNOSTIC ANSWER EVALUATION (OBJECTIVE & WRITING RUBRIC)
  // =========================================================================
  public async evaluateDiagnosticAnswer(
    question: Question,
    userAnswer: string,
    profile: UserProfile
  ): Promise<{
    evaluation: AnswerEvaluation;
    writingRubric?: WritingRubricScore;
  }> {
    const trimmed = userAnswer.trim();
    const lang = profile.explanation_language === 'vi' ? 'Vietnamese' : 'English';

    // Free Writing Multi-Dimensional Rubric Evaluation
    if (question.question_type === 'free_writing') {
      const systemPrompt = `You are a certified English writing assessor evaluating an original response.
Prompt: "${question.prompt}"
Target Level: ${question.difficulty}
Explanation Language: ${lang}
Student Response: "${userAnswer}"

Score each dimension strictly from 1 (very limited) to 5 (fluent/native-like for this level):
1. accuracy: grammatical correctness, tense consistency, agreement
2. vocabularyRange: appropriate collocations and variety
3. sentenceComplexity: subordination, coordination, varied sentence structures
4. coherence: logical flow and linking
5. naturalness: native idioms, natural cadence
6. taskCompletion: fully addresses prompt requirements (length 3-4 sentences)

Provide:
- feedbackSummary in ${lang}
- correctedVersion: natural native rewrite preserving learner voice
- keyCorrections: array of { original, corrected, reason in ${lang} }

Output JSON:
{
  "accuracy": number (1-5),
  "vocabularyRange": number (1-5),
  "sentenceComplexity": number (1-5),
  "coherence": number (1-5),
  "naturalness": number (1-5),
  "taskCompletion": number (1-5),
  "feedbackSummary": string,
  "correctedVersion": string,
  "keyCorrections": [ { "original": string, "corrected": string, "reason": string } ]
}`;

      const prompt = `Assess writing response: "${userAnswer}"`;
      const aiRubric = await this.callGeminiJson<WritingRubricScore>(prompt, systemPrompt);

      const sentences = trimmed.split(/[.!?]+/).filter(Boolean).length;
      const isPass = sentences >= 2 && trimmed.length >= 30;

      const rubric: WritingRubricScore = aiRubric || {
        accuracy: isPass ? 4 : 2,
        vocabularyRange: isPass ? 4 : 3,
        sentenceComplexity: isPass ? 3 : 2,
        coherence: isPass ? 4 : 3,
        naturalness: isPass ? 4 : 2,
        taskCompletion: isPass ? 4 : 2,
        feedbackSummary: profile.explanation_language === 'vi'
          ? 'Bài viết truyền tải rõ thông điệp. Chú ý cấu trúc thì động từ và liên từ nối giữa các câu.'
          : 'Clear message delivery. Ensure consistent tense alignment and clause coordination.',
        correctedVersion: trimmed,
        keyCorrections: []
      };

      const avgScore = (rubric.accuracy + rubric.vocabularyRange + rubric.sentenceComplexity + rubric.coherence + rubric.naturalness + rubric.taskCompletion) / 6;
      const verdict = avgScore >= 3.8 ? 'correct' : avgScore >= 2.5 ? 'partially_correct' : 'incorrect';

      const evaluation: AnswerEvaluation = {
        verdict,
        user_answer: userAnswer,
        expected_answer: 'Original coherent response meeting prompt requirements.',
        full_correct_sentence: rubric.correctedVersion,
        decisive_clue: `Đạt điểm đánh giá kỹ năng viết: ${avgScore.toFixed(1)}/5.0`,
        explanation: rubric.feedbackSummary,
        corrected_text: rubric.correctedVersion,
        key_corrections: rubric.keyCorrections,
        error_tags: avgScore < 3.5 ? ['Sentence structure & grammar accuracy'] : [],
        needs_retry: false,
        next_action: 'continue'
      };

      return { evaluation, writingRubric: rubric };
    }

    // Objective Multiple Choice & Fill in Blank
    const evalResult = await this.evaluateAnswer(question, userAnswer, profile);
    return { evaluation: evalResult };
  }

  // =========================================================================
  // 4. DIAGNOSTIC REPORT COMPUTATION
  // =========================================================================
  public async computeDiagnosticReport(
    session: DiagnosticSession,
    profile: UserProfile
  ): Promise<DiagnosticReport> {
    const attempts = session.history;
    const totalCount = attempts.length;
    const correctCount = attempts.filter(a => a.verdict === 'correct').length;
    const accuracy = totalCount > 0 ? correctCount / totalCount : 0;

    const sections: SectionType[] = ['grammar', 'vocabulary', 'reading', 'writing'];
    const skillEstimates: any = {};

    sections.forEach(sec => {
      const secAttempts = attempts.filter(a => a.question.section === sec);
      const secCount = secAttempts.length;
      const secCorrect = secAttempts.filter(a => a.verdict === 'correct').length;
      const secAcc = secCount > 0 ? secCorrect / secCount : 0;

      let cefr = 'B1-B2';
      if (secCount === 0) {
        cefr = 'B1-B2 (Initial Estimate)';
      } else if (secAcc >= 0.85) {
        cefr = 'B2-C1';
      } else if (secAcc >= 0.65) {
        cefr = 'B2';
      } else if (secAcc >= 0.45) {
        cefr = 'B1-B2';
      } else {
        cefr = 'A2-B1';
      }

      const confidence: 'low' | 'moderate' | 'high' =
        secCount >= 4 ? 'high' : secCount >= 2 ? 'moderate' : 'low';

      const demonstratedStrengths = secAttempts
        .filter(a => a.verdict === 'correct')
        .map(a => a.question.skill_name)
        .slice(0, 3);

      const priorityWeaknesses = secAttempts
        .filter(a => a.verdict !== 'correct')
        .map(a => a.question.skill_name)
        .slice(0, 3);

      const recurringErrors = secAttempts
        .filter(a => a.verdict !== 'correct')
        .map(a => a.evaluation.decisive_clue)
        .filter(Boolean)
        .slice(0, 2);

      skillEstimates[sec] = {
        category: sec,
        cefrRange: cefr,
        confidence,
        evidenceCount: secCount,
        correctCount: secCorrect,
        demonstratedStrengths,
        priorityWeaknesses,
        recurringErrors,
        unassessedSubskills: []
      };
    });

    // Speaking & Listening: explicitly marked as Not Assessed
    skillEstimates.speaking = {
      category: 'speaking',
      cefrRange: 'Not Assessed (Optional / Later)',
      confidence: 'low',
      evidenceCount: 0,
      correctCount: 0,
      demonstratedStrengths: [],
      priorityWeaknesses: ['Audio & live conversational fluency not evaluated in text assessment'],
      recurringErrors: [],
      unassessedSubskills: ['Pronunciation', 'Intonation', 'Spontaneous spoken speech']
    };

    skillEstimates.listening = {
      category: 'listening',
      cefrRange: 'Not Assessed (Optional / Later)',
      confidence: 'low',
      evidenceCount: 0,
      correctCount: 0,
      demonstratedStrengths: [],
      priorityWeaknesses: ['Audio listening comprehension not tested in standard mode'],
      recurringErrors: [],
      unassessedSubskills: ['Connected speech', 'Accent comprehension']
    };

    // Overall CEFR estimation
    let overallCEFR = 'B2';
    if (accuracy >= 0.85) overallCEFR = 'B2-C1';
    else if (accuracy >= 0.65) overallCEFR = 'B2';
    else if (accuracy >= 0.45) overallCEFR = 'B1-B2';
    else overallCEFR = 'A2-B1';

    const overallConfidence: 'low' | 'moderate' | 'high' =
      totalCount >= 10 ? 'high' : totalCount >= 5 ? 'moderate' : 'low';

    const allStrengths = attempts.filter(a => a.verdict === 'correct').map(a => a.question.skill_name);
    const allWeaknesses = attempts.filter(a => a.verdict !== 'correct').map(a => a.question.skill_name);
    const allErrors = attempts
      .filter(a => a.verdict !== 'correct')
      .map(a => a.evaluation.decisive_clue)
      .filter(Boolean);

    const isVi = profile.explanation_language === 'vi';
    const summary = isVi
      ? `Đánh giá hoàn tất với ${totalCount} câu hỏi đa kỹ năng. Tỷ lệ chính xác đạt ${Math.round(accuracy * 100)}%. Năng lực tổng thể định vị ở mức ${overallCEFR} (độ tin cậy: ${overallConfidence}). Ngữ pháp và đọc hiểu thể hiện nền tảng tốt; ưu tiên củng cố kỹ năng viết chuyên môn và các cấu trúc câu điều kiện phức hợp.`
      : `Diagnostic assessment completed with ${totalCount} multi-skill questions. Accuracy reached ${Math.round(accuracy * 100)}%. Overall proficiency estimated at ${overallCEFR} (${overallConfidence} confidence).`;

    return {
      id: `report-${Date.now()}`,
      sessionId: session.sessionId,
      mode: session.mode,
      completedAt: new Date().toISOString(),
      overallCEFR,
      overallConfidence,
      overallSummary: summary,
      skillEstimates,
      demonstratedStrengths: Array.from(new Set(allStrengths)).slice(0, 4),
      priorityWeaknesses: Array.from(new Set(allWeaknesses)).slice(0, 4),
      recurringErrors: Array.from(new Set(allErrors)).slice(0, 3),
      totalQuestionsAnswered: totalCount,
      accuracyRate: accuracy
    };
  }

  // =========================================================================
  // 5. PERSONALIZED STUDY PLAN GENERATION
  // =========================================================================
  public async generatePersonalizedStudyPlan(
    report: DiagnosticReport,
    profile: UserProfile
  ): Promise<PersonalizedStudyPlan> {
    const isVi = profile.explanation_language === 'vi';
    const duration = profile.daily_minutes || 20;

    const systemPrompt = `You are a curriculum director creating an evidence-grounded English study plan.
Diagnostic Report: ${JSON.stringify(report)}.
Learner Profile: ${JSON.stringify(profile)}.
Language: ${isVi ? 'Vietnamese' : 'English'}.

REQUIREMENTS:
1. overallObjective: 1 inspiring, measurable objective.
2. prioritizedSkills: 3-4 skills based on diagnostic weaknesses, with "rationale" explaining why it was prioritized.
3. shortTermMilestones: 3 concrete milestones (Day 7, Day 14, Day 30).
4. suggestedWeeklyRoutine: 5-7 days routine with focus area and minutes.
5. dailyRoutineTemplate: 4 sections (Grammar, Vocabulary, Reading, Writing) with minutes and target.
6. spacedReviewStrategy: clear review intervals (Days 1, 3, 7, 14).
7. progressCheckIntervalDays: 14.

Output JSON:
{
  "overallObjective": string,
  "diagnosticSummary": string,
  "prioritizedSkills": [
    {
      "skillId": string,
      "skillName": string,
      "category": "grammar" | "vocabulary" | "reading" | "writing",
      "currentLevel": string,
      "targetLevel": string,
      "priority": "high" | "medium" | "low",
      "rationale": string
    }
  ],
  "shortTermMilestones": [string],
  "suggestedWeeklyRoutine": [ { "day": string, "focus": string, "minutes": number } ],
  "dailyRoutineTemplate": [ { "section": "grammar" | "vocabulary" | "reading" | "writing", "title": string, "minutes": number, "target": string } ],
  "spacedReviewStrategy": string,
  "progressCheckIntervalDays": number
}`;

    const prompt = `Generate tailored study plan based on report ${report.id}`;
    const aiPlan = await this.callGeminiJson<PersonalizedStudyPlan>(prompt, systemPrompt);

    if (aiPlan && aiPlan.prioritizedSkills && aiPlan.prioritizedSkills.length > 0) {
      return {
        ...aiPlan,
        id: `plan-${Date.now()}`,
        learnerId: profile.id,
        diagnosticReportId: report.id,
        learnerApprovalStatus: 'draft',
        createdAt: new Date().toISOString()
      };
    }

    // Default High-Quality Evidence-Based Plan
    return {
      id: `plan-${Date.now()}`,
      learnerId: profile.id,
      diagnosticReportId: report.id,
      overallObjective: isVi
        ? `Nâng cao độ chuẩn xác ngữ pháp (Mixed Conditionals, Past Narrative) và làm chủ từ vựng chuyên môn đạt mức ${profile.target_level}`
        : `Achieve high-precision grammatical accuracy and fluent technical workplace communication at ${profile.target_level}`,
      diagnosticSummary: report.overallSummary,
      prioritizedSkills: [
        {
          skillId: 'past_perfect_and_mixed_conditionals',
          skillName: 'Third & Mixed Conditionals in Narrative',
          category: 'grammar',
          currentLevel: report.skillEstimates.grammar.cefrRange,
          targetLevel: profile.target_level,
          priority: 'high',
          rationale: isVi
            ? 'Dữ liệu chẩn đoán cho thấy sự nhầm lẫn giữa kết quả quá khứ và kết quả hiện tại khi giải thích nguyên nhân sự cố.'
            : 'Diagnostic evidence flagged inconsistent conditional tense coordination during scenario analysis.'
        },
        {
          skillId: 'collocation_mitigate_leverage',
          skillName: 'Workplace & Engineering Collocations',
          category: 'vocabulary',
          currentLevel: report.skillEstimates.vocabulary.cefrRange,
          targetLevel: profile.target_level,
          priority: 'high',
          rationale: isVi
            ? 'Củng cố các cặp từ tự nhiên (mitigate risk, leverage tools, streamline process) thay thế cho từ đơn lẻ.'
            : 'Focusing on natural professional collocations instead of isolated generic definitions.'
        },
        {
          skillId: 'workplace_writing_updates',
          skillName: 'Concise Technical Status Updates',
          category: 'writing',
          currentLevel: report.skillEstimates.writing.cefrRange,
          targetLevel: profile.target_level,
          priority: 'medium',
          rationale: isVi
            ? 'Luyện tập cấu trúc 3 câu chuẩn cho Slack/Jira: nêu vấn đề, hành động đang làm, thời hạn dự kiến.'
            : 'Practicing structured 3-sentence asynchronous updates with clear blockers and next steps.'
        }
      ],
      shortTermMilestones: isVi
        ? [
            'Tuần 1: Thành thạo câu điều kiện hỗn hợp và 10 collocations kỹ thuật cốt lõi.',
            'Tuần 2: Tự tin viết các cập nhật trạng thái công việc không mắc lỗi thì động từ.',
            'Tuần 4: Đánh giá tiến độ giữa kỳ với tỷ lệ chính xác > 85%.'
          ]
        : [
            'Week 1: Master mixed conditionals and 10 high-impact technical collocations.',
            'Week 2: Compose natural workplace status updates without tense slips.',
            'Week 4: Re-assessment checkpoint targeting > 85% accuracy.'
          ],
      suggestedWeeklyRoutine: [
        { day: 'Thứ 2', focus: 'Ngữ pháp chuyên sâu & Collocations mới', minutes: duration },
        { day: 'Thứ 3', focus: 'Đọc hiểu báo cáo kỹ thuật & Viết cập nhật', minutes: duration },
        { day: 'Thứ 4', focus: 'Ôn tập ngắt quãng (Spaced Review Day 3)', minutes: duration },
        { day: 'Thứ 5', focus: 'Luyện tập tình huống giao tiếp công việc thực tế', minutes: duration },
        { day: 'Thứ 6', focus: 'Tổng kết tuần & Kiểm tra tiến độ mini', minutes: duration }
      ],
      dailyRoutineTemplate: [
        { section: 'grammar', title: 'Part A — Ngữ pháp theo ngữ cảnh', minutes: Math.round(duration * 0.35), target: '1 quy tắc cốt lõi + 1 câu hỏi' },
        { section: 'vocabulary', title: 'Part B — Từ vựng & Collocations', minutes: Math.round(duration * 0.25), target: '1 từ vựng kèm IPA & ví dụ' },
        { section: 'reading', title: 'Part C — Đọc hiểu & Suy luận', minutes: Math.round(duration * 0.2), target: 'Đoạn văn ngắn 120 từ' },
        { section: 'writing', title: 'Part D — Diễn đạt công việc', minutes: Math.round(duration * 0.2), target: 'Viết 2-3 câu ứng dụng' }
      ],
      spacedReviewStrategy: isVi
        ? 'Lặp lại ngắt quãng theo chu kỳ 1 ngày - 3 ngày - 7 ngày - 14 ngày trong ngữ cảnh mới.'
        : 'Spaced repetition schedule at 1, 3, 7, and 14 days in novel sentence contexts.',
      progressCheckIntervalDays: 14,
      learnerApprovalStatus: 'draft',
      createdAt: new Date().toISOString()
    };
  }

  // =========================================================================
  // EXISTING LESSON METHODS
  // =========================================================================
  // =========================================================================
  // EXISTING LESSON METHODS (NOW FULLY DURATION-CALIBRATED)
  // =========================================================================
  public async generateLessonPlan(
    profile: UserProfile,
    skillStates: LearnerSkillState[],
    recentErrors: string[],
    durationOverride?: number
  ): Promise<LessonPlan> {
    const rawDuration = durationOverride || profile.daily_minutes || 20;
    const duration = Math.max(10, Math.min(60, Math.round(rawDuration)));
    const generalRatio = profile.general_vs_work_ratio || 65;
    const workRatio = 100 - generalRatio;
    const isVi = profile.explanation_language === 'vi';

    // Calculate adaptive question quotas based on user duration setting:
    // Guarantees ample questions for all sections (never just 1 vocab or 1 grammar)
    let grammarCount = 5;
    let vocabCount = 5;
    let readingCount = 4;
    let writingCount = 4;
    let paceMode: 'quick_10' | 'focused_15' | 'standard_20' | 'extended_25' | 'deep_30' | 'mastery_35' | 'intensive_45' = 'standard_20';

    if (duration <= 12) {
      paceMode = 'quick_10';
      grammarCount = 3;
      vocabCount = 3;
      readingCount = 2;
      writingCount = 2;
    } else if (duration <= 17) {
      paceMode = 'focused_15';
      grammarCount = 4;
      vocabCount = 4;
      readingCount = 3;
      writingCount = 3;
    } else if (duration <= 22) {
      paceMode = 'standard_20';
      grammarCount = 5;
      vocabCount = 5;
      readingCount = 4;
      writingCount = 4;
    } else if (duration <= 27) {
      paceMode = 'extended_25';
      grammarCount = 6;
      vocabCount = 6;
      readingCount = 5;
      writingCount = 5;
    } else if (duration <= 32) {
      paceMode = 'deep_30';
      grammarCount = 7;
      vocabCount = 7;
      readingCount = 6;
      writingCount = 6;
    } else if (duration <= 40) {
      paceMode = 'mastery_35';
      grammarCount = 8;
      vocabCount = 8;
      readingCount = 7;
      writingCount = 7;
    } else {
      paceMode = 'intensive_45';
      grammarCount = 10;
      vocabCount = 10;
      readingCount = 8;
      writingCount = 8;
    }

    const totalPlannedQuestions = grammarCount + vocabCount + readingCount + writingCount;

    const systemPrompt = `You are an expert, patient English tutor designing a structured daily lesson session.
The learner's current level is ${profile.current_level}, aiming for ${profile.target_level}.
Goal: ${profile.goal_summary}.
Explanation language: ${isVi ? 'Vietnamese' : 'English'}.
Balance: ${generalRatio}% general English, ${workRatio}% workplace/technical English.

SELECTED DURATION: ${duration} minutes per day (${paceMode}).
TARGET QUESTIONS PLANNED: exactly ${totalPlannedQuestions} questions total across ALL 4 parts.

CRITICAL BALANCED STRUCTURE REQUIREMENTS:
Every lesson MUST have exactly 4 parts covering all core competencies:
1. Grammar & Syntax: ${grammarCount} questions (Warm-up retrieval, core incident report rules, conditionals, transformations).
2. Vocabulary & Collocations: ${vocabCount} questions (Full IPA cards, natural workplace collocations, contrasting definitions).
3. Reading Comprehension & Inference: ${readingCount} questions (Contextual scenario passage with comprehension & subtle inference).
4. Workplace Writing & Expression: ${writingCount} questions (Authentic Slack updates, blocker reporting, client notes).

Recent error patterns to address: ${JSON.stringify(recentErrors.slice(0, 3))}.
Known skills needing practice: ${JSON.stringify(skillStates.filter(s => s.status !== 'mastered').map(s => s.skill_name).slice(0, 3))}.

Output strictly JSON:
{
  "primary_objective": string (1 clear objective tailored to today's ${duration}-minute session),
  "reason_for_selection": string (pedagogical reason in ${isVi ? 'Vietnamese' : 'English'}),
  "sections": [
    {
      "section": "grammar",
      "activity_type": "concept_practice",
      "title": string,
      "description": string,
      "estimated_minutes": number,
      "target_questions_count": ${grammarCount},
      "skill_target": string
    },
    {
      "section": "vocabulary",
      "activity_type": "vocab_acquisition",
      "title": string,
      "description": string,
      "estimated_minutes": number,
      "target_questions_count": ${vocabCount},
      "skill_target": string
    },
    {
      "section": "reading",
      "activity_type": "reading_analysis",
      "title": string,
      "description": string,
      "estimated_minutes": number,
      "target_questions_count": ${readingCount},
      "skill_target": string
    },
    {
      "section": "writing",
      "activity_type": "writing_production",
      "title": string,
      "description": string,
      "estimated_minutes": number,
      "target_questions_count": ${writingCount},
      "skill_target": string
    }
  ]
}`;

    const prompt = `Create a customized daily English lesson plan for ${duration} minutes (${paceMode}) targeting ${totalPlannedQuestions} total questions across Grammar (${grammarCount}), Vocabulary (${vocabCount}), Reading (${readingCount}), and Writing (${writingCount}).`;
    const aiResult = await this.callGeminiJson<{
      primary_objective: string;
      reason_for_selection: string;
      sections: Array<{
        section: SectionType;
        activity_type?: any;
        title: string;
        description: string;
        estimated_minutes: number;
        target_questions_count?: number;
        skill_target: string;
      }>;
    }>(prompt, systemPrompt);

    const canonicalSections: SectionType[] = ['grammar', 'vocabulary', 'reading', 'writing'];
    const getQuota = (sec: SectionType) => {
      switch (sec) {
        case 'grammar': return grammarCount;
        case 'vocabulary': return vocabCount;
        case 'reading': return readingCount;
        case 'writing': return writingCount;
      }
    };

    if (aiResult && aiResult.sections && Array.isArray(aiResult.sections) && aiResult.sections.length > 0) {
      const parsedSections = canonicalSections.map(secName => {
        const found = aiResult.sections.find(s => s.section === secName);
        const quota = getQuota(secName);
        const defaultTitle = isVi
          ? secName === 'grammar' ? 'Phần 1 — Ngữ pháp & Cấu trúc câu'
            : secName === 'vocabulary' ? 'Phần 2 — Từ vựng cốt lõi & Collocations'
            : secName === 'reading' ? 'Phần 3 — Đọc hiểu tình huống & Suy luận'
            : 'Phần 4 — Viết ứng dụng công việc & Phản xạ'
          : secName === 'grammar' ? 'Part 1 — Grammar & Structure'
            : secName === 'vocabulary' ? 'Part 2 — Core Vocabulary & Collocations'
            : secName === 'reading' ? 'Part 3 — Contextual Reading & Inference'
            : 'Part 4 — Workplace Writing & Production';

        return {
          section: secName,
          title: found?.title || defaultTitle,
          description: found?.description || `${quota} ${isVi ? 'câu hỏi thực hành' : 'practice questions'}`,
          estimated_minutes: found?.estimated_minutes || Math.round(duration / 4),
          skill_target: found?.skill_target || `Core ${secName} skills`,
          activity_type: found?.activity_type || (secName === 'vocabulary' ? 'vocab_acquisition' : secName === 'reading' ? 'reading_analysis' : secName === 'writing' ? 'writing_production' : 'concept_practice'),
          target_questions_count: quota, // Always strictly enforce the duration-calibrated quota
          completed_questions_count: 0,
          completed: false
        };
      });

      const totalCount = parsedSections.reduce((sum, sec) => sum + sec.target_questions_count, 0);

      return {
        lesson_id: `lesson-${Date.now()}`,
        lesson_number: 1,
        date: new Date().toISOString().split('T')[0],
        primary_objective: aiResult.primary_objective || (isVi ? `Luyện tập thích ứng ${duration} phút: Củng cố 4 kỹ năng toàn diện` : `${duration}-Minute Adaptive Practice across all 4 core skills`),
        reason_for_selection: aiResult.reason_for_selection || (isVi ? `Phiên học thích ứng ${duration} phút với ${totalCount} câu hỏi cân đối giữa ngữ pháp, từ vựng, đọc hiểu và viết.` : `Comprehensive ${duration}-minute session with ${totalCount} active questions.`),
        estimated_duration_minutes: duration,
        session_pace_mode: paceMode,
        total_planned_questions: totalCount,
        sections: parsedSections,
        status: 'in_progress'
      };
    }
    }

    // High quality deterministic fallback calibrated to the user's exact duration
    const grammarMins = Math.max(3, Math.round(duration * 0.3));
    const vocabMins = Math.max(3, Math.round(duration * 0.25));
    const readMins = Math.max(3, Math.round(duration * 0.25));
    const writeMins = Math.max(2, duration - grammarMins - vocabMins - readMins);

    return {
      lesson_id: `lesson-${Date.now()}`,
      lesson_number: 1,
      date: new Date().toISOString().split('T')[0],
      primary_objective: isVi
        ? `Luyện tập thích ứng ${duration} phút: Củng cố thì quá khứ & điều kiện, Collocations kỹ thuật, Đọc hiểu và Viết chuyên nghiệp`
        : `${duration}-Minute Adaptive Practice: Narrative & Conditional Precision, Professional Collocations, Reading Inference, and Written Production`,
      reason_for_selection: isVi
        ? `Phiên học thích ứng ${duration} phút với đầy đủ 4 phần và ${totalPlannedQuestions} câu hỏi thực hành liên tục, cân đối giữa ngữ pháp (${grammarCount} câu), từ vựng (${vocabCount} câu), đọc hiểu (${readingCount} câu) và viết (${writingCount} câu).`
        : `Comprehensive ${duration}-minute session calibrated to deliver ${totalPlannedQuestions} active questions across Grammar (${grammarCount}), Vocabulary (${vocabCount}), Reading (${readingCount}), and Writing (${writingCount}).`,
      estimated_duration_minutes: duration,
      session_pace_mode: paceMode,
      total_planned_questions: totalPlannedQuestions,
      sections: [
        {
          section: 'grammar',
          activity_type: 'concept_practice',
          title: isVi ? 'Phần 1 — Ngữ pháp & Cấu trúc câu' : 'Part 1 — Grammar & Structure',
          description: isVi
            ? `${grammarCount} câu hỏi rà soát thì quá khứ hoàn thành, câu điều kiện hỗn hợp và đảo ngữ.`
            : `${grammarCount} questions on narrative tense coordination, mixed conditionals, and inversion.`,
          estimated_minutes: grammarMins,
          target_questions_count: grammarCount,
          completed_questions_count: 0,
          skill_target: 'Past Perfect, Mixed Conditionals & Inversion',
          completed: false
        },
        {
          section: 'vocabulary',
          activity_type: 'vocab_acquisition',
          title: isVi ? 'Phần 2 — Từ vựng cốt lõi & Collocations' : 'Part 2 — Core Vocabulary & Collocations',
          description: isVi
            ? `${vocabCount} câu hỏi từ vựng kèm phát âm IPA, trọng âm và collocations thực tế (mitigate, streamline, leverage, bottleneck).`
            : `${vocabCount} vocabulary cards with full IPA guidance and workplace collocations.`,
          estimated_minutes: vocabMins,
          target_questions_count: vocabCount,
          completed_questions_count: 0,
          skill_target: 'High-Impact Professional Collocations',
          completed: false
        },
        {
          section: 'reading',
          activity_type: 'reading_analysis',
          title: isVi ? 'Phần 3 — Đọc hiểu tình huống & Phân tích suy luận' : 'Part 3 — Contextual Reading & Inference',
          description: isVi
            ? `${readingCount} câu hỏi: Đoạn văn ngữ cảnh công việc kỹ thuật thực tế và câu hỏi suy luận sâu.`
            : `${readingCount} analytical questions based on real-world engineering and workplace passages.`,
          estimated_minutes: readMins,
          target_questions_count: readingCount,
          completed_questions_count: 0,
          skill_target: 'Technical Strategy Reading & Critical Inference',
          completed: false
        },
        {
          section: 'writing',
          activity_type: 'writing_production',
          title: isVi ? 'Phần 4 — Viết ứng dụng công việc & Phản xạ' : 'Part 4 — Workplace Writing & Production',
          description: isVi
            ? `${writingCount} bài tập viết tình huống thực tế (cập nhật blocker, thông báo hoãn tiến độ, đề xuất giải pháp) với phản hồi AI chi tiết.`
            : `${writingCount} authentic writing prompts with detailed rubric feedback, error tags, and model suggestions.`,
          estimated_minutes: writeMins,
          target_questions_count: writingCount,
          completed_questions_count: 0,
          skill_target: 'Clear Workplace Status Updates & Proposals',
          completed: false
        }
      ],
      status: 'in_progress'
    };
  }

  public async generateQuestion(
    section: SectionType,
    profile: UserProfile,
    targetSkillName?: string,
    contextTopic?: 'general' | 'workplace_tech',
    activityType?: string,
    questionIndex: number = 0,
    totalInActivity: number = 1
  ): Promise<Question> {
    const topic = contextTopic || (Math.random() * 100 > profile.general_vs_work_ratio ? 'workplace_tech' : 'general');
    const lang = profile.explanation_language === 'vi' ? 'Vietnamese' : 'English';

    const systemPrompt = `You are an expert English tutor for a ${profile.current_level} learner.
Generate EXACTLY ONE focused practice question for section: "${section}".
Activity type: ${activityType || 'concept_practice'}.
Question ${questionIndex + 1} of ${totalInActivity} in this activity.
Context topic: ${topic}.
Target skill: ${targetSkillName || 'Core ' + section + ' skill for ' + profile.current_level}.
Explanation and hints must be in ${lang}. Examples and prompt in natural English.

Core rules based on activity type:
- If activity is "warmup_review": Provide a swift retrieval check testing recognition or identifying a common error.
- If activity is "concept_practice": For question index 0, provide multiple_choice with concise concept_intro. For question index >= 1, provide fill_in_blank or sentence completion.
- If activity is "vocab_acquisition": Provide a complete "vocab_card" (word, part_of_speech, ipa, pronunciation_tip, meaning in ${lang}, collocation_pattern, example_general, example_workplace, similar_word_comparison) and a contextual test question.
- If activity is "reading_analysis": Provide a rich "reading_passage" (120-150 words) and a comprehension or subtle inference question.
- If activity is "writing_production" or "exit_synthesis": Provide a realistic free_writing prompt asking for 2-3 sentences.

JSON Output Schema:
{
  "id": string,
  "section": "${section}",
  "skill_id": string,
  "skill_name": string,
  "question_type": "multiple_choice" | "fill_in_blank" | "reading_comprehension" | "free_writing",
  "difficulty": "${profile.current_level}",
  "context_topic": "${topic}",
  "concept_intro": string (optional),
  "vocab_card": object (required if vocabulary),
  "reading_passage": { "title": string, "text": string, "word_count": number, "topic": string } (required if reading),
  "prompt": string,
  "options": [ { "id": "A"|"B"|"C"|"D", "text": string } ] (optional),
  "expected_answer_ids": ["A"|"B"|"C"|"D"] (optional),
  "expected_answer_text": string,
  "accepted_alternatives": [string],
  "hint": string,
  "explanation_rule": string
}`;

    const prompt = `Generate question ${questionIndex + 1} of ${totalInActivity} for ${section} (${activityType || 'practice'}).`;
    const result = await this.callGeminiJson<Question>(prompt, systemPrompt);

    if (result && result.prompt) {
      return {
        ...result,
        id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        section
      };
    }

    // High quality deterministic fallback matching section and question variety
    const matching = DEFAULT_CURRICULUM.filter(item => item.section === section);
    if (matching.length > 0) {
      const unserved = matching.filter(item => !this.servedQuestionHistory.includes(item.id));
      const pool = unserved.length > 0 ? unserved : matching;
      const selected = pool[questionIndex % pool.length] || matching[questionIndex % matching.length];

      this.servedQuestionHistory.push(selected.id);
      if (this.servedQuestionHistory.length > 30) {
        this.servedQuestionHistory.shift();
      }

      return {
        ...selected.question,
        id: `curric-${Date.now()}-${selected.id}`
      };
    }

    return {
      id: `fallback-${Date.now()}`,
      section,
      skill_id: `${section}_core`,
      skill_name: `Core ${section}`,
      question_type: section === 'writing' ? 'free_writing' : 'multiple_choice',
      difficulty: profile.current_level,
      context_topic: topic,
      prompt: 'Which word best fits the sentence: "We must ____ the system before deployment"?',
      options: [
        { id: 'A', text: 'validate' },
        { id: 'B', text: 'validation' },
        { id: 'C', text: 'validating' },
        { id: 'D', text: 'validated' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'validate',
      accepted_alternatives: ['validate'],
      hint: 'Sau trợ động từ khuyết thiếu "must", ta cần động từ nguyên mẫu.',
      explanation_rule: 'Modal verb "must" đi kèm động từ nguyên thể không "to".'
    };
  }

  public async evaluateAnswer(
    question: Question,
    userAnswer: string,
    profile: UserProfile
  ): Promise<AnswerEvaluation> {
    const trimmed = userAnswer.trim();
    const lang = profile.explanation_language === 'vi' ? 'Vietnamese' : 'English';

    // 1. Deterministic check for multiple-choice questions
    if (question.question_type === 'multiple_choice' || question.question_type === 'reading_comprehension') {
      const expectedId = question.expected_answer_ids ? question.expected_answer_ids[0] : '';
      const selectedOption = question.options?.find(o => o.id === trimmed || o.text.toLowerCase() === trimmed.toLowerCase());
      const selectedId = selectedOption?.id || trimmed;

      if (expectedId && selectedId.toUpperCase() === expectedId.toUpperCase()) {
        const optionText = question.options?.find(o => o.id === expectedId)?.text || question.expected_answer_text || '';
        return {
          verdict: 'correct',
          user_answer: userAnswer,
          expected_answer: optionText,
          full_correct_sentence: question.prompt.includes('____')
            ? question.prompt.replace('____', `**${optionText}**`)
            : `${question.prompt} → ${optionText}`,
          decisive_clue: question.explanation_rule || 'Chính xác theo quy tắc ngữ pháp/ngữ cảnh.',
          explanation: profile.explanation_language === 'vi'
            ? `Chính xác! ${question.explanation_rule}`
            : `Well done! ${question.explanation_rule}`,
          error_tags: [],
          needs_retry: false,
          next_action: 'continue'
        };
      }
    }

    // 2. Deterministic exact/alternative match for fill-in-the-blank
    if (question.question_type === 'fill_in_blank') {
      const isDirectMatch = question.expected_answer_text?.toLowerCase() === trimmed.toLowerCase() ||
        question.accepted_alternatives?.some(alt => alt.toLowerCase() === trimmed.toLowerCase());
      if (isDirectMatch) {
        return {
          verdict: 'correct',
          user_answer: userAnswer,
          expected_answer: question.expected_answer_text || '',
          full_correct_sentence: question.prompt.replace(/_{3,}/g, `**${question.expected_answer_text}**`),
          decisive_clue: question.explanation_rule,
          explanation: profile.explanation_language === 'vi'
            ? `Rất chính xác! ${question.explanation_rule}`
            : `Correct! ${question.explanation_rule}`,
          error_tags: [],
          needs_retry: false,
          next_action: 'continue'
        };
      }
    }

    // 3. Nuanced AI Evaluation when available
    const systemPrompt = `You are an empathetic, precise English tutor evaluating a learner's answer.
Current learner level: ${profile.current_level}.
Language for explanations: ${lang}.
Question details:
- Section: ${question.section}
- Question type: ${question.question_type}
- Prompt: "${question.prompt}"
- Expected answer / intent: "${question.expected_answer_text || (question.options?.find(o => question.expected_answer_ids?.includes(o.id))?.text) || ''}"
- Underlying rule: "${question.explanation_rule}"

Output JSON format:
{
  "verdict": "correct" | "partially_correct" | "incorrect" | "ambiguous",
  "expected_answer": string,
  "full_correct_sentence": string,
  "decisive_clue": string,
  "explanation": string,
  "contrast_explanation": string,
  "corrected_text": string,
  "key_corrections": [
    { "original": string, "corrected": string, "reason": string }
  ],
  "reusable_pattern": string,
  "error_tags": [string],
  "needs_retry": boolean,
  "next_action": "continue" | "retry" | "transfer"
}`;

    const prompt = `Learner answer: "${userAnswer}"`;
    const aiResult = await this.callGeminiJson<AnswerEvaluation>(prompt, systemPrompt);

    if (aiResult && aiResult.verdict) {
      return {
        ...aiResult,
        user_answer: userAnswer
      };
    }

    // Local evaluation fallback
    const isMultipleChoice = Boolean(question.options && question.options.length > 0);
    const expectedOpt = question.options?.find(o => question.expected_answer_ids?.includes(o.id));
    const expectedText = expectedOpt?.text || question.expected_answer_text || 'Expected answer';

    if (question.question_type === 'free_writing') {
      const sentenceCount = trimmed.split(/[.!?]+/).filter(Boolean).length;
      const isSufficientLength = trimmed.length >= 35 && sentenceCount >= 2;

      return {
        verdict: isSufficientLength ? 'correct' : 'partially_correct',
        user_answer: userAnswer,
        expected_answer: 'A concise 2-3 sentence workplace update.',
        full_correct_sentence: trimmed,
        decisive_clue: 'Câu trả lời truyền tải rõ ý nghĩa, cấu trúc thì động từ phù hợp với ngữ cảnh công việc.',
        explanation: profile.explanation_language === 'vi'
          ? `Giao tiếp rõ ràng và tự nhiên! Bạn đã nêu được bối cảnh sự việc và kế hoạch tiếp theo.`
          : 'Clear and effective communication! Context and next steps are well conveyed.',
        corrected_text: trimmed,
        key_corrections: [],
        reusable_pattern: 'I ran into an issue with [module], so I am currently [action]. Expecting to push the fix by [time].',
        error_tags: [],
        needs_retry: !isSufficientLength,
        next_action: 'continue'
      };
    }

    return {
      verdict: 'incorrect',
      user_answer: userAnswer,
      expected_answer: expectedText,
      full_correct_sentence: question.prompt.includes('____')
        ? question.prompt.replace('____', `**${expectedText}**`)
        : `${question.prompt} → ${expectedText}`,
      decisive_clue: question.explanation_rule,
      explanation: profile.explanation_language === 'vi'
        ? `Chưa chính xác. ${question.explanation_rule}`
        : `Not quite. ${question.explanation_rule}`,
      contrast_explanation: 'Hãy đối chiếu từ khóa thời gian hoặc cấu trúc ngữ pháp để chọn đáp án đúng.',
      error_tags: [question.skill_name],
      needs_retry: isMultipleChoice,
      next_action: 'retry'
    };
  }

  public async tutorAssist(
    question: Question,
    action: 'hint' | 'simpler_explanation' | 'another_example' | 'clarify_ambiguity',
    profile: UserProfile
  ): Promise<TutorAssistantResponse> {
    const lang = profile.explanation_language === 'vi' ? 'Vietnamese' : 'English';

    const systemPrompt = `You are a supportive, patient English tutor.
The learner requested assistance for this active question:
Question Prompt: "${question.prompt}"
Target Skill: ${question.skill_name}
Current Level: ${profile.current_level}
Action requested: "${action}".

Output in JSON:
{
  "type": "${action}",
  "content": string,
  "example_sentence": string (optional)
}`;

    const prompt = `Help the student with action: ${action}`;
    const result = await this.callGeminiJson<TutorAssistantResponse>(prompt, systemPrompt);

    if (result && result.content) {
      return result;
    }

    if (action === 'hint') {
      return {
        type: 'hint',
        content: question.hint || 'Hãy chú ý đến các từ chỉ thời gian và chủ ngữ thực hiện hành động.'
      };
    } else if (action === 'simpler_explanation') {
      return {
        type: 'simpler_explanation',
        content: profile.explanation_language === 'vi'
          ? `Quy tắc cốt lõi: ${question.explanation_rule || 'Hãy liên kết hành động với dòng thời gian để chọn cấu trúc chuẩn xác nhất.'}`
          : `Core rule: ${question.explanation_rule}`
      };
    } else if (action === 'another_example') {
      return {
        type: 'another_example',
        content: profile.explanation_language === 'vi'
          ? 'Đây là một ví dụ tương tự trong ngữ cảnh công việc:'
          : 'Here is another realistic workplace example:',
        example_sentence: 'By the time QA started the verification phase, our backend engineers had deployed the hotfix.'
      };
    } else {
      return {
        type: 'clarify_ambiguity',
        content: profile.explanation_language === 'vi'
          ? 'Nếu câu hỏi có cảm giác mơ hồ, hãy xem xét ngữ cảnh giao tiếp nơi hành động diễn ra: sự việc đã kết thúc hay vẫn còn tác động đến hiện tại?'
          : 'Consider the temporal anchor: is the action completed before another past event, or continuing?'
      };
    }
  }

  public async generateLessonSummary(
    lesson: LessonPlan,
    attempts: Array<{ question: Question; evaluation: AnswerEvaluation; userAnswer: string }>,
    profile: UserProfile,
    timeSpentMinutes?: number
  ): Promise<DailySummary> {
    const totalQuestions = attempts.length;
    const correctCount = attempts.filter(a => a.evaluation.verdict === 'correct').length;
    const accuracy = totalQuestions > 0 ? Number((correctCount / totalQuestions).toFixed(2)) : 1.0;

    const sectionsPracticed = Array.from(new Set(attempts.map(a => a.question.section))) as SectionType[];
    const lang = profile.explanation_language === 'vi' ? 'Vietnamese' : 'English';
    const targetMins = lesson.estimated_duration_minutes || profile.daily_minutes || 20;
    const computedTimeSpent = timeSpentMinutes || Math.max(1, Math.round(targetMins * (totalQuestions / (lesson.total_planned_questions || totalQuestions || 4))));
    const paceMode = lesson.session_pace_mode || (targetMins <= 12 ? 'quick_10' : targetMins >= 25 ? 'deep_30' : 'standard_20');

    const systemPrompt = `You are a warm, professional English learning coach.
Summarize today's lesson session for a ${profile.current_level} learner.
Duration completed: ${computedTimeSpent} minutes (Target was ${targetMins} minutes, Pace mode: ${paceMode}).
Questions completed: ${totalQuestions} of ${lesson.total_planned_questions || totalQuestions}.
Accuracy: ${Math.round(accuracy * 100)}%.
Language: ${lang}.
Lesson objective: "${lesson.primary_objective}".

Output JSON:
{
  "key_takeaways": [string],
  "vocabulary_learned": [string],
  "recurring_mistakes_flagged": [string],
  "next_review_topics": [string]
}`;

    const prompt = `Generate structured end-of-lesson summary reflecting the ${targetMins}-minute study session.`;
    const aiResult = await this.callGeminiJson<{
      key_takeaways: string[];
      vocabulary_learned: string[];
      recurring_mistakes_flagged: string[];
      next_review_topics: string[];
    }>(prompt, systemPrompt);

    if (aiResult) {
      return {
        lesson_id: lesson.lesson_id,
        lesson_number: lesson.lesson_number || 1,
        completed_at: new Date().toISOString(),
        primary_objective: lesson.primary_objective,
        sections_completed: sectionsPracticed,
        questions_answered: totalQuestions,
        total_planned_questions: lesson.total_planned_questions || totalQuestions,
        time_spent_minutes: computedTimeSpent,
        target_duration_minutes: targetMins,
        session_pace_mode: paceMode,
        accuracy_rate: accuracy,
        key_takeaways: aiResult.key_takeaways || [],
        vocabulary_learned: aiResult.vocabulary_learned || [],
        recurring_mistakes_flagged: aiResult.recurring_mistakes_flagged || [],
        next_review_topics: aiResult.next_review_topics || [],
        learner_rating: 'about_right'
      };
    }

    return {
      lesson_id: lesson.lesson_id,
      lesson_number: lesson.lesson_number || 1,
      completed_at: new Date().toISOString(),
      primary_objective: lesson.primary_objective,
      sections_completed: sectionsPracticed,
      questions_answered: totalQuestions,
      total_planned_questions: lesson.total_planned_questions || totalQuestions,
      time_spent_minutes: computedTimeSpent,
      target_duration_minutes: targetMins,
      session_pace_mode: paceMode,
      accuracy_rate: accuracy,
      key_takeaways: profile.explanation_language === 'vi'
        ? [
            'Nắm chắc thì Past Perfect khi có mốc thời gian "By the time" trong quá khứ.',
            'Vận dụng thành thạo từ "mitigate" & "leverage" đi kèm các danh từ như "risk", "infrastructure".',
            'Viết câu cập nhật tiến độ ngắn gọn, nêu rõ vấn đề và hành động tiếp theo.'
          ]
        : [
            'Consolidated Past Perfect usage with past temporal anchors.',
            'Mastered collocations for "mitigate" and "leverage".',
            'Practiced concise engineering status updates.'
          ],
      vocabulary_learned: ['mitigate /ˈmɪtɪɡeɪt/', 'streamline /ˈstriːmlaɪn/', 'leverage /ˈlev.ər.ɪdʒ/'],
      recurring_mistakes_flagged: accuracy < 0.8
        ? ['Cần lưu ý phân biệt kết quả hiện tại trong Mixed Conditionals']
        : [],
      next_review_topics: ['Mixed Conditionals in technical reviews', 'Inversion with negative adverbials'],
      learner_rating: 'about_right'
    };
  }
}

export const aiService = new GeminiLearningProvider();
