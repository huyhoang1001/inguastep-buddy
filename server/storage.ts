import fs from 'fs';
import path from 'path';
import {
  UserProfile,
  LearnerSkillState,
  VocabularyItem,
  Attempt,
  LessonPlan,
  DailySummary,
  LearningDataExport,
  DiscoveryState,
  DiagnosticSession,
  DiagnosticReport,
  PersonalizedStudyPlan
} from '../src/types/learning.js';
import { UserAccount } from './authTypes.js';

export interface UserLearningData {
  account: UserAccount;
  profile: UserProfile;
  skills: LearnerSkillState[];
  vocabulary: VocabularyItem[];
  attempts: Attempt[];
  lessons: LessonPlan[];
  summaries: DailySummary[];
  discoveryState?: DiscoveryState;
  diagnosticSession?: DiagnosticSession;
  diagnosticReports: DiagnosticReport[];
  studyPlan?: PersonalizedStudyPlan;
}

export interface MultiUserDatabaseSchema {
  version: number;
  users: Record<string, UserLearningData>;
}

export const DEFAULT_PROFILE: UserProfile = {
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
  struggles: [],
  timeline_target: '3 months',
  audio_importance: false,
  confidence_in_level: 'moderate',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export const INITIAL_SKILLS: LearnerSkillState[] = [
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

export const INITIAL_VOCABULARY: VocabularyItem[] = [
  {
    id: 'vocab-1',
    word: 'mitigate',
    part_of_speech: 'verb',
    ipa: '/ˈmɪt.ɪ.ɡeɪt/',
    pronunciation_tip: 'Nhấn trọng âm vào âm đầu: MIT-i-gate; âm cuối bật /t/ rõ ràng.',
    meaning: 'làm giảm bớt mức độ nghiêm trọng, đau đớn hoặc rủi ro của một vấn đề',
    collocation_pattern: 'mitigate + risk / impact / circumstances / damage',
    example_general: 'Soil conservation practices help mitigate the severity of flooding.',
    example_workplace: 'We added fallback servers to mitigate the risk of downtime during database migration.',
    similar_word_comparison: {
      word: 'alleviate',
      difference: 'alleviate thường dùng cho nỗi đau, triệu chứng bệnh; mitigate thường dùng cho rủi ro, tổn thất hoặc thiệt hại.'
    },
    review_stage: 2,
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

export class MultiUserMemoryStore {
  private dbPath: string;
  private users: Map<string, UserLearningData> = new Map();
  private isPersisting = false;
  private hasPendingWrite = false;

  constructor(customPath?: string) {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        console.error('Failed to create data directory:', err);
      }
    }
    this.dbPath = customPath || path.join(dataDir, 'db.json');
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        const parsed = JSON.parse(raw);

        // Check if old single-user schema or new multi-user schema
        if (parsed.version && parsed.users) {
          // New multi-user schema
          for (const [userId, uData] of Object.entries(parsed.users as Record<string, UserLearningData>)) {
            this.users.set(userId, uData);
          }
        } else if (parsed.profile) {
          // Backward-compatible migration from existing single-user db.json!
          const primaryId = parsed.profile.id || 'learner-primary';
          const migratedUser: UserLearningData = {
            account: {
              id: primaryId,
              email: 'primary@learner.local',
              name: parsed.profile.name || 'Primary Learner',
              authProvider: 'guest',
              createdAt: parsed.profile.created_at || new Date().toISOString(),
              lastLoginAt: new Date().toISOString()
            },
            profile: parsed.profile || { ...DEFAULT_PROFILE },
            skills: parsed.skills || [...INITIAL_SKILLS],
            vocabulary: parsed.vocabulary || [...INITIAL_VOCABULARY],
            attempts: parsed.attempts || [],
            lessons: parsed.lessons || [],
            summaries: parsed.summaries || [],
            discoveryState: parsed.discoveryState,
            diagnosticSession: parsed.diagnosticSession,
            diagnosticReports: parsed.diagnosticReports || [],
            studyPlan: parsed.studyPlan
          };
          this.users.set(primaryId, migratedUser);
          console.log(`[Storage] Seamlessly migrated existing user data for '${primaryId}'.`);
          this.persistAtomic();
        }
      }
    } catch (err) {
      console.warn('[Storage] Error reading db.json, starting fresh memory:', err);
    }
  }

  /**
   * Safe atomic write: writes to temporary file then renames to avoid partial corruption on crash
   */
  private persistAtomic() {
    if (this.isPersisting) {
      this.hasPendingWrite = true;
      return;
    }

    this.isPersisting = true;
    try {
      const dump: MultiUserDatabaseSchema = {
        version: 2,
        users: Object.fromEntries(this.users)
      };
      const tmpPath = `${this.dbPath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(dump, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this.dbPath);
    } catch (err) {
      console.error('[Storage] Error persisting database atomically:', err);
    } finally {
      this.isPersisting = false;
      if (this.hasPendingWrite) {
        this.hasPendingWrite = false;
        this.persistAtomic();
      }
    }
  }

  public getDefaultUserId(): string {
    const firstKey = this.users.keys().next().value;
    return firstKey || 'learner-primary';
  }

  public resolveUserId(userId?: string): string {
    if (typeof userId === 'string' && userId.trim()) {
      return userId.trim();
    }
    return this.getDefaultUserId();
  }

  public getOrCreateUser(account: UserAccount): UserLearningData {
    let userData = this.users.get(account.id);
    if (!userData) {
      userData = {
        account,
        profile: {
          ...DEFAULT_PROFILE,
          id: account.id,
          name: account.name || DEFAULT_PROFILE.name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        skills: JSON.parse(JSON.stringify(INITIAL_SKILLS)),
        vocabulary: JSON.parse(JSON.stringify(INITIAL_VOCABULARY)),
        attempts: [],
        lessons: [],
        summaries: [],
        diagnosticReports: []
      };
      this.users.set(account.id, userData);
      this.persistAtomic();
    } else {
      userData.account.lastLoginAt = new Date().toISOString();
      if (account.name && account.name !== userData.account.name) {
        userData.account.name = account.name;
      }
      if (account.picture && account.picture !== userData.account.picture) {
        userData.account.picture = account.picture;
      }
    }
    return userData;
  }

  private ensureUser(userId?: string): UserLearningData {
    const id = this.resolveUserId(userId);
    let u = this.users.get(id);
    if (!u) {
      const defaultAccount: UserAccount = {
        id,
        email: `${id}@learner.local`,
        name: 'Learner',
        authProvider: id.startsWith('google_') ? 'google' : 'guest',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      u = this.getOrCreateUser(defaultAccount);
    }
    return u;
  }

  // Profile
  public getProfile(userId?: string): UserProfile {
    const u = this.ensureUser(userId);
    return { ...u.profile };
  }

  public updateProfile(userId: string | undefined, updates: Partial<UserProfile>): UserProfile {
    const u = this.ensureUser(userId);
    const resolvedId = u.account.id;

    u.profile = {
      ...u.profile,
      ...updates,
      id: resolvedId,
      updated_at: new Date().toISOString()
    };
    this.persistAtomic();
    return { ...u.profile };
  }

  // Skills
  public getSkills(userId?: string): LearnerSkillState[] {
    const u = this.ensureUser(userId);
    return [...u.skills];
  }

  public updateSkillState(
    userId: string | undefined,
    skillId: string,
    skillName: string,
    category: string,
    isCorrect: boolean,
    errorTag?: string
  ): LearnerSkillState {
    const u = this.ensureUser(userId);

    let skill = u.skills.find(s => s.skill_id === skillId);
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
      u.skills.push(skill);
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

    this.persistAtomic();
    return { ...skill };
  }

  // Vocabulary
  public getVocabulary(userId?: string): VocabularyItem[] {
    const u = this.ensureUser(userId);
    return [...u.vocabulary];
  }

  public saveVocabularyItem(arg1: any, arg2?: any): VocabularyItem {
    let targetUserId: string | undefined;
    let item: Partial<VocabularyItem> & { word: string };
    if (arg2 !== undefined) {
      targetUserId = typeof arg1 === 'string' ? arg1 : undefined;
      item = arg2;
    } else {
      targetUserId = undefined;
      item = arg1;
    }

    const u = this.ensureUser(targetUserId);
    const existingIndex = u.vocabulary.findIndex(v => v.word.toLowerCase() === item.word.toLowerCase());
    if (existingIndex >= 0) {
      const existing = u.vocabulary[existingIndex];
      const updated: VocabularyItem = {
        ...existing,
        ...item,
        last_reviewed_at: new Date().toISOString()
      };
      u.vocabulary[existingIndex] = updated;
      this.persistAtomic();
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
      u.vocabulary.push(newItem);
      this.persistAtomic();
      return newItem;
    }
  }

  // Attempts
  public recordAttempt(arg1: any, arg2?: any): Attempt {
    let targetUserId: string | undefined;
    let attempt: Attempt;
    if (arg2 !== undefined) {
      targetUserId = typeof arg1 === 'string' ? arg1 : undefined;
      attempt = arg2;
    } else {
      targetUserId = undefined;
      attempt = arg1;
    }

    const u = this.ensureUser(targetUserId);
    u.attempts.push(attempt);
    const isCorrect = attempt.verdict === 'correct';
    const errorTag = attempt.evaluation.decisive_clue || (attempt.evaluation.error_tags && attempt.evaluation.error_tags[0]);
    this.updateSkillState(u.account.id, attempt.question_id, attempt.skill_name, attempt.section, isCorrect, errorTag);
    this.persistAtomic();
    return attempt;
  }

  public getAttempts(userId?: string): Attempt[] {
    const u = this.ensureUser(typeof userId === 'string' ? userId : undefined);
    return [...u.attempts];
  }

  // Lessons
  public getLessons(userId?: string): LessonPlan[] {
    const u = this.ensureUser(typeof userId === 'string' ? userId : undefined);
    return [...u.lessons];
  }

  public saveLesson(arg1: any, arg2?: any): LessonPlan {
    let targetUserId: string | undefined;
    let lesson: LessonPlan;
    if (arg2 !== undefined) {
      targetUserId = typeof arg1 === 'string' ? arg1 : undefined;
      lesson = arg2;
    } else {
      targetUserId = undefined;
      lesson = arg1;
    }

    const u = this.ensureUser(targetUserId);
    const idx = u.lessons.findIndex(l => l.lesson_id === lesson.lesson_id);
    if (idx >= 0) {
      u.lessons[idx] = lesson;
    } else {
      u.lessons.push(lesson);
    }
    this.persistAtomic();
    return lesson;
  }

  public completeLesson(userId: string | undefined, lessonId: string): void {
    const u = this.ensureUser(typeof userId === 'string' ? userId : undefined);
    const target = u.lessons.find(l => l.lesson_id === lessonId);
    if (target) {
      target.status = 'completed';
      this.persistAtomic();
    }
  }

  // Summaries
  public getSummaries(userId?: string): DailySummary[] {
    const u = this.ensureUser(typeof userId === 'string' ? userId : undefined);
    return [...u.summaries];
  }

  public saveSummary(arg1: any, arg2?: any): DailySummary {
    let targetUserId: string | undefined;
    let summary: DailySummary;
    if (arg2 !== undefined) {
      targetUserId = typeof arg1 === 'string' ? arg1 : undefined;
      summary = arg2;
    } else {
      targetUserId = undefined;
      summary = arg1;
    }

    const u = this.ensureUser(targetUserId);
    const idx = u.summaries.findIndex(s => s.lesson_id === summary.lesson_id);
    if (idx >= 0) {
      u.summaries[idx] = summary;
    } else {
      u.summaries.push(summary);
    }
    this.persistAtomic();
    return summary;
  }

  // Discovery State
  public getDiscoveryState(userId?: string): DiscoveryState | undefined {
    const u = this.ensureUser(typeof userId === 'string' ? userId : undefined);
    return u.discoveryState;
  }

  public saveDiscoveryState(arg1: any, arg2?: any): DiscoveryState {
    let targetUserId: string | undefined;
    let state: DiscoveryState;

    if (arg2 !== undefined) {
      targetUserId = typeof arg1 === 'string' ? arg1 : undefined;
      state = arg2;
    } else {
      targetUserId = undefined;
      state = arg1;
    }

    const u = this.ensureUser(targetUserId);
    u.discoveryState = state;
    this.persistAtomic();
    return state;
  }

  // Diagnostic Session
  public getDiagnosticSession(userId?: string): DiagnosticSession | undefined {
    const u = this.ensureUser(typeof userId === 'string' ? userId : undefined);
    return u.diagnosticSession;
  }

  public saveDiagnosticSession(arg1: any, arg2?: any): DiagnosticSession {
    let targetUserId: string | undefined;
    let session: DiagnosticSession;

    if (arg2 !== undefined) {
      targetUserId = typeof arg1 === 'string' ? arg1 : undefined;
      session = arg2;
    } else {
      targetUserId = undefined;
      session = arg1;
    }

    const u = this.ensureUser(targetUserId);
    u.diagnosticSession = session;
    this.persistAtomic();
    return session;
  }

  public clearDiagnosticSession(userId?: string) {
    const u = this.ensureUser(typeof userId === 'string' ? userId : undefined);
    delete u.diagnosticSession;
    this.persistAtomic();
  }

  // Diagnostic Reports
  public getDiagnosticReports(userId?: string): DiagnosticReport[] {
    const u = this.ensureUser(userId);
    return [...u.diagnosticReports];
  }

  public saveDiagnosticReport(arg1: any, arg2?: any): DiagnosticReport {
    let targetUserId: string | undefined;
    let report: DiagnosticReport;
    if (arg2 !== undefined) {
      targetUserId = typeof arg1 === 'string' ? arg1 : undefined;
      report = arg2;
    } else {
      targetUserId = undefined;
      report = arg1;
    }

    const u = this.ensureUser(targetUserId);
    const idx = u.diagnosticReports.findIndex(r => r.id === report.id);
    if (idx >= 0) {
      u.diagnosticReports[idx] = report;
    } else {
      u.diagnosticReports.push(report);
    }
    this.persistAtomic();
    return report;
  }

  // Study Plan
  public getStudyPlan(userId?: string): PersonalizedStudyPlan | null {
    const u = this.ensureUser(userId);
    return u.studyPlan || null;
  }

  public saveStudyPlan(arg1: any, arg2?: any): PersonalizedStudyPlan {
    let targetUserId: string | undefined;
    let plan: PersonalizedStudyPlan;
    if (arg2 !== undefined) {
      targetUserId = typeof arg1 === 'string' ? arg1 : undefined;
      plan = arg2;
    } else {
      targetUserId = undefined;
      plan = arg1;
    }

    const u = this.ensureUser(targetUserId);
    u.studyPlan = plan;
    this.persistAtomic();
    return plan;
  }

  // Export / Import per user
  public exportAll(userId?: string): LearningDataExport {
    const u = this.ensureUser(userId);
    return {
      profile: this.getProfile(u.account.id),
      skills: this.getSkills(u.account.id),
      vocabulary: this.getVocabulary(u.account.id),
      attempts: this.getAttempts(u.account.id),
      lessons: this.getLessons(u.account.id),
      summaries: this.getSummaries(u.account.id),
      discoveryState: u.discoveryState,
      diagnosticReports: u.diagnosticReports || [],
      studyPlan: u.studyPlan,
      exported_at: new Date().toISOString()
    };
  }

  public importAll(userId: string | undefined, data: Partial<LearningDataExport>) {
    const u = this.ensureUser(userId);

    if (data.profile) u.profile = { ...DEFAULT_PROFILE, ...data.profile, id: u.account.id };
    if (Array.isArray(data.skills)) u.skills = data.skills;
    if (Array.isArray(data.vocabulary)) u.vocabulary = data.vocabulary;
    if (Array.isArray(data.attempts)) u.attempts = data.attempts;
    if (Array.isArray(data.lessons)) u.lessons = data.lessons;
    if (Array.isArray(data.summaries)) u.summaries = data.summaries;
    if (data.discoveryState) u.discoveryState = data.discoveryState;
    if (Array.isArray(data.diagnosticReports)) u.diagnosticReports = data.diagnosticReports;
    if (data.studyPlan) u.studyPlan = data.studyPlan;
    this.persistAtomic();
  }

  public clearAll(userId?: string) {
    const u = this.ensureUser(userId);
    const resolvedId = u.account.id;

    u.profile = { ...DEFAULT_PROFILE, id: resolvedId, onboarding_completed: false };
    u.skills = JSON.parse(JSON.stringify(INITIAL_SKILLS));
    u.vocabulary = JSON.parse(JSON.stringify(INITIAL_VOCABULARY));
    u.attempts = [];
    u.lessons = [];
    u.summaries = [];
    u.diagnosticReports = [];
    delete u.discoveryState;
    delete u.diagnosticSession;
    delete u.studyPlan;
    this.persistAtomic();
  }
}

export const store = new MultiUserMemoryStore();
