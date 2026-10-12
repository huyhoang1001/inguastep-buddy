import {
  UserProfile,
  LessonPlan,
  Question,
  AnswerEvaluation,
  SectionType,
  LearnerSkillState,
  VocabularyItem,
  Attempt,
  DailySummary,
  TutorAssistantResponse,
  LearningDataExport,
  DiscoveryState,
  DiagnosticSession,
  DiagnosticMode,
  DiagnosticReport,
  PersonalizedStudyPlan,
  WritingRubricScore
} from '../types/learning.ts';

export async function getProfile(): Promise<UserProfile> {
  const res = await fetch('/api/profile');
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export async function updateProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
  const res = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  });
  if (!res.ok) throw new Error('Failed to update profile');
  return res.json();
}

export async function getMemory(): Promise<{
  profile: UserProfile;
  skills: LearnerSkillState[];
  vocabulary: VocabularyItem[];
  attempts: Attempt[];
  lessons: LessonPlan[];
  summaries: DailySummary[];
  diagnosticReports?: DiagnosticReport[];
  studyPlan?: PersonalizedStudyPlan;
}> {
  const res = await fetch('/api/memory');
  if (!res.ok) throw new Error('Failed to fetch memory data');
  return res.json();
}

export async function clearMemory(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/memory/clear', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to clear memory');
  return res.json();
}

export async function importMemory(data: Partial<LearningDataExport>): Promise<void> {
  const res = await fetch('/api/memory/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to import memory');
}

export async function exportMemory(): Promise<LearningDataExport> {
  const res = await fetch('/api/memory/export');
  if (!res.ok) throw new Error('Failed to export memory');
  return res.json();
}

export async function generateLessonPlan(): Promise<LessonPlan> {
  const res = await fetch('/api/lesson/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to generate lesson plan');
  return res.json();
}

export async function generateQuestion(
  section: SectionType,
  skillName?: string,
  contextTopic?: 'general' | 'workplace_tech',
  activityType?: string,
  questionIndex?: number,
  totalInActivity?: number
): Promise<Question> {
  const res = await fetch('/api/lesson/question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section, skillName, contextTopic, activityType, questionIndex, totalInActivity })
  });
  if (!res.ok) throw new Error('Failed to generate question');
  return res.json();
}

export async function evaluateAnswer(
  question: Question,
  userAnswer: string,
  lessonId?: string
): Promise<AnswerEvaluation> {
  const res = await fetch('/api/lesson/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, userAnswer, lessonId })
  });
  if (!res.ok) throw new Error('Failed to evaluate answer');
  return res.json();
}

export async function requestTutorAssist(
  question: Question,
  action: 'hint' | 'simpler_explanation' | 'another_example' | 'clarify_ambiguity'
): Promise<TutorAssistantResponse> {
  const res = await fetch('/api/lesson/tutor-assist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, action })
  });
  if (!res.ok) throw new Error('Failed to get tutor assist');
  return res.json();
}

export async function generateLessonSummary(
  lesson: LessonPlan,
  attempts: Array<{ question: Question; evaluation: AnswerEvaluation; userAnswer: string }>,
  timeSpentMinutes?: number
): Promise<DailySummary> {
  const res = await fetch('/api/lesson/summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lesson, attempts, timeSpentMinutes })
  });
  if (!res.ok) throw new Error('Failed to generate lesson summary');
  return res.json();
}

export async function saveVocabularyItem(item: Partial<VocabularyItem> & { word: string }): Promise<VocabularyItem> {
  const res = await fetch('/api/vocabulary/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  if (!res.ok) throw new Error('Failed to save vocabulary item');
  return res.json();
}

// =========================================================================
// CONVERSATIONAL DISCOVERY API
// =========================================================================

export async function getDiscoveryState(): Promise<DiscoveryState> {
  const res = await fetch('/api/discovery');
  if (!res.ok) throw new Error('Failed to fetch discovery state');
  return res.json();
}

export async function sendDiscoveryMessage(message: string): Promise<DiscoveryState> {
  const res = await fetch('/api/discovery/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  if (!res.ok) throw new Error('Failed to send discovery message');
  return res.json();
}

export async function confirmDiscovery(): Promise<{ success: boolean; profile: UserProfile }> {
  const res = await fetch('/api/discovery/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to confirm discovery');
  return res.json();
}

// =========================================================================
// ADAPTIVE DIAGNOSTIC ASSESSMENT API
// =========================================================================

export async function getDiagnosticSession(): Promise<{ session: DiagnosticSession | null }> {
  const res = await fetch('/api/diagnostic/session');
  if (!res.ok) throw new Error('Failed to fetch diagnostic session');
  return res.json();
}

export async function startDiagnosticSession(mode: DiagnosticMode = 'standard'): Promise<DiagnosticSession> {
  const res = await fetch('/api/diagnostic/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode })
  });
  if (!res.ok) throw new Error('Failed to start diagnostic assessment');
  return res.json();
}

export async function getNextDiagnosticQuestion(): Promise<{ question: Question; session: DiagnosticSession }> {
  const res = await fetch('/api/diagnostic/next-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to get next diagnostic question');
  return res.json();
}

export async function submitDiagnosticAnswer(
  question: Question,
  userAnswer: string,
  durationSeconds: number = 0
): Promise<{
  evaluation: AnswerEvaluation;
  writingRubric?: WritingRubricScore;
  canStop: boolean;
  mustStop: boolean;
  historyCount: number;
  minQuestions: number;
  maxQuestions: number;
}> {
  const res = await fetch('/api/diagnostic/submit-answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, userAnswer, durationSeconds })
  });
  if (!res.ok) throw new Error('Failed to submit diagnostic answer');
  return res.json();
}

export async function pauseDiagnosticSession(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/diagnostic/pause', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to pause diagnostic');
  return res.json();
}

export async function completeDiagnosticSession(): Promise<{
  report: DiagnosticReport;
  studyPlan: PersonalizedStudyPlan;
}> {
  const res = await fetch('/api/diagnostic/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to complete diagnostic assessment');
  return res.json();
}

export async function getDiagnosticReports(): Promise<DiagnosticReport[]> {
  const res = await fetch('/api/diagnostic/reports');
  if (!res.ok) throw new Error('Failed to fetch diagnostic reports');
  return res.json();
}

// =========================================================================
// PERSONALIZED STUDY PLAN API
// =========================================================================

export async function getStudyPlan(): Promise<{ plan: PersonalizedStudyPlan | null }> {
  const res = await fetch('/api/study-plan');
  if (!res.ok) throw new Error('Failed to fetch study plan');
  return res.json();
}

export async function approveStudyPlan(
  adjustedMinutes?: number,
  adjustedPriorities?: any[]
): Promise<{ success: boolean; plan: PersonalizedStudyPlan; profile: UserProfile }> {
  const res = await fetch('/api/study-plan/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adjustedMinutes, adjustedPriorities })
  });
  if (!res.ok) throw new Error('Failed to approve study plan');
  return res.json();
}

/**
 * Honest Audio: Speaks English using Web Speech API (with native English voice)
 * Only available when browser supports speech synthesis.
 */
export function playEnglishSpeech(text: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (enVoice) utterance.voice = enVoice;
    
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('Speech synthesis error:', err);
    return false;
  }
}
