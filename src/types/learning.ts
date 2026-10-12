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

export interface LearningDataExport {
  profile: UserProfile;
  skills: LearnerSkillState[];
  vocabulary: VocabularyItem[];
  attempts: Attempt[];
  lessons: LessonPlan[];
  summaries: DailySummary[];
  exported_at: string;
}
