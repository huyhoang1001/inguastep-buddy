export type EnglishLevel = 'A2' | 'B1' | 'B2' | 'C1';

export type PrimaryGoal = 
  | 'workplace_tech' 
  | 'conversation' 
  | 'reading_writing' 
  | 'exam' 
  | 'balanced';

export type ExplanationLanguage = 'vi' | 'en' | 'bilingual';

export type FeedbackStyle = 'encouraging' | 'detailed' | 'concise';

export type SectionType = 'grammar' | 'vocabulary' | 'reading' | 'writing';

export type QuestionType = 
  | 'multiple_choice' 
  | 'fill_in_blank' 
  | 'sentence_rewrite' 
  | 'reading_comprehension' 
  | 'free_writing';

export type Verdict = 'correct' | 'partially_correct' | 'incorrect' | 'ambiguous';

export interface UserProfile {
  id: string;
  name: string;
  current_level: EnglishLevel;
  target_level: EnglishLevel;
  primary_goal: PrimaryGoal;
  goal_summary: string;
  explanation_language: ExplanationLanguage;
  general_vs_work_ratio: number; // percentage of general english, e.g. 65 means 65% general, 35% workplace
  daily_minutes: number; // e.g. 15, 30, 45
  days_per_week: number;
  feedback_style: FeedbackStyle;
  enable_audio_tips: boolean;
  onboarding_completed: boolean;
  
  // Extended conversational discovery fields
  struggles?: string[];
  timeline_target?: string;
  audio_importance?: boolean;
  preferred_topics?: string[];
  confidence_in_level?: 'low' | 'moderate' | 'high';
  
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  name: string;
  category: 'grammar' | 'vocabulary' | 'reading' | 'writing' | 'collocation';
  level: EnglishLevel;
  description: string;
}

export interface LearnerSkillState {
  skill_id: string;
  skill_name: string;
  category: string;
  status: 'new' | 'learning' | 'reviewing' | 'mostly_mastered' | 'mastered';
  accuracy_rate: number;
  total_attempts: number;
  last_practiced_at: string;
  next_review_at: string;
  recurring_errors: string[];
}

export interface VocabularyItem {
  id: string;
  word: string;
  part_of_speech: string;
  ipa: string;
  pronunciation_tip: string;
  meaning: string;
  collocation_pattern: string;
  example_general: string;
  example_workplace: string;
  similar_word_comparison?: {
    word: string;
    difference: string;
  };
  review_stage: 1 | 3 | 7 | 14 | 30; // Spaced repetition interval in days
  next_review_at: string;
  first_seen_at: string;
  last_reviewed_at: string;
  times_correct: number;
  times_incorrect: number;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  section: SectionType;
  skill_id: string;
  skill_name: string;
  question_type: QuestionType;
  difficulty: EnglishLevel;
  context_topic: 'general' | 'workplace_tech';
  
  // Content
  concept_intro?: string; // Short 1-2 sentence concept setup
  reading_passage?: {
    title: string;
    text: string;
    word_count: number;
    topic: string;
  };
  vocab_card?: Omit<VocabularyItem, 'id' | 'review_stage' | 'next_review_at' | 'first_seen_at' | 'last_reviewed_at' | 'times_correct' | 'times_incorrect'>;
  
  prompt: string;
  options?: QuestionOption[];
  expected_answer_ids?: string[];
  expected_answer_text?: string;
  accepted_alternatives?: string[];
  hint: string;
  explanation_rule: string;
}

export interface AnswerEvaluation {
  verdict: Verdict;
  user_answer: string;
  expected_answer: string;
  full_correct_sentence: string;
  decisive_clue: string;
  explanation: string;
  contrast_explanation?: string;
  corrected_text?: string; // For writing
  key_corrections?: Array<{
    original: string;
    corrected: string;
    reason: string;
  }>;
  reusable_pattern?: string;
  error_tags: string[];
  needs_retry: boolean;
  next_action: 'continue' | 'retry' | 'transfer';
}

export interface Attempt {
  id: string;
  lesson_id: string;
  question_id: string;
  section: SectionType;
  skill_name: string;
  user_answer: string;
  verdict: Verdict;
  evaluation: AnswerEvaluation;
  created_at: string;
}

export interface LessonSectionPlan {
  section: SectionType;
  title: string;
  description: string;
  estimated_minutes: number;
  skill_target: string;
  completed: boolean;
}

export interface LessonPlan {
  lesson_id: string;
  lesson_number: number;
  date: string;
  primary_objective: string;
  reason_for_selection: string;
  estimated_duration_minutes: number;
  sections: LessonSectionPlan[];
  status: 'planned' | 'in_progress' | 'completed' | 'paused';
}

export interface DailySummary {
  lesson_id: string;
  lesson_number: number;
  completed_at: string;
  primary_objective: string;
  sections_completed: SectionType[];
  questions_answered: number;
  accuracy_rate: number;
  key_takeaways: string[];
  vocabulary_learned: string[];
  recurring_mistakes_flagged: string[];
  next_review_topics: string[];
  learner_rating?: 'too_easy' | 'about_right' | 'too_difficult';
}

export interface TutorAssistantResponse {
  type: 'hint' | 'simpler_explanation' | 'another_example' | 'clarify_ambiguity';
  content: string;
  example_sentence?: string;
}

// ----------------------------------------------------
// CONVERSATIONAL DISCOVERY TYPES
// ----------------------------------------------------

export interface DiscoveryMessage {
  id: string;
  sender: 'tutor' | 'learner';
  text: string;
  quickReplies?: string[];
  dimension?: 'goal' | 'level' | 'struggles' | 'language' | 'time' | 'ratio' | 'correction' | 'audio' | 'timeline' | 'confirmation';
  timestamp: string;
}

export interface DiscoveryState {
  messages: DiscoveryMessage[];
  currentDimensionIndex: number;
  isConfirmed: boolean;
  summary: string;
  profileDraft: Partial<UserProfile>;
  updatedAt: string;
}

// ----------------------------------------------------
// ADAPTIVE DIAGNOSTIC ASSESSMENT TYPES
// ----------------------------------------------------

export type DiagnosticMode = 'quick' | 'standard' | 'comprehensive';

export interface WritingRubricScore {
  accuracy: number; // 1-5
  vocabularyRange: number; // 1-5
  sentenceComplexity: number; // 1-5
  coherence: number; // 1-5
  naturalness: number; // 1-5
  taskCompletion: number; // 1-5
  feedbackSummary: string;
  correctedVersion: string;
  keyCorrections: Array<{ original: string; corrected: string; reason: string }>;
}

export interface SkillProficiencyEstimate {
  category: SectionType | 'speaking' | 'listening';
  cefrRange: string; // e.g. "B1-B2", "B2", "C1", "Not Assessed"
  confidence: 'low' | 'moderate' | 'high';
  evidenceCount: number;
  correctCount: number;
  demonstratedStrengths: string[];
  priorityWeaknesses: string[];
  recurringErrors: string[];
  unassessedSubskills: string[];
}

export interface DiagnosticItemAttempt {
  id: string;
  question: Question;
  userAnswer: string;
  verdict: Verdict;
  evaluation: AnswerEvaluation;
  writingRubric?: WritingRubricScore;
  durationSeconds?: number;
  timestamp: string;
}

export interface DiagnosticSession {
  sessionId: string;
  mode: DiagnosticMode;
  status: 'in_progress' | 'paused' | 'completed';
  currentIndex: number;
  minQuestions: number;
  maxQuestions: number;
  history: DiagnosticItemAttempt[];
  currentEstimates: {
    grammar: SkillProficiencyEstimate;
    vocabulary: SkillProficiencyEstimate;
    reading: SkillProficiencyEstimate;
    writing: SkillProficiencyEstimate;
    speaking: SkillProficiencyEstimate;
    listening: SkillProficiencyEstimate;
  };
  overallCEFR: string;
  currentQuestion?: Question;
  startedAt: string;
  lastActiveAt: string;
  completedAt?: string;
}

export interface DiagnosticReport {
  id: string;
  sessionId: string;
  mode: DiagnosticMode;
  completedAt: string;
  overallCEFR: string;
  overallConfidence: 'low' | 'moderate' | 'high';
  overallSummary: string;
  skillEstimates: {
    grammar: SkillProficiencyEstimate;
    vocabulary: SkillProficiencyEstimate;
    reading: SkillProficiencyEstimate;
    writing: SkillProficiencyEstimate;
    speaking: SkillProficiencyEstimate;
    listening: SkillProficiencyEstimate;
  };
  demonstratedStrengths: string[];
  priorityWeaknesses: string[];
  recurringErrors: string[];
  totalQuestionsAnswered: number;
  accuracyRate: number;
}

// ----------------------------------------------------
// PERSONALIZED STUDY PLAN TYPES
// ----------------------------------------------------

export interface PrioritizedSkillPlan {
  skillId: string;
  skillName: string;
  category: SectionType;
  currentLevel: string;
  targetLevel: string;
  priority: 'high' | 'medium' | 'low';
  rationale: string;
}

export interface PersonalizedStudyPlan {
  id: string;
  learnerId: string;
  diagnosticReportId: string;
  overallObjective: string;
  diagnosticSummary: string;
  prioritizedSkills: PrioritizedSkillPlan[];
  shortTermMilestones: string[];
  suggestedWeeklyRoutine: Array<{ day: string; focus: string; minutes: number }>;
  dailyRoutineTemplate: Array<{ section: SectionType; title: string; minutes: number; target: string }>;
  spacedReviewStrategy: string;
  progressCheckIntervalDays: number;
  learnerApprovalStatus: 'draft' | 'approved';
  approvedAt?: string;
  createdAt: string;
}

export interface LearningDataExport {
  profile: UserProfile;
  skills: LearnerSkillState[];
  vocabulary: VocabularyItem[];
  attempts: Attempt[];
  lessons: LessonPlan[];
  summaries: DailySummary[];
  discoveryState?: DiscoveryState;
  diagnosticReports?: DiagnosticReport[];
  studyPlan?: PersonalizedStudyPlan;
  exported_at: string;
}
