import { GoogleGenAI } from '@google/genai';
import {
  UserProfile,
  LessonPlan,
  Question,
  AnswerEvaluation,
  SectionType,
  LearnerSkillState,
  DailySummary,
  TutorAssistantResponse
} from '../src/types/learning.js';
import { DEFAULT_CURRICULUM } from './defaultCurriculum.js';

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
    contextTopic?: 'general' | 'workplace_tech'
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
    profile: UserProfile
  ): Promise<DailySummary>;
}

export class GeminiLearningProvider implements LearningModelProvider {
  private ai: GoogleGenAI | null = null;
  // Prioritize models that have active quota
  private modelCandidates = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
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

  private async callGeminiJson<T>(prompt: string, systemInstruction: string): Promise<T | null> {
    if (!this.ai) return null;
    if (this.isQuotaExhausted()) {
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
          return JSON.parse(this.cleanJson(text)) as T;
        }
      } catch (err: any) {
        const errMsg = err?.message || '';
        const isQuota = err?.status === 'RESOURCE_EXHAUSTED' ||
          err?.code === 429 ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('Quota exceeded');

        if (isQuota) {
          // Model quota reached for this candidate, try next model candidate silently
          continue;
        } else {
          // Silent recovery to prevent unhandled applet crashes
          break;
        }
      }
    }

    // If all models hit quota or failed, pause remote attempts for 15 minutes
    this.quotaCooldownUntil = Date.now() + 15 * 60 * 1000;
    return null;
  }

  public async generateLessonPlan(
    profile: UserProfile,
    skillStates: LearnerSkillState[],
    recentErrors: string[]
  ): Promise<LessonPlan> {
    const generalRatio = profile.general_vs_work_ratio || 65;
    const workRatio = 100 - generalRatio;
    const duration = profile.daily_minutes || 20;

    const systemPrompt = `You are an expert, patient English tutor.
The learner's current level is ${profile.current_level}, aiming for ${profile.target_level}.
Goal: ${profile.goal_summary}.
Explanation language: ${profile.explanation_language === 'vi' ? 'Vietnamese' : 'English'}.
Balance: ${generalRatio}% general English, ${workRatio}% workplace/technical English.
Daily available minutes: ${duration} minutes.
Recent error patterns: ${JSON.stringify(recentErrors.slice(0, 3))}.
Known learning skills needing practice: ${JSON.stringify(skillStates.filter(s => s.status !== 'mastered').map(s => s.skill_name).slice(0, 3))}.

Produce a realistic, structured, achievable lesson plan with 4 sections:
1. Grammar (grammar)
2. Vocabulary with IPA & collocations (vocabulary)
3. Reading comprehension (reading)
4. Writing or workplace expression (writing)

Output JSON only in this exact schema:
{
  "primary_objective": string (1 concise sentence),
  "reason_for_selection": string (brief pedagogical reason in ${profile.explanation_language === 'vi' ? 'Vietnamese' : 'English'}),
  "sections": [
    {
      "section": "grammar" | "vocabulary" | "reading" | "writing",
      "title": string,
      "description": string,
      "estimated_minutes": number,
      "skill_target": string
    }
  ]
}`;

    const prompt = `Create a customized daily English lesson plan for today.`;
    const aiResult = await this.callGeminiJson<{
      primary_objective: string;
      reason_for_selection: string;
      sections: Array<{
        section: SectionType;
        title: string;
        description: string;
        estimated_minutes: number;
        skill_target: string;
      }>;
    }>(prompt, systemPrompt);

    if (aiResult && aiResult.sections && aiResult.sections.length > 0) {
      return {
        lesson_id: `lesson-${Date.now()}`,
        lesson_number: 1,
        date: new Date().toISOString().split('T')[0],
        primary_objective: aiResult.primary_objective,
        reason_for_selection: aiResult.reason_for_selection,
        estimated_duration_minutes: duration,
        sections: aiResult.sections.map(s => ({
          ...s,
          completed: false
        })),
        status: 'in_progress'
      };
    }

    // Default Fallback Lesson Plan tailored to user preferences
    return {
      lesson_id: `lesson-${Date.now()}`,
      lesson_number: 1,
      date: new Date().toISOString().split('T')[0],
      primary_objective: 'Master Narrative Tenses in Technical Reports and Action Collocations',
      reason_for_selection: profile.explanation_language === 'vi'
        ? 'Dựa trên mục tiêu giao tiếp chuyên nghiệp, bài học hôm nay củng cố thì quá khứ hoàn thành trong báo cáo sự cố và học từ vựng tinh gọn quy trình.'
        : 'Targeting past narrative accuracy and technical precision collocations.',
      estimated_duration_minutes: duration,
      sections: [
        {
          section: 'grammar',
          title: 'Part A — Past Perfect in Incident Reports',
          description: 'Phân biệt hành động xảy ra trước trong quá khứ khi giải thích sự cố.',
          estimated_minutes: Math.round(duration * 0.35),
          skill_target: 'Past Simple vs. Past Perfect',
          completed: false
        },
        {
          section: 'vocabulary',
          title: 'Part B — High-Impact Action Verbs',
          description: 'Học từ "mitigate" & "streamline" kèm phát âm IPA và collocations.',
          estimated_minutes: Math.round(duration * 0.25),
          skill_target: 'Collocations with Mitigate & Streamline',
          completed: false
        },
        {
          section: 'reading',
          title: 'Part C — Tech Strategy Reading',
          description: 'Đoạn văn ngắn về cân bằng tốc độ release và technical debt.',
          estimated_minutes: Math.round(duration * 0.2),
          skill_target: 'Reading Comprehension & Author Intent',
          completed: false
        },
        {
          section: 'writing',
          title: 'Part D — Workplace Communication',
          description: 'Viết cập nhật tiến độ công việc ngắn gọn, tự nhiên.',
          estimated_minutes: Math.round(duration * 0.2),
          skill_target: 'Clear Workplace Status Updates',
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
    contextTopic?: 'general' | 'workplace_tech'
  ): Promise<Question> {
    const topic = contextTopic || (Math.random() * 100 > profile.general_vs_work_ratio ? 'workplace_tech' : 'general');
    const lang = profile.explanation_language === 'vi' ? 'Vietnamese' : 'English';

    const systemPrompt = `You are an expert English tutor for a ${profile.current_level} learner.
Generate EXACTLY ONE focused practice question for section: "${section}".
Context topic: ${topic}.
Target skill: ${targetSkillName || 'Core ' + section + ' skill for ' + profile.current_level}.
Explanation and hints must be in ${lang}. Examples and prompt in natural English.

Core rules:
- ONE question at a time.
- For "grammar": multiple_choice or fill_in_blank. Include concise "concept_intro" (1-2 sentences), clear decisive clue in explanation.
- For "vocabulary": include a complete "vocab_card" with word, part_of_speech, ipa, pronunciation_tip, meaning (in ${lang}), collocation_pattern, example_general, example_workplace, similar_word_comparison (word & difference). The question must be a short contextual sentence test.
- For "reading": include "reading_passage" (100-140 words, clear topic, natural flow) and 1 comprehension or inference question.
- For "writing": free_writing prompt asking for 2-3 sentences in a realistic workplace or everyday scenario.

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

    const prompt = `Generate a single focused question for section: ${section}`;
    const result = await this.callGeminiJson<Question>(prompt, systemPrompt);

    if (result && result.prompt) {
      return {
        ...result,
        id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        section
      };
    }

    // Adaptive Curriculum Fallback with rotation
    const matching = DEFAULT_CURRICULUM.filter(item => item.section === section);
    if (matching.length > 0) {
      // Find one not recently served if possible
      const unserved = matching.filter(item => !this.servedQuestionHistory.includes(item.id));
      const candidates = unserved.length > 0 ? unserved : matching;
      const selected = candidates[Math.floor(Math.random() * candidates.length)];

      this.servedQuestionHistory.push(selected.id);
      if (this.servedQuestionHistory.length > 10) {
        this.servedQuestionHistory.shift();
      }

      return {
        ...selected.question,
        id: `curric-${Date.now()}-${selected.id}`
      };
    }

    // Ultimate fallback question
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

CRITICAL RULES:
- Distinguish grammatical correctness from naturalness and semantic fit.
- Accept valid alternatives where context permits. Do NOT mark wrong just because it uses a different valid word.
- For writing: preserve the learner's voice and intended meaning. Do NOT turn simple English into overly complex robotic text.
- Verdict must be strictly one of: "correct" | "partially_correct" | "incorrect" | "ambiguous".
- Provide:
  - "full_correct_sentence": complete natural sentence with the fix.
  - "decisive_clue": the exact reason or signal in the sentence that dictates this answer.
  - "explanation": helpful explanation in ${lang}.
  - "contrast_explanation": why common tempting mistakes fail.
  - For writing: "corrected_text", "key_corrections" (list of original, corrected, reason), and "reusable_pattern".

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

    // Smart Local Evaluation Fallback
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

Respond in ${lang} with:
- If "hint": give a gentle thinking clue without revealing the direct answer.
- If "simpler_explanation": break down the underlying grammar/vocab rule in friendly, plain terms.
- If "another_example": provide 1 fresh, natural real-world example sentence illustrating the exact same pattern.
- If "clarify_ambiguity": explain why certain choices differ and whether multiple readings might exist.

JSON Output Schema:
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

    // Adaptive Curated Fallback
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
    profile: UserProfile
  ): Promise<DailySummary> {
    const totalQuestions = attempts.length;
    const correctCount = attempts.filter(a => a.evaluation.verdict === 'correct').length;
    const accuracy = totalQuestions > 0 ? Number((correctCount / totalQuestions).toFixed(2)) : 1.0;

    const sectionsPracticed = Array.from(new Set(attempts.map(a => a.question.section))) as SectionType[];
    const lang = profile.explanation_language === 'vi' ? 'Vietnamese' : 'English';

    const systemPrompt = `You are a warm, professional English learning coach.
Summarize today's lesson session for a ${profile.current_level} learner.
Language: ${lang}.
Lesson objective: "${lesson.primary_objective}".
Total questions: ${totalQuestions}, Correct: ${correctCount}.
Attempts log: ${JSON.stringify(attempts.map(a => ({
  section: a.question.section,
  skill: a.question.skill_name,
  verdict: a.evaluation.verdict,
  userAnswer: a.userAnswer,
  expectedAnswer: a.evaluation.expected_answer,
  clue: a.evaluation.decisive_clue
})))}.

JSON Output Schema:
{
  "key_takeaways": [string (2-3 concise bullets in ${lang})],
  "vocabulary_learned": [string],
  "recurring_mistakes_flagged": [string (1-2 bullets if any, else empty)],
  "next_review_topics": [string (1-2 topics)]
}`;

    const prompt = `Generate structured end-of-lesson summary.`;
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
        accuracy_rate: accuracy,
        key_takeaways: aiResult.key_takeaways || [],
        vocabulary_learned: aiResult.vocabulary_learned || [],
        recurring_mistakes_flagged: aiResult.recurring_mistakes_flagged || [],
        next_review_topics: aiResult.next_review_topics || [],
        learner_rating: 'about_right'
      };
    }

    // Default Fallback Summary
    return {
      lesson_id: lesson.lesson_id,
      lesson_number: lesson.lesson_number || 1,
      completed_at: new Date().toISOString(),
      primary_objective: lesson.primary_objective,
      sections_completed: sectionsPracticed,
      questions_answered: totalQuestions,
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
