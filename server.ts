import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { store } from './server/storage.js';
import { aiService } from './server/aiService.js';
import { Attempt } from './src/types/learning.js';

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
    res.json({ profile, skills, vocabulary, attempts, lessons, summaries });
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

// Lesson generation & questions
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
    
    // If it comes with a vocab card, automatically register it in long-term memory
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
