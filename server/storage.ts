import fs from 'fs';
import path from 'path';
import {
  UserProfile,
  LearnerSkillState,
  VocabularyItem,
  Attempt,
  LessonPlan,
  DailySummary,
  LearningDataExport
} from '../src/types/learning.js';

interface DatabaseSchema {
  profile: UserProfile;
  skills: LearnerSkillState[];
  vocabulary: VocabularyItem[];
  attempts: Attempt[];
  lessons: LessonPlan[];
  summaries: DailySummary[];
}

const DEFAULT_PROFILE: UserProfile = {
  id: 'learner-primary',
  name: 'Learner',
  current_level: 'B2',
  target_level: 'C1',
  primary_goal: 'workplace_tech',
  goal_summary: 'Improve grammar precision, professional collocations, reading comprehension, and clear technical communication.',
  explanation_language: 'vi',
  general_vs_work_ratio: 65,
  daily_minutes: 20,
  days_per_week: 5,
  feedback_style: 'encouraging',
  enable_audio_tips: true,
  onboarding_completed: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const INITIAL_SKILLS: LearnerSkillState[] = [
  {
    skill_id: 'past_simple_vs_past_perfect',
    skill_name: 'Past Simple vs. Past Perfect',
    category: 'grammar',
    status: 'learning',
    accuracy_rate: 0.75,
    total_attempts: 4,
    last_practiced_at: new Date().toISOString(),
    next_review_at: new Date(Date.now() + 86400000).toISOString(),
    recurring_errors: ['Confusing had + V3 with past simple when time markers are implicit']
  },
  {
    skill_id: 'third_and_mixed_conditionals',
    skill_name: 'Third & Mixed Conditionals',
    category: 'grammar',
    status: 'learning',
    accuracy_rate: 0.6,
    total_attempts: 5,
    last_practiced_at: new Date().toISOString(),
    next_review_at: new Date(Date.now() + 86400000 * 2).toISOString(),
    recurring_errors: ['Using would have + V3 instead of would + V for present outcome']
  },
  {
    skill_id: 'collocation_mitigate',
    skill_name: 'Collocations with Mitigate',
    category: 'vocabulary',
    status: 'mostly_mastered',
    accuracy_rate: 0.9,
    total_attempts: 3,
    last_practiced_at: new Date().toISOString(),
    next_review_at: new Date(Date.now() + 86400000 * 3).toISOString(),
    recurring_errors: []
  },
  {
    skill_id: 'workplace_slack_update',
    skill_name: 'Clear Workplace Status Updates',
    category: 'writing',
    status: 'learning',
    accuracy_rate: 0.8,
    total_attempts: 2,
    last_practiced_at: new Date().toISOString(),
    next_review_at: new Date(Date.now() + 86400000 * 2).toISOString(),
    recurring_errors: ['Mixing past and present continuous tenses when stating blockers']
  }
];

const INITIAL_VOCABULARY: VocabularyItem[] = [
  {
    id: 'vocab-1',
    word: 'mitigate',
    part_of_speech: 'verb',
    ipa: '/ˈmɪtɪɡeɪt/',
    pronunciation_tip: 'Trọng âm rơi vào âm tiết đầu tiên: MIT-i-gate.',
    meaning: 'giảm nhẹ mức độ nghiêm trọng hoặc tác động tiêu cực của một rủi ro/thiệt hại',
    collocation_pattern: 'mitigate + risk / impact / damage / vulnerability',
    example_general: 'Planting trees along the river helped mitigate soil erosion.',
    example_workplace: 'Implementing rate limiting will mitigate the risk of server outages.',
    similar_word_comparison: {
      word: 'minimize',
      difference: 'mitigate tập trung vào giảm nhẹ hậu quả; minimize tập trung vào giảm số lượng/kích cỡ tối thiểu.'
    },
    review_stage: 3,
    next_review_at: new Date(Date.now() + 86400000 * 2).toISOString(),
    first_seen_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    last_reviewed_at: new Date().toISOString(),
    times_correct: 3,
    times_incorrect: 0
  },
  {
    id: 'vocab-2',
    word: 'streamline',
    part_of_speech: 'verb',
    ipa: '/ˈstriːmlaɪn/',
    pronunciation_tip: 'Âm /iː/ kéo dài trong stream; trọng âm vào âm đầu: STREAM-line.',
    meaning: 'tinh gọn hoá quy trình để loại bỏ khâu thừa và tiết kiệm thời gian',
    collocation_pattern: 'streamline + process / workflow / operations',
    example_general: 'The clinic introduced an online booking form to streamline admissions.',
    example_workplace: 'We automated the release cycle to streamline our deployment pipeline.',
    similar_word_comparison: {
      word: 'simplify',
      difference: 'simplify là làm cho dễ hiểu hơn; streamline là cắt bớt các bước rườm rà để vận hành hiệu quả hơn.'
    },
    review_stage: 1,
    next_review_at: new Date(Date.now() + 86400000).toISOString(),
    first_seen_at: new Date().toISOString(),
    last_reviewed_at: new Date().toISOString(),
    times_correct: 1,
    times_incorrect: 0
  }
];

class MemoryStore {
  private dbPath: string;
  private memoryData: DatabaseSchema;

  constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        console.error('Failed to create data directory:', err);
      }
    }
    this.dbPath = path.join(dataDir, 'db.json');
    this.memoryData = this.loadFromDisk();
  }

  private loadFromDisk(): DatabaseSchema {
    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          profile: parsed.profile || DEFAULT_PROFILE,
          skills: parsed.skills || INITIAL_SKILLS,
          vocabulary: parsed.vocabulary || INITIAL_VOCABULARY,
          attempts: parsed.attempts || [],
          lessons: parsed.lessons || [],
          summaries: parsed.summaries || []
        };
      }
    } catch (err) {
      console.warn('Error reading db.json, initializing fresh store:', err);
    }

    return {
      profile: { ...DEFAULT_PROFILE },
      skills: [...INITIAL_SKILLS],
      vocabulary: [...INITIAL_VOCABULARY],
      attempts: [],
      lessons: [],
      summaries: []
    };
  }

  private persist() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.memoryData, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error persisting database:', err);
    }
  }

  public getProfile(): UserProfile {
    return { ...this.memoryData.profile };
  }

  public updateProfile(updates: Partial<UserProfile>): UserProfile {
    this.memoryData.profile = {
      ...this.memoryData.profile,
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.persist();
    return this.memoryData.profile;
  }

  public getSkills(): LearnerSkillState[] {
    return [...this.memoryData.skills];
  }

  public updateSkillState(
    skillId: string,
    skillName: string,
    category: string,
    isCorrect: boolean,
    errorTag?: string
  ): LearnerSkillState {
    let skill = this.memoryData.skills.find(s => s.skill_id === skillId);
    if (!skill) {
      skill = {
        skill_id: skillId,
        skill_name: skillName,
        category,
        status: isCorrect ? 'mostly_mastered' : 'learning',
        accuracy_rate: isCorrect ? 1.0 : 0.0,
        total_attempts: 1,
        last_practiced_at: new Date().toISOString(),
        next_review_at: new Date(Date.now() + 86400000).toISOString(),
        recurring_errors: errorTag ? [errorTag] : []
      };
      this.memoryData.skills.push(skill);
    } else {
      skill.total_attempts += 1;
      const prevCorrect = Math.round(skill.accuracy_rate * (skill.total_attempts - 1));
      const currentCorrect = prevCorrect + (isCorrect ? 1 : 0);
      skill.accuracy_rate = Number((currentCorrect / skill.total_attempts).toFixed(2));
      skill.last_practiced_at = new Date().toISOString();

      if (skill.accuracy_rate >= 0.85 && skill.total_attempts >= 4) {
        skill.status = 'mastered';
        skill.next_review_at = new Date(Date.now() + 86400000 * 14).toISOString();
      } else if (skill.accuracy_rate >= 0.7) {
        skill.status = 'mostly_mastered';
        skill.next_review_at = new Date(Date.now() + 86400000 * 7).toISOString();
      } else if (!isCorrect) {
        skill.status = 'learning';
        skill.next_review_at = new Date(Date.now() + 86400000).toISOString();
        if (errorTag && !skill.recurring_errors.includes(errorTag)) {
          skill.recurring_errors.push(errorTag);
          if (skill.recurring_errors.length > 5) {
            skill.recurring_errors.shift();
          }
        }
      }
    }
    this.persist();
    return skill;
  }

  public getVocabulary(): VocabularyItem[] {
    return [...this.memoryData.vocabulary];
  }

  public saveVocabularyItem(item: Partial<VocabularyItem> & { word: string }): VocabularyItem {
    const existingIndex = this.memoryData.vocabulary.findIndex(
      v => v.word.toLowerCase() === item.word.toLowerCase()
    );

    if (existingIndex >= 0) {
      const existing = this.memoryData.vocabulary[existingIndex];
      const updated: VocabularyItem = {
        ...existing,
        ...item,
        last_reviewed_at: new Date().toISOString()
      };
      this.memoryData.vocabulary[existingIndex] = updated;
      this.persist();
      return updated;
    } else {
      const newItem: VocabularyItem = {
        id: `vocab-${Date.now()}`,
        word: item.word,
        part_of_speech: item.part_of_speech || 'noun',
        ipa: item.ipa || '',
        pronunciation_tip: item.pronunciation_tip || '',
        meaning: item.meaning || '',
        collocation_pattern: item.collocation_pattern || '',
        example_general: item.example_general || '',
        example_workplace: item.example_workplace || '',
        similar_word_comparison: item.similar_word_comparison,
        review_stage: 1,
        next_review_at: new Date(Date.now() + 86400000).toISOString(),
        first_seen_at: new Date().toISOString(),
        last_reviewed_at: new Date().toISOString(),
        times_correct: 1,
        times_incorrect: 0
      };
      this.memoryData.vocabulary.push(newItem);
      this.persist();
      return newItem;
    }
  }

  public recordAttempt(attempt: Attempt): Attempt {
    this.memoryData.attempts.push(attempt);
    
    // Update skill state accordingly
    const isCorrect = attempt.verdict === 'correct';
    const errorTag = attempt.evaluation.decisive_clue || (attempt.evaluation.error_tags && attempt.evaluation.error_tags[0]);
    this.updateSkillState(
      attempt.question_id,
      attempt.skill_name,
      attempt.section,
      isCorrect,
      errorTag
    );

    this.persist();
    return attempt;
  }

  public getAttempts(): Attempt[] {
    return [...this.memoryData.attempts];
  }

  public getLessons(): LessonPlan[] {
    return [...this.memoryData.lessons];
  }

  public saveLesson(lesson: LessonPlan): LessonPlan {
    const idx = this.memoryData.lessons.findIndex(l => l.lesson_id === lesson.lesson_id);
    if (idx >= 0) {
      this.memoryData.lessons[idx] = lesson;
    } else {
      this.memoryData.lessons.push(lesson);
    }
    this.persist();
    return lesson;
  }

  public getSummaries(): DailySummary[] {
    return [...this.memoryData.summaries];
  }

  public saveSummary(summary: DailySummary): DailySummary {
    const idx = this.memoryData.summaries.findIndex(s => s.lesson_id === summary.lesson_id);
    if (idx >= 0) {
      this.memoryData.summaries[idx] = summary;
    } else {
      this.memoryData.summaries.push(summary);
    }
    this.persist();
    return summary;
  }

  public exportAll(): LearningDataExport {
    return {
      profile: this.getProfile(),
      skills: this.getSkills(),
      vocabulary: this.getVocabulary(),
      attempts: this.getAttempts(),
      lessons: this.getLessons(),
      summaries: this.getSummaries(),
      exported_at: new Date().toISOString()
    };
  }

  public importAll(data: Partial<LearningDataExport>) {
    if (data.profile) this.memoryData.profile = { ...DEFAULT_PROFILE, ...data.profile };
    if (Array.isArray(data.skills)) this.memoryData.skills = data.skills;
    if (Array.isArray(data.vocabulary)) this.memoryData.vocabulary = data.vocabulary;
    if (Array.isArray(data.attempts)) this.memoryData.attempts = data.attempts;
    if (Array.isArray(data.lessons)) this.memoryData.lessons = data.lessons;
    if (Array.isArray(data.summaries)) this.memoryData.summaries = data.summaries;
    this.persist();
  }

  public clearAll() {
    this.memoryData = {
      profile: { ...DEFAULT_PROFILE, onboarding_completed: false },
      skills: [],
      vocabulary: [],
      attempts: [],
      lessons: [],
      summaries: []
    };
    this.persist();
  }
}

export const store = new MemoryStore();
