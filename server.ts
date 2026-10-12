import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { store } from './server/storage.js';
import { aiService } from './server/aiService.js';
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

// --- API ROUTES ---

// Health & Status
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    timestamp: new Date().toISOString()
  });
});

// Profile endpoints
app.get('/api/profile', (req: Request, res: Response) => {
  try {
    const profile = store.getProfile();
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/profile', (req: Request, res: Response) => {
  try {
    const updated = store.updateProfile(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Memory / Learning Data endpoints
app.get('/api/memory', (req: Request, res: Response) => {
  try {
    const profile = store.getProfile();
    const skills = store.getSkills();
    const vocabulary = store.getVocabulary();
    const attempts = store.getAttempts();
    const lessons = store.getLessons();
    const summaries = store.getSummaries();
    const diagnosticReports = store.getDiagnosticReports();
    const studyPlan = store.getStudyPlan();
    res.json({ profile, skills, vocabulary, attempts, lessons, summaries, diagnosticReports, studyPlan });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/memory/clear', (req: Request, res: Response) => {
  try {
    store.clearAll();
    res.json({ success: true, message: 'Learning data successfully reset.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/memory/import', (req: Request, res: Response) => {
  try {
    store.importAll(req.body);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/memory/export', (req: Request, res: Response) => {
  try {
    const exported = store.exportAll();
    res.json(exported);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vocabulary item updates
app.post('/api/vocabulary/save', (req: Request, res: Response) => {
  try {
    const saved = store.saveVocabularyItem(req.body);
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
    const profile = store.getProfile();
    let discoveryState = store.getDiscoveryState();

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
      store.saveDiscoveryState(discoveryState);
    }

    res.json(discoveryState);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/discovery/message', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    let discoveryState = store.getDiscoveryState();
    const profile = store.getProfile();

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
      store.updateProfile(result.updatedProfile);
    }

    discoveryState.currentDimensionIndex += 1;
    discoveryState.isConfirmed = result.isDiscoveryComplete;
    if (result.confirmationSummary) {
      discoveryState.summary = result.confirmationSummary;
    }
    discoveryState.updatedAt = new Date().toISOString();

    store.saveDiscoveryState(discoveryState);
    res.json(discoveryState);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/discovery/confirm', (req: Request, res: Response) => {
  try {
    const discoveryState = store.getDiscoveryState();
    if (discoveryState) {
      discoveryState.isConfirmed = true;
      store.saveDiscoveryState(discoveryState);
    }
    const profile = store.getProfile();
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
    const session = store.getDiagnosticSession();
    res.json({ session });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/diagnostic/start', async (req: Request, res: Response) => {
  try {
    const { mode = 'standard' } = req.body as { mode: DiagnosticMode };
    const profile = store.getProfile();

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

    store.saveDiagnosticSession(initialSession);
    res.json(initialSession);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/diagnostic/next-question', async (req: Request, res: Response) => {
  try {
    const session = store.getDiagnosticSession();
    if (!session) {
      return res.status(400).json({ error: 'No active diagnostic session' });
    }

    const profile = store.getProfile();
    const nextQ = await aiService.generateAdaptiveDiagnosticQuestion(session, profile);
    session.currentQuestion = nextQ;
    session.currentIndex = session.history.length + 1;
    session.lastActiveAt = new Date().toISOString();

    store.saveDiagnosticSession(session);
    res.json({ question: nextQ, session });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/diagnostic/submit-answer', async (req: Request, res: Response) => {
  try {
    const { question, userAnswer, durationSeconds = 0 } = req.body;
    let session = store.getDiagnosticSession();
    if (!session) {
      return res.status(400).json({ error: 'No active diagnostic session' });
    }

    const profile = store.getProfile();
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

    // Check adaptive stopping rule:
    // Has answered minimum questions AND covered all 4 core dimensions (grammar, vocab, reading, writing)?
    const count = session.history.length;
    const hasGrammar = session.history.some(h => h.question.section === 'grammar');
    const hasVocab = session.history.some(h => h.question.section === 'vocabulary');
    const hasReading = session.history.some(h => h.question.section === 'reading');
    const hasWriting = session.history.some(h => h.question.section === 'writing');

    const canStop = count >= session.minQuestions && hasGrammar && hasVocab && hasReading && hasWriting;
    const mustStop = count >= session.maxQuestions;

    store.saveDiagnosticSession(session);

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
    const session = store.getDiagnosticSession();
    if (session) {
      session.status = 'paused';
      session.lastActiveAt = new Date().toISOString();
      store.saveDiagnosticSession(session);
    }
    res.json({ success: true, message: 'Assessment saved. You can resume anytime.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/diagnostic/complete', async (req: Request, res: Response) => {
  try {
    const session = store.getDiagnosticSession();
    if (!session) {
      return res.status(400).json({ error: 'No active diagnostic session' });
    }

    const profile = store.getProfile();
    session.status = 'completed';
    session.completedAt = new Date().toISOString();

    // Generate comprehensive diagnostic report
    const report = await aiService.computeDiagnosticReport(session, profile);
    store.saveDiagnosticReport(report);

    // Generate personalized study plan
    const studyPlan = await aiService.generatePersonalizedStudyPlan(report, profile);
    store.saveStudyPlan(studyPlan);

    // Update profile level with confirmed CEFR estimate
    const finalLevel = report.overallCEFR.includes('C1') ? 'C1' : report.overallCEFR.includes('B2') ? 'B2' : 'B1';
    store.updateProfile({
      current_level: finalLevel as any,
      goal_summary: `Calibrated at ${report.overallCEFR} based on adaptive diagnostic assessment.`
    });

    // Clear active session since completed
    store.clearDiagnosticSession();

    res.json({ report, studyPlan });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/diagnostic/reports', (req: Request, res: Response) => {
  try {
    const reports = store.getDiagnosticReports();
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
    const plan = store.getStudyPlan();
    res.json({ plan });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/study-plan/approve', (req: Request, res: Response) => {
  try {
    let plan = store.getStudyPlan();
    if (!plan) {
      return res.status(404).json({ error: 'No study plan to approve' });
    }

    const { adjustedMinutes, adjustedPriorities } = req.body;
    if (adjustedPriorities) {
      plan.prioritizedSkills = adjustedPriorities;
    }

    plan.learnerApprovalStatus = 'approved';
    plan.approvedAt = new Date().toISOString();
    store.saveStudyPlan(plan);

    // Mark onboarding fully completed
    const updatedProfile = store.updateProfile({
      onboarding_completed: true,
      daily_minutes: adjustedMinutes || plan.dailyRoutineTemplate.reduce((acc, s) => acc + s.minutes, 0)
    });

    res.json({ success: true, plan, profile: updatedProfile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// LESSON GENERATION & QUESTIONS (EXISTING CORE DAILY FLOW)
// =========================================================================

app.post('/api/lesson/plan', async (req: Request, res: Response) => {
  try {
    const profile = store.getProfile();
    const skills = store.getSkills();
    const recentErrors = skills.flatMap(s => s.recurring_errors);

    const plan = await aiService.generateLessonPlan(profile, skills, recentErrors);
    store.saveLesson(plan);
    res.json(plan);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lesson/question', async (req: Request, res: Response) => {
  try {
    const { section, skillName, contextTopic } = req.body;
    const profile = store.getProfile();
    const question = await aiService.generateQuestion(section, profile, skillName, contextTopic);
    
    // Automatically register vocab card
    if (question.vocab_card) {
      store.saveVocabularyItem(question.vocab_card);
    }

    res.json(question);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lesson/evaluate', async (req: Request, res: Response) => {
  try {
    const { question, userAnswer, lessonId } = req.body;
    const profile = store.getProfile();

    const evaluation = await aiService.evaluateAnswer(question, userAnswer, profile);

    // Persist attempt
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

    store.recordAttempt(attempt);

    // If vocab question, update times_correct or times_incorrect
    if (question.vocab_card) {
      const isCorrect = evaluation.verdict === 'correct';
      const existingVocab = store.getVocabulary().find(v => v.word.toLowerCase() === question.vocab_card!.word.toLowerCase());
      if (existingVocab) {
        store.saveVocabularyItem({
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
    const { question, action } = req.body;
    const profile = store.getProfile();
    const response = await aiService.tutorAssist(question, action, profile);
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lesson/summary', async (req: Request, res: Response) => {
  try {
    const { lesson, attempts } = req.body;
    const profile = store.getProfile();
    const summary = await aiService.generateLessonSummary(lesson, attempts, profile);
    store.saveSummary(summary);
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
