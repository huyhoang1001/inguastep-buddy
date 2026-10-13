import { aiService } from '../server/aiService.js';
import { UserProfile, Question, AnswerEvaluation } from '../src/types/learning.js';

async function runWritingAndDeepDiveTests() {
  console.log('=== RUNNING WRITING POLISHING & TUTOR DEEP-DIVE INQUIRY TESTS ===\n');

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

  const mockProfile: UserProfile = {
    id: 'test-user',
    name: 'Hoang',
    current_level: 'B2',
    target_level: 'C1',
    primary_goal: 'workplace_tech',
    daily_minutes: 20,
    explanation_language: 'vi',
    general_vs_work_ratio: 70,
    struggles: [],
    goal_summary: 'Workplace and tech communication',
    days_per_week: 5,
    feedback_style: 'encouraging',
    enable_audio_tips: true,
    onboarding_completed: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // -------------------------------------------------------------------------
  // Test 1: Writing Polishing & Non-Identity
  // -------------------------------------------------------------------------
  console.log('--- Test 1: Writing Native Phrasing & Dynamic Useful Phrases ---');

  const writingQuestion: Question = {
    id: 'test-writing-q1',
    section: 'writing',
    skill_id: 'workplace_status_updates',
    skill_name: 'Workplace Status Updates',
    question_type: 'free_writing',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    prompt: 'Write a 2-3 sentence update on Slack regarding a delay in deploying the user authentication service.',
    hint: 'Mention what happened and when you expect to push the fix.',
    explanation_rule: 'State the situation clearly, followed by action being taken and revised timeline.'
  };

  const rawUserWriting = 'I have complete the task yesterday and send to manager, but server have bug so delay.';

  const writingEval = await aiService.evaluateAnswer(writingQuestion, rawUserWriting, mockProfile);

  assert(Boolean(writingEval.corrected_text), 'Evaluation contains corrected_text (Natural Native Phrasing)');
  assert(writingEval.corrected_text !== rawUserUserWriting(), 'Corrected native phrasing is NOT identical to raw student input');
  assert(Boolean(writingEval.key_corrections && writingEval.key_corrections.length > 0), 'Evaluation contains concrete key corrections');
  assert(Boolean(writingEval.useful_phrases && writingEval.useful_phrases.length >= 2), 'Evaluation contains dynamic useful phrases for this context');

  function rawUserUserWriting() {
    return rawUserWriting.trim();
  }

  const firstPhrase = writingEval.useful_phrases ? writingEval.useful_phrases[0] : null;
  assert(Boolean(firstPhrase && (typeof firstPhrase === 'string' || firstPhrase.phrase)), 'Useful phrase contains valid phrase string');
  assert(Boolean(writingEval.reusable_pattern && writingEval.reusable_pattern.length > 10), 'Evaluation provides a substantive reusable pattern');

  // -------------------------------------------------------------------------
  // Test 2: Context Sensitivity of Useful Phrases
  // -------------------------------------------------------------------------
  console.log('--- Test 2: Context Sensitivity of Useful Phrases & Corrections ---');

  const meetingQuestion: Question = {
    id: 'test-writing-q2',
    section: 'writing',
    skill_id: 'meeting_sync_summaries',
    skill_name: 'Meeting Summaries',
    question_type: 'free_writing',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    prompt: 'Write an email summary after our sprint planning meeting about agreed priorities.',
    hint: 'Highlight consensus and deadlines.',
    explanation_rule: 'Use alignment verbs like align, agree, and table.'
  };

  const meetingUserWriting = 'In meeting we discussed about new design and because of budget so we will decide next time.';
  const meetingEval = await aiService.evaluateAnswer(meetingQuestion, meetingUserWriting, mockProfile);

  assert(meetingEval.corrected_text !== meetingUserWriting.trim(), 'Meeting email rewrite is polished beyond raw input');
  assert(
    Boolean(meetingEval.key_corrections?.some(kc => kc.original.includes('discussed about') || kc.original.includes('because'))),
    'Detected redundant preposition or connector error'
  );

  // -------------------------------------------------------------------------
  // Test 3: Tutor Deep-Dive Inquiry for Vocabulary Nuances
  // -------------------------------------------------------------------------
  console.log('--- Test 3: Tutor Deep-Dive for Vocabulary Nuances (mitigate vs prevent) ---');

  const vocabQuestion: Question = {
    id: 'test-vocab-q1',
    section: 'vocabulary',
    skill_id: 'collocation_mitigate',
    skill_name: 'Professional Collocations',
    question_type: 'multiple_choice',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    prompt: 'Which word best collocates with "risk" to mean reducing its potential negative impact?',
    options: [
      { id: 'A', text: 'mitigate' },
      { id: 'B', text: 'cancel' },
      { id: 'C', text: 'forbid' },
      { id: 'D', text: 'demolish' }
    ],
    expected_answer_ids: ['A'],
    expected_answer_text: 'mitigate',
    hint: 'Think about reducing severity rather than outright elimination.',
    explanation_rule: 'To "mitigate risk" is the standard professional collocation for diminishing severity.',
    vocab_card: {
      word: 'mitigate',
      part_of_speech: 'verb',
      ipa: '/ˈmɪt.ɪ.ɡeɪt/',
      pronunciation_tip: 'Trọng âm rơi vào âm tiết đầu tiên MIT-i-gate.',
      meaning: 'Làm giảm nhẹ, giảm bớt mức độ nghiêm trọng của rủi ro/sự cố.',
      collocation_pattern: 'mitigate risk / impact / consequences / technical debt',
      example_workplace: 'We implemented caching to mitigate database latency.',
      example_general: 'Planting trees helps mitigate the effects of climate change.',
      similar_word_comparison: {
        word: 'prevent',
        difference: 'Khác với "prevent" (ngăn chặn triệt để không cho xảy ra), "mitigate" chấp nhận rủi ro có thể xảy ra và tìm cách giảm nhẹ thiệt hại.'
      }
    }
  };

  const deepDiveVocabResponse = await aiService.deepDiveInquiry(
    vocabQuestion,
    'mitigate',
    undefined,
    'What is the difference between mitigate, prevent, and alleviate? When should I use each?',
    [],
    mockProfile
  );

  assert(Boolean(deepDiveVocabResponse.reply && deepDiveVocabResponse.reply.length > 50), 'Tutor replied with detailed explanation');
  assert(
    Boolean(
      deepDiveVocabResponse.reply.toLowerCase().includes('mitigate') &&
      deepDiveVocabResponse.reply.toLowerCase().includes('prevent')
    ),
    'Tutor reply explicitly contrasts mitigate and prevent'
  );
  assert(
    Boolean(deepDiveVocabResponse.similar_words_comparison && deepDiveVocabResponse.similar_words_comparison.length >= 2),
    'Tutor provides structured similar words comparison cards'
  );
  assert(
    Boolean(deepDiveVocabResponse.suggestedFollowUps && deepDiveVocabResponse.suggestedFollowUps.length > 0),
    'Tutor provides suggested follow-up inquiry prompts'
  );

  // -------------------------------------------------------------------------
  // Test 4: Tutor Deep-Dive Inquiry for Grammar Rationale
  // -------------------------------------------------------------------------
  console.log('--- Test 4: Tutor Deep-Dive for Grammar Timeline & Rules ---');

  const grammarQuestion: Question = {
    id: 'test-grammar-q1',
    section: 'grammar',
    skill_id: 'past_perfect_narrative',
    skill_name: 'Past Perfect vs Past Simple',
    question_type: 'fill_in_blank',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    prompt: 'By the time QA began testing, we ____ (deploy) the hotfix to staging.',
    expected_answer_text: 'had deployed',
    hint: 'Use past perfect for the action completed before another past event.',
    explanation_rule: 'When an action occurs prior to another past time anchor ("by the time"), use past perfect (had + past participle).'
  };

  const deepDiveGrammarResponse = await aiService.deepDiveInquiry(
    grammarQuestion,
    'had deployed',
    undefined,
    'Why can we not just say "we deployed"? Is it wrong?',
    [],
    mockProfile
  );

  assert(Boolean(deepDiveGrammarResponse.reply), 'Tutor replied to grammar inquiry');
  assert(
    Boolean(
      deepDiveGrammarResponse.reply.includes('Past Perfect') ||
      deepDiveGrammarResponse.reply.includes('quá khứ') ||
      deepDiveGrammarResponse.reply.includes('had')
    ),
    'Tutor reply addresses the temporal past perfect rule'
  );
  assert(
    Boolean(deepDiveGrammarResponse.examples && deepDiveGrammarResponse.examples.length > 0),
    'Tutor supplied example sentences for grammar usage'
  );

  console.log('\n========================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runWritingAndDeepDiveTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
