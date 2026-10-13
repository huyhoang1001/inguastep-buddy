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
  EnglishLevel,
  DeepDiveInquiryResponse,
  SimilarWordComparison,
  DiagnosticAssessmentPlan
} from '../src/types/learning.js';
import { createDiagnosticAssessmentPlan } from '../src/types/diagnosticPlans.js';
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

  deepDiveInquiry(
    question: Question,
    userAnswer: string,
    evaluation: AnswerEvaluation | undefined,
    message: string,
    history: Array<{ role: 'user' | 'tutor'; content: string }>,
    profile: UserProfile
  ): Promise<DeepDiveInquiryResponse>;
}

export class GeminiLearningProvider implements LearningModelProvider {
  private ai: GoogleGenAI | null = null;
  // Official standard Gemini models
  private modelCandidates = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  private quotaCooldownUntil = 0;
  private servedQuestionHistory: string[] = [];
  private mockHandler: ((prompt: string, systemInstruction: string, options?: { userId?: string; operation?: string }) => any) | null = null;

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

  public setMockHandler(handler: ((prompt: string, systemInstruction: string, options?: { userId?: string; operation?: string }) => any) | null): void {
    this.mockHandler = handler;
  }

  public isQuotaExhausted(): boolean {
    return Date.now() < this.quotaCooldownUntil;
  }

  public resetQuotaCooldown(): void {
    this.quotaCooldownUntil = 0;
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
      // If a test mock handler is registered, use it without network calls
      if (this.mockHandler) {
        try {
          const mocked = this.mockHandler(prompt, systemInstruction, options);
          if (userId !== 'system') {
            budgetManager.recordUsage(userId, 'mock-model', operation, estInputTokens, 50, 'success');
          }
          return mocked as T;
        } catch (err: any) {
          if (userId !== 'system') {
            budgetManager.recordUsage(userId, 'mock-model', operation, estInputTokens, 0, 'error', err?.message);
          }
          return null;
        }
      }

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
          const response = await this.ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          });
          const text = response.text || '';
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
            console.warn(`[AI] Generation error with ${model}:`, errMsg.slice(0, 100));
            break;
          }
        }
      }

      // Pause remote attempts if all models failed
      this.quotaCooldownUntil = Date.now() + 15 * 60 * 1000;
      if (userId !== 'system') {
        budgetManager.recordUsage(userId, 'fallback', operation, estInputTokens, 0, 'error', 'All model candidates failed');
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
  // 2. ADAPTIVE DIAGNOSTIC QUESTION SELECTION & GENERATION (SEQUENTIAL SECTIONS)
  // =========================================================================
  public async generateAdaptiveDiagnosticQuestion(
    session: DiagnosticSession,
    profile: UserProfile
  ): Promise<Question> {
    const answered = session.history;
    const answeredIds = new Set(answered.map(a => a.question.id));
    const answeredPrompts = new Set(answered.map(a => a.question.prompt.trim().toLowerCase()));

    // 1. Ensure a structured assessment plan exists for the session
    const plan = session.plan || createDiagnosticAssessmentPlan(session.mode, profile.explanation_language);
    session.plan = plan;

    // 2. Determine active section sequentially: Grammar -> Vocabulary -> Reading -> Writing
    let activeSectionIndex = 0;
    let activeSectionPlan = plan.sections[0];
    let sectionFound = false;

    for (let i = 0; i < plan.sections.length; i++) {
      const sec = plan.sections[i];
      const secAttempts = answered.filter(a => a.question.section === sec.section);
      if (secAttempts.length < sec.targetQuestionsCount) {
        activeSectionIndex = i;
        activeSectionPlan = sec;
        sectionFound = true;
        break;
      }
    }

    if (!sectionFound) {
      // All sections have satisfied their target count; default to final section
      activeSectionIndex = plan.sections.length - 1;
      activeSectionPlan = plan.sections[activeSectionIndex];
    }

    session.currentSectionIndex = activeSectionIndex;
    const targetSection: SectionType = activeSectionPlan.section;
    const secAttempts = answered.filter(a => a.question.section === targetSection);
    const currentQuestionIndexInSection = secAttempts.length;
    session.questionIndexInSection = currentQuestionIndexInSection;

    // 3. Adaptive difficulty calibration within the current section
    let targetLevel: EnglishLevel = profile.current_level || 'B2';
    if (secAttempts.length >= 2) {
      const lastTwo = secAttempts.slice(-2);
      const bothCorrect = lastTwo.every(a => a.verdict === 'correct');
      const anyWrong = lastTwo.some(a => a.verdict === 'incorrect');
      if (bothCorrect) {
        if (targetLevel === 'A2') targetLevel = 'B1';
        else if (targetLevel === 'B1') targetLevel = 'B2';
        else if (targetLevel === 'B2') targetLevel = 'C1';
      } else if (anyWrong) {
        if (targetLevel === 'C1') targetLevel = 'B2';
        else if (targetLevel === 'B2') targetLevel = 'B1';
        else if (targetLevel === 'B1') targetLevel = 'A2';
      }
    } else if (secAttempts.length === 1 && secAttempts[0].verdict === 'incorrect') {
      if (targetLevel === 'C1') targetLevel = 'B2';
      else if (targetLevel === 'B2') targetLevel = 'B1';
    }

    const topic = profile.primary_goal === 'workplace_tech' || (profile.general_vs_work_ratio || 65) >= 50
      ? 'workplace_tech'
      : 'general';
    const lang = profile.explanation_language === 'vi' ? 'Vietnamese' : 'English';

    // Check if continuing a passage in the Reading section
    const lastReadingAttempt = targetSection === 'reading' && secAttempts.length > 0
      ? secAttempts[secAttempts.length - 1]
      : null;
    const existingPassage = lastReadingAttempt?.question.reading_passage;

    // 4. AI Dynamic Question Generation
    const systemPrompt = `You are an expert English proficiency test examiner constructing an official diagnostic exam.
Current Assessment Section: ${targetSection.toUpperCase()} (${activeSectionPlan.title}).
Section Item: ${currentQuestionIndexInSection + 1} of ${activeSectionPlan.targetQuestionsCount}.
Adaptive Difficulty Target: ${targetLevel}.
Topic Context: ${topic}.
Learner Background: Goal: ${profile.primary_goal}, Target: ${profile.target_level}, Explanation Language: ${lang}.
Answered items count in this diagnostic: ${answered.length}.

SECTION SPECIFIC RULES:
- If section is "grammar": Create a multiple-choice item testing grammar rule at CEFR ${targetLevel}. Provide 4 options A, B, C, D with 1 unambiguous correct answer and plausible distractors.
- If section is "vocabulary": Create a contextual multiple-choice item testing nuanced collocations, phrasal verbs, or workplace vocabulary at CEFR ${targetLevel}.
- If section is "reading":
  ${existingPassage && currentQuestionIndexInSection < 3
    ? `Reuse the existing reading passage "${existingPassage.title}" and generate a brand-new follow-up comprehension, inference, or vocabulary-in-context question.`
    : `Generate a coherent, high-quality reading passage (120-180 words) and 1 reading comprehension question with 4 options.`}
- If section is "writing": Provide a structured scenario prompt requiring original production (e.g. 3-4 sentences describing a status update, routine, or technical trade-off). Set question_type to "free_writing".
- NEVER duplicate any prompt or skill from previously answered questions: ${JSON.stringify(answered.map(a => a.question.prompt.slice(0, 40)))}.
- Keep hints and explanations in ${lang}.

Output strictly in JSON format:
{
  "id": string,
  "section": "${targetSection}",
  "skill_id": string,
  "skill_name": string,
  "question_type": "${targetSection === 'writing' ? 'free_writing' : targetSection === 'reading' ? 'reading_comprehension' : 'multiple_choice'}",
  "difficulty": "${targetLevel}",
  "context_topic": "${topic}",
  "reading_passage": { "title": string, "text": string, "word_count": number, "topic": string } (only if reading),
  "prompt": string,
  "options": [ { "id": "A"|"B"|"C"|"D", "text": string } ] (if multiple choice),
  "expected_answer_ids": [string] (if multiple choice),
  "expected_answer_text": string,
  "accepted_alternatives": [string],
  "hint": string,
  "explanation_rule": string
}`;

    const prompt = `Generate item ${currentQuestionIndexInSection + 1}/${activeSectionPlan.targetQuestionsCount} for section ${targetSection} at CEFR ${targetLevel}.`;
    const generated = await this.callGeminiJson<Question>(prompt, systemPrompt, {
      userId: profile.id,
      operation: 'diagnostic_question'
    });

    if (
      generated &&
      generated.prompt &&
      generated.section === targetSection &&
      !answeredIds.has(generated.id) &&
      !answeredPrompts.has(generated.prompt.trim().toLowerCase())
    ) {
      return {
        ...generated,
        id: `diag-gen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        section: targetSection,
        difficulty: generated.difficulty || targetLevel
      };
    }

    // 5. High-Quality Calibrated Bank Fallback (Ensures zero duplicates & sequential coherence)
    const bankCandidates = DIAGNOSTIC_BANK.filter(item => {
      if (item.category !== targetSection) return false;
      if (answeredIds.has(item.question.id)) return false;
      if (answeredPrompts.has(item.question.prompt.trim().toLowerCase())) return false;
      return true;
    });

    // In Reading, if we have an existing passage, prefer an unserved question linked to the same passage
    let selected: DiagnosticBankItem | undefined;
    if (targetSection === 'reading' && existingPassage) {
      selected = bankCandidates.find(
        b => b.question.reading_passage?.title === existingPassage.title
      );
    }

    if (!selected) {
      // Find matching difficulty in bank
      selected = bankCandidates.find(b => b.difficulty === targetLevel);
    }

    if (!selected && bankCandidates.length > 0) {
      // Pick closest available difficulty in current section
      selected = bankCandidates[0];
    }

    if (selected) {
      return {
        ...selected.question,
        id: `diag-bank-${Date.now()}-${selected.id}`
      };
    }

    // 6. Generative Unique Emergency Item (guaranteed zero repeats if bank is fully exhausted)
    const uniqueSuffix = `${Date.now().toString().slice(-4)}`;
    if (targetSection === 'grammar') {
      return {
        id: `diag-procedural-gram-${uniqueSuffix}`,
        section: 'grammar',
        skill_id: `adaptive_grammar_review_${targetLevel.toLowerCase()}`,
        skill_name: `Adaptive Grammar Diagnostic (${targetLevel})`,
        question_type: 'multiple_choice',
        difficulty: targetLevel,
        context_topic: topic,
        prompt: `Select the sentence with the most natural and grammatically accurate structure for a workplace status report:`,
        options: [
          { id: 'A', text: `Having finished the database migration, our engineering team began load testing.` },
          { id: 'B', text: `Finished the database migration, our engineering team had begun load testing.` },
          { id: 'C', text: `Our team had finish the database migration when load testing began.` },
          { id: 'D', text: `Having finish the database migration, load testing was begun by our team.` }
        ],
        expected_answer_ids: ['A'],
        expected_answer_text: `Having finished the database migration, our engineering team began load testing.`,
        accepted_alternatives: ['A'],
        hint: lang === 'Vietnamese' ? 'Dùng phân từ hoàn thành "Having finished" để rút gọn mệnh đề trạng ngữ chỉ hành động xảy ra trước.' : 'Use perfect participle "Having finished" for completed antecedent actions.',
        explanation_rule: 'Perfect participle clause: Having + V3 correctly modifies the subject "our engineering team".'
      };
    } else if (targetSection === 'vocabulary') {
      return {
        id: `diag-procedural-voc-${uniqueSuffix}`,
        section: 'vocabulary',
        skill_id: `adaptive_vocab_collocation_${targetLevel.toLowerCase()}`,
        skill_name: `Adaptive Vocabulary Diagnostic (${targetLevel})`,
        question_type: 'multiple_choice',
        difficulty: targetLevel,
        context_topic: topic,
        prompt: `Which word best fits the sentence: "To prevent scope creep, the project manager decided to strictly ____ the project deliverables."?`,
        options: [
          { id: 'A', text: 'delineate' },
          { id: 'B', text: 'evaporate' },
          { id: 'C', text: 'disintegrate' },
          { id: 'D', text: 'speculate' }
        ],
        expected_answer_ids: ['A'],
        expected_answer_text: 'delineate',
        accepted_alternatives: ['delineate'],
        hint: lang === 'Vietnamese' ? 'Từ mang nghĩa vạch rõ ranh giới, xác định chi tiết phạm vi dự án.' : 'Means to clearly describe or outline the boundary of deliverables.',
        explanation_rule: '"Delineate deliverables" is a formal collocation meaning to outline or demarcate clearly.'
      };
    } else if (targetSection === 'reading') {
      return {
        id: `diag-procedural-read-${uniqueSuffix}`,
        section: 'reading',
        skill_id: 'reading_synthesis_adaptive',
        skill_name: 'Reading Synthesis & Evaluation',
        question_type: 'reading_comprehension',
        difficulty: targetLevel,
        context_topic: topic,
        reading_passage: {
          title: 'Architectural Agility in Distributed Teams',
          word_count: 120,
          topic: 'Engineering Management',
          text: 'Distributed teams require rigorous written consensus. When asynchronous teams rely on implicit assumptions, integration drift rapidly escalates into systemic blockers. Documenting explicit API boundaries and architectural decision records preserves independent velocity across distinct time zones.'
        },
        prompt: 'Why are explicit architectural decision records essential for distributed teams according to the text?',
        options: [
          { id: 'A', text: 'They eliminate the need for any automated testing' },
          { id: 'B', text: 'They prevent integration drift and allow asynchronous velocity across time zones' },
          { id: 'C', text: 'They replace all project management software' },
          { id: 'D', text: 'They mandate that all engineers work the exact same office hours' }
        ],
        expected_answer_ids: ['B'],
        expected_answer_text: 'They prevent integration drift and allow asynchronous velocity across time zones',
        accepted_alternatives: ['B'],
        hint: lang === 'Vietnamese' ? 'Đọc câu cuối cùng về việc bảo tồn tiến độ độc lập giữa các múi giờ.' : 'Look at the concluding sentence on independent velocity across time zones.',
        explanation_rule: 'The passage explicitly states that documented decisions preserve independent velocity.'
      };
    } else {
      return {
        id: `diag-procedural-write-${uniqueSuffix}`,
        section: 'writing',
        skill_id: 'writing_synthesis_adaptive',
        skill_name: 'Workplace Incident & Plan Writing',
        question_type: 'free_writing',
        difficulty: targetLevel,
        context_topic: topic,
        prompt: `Write 3 to 4 sentences in English describing an unexpected delay or challenge you encountered recently at work or study. State what happened, what action you took, and what you learned.`,
        hint: lang === 'Vietnamese' ? 'Sử dụng liên từ quá khứ (When/While), thì quá khứ đơn, và kết bài bằng bài học rút ra.' : 'Structure with: What happened -> Mitigation action -> Takeaway.',
        explanation_rule: 'Evaluates past tense narrative accuracy, cohesive transition devices, and professional register.'
      };
    }
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
- correctedVersion: CRITICAL: You MUST write an elevated, idiomatic, natural native rewrite of the student's text that preserves their core voice and intent while demonstrating professional rhythm and phrasing. NEVER return raw student text!
- keyCorrections: array of { original, corrected, reason in ${lang} }
- usefulPhrases: array of { phrase, meaning in ${lang}, how_to_use in ${lang} }

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
  "keyCorrections": [ { "original": string, "corrected": string, "reason": string } ],
  "usefulPhrases": [ { "phrase": string, "meaning": string, "how_to_use": string } ]
}`;

      const prompt = `Assess writing response: "${userAnswer}"`;
      const aiRubric = await this.callGeminiJson<WritingRubricScore & { usefulPhrases?: Array<{ phrase: string; meaning: string; how_to_use: string }> }>(prompt, systemPrompt);

      const sentences = trimmed.split(/[.!?]+/).filter(Boolean).length;
      const isPass = sentences >= 2 && trimmed.length >= 30;
      const fallbackPolished = this.polishWritingText(trimmed, question.prompt, profile);

      const rubric: WritingRubricScore = {
        accuracy: aiRubric?.accuracy ?? (isPass ? 4 : 2),
        vocabularyRange: aiRubric?.vocabularyRange ?? (isPass ? 4 : 3),
        sentenceComplexity: aiRubric?.sentenceComplexity ?? (isPass ? 3 : 2),
        coherence: aiRubric?.coherence ?? (isPass ? 4 : 3),
        naturalness: aiRubric?.naturalness ?? (isPass ? 4 : 2),
        taskCompletion: aiRubric?.taskCompletion ?? (isPass ? 4 : 2),
        feedbackSummary: aiRubric?.feedbackSummary || (profile.explanation_language === 'vi'
          ? 'Bài viết truyền tải rõ thông điệp. Chú ý cấu trúc thì động từ và liên từ nối giữa các câu.'
          : 'Clear message delivery. Ensure consistent tense alignment and clause coordination.'),
        correctedVersion: (aiRubric?.correctedVersion && aiRubric.correctedVersion.trim() !== trimmed)
          ? aiRubric.correctedVersion
          : fallbackPolished.polishedText,
        keyCorrections: (aiRubric?.keyCorrections && aiRubric.keyCorrections.length > 0)
          ? aiRubric.keyCorrections
          : fallbackPolished.keyCorrections
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
        useful_phrases: (aiRubric as any)?.usefulPhrases || fallbackPolished.usefulPhrases,
        reusable_pattern: fallbackPolished.reusablePattern,
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
  // 4. DIAGNOSTIC REPORT COMPUTATION (EXPLICIT 4-AREA WEIGHTED SCORING)
  // =========================================================================
  public async computeDiagnosticReport(
    session: DiagnosticSession,
    profile: UserProfile
  ): Promise<DiagnosticReport> {
    const attempts = session.history;
    const totalCount = attempts.length;
    const plan = session.plan || createDiagnosticAssessmentPlan(session.mode, profile.explanation_language);

    const scoringWeights = plan.scoringWeights || {
      grammar: 25,
      vocabulary: 25,
      reading: 25,
      writing: 25
    };

    const sections: SectionType[] = ['grammar', 'vocabulary', 'reading', 'writing'];
    const skillEstimates: any = {};
    const sectionScores: any = {};

    sections.forEach(sec => {
      const secAttempts = attempts.filter(a => a.question.section === sec);
      const secCount = secAttempts.length;

      let earnedPoints = 0;
      let maxPoints = secCount > 0 ? secCount : 1;

      if (sec === 'writing') {
        // Writing uses multi-dimensional rubric average
        if (secCount > 0) {
          const totalRubricScore = secAttempts.reduce((acc, a) => {
            if (a.writingRubric) {
              const r = a.writingRubric;
              const avg = (r.accuracy + r.vocabularyRange + r.sentenceComplexity + r.coherence + r.naturalness + r.taskCompletion) / 6;
              return acc + (avg / 5); // Normalized 0-1
            }
            return acc + (a.verdict === 'correct' ? 1.0 : 0.6);
          }, 0);
          earnedPoints = Number((totalRubricScore).toFixed(2));
        }
      } else {
        // Objective sections: 1.0 for correct, 0.5 for partially_correct
        earnedPoints = secAttempts.reduce((acc, a) => {
          if (a.verdict === 'correct') return acc + 1.0;
          if (a.verdict === 'partially_correct') return acc + 0.5;
          return acc;
        }, 0);
      }

      const secPercentage = secCount > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;

      // Calibrate CEFR by percentage and question difficulty
      let cefr = 'B1-B2';
      if (secCount === 0) {
        cefr = 'Not Assessed (Insufficient Data)';
      } else if (secPercentage >= 85) {
        cefr = 'B2-C1';
      } else if (secPercentage >= 70) {
        cefr = 'B2';
      } else if (secPercentage >= 50) {
        cefr = 'B1';
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
        correctCount: secAttempts.filter(a => a.verdict === 'correct').length,
        demonstratedStrengths,
        priorityWeaknesses,
        recurringErrors,
        unassessedSubskills: []
      };

      sectionScores[sec] = {
        score: earnedPoints,
        maxScore: maxPoints,
        percentage: secPercentage,
        cefr
      };
    });

    // Speaking & Listening: explicitly marked as Not Assessed in text diagnostic
    skillEstimates.speaking = {
      category: 'speaking',
      cefrRange: 'Not Assessed (Text Diagnostic)',
      confidence: 'low',
      evidenceCount: 0,
      correctCount: 0,
      demonstratedStrengths: [],
      priorityWeaknesses: ['Oral pronunciation and live conversational reflex require audio module'],
      recurringErrors: [],
      unassessedSubskills: ['Spoken spontaneous output', 'Phonetic articulation']
    };

    skillEstimates.listening = {
      category: 'listening',
      cefrRange: 'Not Assessed (Text Diagnostic)',
      confidence: 'low',
      evidenceCount: 0,
      correctCount: 0,
      demonstratedStrengths: [],
      priorityWeaknesses: ['Acoustic decoding and accent comprehension not tested in standard mode'],
      recurringErrors: [],
      unassessedSubskills: ['Connected speech recognition', 'Multi-accent listening']
    };

    // Calculate Overall Weighted Score (adds up to 100%)
    const weightedScore = Math.round(
      (sectionScores.grammar.percentage * (scoringWeights.grammar / 100)) +
      (sectionScores.vocabulary.percentage * (scoringWeights.vocabulary / 100)) +
      (sectionScores.reading.percentage * (scoringWeights.reading / 100)) +
      (sectionScores.writing.percentage * (scoringWeights.writing / 100))
    );

    let overallCEFR = 'B2';
    if (weightedScore >= 85) overallCEFR = 'B2-C1';
    else if (weightedScore >= 70) overallCEFR = 'B2';
    else if (weightedScore >= 50) overallCEFR = 'B1-B2';
    else overallCEFR = 'A2-B1';

    const overallConfidence: 'low' | 'moderate' | 'high' =
      session.mode === 'comprehensive' || totalCount >= 14 ? 'high' : session.mode === 'standard' || totalCount >= 8 ? 'high' : 'moderate';

    const allStrengths = attempts.filter(a => a.verdict === 'correct').map(a => a.question.skill_name);
    const allWeaknesses = attempts.filter(a => a.verdict !== 'correct').map(a => a.question.skill_name);
    const allErrors = attempts
      .filter(a => a.verdict !== 'correct')
      .map(a => a.evaluation.decisive_clue)
      .filter(Boolean);

    const isVi = profile.explanation_language === 'vi';
    const summary = isVi
      ? `Bài đánh giá chẩn đoán hoàn tất qua 4 phần thi tuần tự với ${totalCount} câu hỏi (${plan.targetDurationMinutes} phút tiêu chuẩn). Điểm tổng hợp trọng số đạt ${weightedScore}% (Ngữ pháp: ${sectionScores.grammar.percentage}%, Từ vựng: ${sectionScores.vocabulary.percentage}%, Đọc hiểu: ${sectionScores.reading.percentage}%, Viết: ${sectionScores.writing.percentage}%). Năng lực tổng thể định vị ở mức ${overallCEFR} (độ tin cậy: ${overallConfidence}).`
      : `Diagnostic assessment completed across all 4 sequential sections with ${totalCount} items (${plan.targetDurationMinutes}-min calibrated standard). Overall weighted performance is ${weightedScore}% (Grammar: ${sectionScores.grammar.percentage}%, Vocab: ${sectionScores.vocabulary.percentage}%, Reading: ${sectionScores.reading.percentage}%, Writing: ${sectionScores.writing.percentage}%). Overall CEFR estimated at ${overallCEFR} (${overallConfidence} confidence).`;

    return {
      id: `report-${Date.now()}`,
      sessionId: session.sessionId,
      mode: session.mode,
      targetDurationMinutes: plan.targetDurationMinutes,
      completedAt: new Date().toISOString(),
      overallScorePercentage: weightedScore,
      overallCEFR,
      overallConfidence,
      overallSummary: summary,
      scoringWeights,
      sectionScores,
      skillEstimates,
      demonstratedStrengths: Array.from(new Set(allStrengths)).slice(0, 4),
      priorityWeaknesses: Array.from(new Set(allWeaknesses)).slice(0, 4),
      recurringErrors: Array.from(new Set(allErrors)).slice(0, 3),
      totalQuestionsAnswered: totalCount,
      accuracyRate: Number((weightedScore / 100).toFixed(2))
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
    recentErrors: string[]
  ): Promise<LessonPlan> {
    const rawDuration = profile.daily_minutes || 20;
    const duration: 10 | 20 | 30 = rawDuration <= 12 ? 10 : rawDuration >= 25 ? 30 : 20;
    const generalRatio = profile.general_vs_work_ratio || 65;
    const workRatio = 100 - generalRatio;
    const isVi = profile.explanation_language === 'vi';

    const paceMode: 'quick_10' | 'standard_20' | 'deep_30' =
      duration === 10 ? 'quick_10' : duration === 30 ? 'deep_30' : 'standard_20';
    const totalPlannedQuestions = duration === 10 ? 4 : duration === 30 ? 12 : 7;

    const cacheKey = contentCache.makeKey('lesson_plan', {
      level: profile.current_level,
      targetLevel: profile.target_level,
      duration,
      goal: profile.primary_goal,
      lang: profile.explanation_language
    });
    const cachedPlan = contentCache.get<LessonPlan>(cacheKey);
    if (cachedPlan) {
      return {
        ...cachedPlan,
        lesson_id: `lesson-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        status: 'in_progress',
        sections: cachedPlan.sections.map(s => ({ ...s, completed_questions_count: 0, completed: false }))
      };
    }

    const systemPrompt = `You are an expert, patient English tutor designing a structured daily lesson session.
The learner's current level is ${profile.current_level}, aiming for ${profile.target_level}.
Goal: ${profile.goal_summary}.
Explanation language: ${isVi ? 'Vietnamese' : 'English'}.
Balance: ${generalRatio}% general English, ${workRatio}% workplace/technical English.

SELECTED DAILY STUDY TIME: ${duration} minutes per day (${paceMode}).
TARGET QUESTIONS PLANNED: exactly ${totalPlannedQuestions} questions total across activities.

CRITICAL DURATION INSTRUCTIONS:
- 10 minutes (Quick Practice): Create 3 focused activities totaling 10 minutes and 4 questions (1 Warm-up, 2 Core Concept drills, 1 Exit check).
- 20 minutes (Standard Practice): Create 4 balanced activities totaling 20 minutes and 7 questions (1 Warm-up, 2 Grammar in context, 2 Vocabulary & collocations, 2 Reading/writing application).
- 30 minutes (Deep Practice): Create 5 comprehensive activities totaling 30 minutes and 12 questions (2 Error clinic/warm-up, 3 In-depth grammar & nuances, 3 Professional vocabulary & collocations, 2 Contextual reading & inference, 2 Authentic workplace production & exit check).

Recent error patterns to address: ${JSON.stringify(recentErrors.slice(0, 3))}.
Known skills needing practice: ${JSON.stringify(skillStates.filter(s => s.status !== 'mastered').map(s => s.skill_name).slice(0, 3))}.

Output strictly JSON:
{
  "primary_objective": string (1 clear objective tailored to today's duration),
  "reason_for_selection": string (pedagogical reason in ${isVi ? 'Vietnamese' : 'English'}),
  "sections": [
    {
      "section": "grammar" | "vocabulary" | "reading" | "writing",
      "activity_type": "warmup_review" | "concept_practice" | "vocab_acquisition" | "reading_analysis" | "writing_production" | "exit_synthesis",
      "title": string,
      "description": string,
      "estimated_minutes": number,
      "target_questions_count": number,
      "skill_target": string
    }
  ]
}`;

    const prompt = `Create a customized daily English lesson plan for ${duration} minutes (${paceMode}) targeting ${totalPlannedQuestions} total questions.`;
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

    if (aiResult && aiResult.sections && aiResult.sections.length > 0) {
      let allocatedQuestions = 0;
      const parsedSections = aiResult.sections.map((s, idx) => {
        const count = s.target_questions_count || (duration === 10 ? (idx === 1 ? 2 : 1) : duration === 30 ? (idx <= 2 ? 3 : 2) : (idx === 0 ? 1 : 2));
        allocatedQuestions += count;
        return {
          section: s.section,
          title: s.title,
          description: s.description,
          estimated_minutes: s.estimated_minutes,
          skill_target: s.skill_target,
          activity_type: s.activity_type || (s.section === 'vocabulary' ? 'vocab_acquisition' : s.section === 'reading' ? 'reading_analysis' : s.section === 'writing' ? 'writing_production' : idx === 0 ? 'warmup_review' : 'concept_practice'),
          target_questions_count: count,
          completed_questions_count: 0,
          completed: false
        };
      });

      const plan: LessonPlan = {
        lesson_id: `lesson-${Date.now()}`,
        lesson_number: 1,
        date: new Date().toISOString().split('T')[0],
        primary_objective: aiResult.primary_objective,
        reason_for_selection: aiResult.reason_for_selection,
        estimated_duration_minutes: duration,
        session_pace_mode: paceMode,
        total_planned_questions: allocatedQuestions > 0 ? allocatedQuestions : totalPlannedQuestions,
        sections: parsedSections,
        status: 'in_progress'
      };
      contentCache.set(cacheKey, plan, 86400);
      return plan;
    }

    // High quality deterministic fallback calibrated to 10, 20, or 30 minutes
    if (duration === 10) {
      return {
        lesson_id: `lesson-${Date.now()}`,
        lesson_number: 1,
        date: new Date().toISOString().split('T')[0],
        primary_objective: isVi
          ? 'Luyện nhanh 10 phút: Làm chủ Past Perfect trong báo cáo tiến độ và kiểm tra phản xạ'
          : '10-Minute Quick Practice: Fast Retrieval of Past Perfect and Clear Status Update',
        reason_for_selection: isVi
          ? 'Phiên học 10 phút tập trung vào 1 mục tiêu ngữ pháp then chốt kèm 4 câu hỏi luyện tập và kiểm tra thoát bài nhanh.'
          : 'Condensed 10-minute session targeting high-yield past perfect accuracy with immediate exit check.',
        estimated_duration_minutes: 10,
        session_pace_mode: 'quick_10',
        total_planned_questions: 4,
        sections: [
          {
            section: 'grammar',
            activity_type: 'warmup_review',
            title: isVi ? 'Phần 1 — Khởi động & Ôn tập nhanh' : 'Part 1 — Warm-up & Retrieval Check',
            description: isVi ? 'Kích hoạt trí nhớ về mốc thời gian "By the time" trong quá khứ.' : 'Quick check on past temporal anchors.',
            estimated_minutes: 2,
            target_questions_count: 1,
            completed_questions_count: 0,
            skill_target: 'Past Simple vs. Past Perfect',
            completed: false
          },
          {
            section: 'grammar',
            activity_type: 'concept_practice',
            title: isVi ? 'Phần 2 — Quy tắc cốt lõi & Luyện tập' : 'Part 2 — Core Concept & Focused Practice',
            description: isVi ? '2 câu hỏi thực hành liên tiếp về phối hợp thì quá khứ hoàn thành.' : '2 consecutive practice drills on narrative tense coordination.',
            estimated_minutes: 5,
            target_questions_count: 2,
            completed_questions_count: 0,
            skill_target: 'Past Perfect in Incident Explanations',
            completed: false
          },
          {
            section: 'writing',
            activity_type: 'exit_synthesis',
            title: isVi ? 'Phần 3 — Thoát bài & Phản xạ ứng dụng' : 'Part 3 — Exit Check & Quick Application',
            description: isVi ? '1 câu hỏi viết ngắn 2 câu cập nhật tiến độ công việc.' : '1 prompt applying past narrative to a realistic workplace update.',
            estimated_minutes: 3,
            target_questions_count: 1,
            completed_questions_count: 0,
            skill_target: 'Clear Workplace Status Updates',
            completed: false
          }
        ],
        status: 'in_progress'
      };
    } else if (duration === 30) {
      return {
        lesson_id: `lesson-${Date.now()}`,
        lesson_number: 1,
        date: new Date().toISOString().split('T')[0],
        primary_objective: isVi
          ? 'Học sâu 30 phút: Thành thạo toàn diện Ngữ pháp giả định, Collocations kỹ thuật và Giao tiếp viết chuyên nghiệp'
          : '30-Minute Deep Practice: Comprehensive Mastery of Conditionals, Collocations, and Asynchronous Technical Writing',
        reason_for_selection: isVi
          ? 'Phiên học sâu 30 phút với 5 hoạt động kết nối và 12 câu hỏi thực hành đa dạng, đi sâu từ sửa lỗi sai cũ đến đọc hiểu phân tích và viết chuyên nghiệp.'
          : 'Extensive 30-minute deep practice covering error clinic, multi-round grammar transformation, active collocations, reading analysis, and authentic written production.',
        estimated_duration_minutes: 30,
        session_pace_mode: 'deep_30',
        total_planned_questions: 12,
        sections: [
          {
            section: 'grammar',
            activity_type: 'warmup_review',
            title: isVi ? 'Phần 1 — Khắc phục lỗi sai cũ & Khởi động' : 'Part 1 — Mistake Clinic & Warm-up',
            description: isVi ? '2 câu hỏi rà soát các điểm dễ nhầm lẫn (thì động từ và câu điều kiện).' : '2 targeted questions addressing recurring past slips.',
            estimated_minutes: 4,
            target_questions_count: 2,
            completed_questions_count: 0,
            skill_target: 'Third & Mixed Conditionals in Narrative',
            completed: false
          },
          {
            section: 'grammar',
            activity_type: 'concept_practice',
            title: isVi ? 'Phần 2 — Ngữ pháp chuyên sâu & Biến đổi câu' : 'Part 2 — In-Depth Grammar Analysis & Transformation',
            description: isVi ? '3 câu hỏi qua nhiều định dạng (trắc nghiệm, điền khuyết, câu chẻ nhấn mạnh).' : '3 multi-format questions testing precision and nuanced transformations.',
            estimated_minutes: 7,
            target_questions_count: 3,
            completed_questions_count: 0,
            skill_target: 'Passive Voice in Technical Reports & Cleft Emphasis',
            completed: false
          },
          {
            section: 'vocabulary',
            activity_type: 'vocab_acquisition',
            title: isVi ? 'Phần 3 — Từ vựng cốt lõi & Collocations tự nhiên' : 'Part 3 — Professional Vocabulary & Collocations',
            description: isVi ? '3 câu hỏi: Thẻ từ vựng IPA chi tiết (mitigate, streamline, leverage) kèm ngữ cảnh tương phản.' : '3 items with IPA cards, natural collocations, and contextual comparison.',
            estimated_minutes: 7,
            target_questions_count: 3,
            completed_questions_count: 0,
            skill_target: 'Collocations with Mitigate, Streamline & Leverage',
            completed: false
          },
          {
            section: 'reading',
            activity_type: 'reading_analysis',
            title: isVi ? 'Phần 4 — Đọc hiểu tình huống & Phân tích suy luận' : 'Part 4 — In-Depth Reading & Critical Inference',
            description: isVi ? 'Đoạn văn 130 từ về văn hoá code review và giao tiếp bất đồng bộ + 2 câu hỏi suy luận.' : 'Authentic 130-word scenario passage with 2 analytical inference questions.',
            estimated_minutes: 6,
            target_questions_count: 2,
            completed_questions_count: 0,
            skill_target: 'Technical Strategy Reading & Empathy in Code Review',
            completed: false
          },
          {
            section: 'writing',
            activity_type: 'writing_production',
            title: isVi ? 'Phần 5 — Viết thực chiến & Tổng hợp thoát bài' : 'Part 5 — Authentic Workplace Production & Synthesis',
            description: isVi ? '2 bài tập viết thực tế (cập nhật tiến độ blocker & thông báo hoãn tiến độ với khách hàng).' : '2 writing tasks with native rubric feedback and error tags.',
            estimated_minutes: 6,
            target_questions_count: 2,
            completed_questions_count: 0,
            skill_target: 'Clear Workplace Status Updates & Client Notifications',
            completed: false
          }
        ],
        status: 'in_progress'
      };
    }

    // Default 20-minute standard practice
    return {
      lesson_id: `lesson-${Date.now()}`,
      lesson_number: 1,
      date: new Date().toISOString().split('T')[0],
      primary_objective: isVi
        ? 'Tiêu chuẩn 20 phút: Củng cố thì quá khứ hoàn thành, Collocations hành động và Đọc hiểu chiến lược kỹ thuật'
        : '20-Minute Standard Practice: Narrative Tense Precision, High-Impact Collocations, and Workplace Application',
      reason_for_selection: isVi
        ? 'Phiên học tiêu chuẩn 20 phút với 4 hoạt động cân bằng và 7 câu hỏi trải đều qua ngữ pháp, từ vựng, đọc hiểu và viết.'
        : 'Balanced 20-minute practice delivering 7 questions across grammar, vocabulary, reading, and workplace writing.',
      estimated_duration_minutes: 20,
      session_pace_mode: 'standard_20',
      total_planned_questions: 7,
      sections: [
        {
          section: 'grammar',
          activity_type: 'warmup_review',
          title: isVi ? 'Phần 1 — Khởi động & Ôn tập củng cố' : 'Part 1 — Warm-up & Pattern Review',
          description: isVi ? '1 câu hỏi khởi động nhanh về mốc thời gian "By the time".' : '1 warm-up retrieval question on narrative time anchors.',
          estimated_minutes: 3,
          target_questions_count: 1,
          completed_questions_count: 0,
          skill_target: 'Past Simple vs. Past Perfect',
          completed: false
        },
        {
          section: 'grammar',
          activity_type: 'concept_practice',
          title: isVi ? 'Phần 2 — Ngữ pháp theo ngữ cảnh' : 'Part 2 — Grammar in Context',
          description: isVi ? '2 câu hỏi luyện tập sâu thì quá khứ hoàn thành và câu điều kiện trong báo cáo.' : '2 contextual grammar questions on incident reports and conditionals.',
          estimated_minutes: 6,
          target_questions_count: 2,
          completed_questions_count: 0,
          skill_target: 'Third & Mixed Conditionals & Passive Voice',
          completed: false
        },
        {
          section: 'vocabulary',
          activity_type: 'vocab_acquisition',
          title: isVi ? 'Phần 3 — Từ vựng & Collocations' : 'Part 3 — Active Vocabulary & Collocations',
          description: isVi ? '2 câu hỏi từ vựng kèm phát âm IPA, trọng âm và collocations với "mitigate" & "streamline".' : '2 questions with full IPA cards and collocation drills.',
          estimated_minutes: 5,
          target_questions_count: 2,
          completed_questions_count: 0,
          skill_target: 'Collocations with Mitigate & Streamline',
          completed: false
        },
        {
          section: 'reading',
          activity_type: 'reading_analysis',
          title: isVi ? 'Phần 4 — Đọc hiểu & Diễn đạt công việc' : 'Part 4 — Contextual Reading & Workplace Expression',
          description: isVi ? '2 câu hỏi: 1 bài đọc ngắn 128 từ về technical debt + 1 bài viết cập nhật tiến độ công việc.' : '2 questions: 1 passage comprehension check and 1 workplace written update.',
          estimated_minutes: 6,
          target_questions_count: 2,
          completed_questions_count: 0,
          skill_target: 'Tech Strategy Reading & Clear Status Updates',
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
      const candidates = unserved.length > 0 ? unserved : matching;
      
      // If index > 0, try to pick fill_in_blank or alternate format if available
      let selected = candidates[0];
      if (questionIndex > 0) {
        const altFormat = candidates.find(c => c.question.question_type !== 'multiple_choice');
        selected = altFormat || candidates[Math.floor(Math.random() * candidates.length)];
      } else {
        selected = candidates[Math.floor(Math.random() * candidates.length)];
      }

      this.servedQuestionHistory.push(selected.id);
      if (this.servedQuestionHistory.length > 15) {
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
    const isWriting = question.question_type === 'free_writing' || question.section === 'writing';
    const systemPrompt = `You are an empathetic, precise English tutor evaluating a learner's answer.
Current learner level: ${profile.current_level}.
Language for explanations: ${lang}.
Question details:
- Section: ${question.section}
- Question type: ${question.question_type}
- Prompt: "${question.prompt}"
- Expected answer / intent: "${question.expected_answer_text || (question.options?.find(o => question.expected_answer_ids?.includes(o.id))?.text) || ''}"
- Underlying rule: "${question.explanation_rule}"

${isWriting ? `
CRITICAL INSTRUCTIONS FOR WRITING EVALUATION:
1. "corrected_text" (NATURAL NATIVE PHRASING): You MUST provide a polished, idiomatic, native-level rewrite of the learner's actual text. DO NOT return their raw text unchanged! Show how an articulate native professional would phrase the exact same message while preserving the learner's personal voice, tone, and intended message.
2. "key_corrections": Detail 2 to 4 specific adjustments made between the learner's text and the polished version (e.g. vocabulary elevation, preposition correction, tense consistency, punctuation).
   Format: [ { "original": "<awkward phrase in draft>", "corrected": "<native phrasing>", "reason": "<clear explanation in ${lang}>" } ]
3. "useful_phrases": Dynamically generate 2 to 3 high-value, professional phrases or collocations specifically relevant to this passage topic that the learner can reuse:
   Format: [ { "phrase": string, "meaning": string in ${lang}, "how_to_use": string in ${lang} } ]
4. "reusable_pattern": A flexible template formula derived from their specific passage context that they can reuse.
` : ''}

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
  "useful_phrases": [
    { "phrase": string, "meaning": string, "how_to_use": string }
  ],
  "reusable_pattern": string,
  "error_tags": [string],
  "needs_retry": boolean,
  "next_action": "continue" | "retry" | "transfer"
}`;

    const prompt = `Learner answer: "${userAnswer}"`;
    const aiResult = await this.callGeminiJson<AnswerEvaluation>(prompt, systemPrompt);

    if (aiResult && aiResult.verdict) {
      if (isWriting) {
        // Guard against AI laziness returning the raw input as corrected_text
        if (!aiResult.corrected_text || aiResult.corrected_text.trim() === trimmed) {
          const fallback = this.polishWritingText(trimmed, question.prompt, profile);
          aiResult.corrected_text = fallback.polishedText;
          if (!aiResult.key_corrections || aiResult.key_corrections.length === 0) {
            aiResult.key_corrections = fallback.keyCorrections;
          }
          if (!aiResult.useful_phrases || aiResult.useful_phrases.length === 0) {
            aiResult.useful_phrases = fallback.usefulPhrases;
          }
          if (!aiResult.reusable_pattern) {
            aiResult.reusable_pattern = fallback.reusablePattern;
          }
        } else if (!aiResult.useful_phrases || aiResult.useful_phrases.length === 0) {
          const fallback = this.polishWritingText(trimmed, question.prompt, profile);
          aiResult.useful_phrases = fallback.usefulPhrases;
          if (!aiResult.reusable_pattern) {
            aiResult.reusable_pattern = fallback.reusablePattern;
          }
        }
      }

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
      const isSufficientLength = trimmed.length >= 30 && sentenceCount >= 2;
      const polished = this.polishWritingText(trimmed, question.prompt, profile);

      return {
        verdict: isSufficientLength ? 'correct' : 'partially_correct',
        user_answer: userAnswer,
        expected_answer: 'Original coherent response meeting prompt requirements.',
        full_correct_sentence: polished.polishedText,
        decisive_clue: profile.explanation_language === 'vi'
          ? 'Bài viết truyền tải rõ thông điệp. Đã đối chiếu và nâng cấp nhịp điệu tự nhiên như người bản xứ.'
          : 'Clear communicative intent. Elevated for idiomatic native rhythm and natural vocabulary.',
        explanation: profile.explanation_language === 'vi'
          ? `Giao tiếp rõ ràng và mạch lạc! Bạn đã nêu được bối cảnh sự việc và kế hoạch tiếp theo. Hãy tham khảo phiên bản diễn đạt bản xứ tự nhiên bên dưới.`
          : 'Clear and effective communication! Context and next steps are well conveyed. Review the polished native phrasing below.',
        corrected_text: polished.polishedText,
        key_corrections: polished.keyCorrections,
        useful_phrases: polished.usefulPhrases,
        reusable_pattern: polished.reusablePattern,
        error_tags: !isSufficientLength ? ['Length & sentence variety'] : [],
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

  /**
   * Intelligently polishes learner writing when AI is offline or returns raw text.
   * Produces an elevated native rewrite, extracts concrete key corrections,
   * generates dynamic topic-relevant useful phrases, and builds a customized reusable pattern.
   */
  public polishWritingText(
    rawText: string,
    prompt: string,
    profile: UserProfile
  ): {
    polishedText: string;
    keyCorrections: Array<{ original: string; corrected: string; reason: string }>;
    usefulPhrases: Array<{ phrase: string; meaning: string; how_to_use: string }>;
    reusablePattern: string;
  } {
    const isVi = profile.explanation_language === 'vi';
    const trimmed = rawText.trim();
    const lower = trimmed.toLowerCase();
    const promptLower = prompt.toLowerCase();

    const corrections: Array<{ original: string; corrected: string; reason: string }> = [];
    let polished = trimmed;

    // 1. Identify specific slips and perform stylistic elevations
    const replacements: Array<{ regex: RegExp; replacement: string; originalMatch: string; reasonVi: string; reasonEn: string }> = [
      {
        regex: /\bi have complete\b/gi,
        replacement: 'I have completed',
        originalMatch: 'have complete',
        reasonVi: 'Sau "have" trong thì hiện tại hoàn thành, cần dùng phân từ hai "completed".',
        reasonEn: 'Present perfect requires past participle "completed".'
      },
      {
        regex: /\bi complete the task yesterday\b/gi,
        replacement: 'I completed the task yesterday',
        originalMatch: 'complete ... yesterday',
        reasonVi: 'Trạng từ quá khứ "yesterday" yêu cầu thì quá khứ đơn "completed".',
        reasonEn: 'Past time marker "yesterday" requires simple past "completed".'
      },
      {
        regex: /\bsend to (my |the )?(manager|client|team)\b/gi,
        replacement: 'sent to $1$2 for review',
        originalMatch: 'send to ...',
        reasonVi: 'Chuyển sang dạng quá khứ "sent" và bổ sung "for review" để câu văn tự nhiên, chuyên nghiệp.',
        reasonEn: 'Use past tense "sent" and qualify with "for review" for professional clarity.'
      },
      {
        regex: /\bwe discussed about\b/gi,
        replacement: 'we discussed',
        originalMatch: 'discussed about',
        reasonVi: '"Discuss" là ngoại động từ trực tiếp, không đi kèm giới từ "about".',
        reasonEn: '"Discuss" is transitive; do not use the preposition "about".'
      },
      {
        regex: /\bbecause of .* so\b/gi,
        replacement: 'because',
        originalMatch: 'because ... so',
        reasonVi: 'Tránh dùng cặp liên từ "because ... so" trong cùng một câu tiếng Anh.',
        reasonEn: 'Avoid pairing "because" with "so" in the same clause structure.'
      },
      {
        regex: /\bfix (the |this )?(bug|problem|issue)\b/gi,
        replacement: 'resolve the issue',
        originalMatch: 'fix bug/problem',
        reasonVi: '"Resolve the issue" là cách diễn đạt chuyên nghiệp và tự nhiên hơn trong giao tiếp công việc.',
        reasonEn: '"Resolve the issue" is more idiomatic and professional in workplace communication.'
      },
      {
        regex: /\btell (my |the )?manager\b/gi,
        replacement: 'brief my manager',
        originalMatch: 'tell manager',
        reasonVi: '"Brief my manager" thể hiện sự chủ động báo cáo ngắn gọn, chuẩn xác.',
        reasonEn: '"Brief my manager" denotes concise, professional communication.'
      },
      {
        regex: /\bmake it fast\b/gi,
        replacement: 'expedite the process',
        originalMatch: 'make it fast',
        reasonVi: '"Expedite the process" diễn đạt việc đẩy nhanh tiến độ một cách lịch sự, trang trọng.',
        reasonEn: '"Expedite the process" elevates informal phrasing.'
      },
      {
        regex: /\bi think we should\b/gi,
        replacement: 'I recommend that we',
        originalMatch: 'I think we should',
        reasonVi: '"I recommend that we" mang tính xây dựng và quyết đoán hơn trong văn bản công việc.',
        reasonEn: '"I recommend that we" sounds more confident and constructive.'
      }
    ];

    for (const rule of replacements) {
      if (rule.regex.test(polished)) {
        polished = polished.replace(rule.regex, rule.replacement);
        corrections.push({
          original: rule.originalMatch,
          corrected: rule.replacement,
          reason: isVi ? rule.reasonVi : rule.reasonEn
        });
      }
    }

    // If no direct rule matched, apply stylistic elevation so the rewrite is genuinely elevated
    if (corrections.length === 0) {
      if (lower.startsWith('i am ') || lower.startsWith("i'm ")) {
        polished = polished.replace(/\bi am \b/i, 'I am currently ').replace(/\bi'm \b/i, 'I am currently ');
        corrections.push({
          original: 'Present continuous opening',
          corrected: 'I am currently + present participle',
          reason: isVi
            ? 'Thêm trạng từ "currently" giúp câu cập nhật tiến độ có tính thời điểm rõ nét hơn.'
            : 'Adding "currently" clarifies ongoing status.'
        });
      } else {
        corrections.push({
          original: 'Sentence cadence',
          corrected: 'Polished idiomatic phrasing',
          reason: isVi
            ? 'Chuẩn hóa nhịp điệu và liên kết câu theo phong cách người bản xứ.'
            : 'Standardized phrasing to match native business English rhythm.'
        });
      }
    }

    // Capitalize and punctuate
    polished = polished.charAt(0).toUpperCase() + polished.slice(1);
    if (!/[.!?]$/.test(polished)) {
      polished += '.';
    }

    // 2. Dynamic Useful Phrases and Reusable Pattern based on context
    const isIncident = promptLower.includes('incident') || promptLower.includes('bug') || promptLower.includes('delay') || promptLower.includes('blocker') || lower.includes('bug') || lower.includes('error') || lower.includes('failed');
    const isClient = promptLower.includes('client') || promptLower.includes('customer') || promptLower.includes('stakeholder') || promptLower.includes('postpone') || lower.includes('client');
    const isMeeting = promptLower.includes('meeting') || promptLower.includes('discuss') || promptLower.includes('sync') || lower.includes('agenda');

    let usefulPhrases: Array<{ phrase: string; meaning: string; how_to_use: string }>;
    let reusablePattern: string;

    if (isIncident) {
      usefulPhrases = isVi ? [
        {
          phrase: 'mitigate further disruption',
          meaning: 'Giảm thiểu sự gián đoạn lan rộng',
          how_to_use: 'Dùng khi báo cáo sự cố kỹ thuật và giải thích biện pháp ngăn chặn tức thì.'
        },
        {
          phrase: 'conduct a root-cause analysis',
          meaning: 'Tiến hành phân tích nguyên nhân gốc rễ',
          how_to_use: 'Dùng khi cam kết tìm hiểu triệt để nguyên nhân sau khi sự cố được khắc phục.'
        },
        {
          phrase: 'provide a revised timeline',
          meaning: 'Đưa ra khung thời gian điều chỉnh rõ ràng',
          how_to_use: 'Thiết yếu khi công việc bị chậm tiến độ và cần đặt lại kỳ vọng với nhóm.'
        }
      ] : [
        {
          phrase: 'mitigate further disruption',
          meaning: 'Prevent an incident from causing broader downtime',
          how_to_use: 'Use in post-incident updates to reassure stakeholders.'
        },
        {
          phrase: 'conduct a root-cause analysis',
          meaning: 'Investigate the underlying source of failure',
          how_to_use: 'Promise this follow-up step after a hotfix is deployed.'
        },
        {
          phrase: 'provide a revised timeline',
          meaning: 'Supply an updated completion estimate',
          how_to_use: 'Crucial when communicating blockers and schedule adjustments.'
        }
      ];
      reusablePattern = 'Following an unexpected [incident/blocker], we immediately initiated [containment action] and anticipate [resolution] by [target timeline].';
    } else if (isClient) {
      usefulPhrases = isVi ? [
        {
          phrase: 'manage stakeholder expectations',
          meaning: 'Chủ động điều phối và quản lý kỳ vọng của đối tác',
          how_to_use: 'Dùng khi thông báo điều chỉnh phạm vi hoặc dời ngày bàn giao.'
        },
        {
          phrase: 'ensure seamless handover',
          meaning: 'Đảm bảo quá trình bàn giao diễn ra suôn sẻ',
          how_to_use: 'Dùng khi chuyển giao công việc, sản phẩm hoặc tài liệu cho đối tác.'
        },
        {
          phrase: 'keep you closely informed',
          meaning: 'Liên tục cập nhật tình hình cho bạn',
          how_to_use: 'Cách diễn đạt trang trọng thay cho câu "I will email you again".'
        }
      ] : [
        {
          phrase: 'manage stakeholder expectations',
          meaning: 'Set clear boundaries on deliverables and timeline',
          how_to_use: 'Use when renegotiating project deadlines or scope.'
        },
        {
          phrase: 'ensure seamless handover',
          meaning: 'Guarantee smooth transition of responsibility or assets',
          how_to_use: 'Highlight this during deliverable releases.'
        },
        {
          phrase: 'keep you closely informed',
          meaning: 'Provide consistent asynchronous updates',
          how_to_use: 'Polite client-facing closing for status emails.'
        }
      ];
      reusablePattern = 'We want to proactively inform you that [situation]; our team is currently [mitigation action] to ensure [desired outcome].';
    } else if (isMeeting) {
      usefulPhrases = isVi ? [
        {
          phrase: 'align on key priorities',
          meaning: 'Thống nhất các ưu tiên trọng tâm',
          how_to_use: 'Dùng để nêu mục đích chính của buổi họp hoặc email tóm tắt.'
        },
        {
          phrase: 'reach a shared consensus',
          meaning: 'Đạt được sự đồng thuận chung giữa các bên',
          how_to_use: 'Dùng khi các thành viên đã chốt được phương án sau khi thảo luận.'
        },
        {
          phrase: 'table this for the next sync',
          meaning: 'Tạm gác lại chủ đề này cho buổi thảo luận sau',
          how_to_use: 'Dùng khi hết giờ hoặc cần thêm dữ liệu trước khi đưa ra quyết định.'
        }
      ] : [
        {
          phrase: 'align on key priorities',
          meaning: 'Ensure all parties share the same primary objectives',
          how_to_use: 'Use to establish the objective of meetings or recap notes.'
        },
        {
          phrase: 'reach a shared consensus',
          meaning: 'Arrive at mutual agreement across the group',
          how_to_use: 'Use in meeting summaries when decisions are finalized.'
        },
        {
          phrase: 'table this for the next sync',
          meaning: 'Postpone a discussion item until a later session',
          how_to_use: 'Professional way to avoid derailing meeting agendas.'
        }
      ];
      reusablePattern = 'During our sync, we aligned on [core goal] and agreed to [next action item] ahead of [upcoming deadline].';
    } else {
      usefulPhrases = isVi ? [
        {
          phrase: 'on track for delivery',
          meaning: 'Đúng tiến độ để bàn giao sản phẩm',
          how_to_use: 'Dùng trong standup hoặc cập nhật Slack để khẳng định tiến độ ổn định.'
        },
        {
          phrase: 'streamline the workflow',
          meaning: 'Tối ưu hóa và tinh gọn quy trình làm việc',
          how_to_use: 'Dùng khi đề cập đến việc cải tiến công cụ hoặc giảm thiểu thao tác dư thừa.'
        },
        {
          phrase: 'circle back with findings',
          meaning: 'Phản hồi lại sau khi có kết quả điều tra hoặc thử nghiệm',
          how_to_use: 'Dùng cuối tin nhắn cập nhật để hẹn thời điểm báo cáo tiếp theo.'
        }
      ] : [
        {
          phrase: 'on track for delivery',
          meaning: 'Progressing according to scheduled expectations',
          how_to_use: 'Use in asynchronous updates to convey project health.'
        },
        {
          phrase: 'streamline the workflow',
          meaning: 'Simplify procedures and eliminate redundant overhead',
          how_to_use: 'Highlight when discussing process improvements.'
        },
        {
          phrase: 'circle back with findings',
          meaning: 'Follow up once investigation data is available',
          how_to_use: 'Professional closing for asynchronous updates.'
        }
      ];
      reusablePattern = 'I have finalized [completed item] and am now focusing on [in-progress task], which remains on track for [target time].';
    }

    return {
      polishedText: polished,
      keyCorrections: corrections,
      usefulPhrases,
      reusablePattern
    };
  }

  // =========================================================================
  // TUTOR DEEP-DIVE INQUIRY (INTERACTIVE CHAT UNDER EACH QUESTION RESPONSE)
  // =========================================================================
  public async deepDiveInquiry(
    question: Question,
    userAnswer: string,
    evaluation: AnswerEvaluation | undefined,
    message: string,
    history: Array<{ role: 'user' | 'tutor'; content: string }>,
    profile: UserProfile
  ): Promise<DeepDiveInquiryResponse> {
    const lang = profile.explanation_language === 'vi' ? 'Vietnamese' : 'English';

    const systemPrompt = `You are an expert, encouraging, pedagogically skilled English tutor.
The learner has completed an exercise and is asking follow-up questions to dig deeper into the concept instead of moving on immediately.

CONTEXT OF THE EXERCISE:
- Section: ${question.section} (e.g., vocabulary, grammar, reading, writing)
- Target Skill: ${question.skill_name}
- Question Prompt: "${question.prompt}"
- Correct / Target Answer: "${evaluation?.expected_answer || question.expected_answer_text || ''}"
- Learner's Submitted Answer: "${userAnswer || '(none)'}"
- Evaluation Verdict: "${evaluation?.verdict || 'evaluated'}"
- Decisive Clue / Rule: "${evaluation?.decisive_clue || question.explanation_rule || ''}"
${question.vocab_card ? `- Vocabulary Item: "${question.vocab_card.word}" (${question.vocab_card.part_of_speech}), IPA: "${question.vocab_card.ipa}", Collocation: "${question.vocab_card.collocation_pattern}"` : ''}

LEARNER PROFILE:
- Level: ${profile.current_level}
- Target: ${profile.target_level}
- Primary Goal: ${profile.primary_goal}
- Explanation Language: ${lang}

INSTRUCTIONS FOR TUTOR RESPONSE:
1. Answer the learner's question directly, clearly, and insightfully in ${lang}:
   - If the learner asks about VOCABULARY or "SIMILAR WORDS / SYNONYMS":
     * Clarify the exact shades of meaning, register (formal vs. casual vs. technical), and nuances.
     * Explain WHEN and WHY to use each word with concrete workplace and everyday situations.
     * Fill the "similar_words_comparison" table with the words compared.
   - If the learner asks about GRAMMAR:
     * Explain the structural reason behind the rule with an intuitive memory trick.
     * Contrast the right way with common intuitive errors.
     * Provide 2-3 clear example sentences showing how to use it in different contexts.
   - If the learner asks about WRITING:
     * Explain how sentence variety, natural collocations, and signposting improve flow.
     * Show contrasting "Standard" vs. "Polished Native" variations.
2. Structure your reply in clear Markdown with formatting (bold keywords, bullet points, clean paragraphs).
3. Provide 2 to 3 natural example sentences in "examples" field.
4. Suggest 2 to 3 concise, intriguing follow-up prompts in "suggestedFollowUps" that the learner might want to explore next.

OUTPUT JSON SCHEMA:
{
  "reply": string (markdown explanation in ${lang}),
  "suggestedFollowUps": [string],
  "examples": [string],
  "similar_words_comparison": [
    {
      "word": string,
      "nuance": string,
      "when_to_use": string,
      "example": string
    }
  ]
}`;

    const conversationContext = history && history.length > 0
      ? `Prior chat turns about this exercise:\n` + history.map(h => `${h.role === 'user' ? 'Learner' : 'Tutor'}: ${h.content}`).join('\n') + `\n\n`
      : '';

    const prompt = `${conversationContext}Learner's current question: "${message}"`;

    const aiResult = await this.callGeminiJson<DeepDiveInquiryResponse>(prompt, systemPrompt, {
      userId: profile.id,
      operation: 'tutor_deep_dive'
    });

    if (aiResult && aiResult.reply) {
      return aiResult;
    }

    // Dynamic local fallback
    return this.fallbackDeepDive(question, userAnswer, evaluation, message, profile);
  }

  private fallbackDeepDive(
    question: Question,
    userAnswer: string,
    evaluation: AnswerEvaluation | undefined,
    message: string,
    profile: UserProfile
  ): DeepDiveInquiryResponse {
    const isVi = profile.explanation_language === 'vi';
    const msgLower = message.toLowerCase();
    const section = question.section;
    const targetWord = question.vocab_card?.word || (question.options?.find(o => question.expected_answer_ids?.includes(o.id))?.text) || question.expected_answer_text || 'target term';

    // 1. User is asking about SIMILAR WORDS / SYNONYMS / WHEN TO USE WHICH
    if (
      msgLower.includes('similar') ||
      msgLower.includes('synonym') ||
      msgLower.includes('khác nhau') ||
      msgLower.includes('đồng nghĩa') ||
      msgLower.includes('when to use') ||
      msgLower.includes('khi nào') ||
      msgLower.includes('phân biệt') ||
      section === 'vocabulary'
    ) {
      if (targetWord.toLowerCase().includes('mitigate')) {
        return {
          reply: isVi
            ? `### So sánh từ đồng nghĩa: **mitigate** vs **prevent** vs **alleviate**\n\n` +
              `Trong công việc và kỹ thuật, các từ này đều mang nghĩa giảm nhẹ hoặc ngăn chặn, nhưng có sắc thái rất khác biệt:\n\n` +
              `1. **Mitigate (Giảm thiểu tác động / Rủi ro):**\n` +
              `   - *Khi nào dùng:* Dùng khi điều không mong muốn **đã hoặc chắc chắn sẽ xảy ra**, và mục tiêu của bạn là làm giảm mức độ nghiêm trọng hoặc thiệt hại của nó.\n` +
              `   - *Collocations vàng:* *mitigate risk*, *mitigate technical debt*, *mitigate downtime*.\n` +
              `   - *Ví dụ:* *"We implemented redundancy to **mitigate** potential server outages."*\n\n` +
              `2. **Prevent (Ngăn chặn hoàn toàn):**\n` +
              `   - *Khi nào dùng:* Dùng khi bạn ngăn điều xấu **không xảy ra ngay từ đầu** (ngăn chặn triệt để).\n` +
              `   - *Collocations:* *prevent errors*, *prevent security breaches*.\n` +
              `   - *Ví dụ:* *"Rigorous unit tests **prevent** bugs from reaching production."*\n\n` +
              `3. **Alleviate (Làm vơi bớt / Xoa dịu gánh nặng):**\n` +
              `   - *Khi nào dùng:* Dùng khi giảm bớt cảm giác gánh nặng, áp lực, đau đớn hoặc khối lượng công việc quá tải.\n` +
              `   - *Collocations:* *alleviate pressure*, *alleviate workload*.\n` +
              `   - *Ví dụ:* *"Hiring two contractors helped **alleviate** the sprint pressure on our core team."*`
            : `### Synonym Breakdown: **mitigate** vs **prevent** vs **alleviate**\n\n` +
              `These words often confuse learners, but native professionals differentiate them sharply:\n\n` +
              `1. **Mitigate (Reduce Severity / Harm):**\n` +
              `   - *When to use:* The undesirable condition exists or is inevitable; your goal is to reduce its damaging impact.\n` +
              `   - *Collocations:* *mitigate risk*, *mitigate impact*, *mitigate technical debt*.\n` +
              `   - *Example:* *"Automated backups **mitigate** the impact of database corruption."*\n\n` +
              `2. **Prevent (Stop from Happening in the First Place):**\n` +
              `   - *When to use:* Stopping the problem from occurring at all.\n` +
              `   - *Example:* *"Two-factor authentication **prevents** unauthorized account access."*\n\n` +
              `3. **Alleviate (Relieve Burden or Pressure):**\n` +
              `   - *When to use:* Lightening mental/physical stress, backlog, or heavy workloads.\n` +
              `   - *Example:* *"Refactoring this legacy service **alleviated** daily system strain."*`,
          suggestedFollowUps: isVi
            ? ['Có thể cho mình thêm 3 ví dụ thực tế trong công ty công nghệ?', 'Từ "reduce" có thay thế hoàn toàn cho "mitigate" được không?', 'Những lỗi sai phổ biến khi dùng "mitigate"?']
            : ['Can you give me 3 more tech workplace examples?', 'Can "reduce" replace "mitigate" directly?', 'What common preposition follows mitigate?'],
          examples: [
            'We introduced caching to mitigate load spikes during peak traffic hours.',
            'Automated code linters prevent trivial formatting errors before peer review.',
            'Adding load balancers alleviated pressure on our primary application servers.'
          ],
          similar_words_comparison: [
            {
              word: 'mitigate',
              nuance: isVi ? 'Giảm mức độ nghiêm trọng hoặc thiệt hại của rủi ro' : 'Reduces the severity or damage of an inevitable risk',
              when_to_use: isVi ? 'Rủi ro công việc, nợ kỹ thuật, sự cố downtime' : 'Risks, disasters, delays, technical debt',
              example: 'We must mitigate the impact of the latency spike.'
            },
            {
              word: 'prevent',
              nuance: isVi ? 'Ngăn chặn triệt để, không cho sự việc xảy ra từ đầu' : 'Stops an event from occurring in the first place',
              when_to_use: isVi ? 'Lỗi bảo mật, tai nạn, vi phạm chính sách' : 'Security vulnerabilities, failures, accidents',
              example: 'Code reviews prevent flawed logic from merging.'
            },
            {
              word: 'alleviate',
              nuance: isVi ? 'Làm vơi bớt áp lực, gánh nặng hoặc sự căng thẳng' : 'Relieves pain, burden, workload, or strain',
              when_to_use: isVi ? 'Khối lượng công việc quá tải, áp lực deadline' : 'Heavy workloads, systemic bottlenecks, strain',
              example: 'The new CI pipeline alleviated deployment bottlenecks.'
            }
          ]
        };
      } else if (targetWord.toLowerCase().includes('streamline')) {
        return {
          reply: isVi
            ? `### So sánh từ đồng nghĩa: **streamline** vs **optimize** vs **simplify**\n\n` +
              `1. **Streamline (Tinh gọn quy trình):**\n` +
              `   - *Khi nào dùng:* Cắt bỏ các bước rườm rà, thủ tục dư thừa để quy trình chạy mượt mà và nhanh hơn.\n` +
              `   - *Ví dụ:* *"We **streamlined** our onboarding workflow from 5 days to 2 hours."*\n\n` +
              `2. **Optimize (Tối ưu hóa hiệu năng):**\n` +
              `   - *Khi nào dùng:* Nâng cao hiệu suất tối đa (thường dùng trong kỹ thuật, thuật toán, ngân sách).\n` +
              `   - *Ví dụ:* *"The database index was updated to **optimize** query execution speed."*\n\n` +
              `3. **Simplify (Đơn giản hóa):**\n` +
              `   - *Khi nào dùng:* Làm cho điều gì đó bớt phức tạp, dễ hiểu hơn với người dùng hoặc người mới.\n` +
              `   - *Ví dụ:* *"Let's **simplify** the UI so first-time users can navigate easily."*`
            : `### Synonym Breakdown: **streamline** vs **optimize** vs **simplify**\n\n` +
              `1. **Streamline (Eliminate Friction & Redundancy):**\n` +
              `   - Focuses on process flow and removing unnecessary intermediate steps.\n\n` +
              `2. **Optimize (Maximize Efficiency / Resource Utilization):**\n` +
              `   - Focuses on tuning algorithms, speed, throughput, and performance.\n\n` +
              `3. **Simplify (Make Understandable or Less Complex):**\n` +
              `   - Focuses on user comprehensibility and reducing cognitive load.`,
          suggestedFollowUps: isVi
            ? ['Cho mình 3 mẫu câu với "streamline" khi viết báo cáo', 'Collocations phổ biến nhất đi với "streamline"?']
            : ['Give me 3 report sentences with streamline', 'What collocations go with streamline?'],
          examples: [
            'Our engineering team streamlined the deployment pipeline.',
            'We simplified the onboarding checklist to help new hires ramp up faster.'
          ],
          similar_words_comparison: [
            {
              word: 'streamline',
              nuance: isVi ? 'Cắt bỏ bước dư thừa để vận hành trơn tru hơn' : 'Remove redundant steps to accelerate a process',
              when_to_use: isVi ? 'Quy trình xét duyệt, thủ tục, chuỗi công việc' : 'Processes, pipelines, bureaucratic workflows',
              example: 'We streamlined our pull request approval flow.'
            },
            {
              word: 'optimize',
              nuance: isVi ? 'Căn chỉnh đạt hiệu suất kỹ thuật cao nhất' : 'Make the best or most effective use of resources',
              when_to_use: isVi ? 'Tốc độ phần mềm, thuật toán, chi phí đám mây' : 'Algorithms, cloud spending, performance tuning',
              example: 'We optimized memory allocation in the backend.'
            }
          ]
        };
      }
    }

    // 2. User asks about GRAMMAR or WHY this tense/choice was picked
    if (section === 'grammar' || msgLower.includes('grammar') || msgLower.includes('ngữ pháp') || msgLower.includes('tense') || msgLower.includes('thì')) {
      return {
        reply: isVi
          ? `### Giải thích ngữ pháp chuyên sâu cho câu này:\n\n` +
            `**1. Điểm mấu chốt của quy tắc:**\n` +
            `${question.explanation_rule || 'Cấu trúc này thiết lập mối quan hệ thời gian rõ ràng giữa hai hành động trong quá khứ.'}\n\n` +
            `**2. Vì sao phương án đúng được lựa chọn:**\n` +
            `Khi câu có mốc thời gian hoặc hành động mốc (như *"By the time"* hoặc liên từ chỉ nguyên nhân), hành động xảy ra trước phải dùng dạng hoàn thành để báo hiệu cho người nghe rằng sự việc đã hoàn tất trước khi hành động thứ hai bắt đầu.\n\n` +
            `**3. Mẹo ghi nhớ thực chiến:**\n` +
            `• *Hành động xảy ra trước:* Dùng **Past Perfect (had + V3)**.\n` +
            `• *Hành động xảy ra sau:* Dùng **Past Simple (V2/ed)**.`
          : `### In-Depth Grammar Breakdown:\n\n` +
            `**1. The Decisive Rule:**\n` +
            `${question.explanation_rule || 'This construction anchors a sequence of actions along a past timeline.'}\n\n` +
            `**2. Why the Target Form is Mandatory:**\n` +
            `When temporal connectors (such as *"By the time"*) indicate that an event was completed before another milestone, simple past is insufficient—Past Perfect (had + past participle) is required to establish relative completion.\n\n` +
            `**3. Mental Hook:**\n` +
            `• Event 1 (earlier): **had + V3**\n` +
            `• Event 2 (later): **Past Simple (V-ed)**`,
        suggestedFollowUps: isVi
          ? ['Nếu dùng thì quá khứ đơn ở cả 2 vế thì có bị xem là sai không?', 'Có thể cho mình 3 ví dụ tương tự trong báo cáo công việc?', 'Quy tắc này áp dụng như thế nào với câu điều kiện hỗn hợp?']
          : ['Would using simple past in both clauses be strictly wrong?', 'Can you show 3 more workplace examples?', 'How does this connect to mixed conditionals?'],
        examples: [
          'By the time the client joined the video call, we had already resolved the audio glitch.',
          'The team had finished the security audit before the product officially launched.'
        ]
      };
    }

    // 3. User asks about WRITING / POLISHING
    if (section === 'writing' || msgLower.includes('writing') || msgLower.includes('viết') || msgLower.includes('cải thiện') || msgLower.includes('natural')) {
      return {
        reply: isVi
          ? `### Cách nâng tầm diễn đạt cho đoạn văn của bạn:\n\n` +
            `**1. Giữ nguyên ý chính nhưng thay thế từ vựng thông dụng:**\n` +
            `Thay vì dùng các động từ đơn giản như *"do"*, *"make"*, *"send"*, người bản xứ trong môi trường chuyên nghiệp thường dùng các cụm kết hợp tự nhiên (collocations) như *"conduct verification"*, *"streamline communication"*, *"brief the team"*.\n\n` +
            `**2. Sử dụng liên từ chỉ trạng thái thay vì câu rời rạc:**\n` +
            `Thay vì viết nhiều câu ngắn đơn lẻ, hãy kết hợp bằng các cụm như *"Following [X], we initiated [Y]..."* hoặc *"In order to ensure [X], our team has [Y]..."* để tạo nhịp điệu chuyên nghiệp và mạch lạc.`
          : `### How to Elevate Your Writing Style:\n\n` +
            `**1. Replace Generic Verbs with Purposeful Collocations:**\n` +
            `Instead of basic verbs like *"make"*, *"do"*, or *"tell"*, adopt high-frequency professional phrases like *"streamline workflow"*, *"brief the team"*, or *"mitigate risk"*.\n\n` +
            `**2. Use Cohesive Linking Phrases:**\n` +
            `Connect your thoughts with introductory participial clauses (e.g. *"Following yesterday's review, we have prioritized..."*) to create fluid paragraph cadence.`,
        suggestedFollowUps: isVi
          ? ['Cho mình xem một phiên bản mẫu chuẩn cho Slack/Jira', 'Những từ nối nào giúp câu văn trang trọng hơn?', 'Làm sao để viết ngắn gọn mà không bị cộc lốc?']
          : ['Show me an ideal Slack/Jira status template', 'Which connectors sound most professional?', 'How do I remain concise without sounding blunt?'],
        examples: [
          'Following an initial blocker, we implemented a fallback handler and restored service by 3 PM.',
          'We have aligned with the design team and anticipate closing the remaining tickets today.'
        ]
      };
    }

    // 4. Default helpful tutor response
    return {
      reply: isVi
        ? `### Giải đáp từ Gia sư:\n\n` +
          `Về câu hỏi **"${message}"** đối với bài tập này:\n\n` +
          `• **Khái niệm cốt lõi:** ${question.skill_name}\n` +
          `• **Điểm cần lưu ý:** ${question.explanation_rule || 'Hãy chú ý đến sắc thái ngữ cảnh và tính chuẩn xác của câu.'}\n\n` +
          `Khi gặp dạng bài này trong thực tế, bạn nên đặt câu hỏi: *Mục tiêu giao tiếp là gì? Người nghe/đọc cần thông tin gì rõ ràng nhất?* Từ đó bạn sẽ luôn chọn được từ vựng và cấu trúc tự nhiên nhất.`
        : `### Tutor Explanation:\n\n` +
          `Regarding your question **"${message}"** for this exercise:\n\n` +
          `• **Core Competency:** ${question.skill_name}\n` +
          `• **Key Takeaway:** ${question.explanation_rule || 'Focus on context precision and natural cadence.'}\n\n` +
          `In real communication, always ask yourself: *What does my reader need to act on immediately?* This guides your vocabulary choices and structure naturally.`,
      suggestedFollowUps: isVi
        ? ['Cho mình thêm ví dụ ứng dụng', 'Từ này thường đi chung với giới từ nào?']
        : ['Give me more practical examples', 'Which prepositions collocate with this term?'],
      examples: [
        'Our team prioritized precision over speed to ensure long-term stability.'
      ]
    };
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
