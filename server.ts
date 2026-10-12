import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { store } from './server/storage.js';
import { aiService } from './server/aiService.js';
import {
  verifyGoogleIdToken,
  validateSessionToken,
  createSessionToken,
  revokeSessionToken,
  createGuestSession,
  isGoogleAuthAvailable,
  getGoogleClientId
} from './server/authService.js';
import { budgetManager } from './server/usageBudget.js';
import { contentCache } from './server/contentCache.js';
import { UserAccount } from './server/authTypes.js';
import {
  Attempt,
  DiagnosticSession,
  DiagnosticMode,
  DiscoveryState
} from './src/types/learning.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Extend Request type for authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: UserAccount;
      sessionToken?: string;
    }
  }
}

// ---------------------------------------------------------------------------
// AUTHENTICATION MIDDLEWARE
// ---------------------------------------------------------------------------
// Extracts Bearer session token. Never trusts raw unverified user IDs from client!
app.use((req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const verifiedUser = validateSessionToken(token);
    if (verifiedUser) {
      req.user = verifiedUser;
      req.sessionToken = token;
    }
  }

  // If no bearer token is present, fall back to guest session based on stable header or default guest
  if (!req.user) {
    const guestHeader = req.headers['x-guest-id'] as string;
    const guestId = (typeof guestHeader === 'string' && guestHeader.trim())
      ? guestHeader.trim()
      : store.getDefaultUserId();

    const fallbackUser: UserAccount = {
      id: guestId,
      email: `${guestId}@linguastep.local`,
      name: guestId === 'learner-primary' ? 'Learner' : 'Guest Learner',
      authProvider: 'guest',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    req.user = fallbackUser;
  }

  next();
});

// =========================================================================
// AUTHENTICATION & SESSION ENDPOINTS
// =========================================================================

// Get current session state & user usage budget
app.get('/api/auth/session', (req: Request, res: Response) => {
  try {
    const user = req.user || null;
    const userId = user ? user.id : 'anonymous';
    const stats = budgetManager.getStats(userId);

    res.json({
      user,
      googleAuthAvailable: isGoogleAuthAvailable(),
      googleClientId: getGoogleClientId(),
      limits: stats
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Google Sign-In with verified Google ID Token
app.post('/api/auth/google', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Missing Google credential ID token.' });
    }

    const verifiedUser = await verifyGoogleIdToken(credential);
    // Persist or update account in isolated store
    store.getOrCreateUser(verifiedUser);
    const sessionToken = createSessionToken(verifiedUser);

    res.json({
      success: true,
      user: verifiedUser,
      token: sessionToken,
      profile: store.getProfile(verifiedUser.id)
    });
  } catch (err: any) {
    console.error('[Auth] Google sign-in failure:', err?.message || err);
    res.status(401).json({ error: err.message || 'Failed to authenticate Google token.' });
  }
});

// Start or resume guest session (isolated per guest id)
app.post('/api/auth/guest', (req: Request, res: Response) => {
  try {
    const { user, token } = createGuestSession();
    store.getOrCreateUser(user);
    res.json({
      success: true,
      user,
      token,
      profile: store.getProfile(user.id)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sign out
app.post('/api/auth/logout', (req: Request, res: Response) => {
  try {
    if (req.sessionToken) {
      revokeSessionToken(req.sessionToken);
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Usage statistics & audit log (admin/monitoring safe view)
app.get('/api/auth/usage-stats', (req: Request, res: Response) => {
  try {
    const userId = req.user ? req.user.id : 'anonymous';
    const stats = budgetManager.getStats(userId);
    const recentLogs = budgetManager.getRecentLogs(25);
    res.json({
      stats,
      recentLogs: recentLogs.map(l => ({
        timestamp: l.timestamp,
        operation: l.operation,
        model: l.model,
        tokens: l.totalEstimatedTokens,
        status: l.status
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// PROFILE & MEMORY ENDPOINTS (USER-ISOLATED)
// =========================================================================

// Health & Status
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/profile', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = store.getProfile(userId);
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/profile', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const updated = store.updateProfile(userId, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Memory / Learning Data endpoints
app.get('/api/memory', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = store.getProfile(userId);
    const skills = store.getSkills(userId);
    const vocabulary = store.getVocabulary(userId);
    const attempts = store.getAttempts(userId);
    const lessons = store.getLessons(userId);
    const summaries = store.getSummaries(userId);
    const diagnosticReports = store.getDiagnosticReports(userId);
    const studyPlan = store.getStudyPlan(userId);
    res.json({ profile, skills, vocabulary, attempts, lessons, summaries, diagnosticReports, studyPlan });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/memory/clear', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    store.clearAll(userId);
    res.json({ success: true, message: 'Learning data successfully reset.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/memory/import', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    store.importAll(userId, req.body);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/memory/export', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const exported = store.exportAll(userId);
    res.json(exported);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vocabulary/save', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const saved = store.saveVocabularyItem(userId, req.body);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// CONVERSATIONAL DISCOVERY ROUTES
// =========================================================================

app.get('/api/discovery', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = store.getProfile(userId);
    let discoveryState = store.getDiscoveryState(userId);

    if (!discoveryState || discoveryState.messages.length === 0) {
      const isVi = profile.explanation_language === 'vi';
      discoveryState = {
        messages: [
          {
            id: `msg-${Date.now()}`,
            sender: 'tutor',
            text: isVi
              ? 'Xin chào! Mình là gia sư tiếng Anh cá nhân của bạn. Mình ở đây để giúp bạn tiến bộ qua các buổi học 1 câu hỏi tại một thời điểm, giải thích cặn kẽ và ghi nhớ dài hạn.\n\nĐể bắt đầu, mục tiêu học tiếng Anh lớn nhất của bạn lúc này là gì?'
              : 'Hello! I am your personal adaptive English tutor. I will guide you with focused step-by-step questions, clear explanations, and long-term memory tracking.\n\nTo begin, what is your primary English learning goal right now?',
            quickReplies: isVi
              ? ['Giao tiếp công việc & Kỹ thuật', 'Giao tiếp đời sống tự nhiên', 'Viết báo cáo & Đọc tài liệu', 'Cân bằng cả hai']
              : ['Workplace & Tech Communication', 'Natural Conversation', 'Reading & Technical Writing', 'Balanced Mix'],
            dimension: 'goal',
            timestamp: new Date().toISOString()
          }
        ],
        currentDimensionIndex: 1,
        isConfirmed: false,
        summary: '',
        profileDraft: { ...profile },
        updatedAt: new Date().toISOString()
      };
      store.saveDiscoveryState(userId, discoveryState);
    }

    res.json(discoveryState);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/discovery/message', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    let discoveryState = store.getDiscoveryState(userId);
    const profile = store.getProfile(userId);

    if (!discoveryState) {
      discoveryState = {
        messages: [],
        currentDimensionIndex: 0,
        isConfirmed: false,
        summary: '',
        profileDraft: { ...profile },
        updatedAt: new Date().toISOString()
      };
    }

    // Add user message
    const userMsg = {
      id: `msg-user-${Date.now()}`,
      sender: 'learner' as const,
      text: message.trim(),
      timestamp: new Date().toISOString()
    };
    discoveryState.messages.push(userMsg);

    // Call AI turn handler
    const result = await aiService.handleDiscoveryTurn(
      discoveryState.messages,
      message.trim(),
      profile
    );

    // Add tutor reply
    const tutorMsg = {
      id: `msg-tutor-${Date.now()}`,
      sender: 'tutor' as const,
      text: result.tutorReply,
      quickReplies: result.quickReplies,
      dimension: result.dimension,
      timestamp: new Date().toISOString()
    };
    discoveryState.messages.push(tutorMsg);

    // Update profile draft
    if (result.updatedProfile) {
      discoveryState.profileDraft = {
        ...discoveryState.profileDraft,
        ...result.updatedProfile
      };
      store.updateProfile(userId, result.updatedProfile);
    }

    discoveryState.currentDimensionIndex += 1;
    discoveryState.isConfirmed = result.isDiscoveryComplete;
    if (result.confirmationSummary) {
      discoveryState.summary = result.confirmationSummary;
    }
    discoveryState.updatedAt = new Date().toISOString();

    store.saveDiscoveryState(userId, discoveryState);
    res.json(discoveryState);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/discovery/confirm', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const discoveryState = store.getDiscoveryState(userId);
    if (discoveryState) {
      discoveryState.isConfirmed = true;
      store.saveDiscoveryState(userId, discoveryState);
    }
    const profile = store.getProfile(userId);
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// ADAPTIVE DIAGNOSTIC ASSESSMENT ROUTES
// =========================================================================

app.get('/api/diagnostic/session', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const session = store.getDiagnosticSession(userId);
    res.json({ session });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/diagnostic/start', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { mode = 'standard' } = req.body as { mode: DiagnosticMode };
    const profile = store.getProfile(userId);

    let minQuestions = 8;
    let maxQuestions = 14;
    if (mode === 'quick') {
      minQuestions = 5;
      maxQuestions = 8;
    } else if (mode === 'comprehensive') {
      minQuestions = 15;
      maxQuestions = 22;
    }

    const initialSession: DiagnosticSession = {
      sessionId: `diag-sess-${Date.now()}`,
      mode,
      status: 'in_progress',
      currentIndex: 1,
      minQuestions,
      maxQuestions,
      history: [],
      currentEstimates: {
        grammar: {
          category: 'grammar',
          cefrRange: profile.current_level || 'B2',
          confidence: 'low',
          evidenceCount: 0,
          correctCount: 0,
          demonstratedStrengths: [],
          priorityWeaknesses: [],
          recurringErrors: [],
          unassessedSubskills: []
        },
        vocabulary: {
          category: 'vocabulary',
          cefrRange: profile.current_level || 'B2',
          confidence: 'low',
          evidenceCount: 0,
          correctCount: 0,
          demonstratedStrengths: [],
          priorityWeaknesses: [],
          recurringErrors: [],
          unassessedSubskills: []
        },
        reading: {
          category: 'reading',
          cefrRange: profile.current_level || 'B2',
          confidence: 'low',
          evidenceCount: 0,
          correctCount: 0,
          demonstratedStrengths: [],
          priorityWeaknesses: [],
          recurringErrors: [],
          unassessedSubskills: []
        },
        writing: {
          category: 'writing',
          cefrRange: profile.current_level || 'B2',
          confidence: 'low',
          evidenceCount: 0,
          correctCount: 0,
          demonstratedStrengths: [],
          priorityWeaknesses: [],
          recurringErrors: [],
          unassessedSubskills: []
        },
        speaking: {
          category: 'speaking',
          cefrRange: 'Not Assessed (Optional)',
          confidence: 'low',
          evidenceCount: 0,
          correctCount: 0,
          demonstratedStrengths: [],
          priorityWeaknesses: ['Speech fluency requires audio session'],
          recurringErrors: [],
          unassessedSubskills: ['Spoken spontaneous output', 'Pronunciation']
        },
        listening: {
          category: 'listening',
          cefrRange: 'Not Assessed (Optional)',
          confidence: 'low',
          evidenceCount: 0,
          correctCount: 0,
          demonstratedStrengths: [],
          priorityWeaknesses: [],
          recurringErrors: [],
          unassessedSubskills: ['Spoken accent comprehension']
        }
      },
      overallCEFR: profile.current_level || 'B2',
      startedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    };

    // Generate first adaptive question
    const firstQ = await aiService.generateAdaptiveDiagnosticQuestion(initialSession, profile);
    initialSession.currentQuestion = firstQ;

    store.saveDiagnosticSession(userId, initialSession);
    res.json(initialSession);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/diagnostic/next-question', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const session = store.getDiagnosticSession(userId);
    if (!session) {
      return res.status(400).json({ error: 'No active diagnostic session' });
    }

    const profile = store.getProfile(userId);
    const nextQ = await aiService.generateAdaptiveDiagnosticQuestion(session, profile);
    session.currentQuestion = nextQ;
    session.currentIndex = session.history.length + 1;
    session.lastActiveAt = new Date().toISOString();

    store.saveDiagnosticSession(userId, session);
    res.json({ question: nextQ, session });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/diagnostic/submit-answer', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { question, userAnswer, durationSeconds = 0 } = req.body;
    let session = store.getDiagnosticSession(userId);
    if (!session) {
      return res.status(400).json({ error: 'No active diagnostic session' });
    }

    const profile = store.getProfile(userId);
    const { evaluation, writingRubric } = await aiService.evaluateDiagnosticAnswer(
      question,
      userAnswer,
      profile
    );

    // Record attempt
    const attempt = {
      id: `diag-att-${Date.now()}`,
      question,
      userAnswer,
      verdict: evaluation.verdict,
      evaluation,
      writingRubric,
      durationSeconds,
      timestamp: new Date().toISOString()
    };
    session.history.push(attempt);
    session.lastActiveAt = new Date().toISOString();

    const count = session.history.length;
    const hasGrammar = session.history.some(h => h.question.section === 'grammar');
    const hasVocab = session.history.some(h => h.question.section === 'vocabulary');
    const hasReading = session.history.some(h => h.question.section === 'reading');
    const hasWriting = session.history.some(h => h.question.section === 'writing');

    const canStop = count >= session.minQuestions && hasGrammar && hasVocab && hasReading && hasWriting;
    const mustStop = count >= session.maxQuestions;

    store.saveDiagnosticSession(userId, session);

    res.json({
      evaluation,
      writingRubric,
      canStop,
      mustStop,
      historyCount: count,
      minQuestions: session.minQuestions,
      maxQuestions: session.maxQuestions
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/diagnostic/pause', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const session = store.getDiagnosticSession(userId);
    if (session) {
      session.status = 'paused';
      session.lastActiveAt = new Date().toISOString();
      store.saveDiagnosticSession(userId, session);
    }
    res.json({ success: true, message: 'Assessment saved. You can resume anytime.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/diagnostic/complete', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const session = store.getDiagnosticSession(userId);
    if (!session) {
      return res.status(400).json({ error: 'No active diagnostic session' });
    }

    const profile = store.getProfile(userId);
    session.status = 'completed';
    session.completedAt = new Date().toISOString();

    const report = await aiService.computeDiagnosticReport(session, profile);
    store.saveDiagnosticReport(userId, report);

    const studyPlan = await aiService.generatePersonalizedStudyPlan(report, profile);
    store.saveStudyPlan(userId, studyPlan);

    const finalLevel = report.overallCEFR.includes('C1') ? 'C1' : report.overallCEFR.includes('B2') ? 'B2' : 'B1';
    store.updateProfile(userId, {
      current_level: finalLevel as any,
      goal_summary: `Calibrated at ${report.overallCEFR} based on adaptive diagnostic assessment.`
    });

    store.clearDiagnosticSession(userId);

    res.json({ report, studyPlan });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/diagnostic/reports', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const reports = store.getDiagnosticReports(userId);
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// PERSONALIZED STUDY PLAN ROUTES
// =========================================================================

app.get('/api/study-plan', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const plan = store.getStudyPlan(userId);
    res.json({ plan });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/study-plan/approve', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    let plan = store.getStudyPlan(userId);
    if (!plan) {
      return res.status(404).json({ error: 'No study plan to approve' });
    }

    const { adjustedMinutes, adjustedPriorities } = req.body;
    if (adjustedPriorities) {
      plan.prioritizedSkills = adjustedPriorities;
    }

    plan.learnerApprovalStatus = 'approved';
    plan.approvedAt = new Date().toISOString();
    store.saveStudyPlan(userId, plan);

    const updatedProfile = store.updateProfile(userId, {
      onboarding_completed: true,
      daily_minutes: adjustedMinutes || plan.dailyRoutineTemplate.reduce((acc, s) => acc + s.minutes, 0)
    });

    res.json({ success: true, plan, profile: updatedProfile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// LESSON GENERATION & QUESTIONS (CACHE-AWARE & BUDGET-AWARE)
// =========================================================================

app.post('/api/lesson/plan', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    let profile = store.getProfile(userId);
    const { daily_minutes, forceRegenerate } = req.body;
    if (typeof daily_minutes === 'number' && daily_minutes >= 5 && daily_minutes <= 120) {
      profile = store.updateProfile(userId, { daily_minutes });
    }

    const duration = typeof daily_minutes === 'number' ? daily_minutes : profile.daily_minutes;

    // Check if user already has an active, incomplete lesson to avoid wasteful re-generation on refresh
    const existingLessons = store.getLessons(userId);
    const activeIncomplete = existingLessons.find(l => l.status === 'in_progress');
    if (activeIncomplete && !forceRegenerate && activeIncomplete.estimated_duration_minutes === duration) {
      return res.json(activeIncomplete);
    }

    // If forcing a fresh lesson or duration changed, mark any prior incomplete lesson as completed
    if (activeIncomplete) {
      activeIncomplete.status = 'completed';
      store.saveLesson(userId, activeIncomplete);
    }

    const skills = store.getSkills(userId);
    const recentErrors = skills.flatMap(s => s.recurring_errors);

    const plan = await aiService.generateLessonPlan(profile, skills, recentErrors, duration);
    store.saveLesson(userId, plan);
    res.json(plan);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lesson/question', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { section, skillName, contextTopic, activityType, questionIndex, totalInActivity } = req.body;
    const profile = store.getProfile(userId);

    const question = await aiService.generateQuestion(
      section,
      profile,
      skillName,
      contextTopic,
      activityType,
      questionIndex,
      totalInActivity
    );

    if (question.vocab_card) {
      store.saveVocabularyItem(userId, question.vocab_card);
    }

    res.json(question);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lesson/evaluate', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { question, userAnswer, lessonId } = req.body;
    const profile = store.getProfile(userId);

    const evaluation = await aiService.evaluateAnswer(question, userAnswer, profile);

    const attempt: Attempt = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      lesson_id: lessonId || 'current-lesson',
      question_id: question.id,
      section: question.section,
      skill_name: question.skill_name,
      user_answer: userAnswer,
      verdict: evaluation.verdict,
      evaluation,
      created_at: new Date().toISOString()
    };

    store.recordAttempt(userId, attempt);

    if (question.vocab_card) {
      const isCorrect = evaluation.verdict === 'correct';
      const existingVocab = store.getVocabulary(userId).find(v => v.word.toLowerCase() === question.vocab_card!.word.toLowerCase());
      if (existingVocab) {
        store.saveVocabularyItem(userId, {
          ...existingVocab,
          times_correct: existingVocab.times_correct + (isCorrect ? 1 : 0),
          times_incorrect: existingVocab.times_incorrect + (isCorrect ? 0 : 1),
          review_stage: isCorrect ? Math.min(30, (existingVocab.review_stage * 2 || 3)) as any : 1
        });
      }
    }

    res.json(evaluation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lesson/tutor-assist', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { question, action } = req.body;
    const profile = store.getProfile(userId);
    const response = await aiService.tutorAssist(question, action, profile);
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lesson/summary', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { lesson, attempts, timeSpentMinutes } = req.body;
    const profile = store.getProfile(userId);
    const summary = await aiService.generateLessonSummary(lesson, attempts, profile, timeSpentMinutes);
    store.saveSummary(userId, summary);
    if (lesson?.lesson_id) {
      store.completeLesson(userId, lesson.lesson_id);
    }
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Setup Vite or static serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LinguaStep server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
