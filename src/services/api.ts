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
  LearningDataExport
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
  contextTopic?: 'general' | 'workplace_tech'
): Promise<Question> {
  const res = await fetch('/api/lesson/question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section, skillName, contextTopic })
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
  attempts: Array<{ question: Question; evaluation: AnswerEvaluation; userAnswer: string }>
): Promise<DailySummary> {
  const res = await fetch('/api/lesson/summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lesson, attempts })
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
    utterance.rate = 0.9; // natural, clear pacing for language learners
    
    // Pick English voice if available
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
