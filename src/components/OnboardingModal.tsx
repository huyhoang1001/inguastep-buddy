import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Brain,
  Clock,
  Globe,
  Sliders,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { UserProfile, EnglishLevel, PrimaryGoal, ExplanationLanguage, FeedbackStyle } from '../types/learning.ts';
import { updateProfile, generateLessonPlan } from '../services/api.ts';

interface OnboardingModalProps {
  currentProfile: UserProfile;
  onComplete: () => void;
}

interface DiagnosticQuestion {
  id: string;
  category: string;
  prompt: string;
  options: Array<{ id: string; text: string }>;
  expectedId: string;
  clue: string;
}

const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: 'diag-1',
    category: 'Grammar in Context (Conditionals & Past Tenses)',
    prompt: 'If we ____ the architectural bottlenecks earlier, our release would not have stalled yesterday.',
    options: [
      { id: 'A', text: 'identified' },
      { id: 'B', text: 'had identified' },
      { id: 'C', text: 'would identify' },
      { id: 'D', text: 'have identified' }
    ],
    expectedId: 'B',
    clue: 'Third conditional for past hypothesis: "If + had + V3, would have + V3".'
  },
  {
    id: 'diag-2',
    category: 'Vocabulary in Context (Workplace Precision)',
    prompt: 'We implemented caching to ____ the performance degradation during peak hours.',
    options: [
      { id: 'A', text: 'mitigate' },
      { id: 'B', text: 'dismiss' },
      { id: 'C', text: 'decline' },
      { id: 'D', text: 'abolish' }
    ],
    expectedId: 'A',
    clue: 'Collocation "mitigate degradation / risk" means to lessen negative impact.'
  },
  {
    id: 'diag-3',
    category: 'Reading Comprehension & Inference',
    prompt: 'Passage: "Although microservices promise modularity, they inevitably increase operational complexity."\nWhat does the author imply?',
    options: [
      { id: 'A', text: 'Microservices eliminate all architectural trade-offs' },
      { id: 'B', text: 'Modularity comes with an engineering management cost' },
      { id: 'C', text: 'Microservices should never be adopted' },
      { id: 'D', text: 'Operational complexity is always easy to automate' }
    ],
    expectedId: 'B',
    clue: 'The contrast "promise modularity, but increase complexity" shows a trade-off cost.'
  }
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ currentProfile, onComplete }) => {
  // Conversational step: 1: Goal, 2: Level & Lang, 3: Pacing & Blend, 4: Diagnostic (1-by-1), 5: Draft Study Plan
  const [step, setStep] = useState<number>(1);
  const [goal, setGoal] = useState<PrimaryGoal>(currentProfile.primary_goal || 'workplace_tech');
  const [level, setLevel] = useState<EnglishLevel>(currentProfile.current_level || 'B2');
  const [targetLevel, setTargetLevel] = useState<EnglishLevel>('C1');
  const [language, setLanguage] = useState<ExplanationLanguage>(currentProfile.explanation_language || 'vi');
  const [dailyMinutes, setDailyMinutes] = useState<number>(currentProfile.daily_minutes || 20);
  const [generalRatio, setGeneralRatio] = useState<number>(currentProfile.general_vs_work_ratio || 65);
  const [feedbackStyle, setFeedbackStyle] = useState<FeedbackStyle>('encouraging');

  // Diagnostic state
  const [diagIndex, setDiagIndex] = useState<number>(0);
  const [diagAnswers, setDiagAnswers] = useState<Record<string, string>>({});
  const [diagScore, setDiagScore] = useState<number>(0);

  // Draft Plan state
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [draftPlanSummary, setDraftPlanSummary] = useState<string>('');

  const handleNextStep = async () => {
    if (step === 3) {
      // Move to diagnostic
      setStep(4);
    } else if (step === 4) {
      // Diagnostic complete, generate draft study plan
      setIsGeneratingPlan(true);
      setStep(5);
      
      const updated = await updateProfile({
        primary_goal: goal,
        current_level: level,
        target_level: targetLevel,
        explanation_language: language,
        daily_minutes: dailyMinutes,
        general_vs_work_ratio: generalRatio,
        feedback_style: feedbackStyle,
        goal_summary: `Targeting ${targetLevel} with focus on ${goal.replace('_', ' ')}. Diagnostic score: ${diagScore}/${DIAGNOSTIC_QUESTIONS.length}.`
      });

      try {
        const plan = await generateLessonPlan();
        setDraftPlanSummary(plan.primary_objective || 'Balanced B2 Grammar, Technical Collocations, and Engineering Updates.');
      } catch (err) {
        setDraftPlanSummary('Adaptive grammar foundation with 65% general and 35% workplace English collocations.');
      } finally {
        setIsGeneratingPlan(false);
      }
    } else {
      setStep(step + 1);
    }
  };

  const handleDiagSelect = (optionId: string) => {
    const currentQ = DIAGNOSTIC_QUESTIONS[diagIndex];
    const isCorrect = optionId === currentQ.expectedId;
    const newAnswers = { ...diagAnswers, [currentQ.id]: optionId };
    setDiagAnswers(newAnswers);

    if (isCorrect) {
      setDiagScore(prev => prev + 1);
    }

    if (diagIndex < DIAGNOSTIC_QUESTIONS.length - 1) {
      setDiagIndex(diagIndex + 1);
    } else {
      // Finished all diagnostic questions
      handleNextStep();
    }
  };

  const handleActivatePlan = async () => {
    await updateProfile({
      onboarding_completed: true
    });
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Progress header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">LinguaStep Tutor Setup</h2>
              <p className="text-xs text-slate-400">Step {step} of 5 • Discovery & Placement</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className={`w-6 h-1.5 rounded-full transition-all ${
                  i === step
                    ? 'bg-indigo-500 w-8'
                    : i < step
                    ? 'bg-emerald-500'
                    : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: PRIMARY GOAL */}
        {step === 1 && (
          <div className="py-6 space-y-5">
            <div>
              <span className="text-xs uppercase font-semibold text-indigo-400 tracking-wider">Discovery 1</span>
              <h3 className="text-xl font-bold text-white mt-1">What is your primary English goal right now?</h3>
              <p className="text-sm text-slate-400 mt-1">
                We will tailor real-world sentence examples, reading articles, and collocations around this.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  id: 'workplace_tech',
                  title: 'Workplace & Software Engineering (Recommended)',
                  desc: 'Standups, code reviews, architectural trade-offs, Jira tickets, and clear status updates.'
                },
                {
                  id: 'conversation',
                  title: 'Natural Daily Conversation',
                  desc: 'Casual fluency, idiomatic phrasal verbs, social nuance, and confidence.'
                },
                {
                  id: 'reading_writing',
                  title: 'Deep Reading & Technical Writing',
                  desc: 'Articles, documentation, precise grammar, and structured paragraphs.'
                },
                {
                  id: 'balanced',
                  title: 'Balanced Professional & General English',
                  desc: '65% everyday English combined with 35% workplace communication.'
                }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setGoal(opt.id as PrimaryGoal)}
                  className={`w-full text-left p-4 rounded-2xl border transition flex items-start space-x-3.5 ${
                    goal === opt.id
                      ? 'bg-indigo-950/40 border-indigo-500/80 ring-1 ring-indigo-500/50'
                      : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    goal === opt.id ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-600'
                  }`}>
                    {goal === opt.id && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-white">{opt.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleNextStep}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/30"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: LEVEL & LANGUAGE */}
        {step === 2 && (
          <div className="py-6 space-y-6">
            <div>
              <span className="text-xs uppercase font-semibold text-indigo-400 tracking-wider">Discovery 2</span>
              <h3 className="text-xl font-bold text-white mt-1">Current Estimated Level & Explanation Language</h3>
              <p className="text-sm text-slate-400 mt-1">
                We'll start at this baseline and adjust based on your actual answers.
              </p>
            </div>

            {/* Level selection */}
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                Estimated English Level
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { lvl: 'A2', label: 'A2 Elementary', desc: 'Basic sentences' },
                  { lvl: 'B1', label: 'B1 Intermediate', desc: 'Everyday topics' },
                  { lvl: 'B2', label: 'B2 Upper-Int (Default)', desc: 'Workplace & complex ideas' },
                  { lvl: 'C1', label: 'C1 Advanced', desc: 'Nuanced & fluent' }
                ].map(item => (
                  <button
                    key={item.lvl}
                    onClick={() => setLevel(item.lvl as EnglishLevel)}
                    className={`p-3 rounded-xl border text-left transition ${
                      level === item.lvl
                        ? 'bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500'
                        : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-bold text-sm text-white block">{item.lvl}</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Explanation Language */}
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                Tutor Explanation Language
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setLanguage('vi')}
                  className={`p-4 rounded-xl border text-left transition flex items-center space-x-3 ${
                    language === 'vi'
                      ? 'bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  <Globe className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Tiếng Việt (Recommended)</h4>
                    <p className="text-xs text-slate-400">Giải thích quy tắc & gợi ý bằng tiếng Việt, ví dụ tiếng Anh</p>
                  </div>
                </button>

                <button
                  onClick={() => setLanguage('en')}
                  className={`p-4 rounded-xl border text-left transition flex items-center space-x-3 ${
                    language === 'en'
                      ? 'bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  <BookOpen className="w-5 h-5 text-sky-400" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Full English</h4>
                    <p className="text-xs text-slate-400">100% immersive English explanations & examples</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm"
              >
                Back
              </button>
              <button
                onClick={handleNextStep}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/30"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PACING & TOPIC BLEND */}
        {step === 3 && (
          <div className="py-6 space-y-6">
            <div>
              <span className="text-xs uppercase font-semibold text-indigo-400 tracking-wider">Discovery 3</span>
              <h3 className="text-xl font-bold text-white mt-1">Available Time & Topic Ratio</h3>
              <p className="text-sm text-slate-400 mt-1">
                Keep sessions achievable every day. You can change this anytime.
              </p>
            </div>

            {/* Daily Minutes */}
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                Daily Minutes Available
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { min: 10, label: '10 mins', desc: 'Short micro-session' },
                  { min: 20, label: '20 mins (Recommended)', desc: 'Grammar + Vocab focus' },
                  { min: 35, label: '35 mins', desc: 'Full 4-part immersion' }
                ].map(item => (
                  <button
                    key={item.min}
                    onClick={() => setDailyMinutes(item.min)}
                    className={`p-3.5 rounded-xl border text-left transition ${
                      dailyMinutes === item.min
                        ? 'bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500'
                        : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 text-white font-bold text-sm">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-1">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* General vs Workplace Ratio */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Topic Balance
                </span>
                <span className="text-xs font-bold text-indigo-300">
                  {generalRatio}% Everyday / {100 - generalRatio}% Workplace & Tech
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="80"
                step="5"
                value={generalRatio}
                onChange={e => setGeneralRatio(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-2">
                <span>More Workplace (Tech/Eng)</span>
                <span>Default (65 / 35)</span>
                <span>More Everyday General</span>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm"
              >
                Back
              </button>
              <button
                onClick={handleNextStep}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/30"
              >
                <span>Take Short Diagnostic</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: ADAPTIVE 1-BY-1 DIAGNOSTIC */}
        {step === 4 && (
          <div className="py-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-semibold text-indigo-400 tracking-wider">Diagnostic Placement</span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Question {diagIndex + 1} of {DIAGNOSTIC_QUESTIONS.length}
                </h3>
              </div>
              <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                {DIAGNOSTIC_QUESTIONS[diagIndex].category}
              </span>
            </div>

            <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-5">
              <p className="text-base text-slate-100 font-medium whitespace-pre-line leading-relaxed">
                {DIAGNOSTIC_QUESTIONS[diagIndex].prompt}
              </p>
            </div>

            <div className="space-y-2.5">
              {DIAGNOSTIC_QUESTIONS[diagIndex].options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleDiagSelect(opt.id)}
                  className="w-full text-left p-4 rounded-xl border border-slate-700/80 bg-slate-800/50 hover:bg-indigo-950/40 hover:border-indigo-500/80 transition flex items-center space-x-3 text-slate-200 hover:text-white"
                >
                  <span className="w-6 h-6 rounded-lg bg-slate-700 flex items-center justify-center font-bold text-xs text-indigo-300 shrink-0">
                    {opt.id}
                  </span>
                  <span className="text-sm font-medium">{opt.text}</span>
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-400 text-center italic">
              Answer one question at a time. No stress—this simply tunes your starting difficulty!
            </p>
          </div>
        )}

        {/* STEP 5: STUDY PLAN SUMMARY */}
        {step === 5 && (
          <div className="py-6 space-y-6">
            <div>
              <span className="text-xs uppercase font-semibold text-emerald-400 tracking-wider">Study Plan Ready</span>
              <h3 className="text-xl font-bold text-white mt-1">Your Personalized English Study Plan</h3>
              <p className="text-sm text-slate-400 mt-1">
                Diagnostic score: <strong className="text-emerald-400">{diagScore}/{DIAGNOSTIC_QUESTIONS.length}</strong>. Starting baseline calibrated to <strong className="text-indigo-300">{level}</strong>.
              </p>
            </div>

            {isGeneratingPlan ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-300">Customizing your daily learning schedule...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-2xl p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 block mb-1">
                    Daily Objective
                  </span>
                  <p className="text-base font-semibold text-white">
                    {draftPlanSummary}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                    <span className="text-slate-400 block mb-0.5">Lesson Pace</span>
                    <strong className="text-slate-200 text-sm">{dailyMinutes} mins/session</strong>
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                    <span className="text-slate-400 block mb-0.5">Topic Distribution</span>
                    <strong className="text-slate-200 text-sm">{generalRatio}% General / {100 - generalRatio}% Workplace</strong>
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                    <span className="text-slate-400 block mb-0.5">Explanation Mode</span>
                    <strong className="text-slate-200 text-sm">{language === 'vi' ? 'Tiếng Việt' : 'English'}</strong>
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                    <span className="text-slate-400 block mb-0.5">Teaching Rule</span>
                    <strong className="text-slate-200 text-sm">1 Question at a Time</strong>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleActivatePlan}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-sm transition shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2"
                  >
                    <span>Activate Plan & Start Day 1 Lesson</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
