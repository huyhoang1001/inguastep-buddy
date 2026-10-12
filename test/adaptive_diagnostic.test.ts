import { GeminiLearningProvider } from '../server/aiService.js';
import { DIAGNOSTIC_BANK } from '../server/diagnosticBank.js';
import { DiagnosticSession, UserProfile, Question } from '../src/types/learning.js';

async function runTests() {
  console.log('=== RUNNING ADAPTIVE DIAGNOSTIC ASSESSMENT TESTS ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName}`);
      failed++;
    }
  }

  const ai = new GeminiLearningProvider();

  const mockProfile: UserProfile = {
    id: 'test-learner',
    name: 'Test Learner',
    current_level: 'B2',
    target_level: 'C1',
    primary_goal: 'workplace_tech',
    goal_summary: 'Targeting technical communication',
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

  // TEST 1: Question Bank Integrity
  console.log('--- Test 1: Diagnostic Question Bank ---');
  assert(DIAGNOSTIC_BANK.length >= 10, 'Diagnostic bank has at least 10 calibrated items');
  const sectionsInBank = new Set(DIAGNOSTIC_BANK.map(i => i.category));
  assert(sectionsInBank.has('grammar') && sectionsInBank.has('vocabulary') && sectionsInBank.has('reading') && sectionsInBank.has('writing'),
    'Bank covers all 4 core dimensions (grammar, vocabulary, reading, writing)');

  // TEST 2: Adaptive Question Generation & Selection
  console.log('\n--- Test 2: Adaptive Question Selection ---');
  const mockSession: DiagnosticSession = {
    sessionId: 'test-session-1',
    mode: 'standard',
    status: 'in_progress',
    currentIndex: 1,
    minQuestions: 8,
    maxQuestions: 14,
    history: [],
    currentEstimates: {} as any,
    overallCEFR: 'B2',
    startedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString()
  };

  const q1 = await ai.generateAdaptiveDiagnosticQuestion(mockSession, mockProfile);
  assert(Boolean(q1 && q1.prompt), 'Generated first adaptive question successfully');
  assert(q1.section === 'grammar', 'First question begins with grammar balance');

  // Push mock attempt
  mockSession.history.push({
    id: 'att-1',
    question: q1,
    userAnswer: 'had already completed',
    verdict: 'correct',
    evaluation: {
      verdict: 'correct',
      user_answer: 'had already completed',
      expected_answer: 'had already completed',
      full_correct_sentence: q1.prompt,
      decisive_clue: 'Past Perfect',
      explanation: 'Correct',
      error_tags: [],
      needs_retry: false,
      next_action: 'continue'
    },
    timestamp: new Date().toISOString()
  });

  // Next question should target a different dimension (e.g. vocabulary) to ensure coverage
  const q2 = await ai.generateAdaptiveDiagnosticQuestion(mockSession, mockProfile);
  assert(q2.id !== q1.id, 'Next question does not duplicate previously answered item');
  assert(q2.section === 'vocabulary', 'Next adaptive question balances into vocabulary');

  // TEST 3: Multi-Dimensional Writing Evaluation
  console.log('\n--- Test 3: Multi-Dimensional Writing Evaluation ---');
  const writingQ: Question = {
    id: 'test-wq',
    section: 'writing',
    skill_id: 'test_writing',
    skill_name: 'Workplace Blocker Update',
    question_type: 'free_writing',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    prompt: 'Write 3-4 sentences updating your team on a bug.',
    hint: 'State issue and time.',
    explanation_rule: 'Check tenses.'
  };

  const studentWriting = 'I encountered an unexpected database connection error during deployment. I am currently reviewing the server configuration logs with the backend team. I anticipate deploying the fix by 3 PM.';
  const writingResult = await ai.evaluateDiagnosticAnswer(writingQ, studentWriting, mockProfile);

  assert(writingResult.evaluation.verdict === 'correct', 'High-quality writing response evaluated as correct/pass');
  assert(Boolean(writingResult.writingRubric), 'Writing rubric generated with multi-dimensional scores');
  if (writingResult.writingRubric) {
    assert(writingResult.writingRubric.accuracy >= 3, 'Rubric scored accuracy >= 3');
    assert(writingResult.writingRubric.taskCompletion >= 3, 'Rubric scored task completion >= 3');
  }

  // TEST 4: Diagnostic Report Computation
  console.log('\n--- Test 4: Diagnostic Report & Honest Audio Capability ---');
  // Add reading and writing attempts to satisfy coverage
  mockSession.history.push({
    id: 'att-2',
    question: q2,
    userAnswer: 'mitigate',
    verdict: 'correct',
    evaluation: { verdict: 'correct', user_answer: 'mitigate', expected_answer: 'mitigate', full_correct_sentence: '', decisive_clue: '', explanation: '', error_tags: [], needs_retry: false, next_action: 'continue' },
    timestamp: new Date().toISOString()
  });
  mockSession.history.push({
    id: 'att-3',
    question: { id: 'rq', section: 'reading', skill_id: 'r1', skill_name: 'Reading', question_type: 'reading_comprehension', difficulty: 'B2', context_topic: 'workplace_tech', prompt: 'Reading Q', hint: '', explanation_rule: '' },
    userAnswer: 'B',
    verdict: 'correct',
    evaluation: { verdict: 'correct', user_answer: 'B', expected_answer: 'B', full_correct_sentence: '', decisive_clue: '', explanation: '', error_tags: [], needs_retry: false, next_action: 'continue' },
    timestamp: new Date().toISOString()
  });
  mockSession.history.push({
    id: 'att-4',
    question: writingQ,
    userAnswer: studentWriting,
    verdict: 'correct',
    evaluation: writingResult.evaluation,
    writingRubric: writingResult.writingRubric,
    timestamp: new Date().toISOString()
  });

  const report = await ai.computeDiagnosticReport(mockSession, mockProfile);
  assert(Boolean(report.overallCEFR), `Report computed overall CEFR level: ${report.overallCEFR}`);
  assert(report.skillEstimates.speaking.cefrRange.includes('Not Assessed'), 'Speaking honestly marked as Not Assessed in text diagnostic');
  assert(report.skillEstimates.listening.cefrRange.includes('Not Assessed'), 'Listening honestly marked as Not Assessed in text diagnostic');

  // TEST 5: Evidence-Grounded Study Plan Generation
  console.log('\n--- Test 5: Personalized Study Plan Generation ---');
  const plan = await ai.generatePersonalizedStudyPlan(report, mockProfile);
  assert(Boolean(plan.overallObjective), 'Study plan contains overall objective');
  assert(plan.prioritizedSkills.length >= 2, 'Study plan contains prioritized skills');
  assert(Boolean(plan.prioritizedSkills[0].rationale), 'Prioritized skills include explicit rationale grounded in assessment');
  assert(plan.dailyRoutineTemplate.length === 4, 'Daily routine template has 4 flexible sections (Grammar, Vocab, Reading, Writing)');
  assert(plan.learnerApprovalStatus === 'draft', 'Study plan is created in draft status awaiting learner approval');

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
