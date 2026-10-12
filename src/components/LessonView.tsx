import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Lightbulb,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Volume2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Mic,
  MicOff,
  Flame,
  Check,
  PauseCircle,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import {
  UserProfile,
  LessonPlan,
  Question,
  AnswerEvaluation,
  SectionType,
  TutorAssistantResponse
} from '../types/learning.ts';
import { VocabularyCard } from './VocabularyCard.tsx';
import {
  generateQuestion,
  evaluateAnswer,
  requestTutorAssist,
  playEnglishSpeech
} from '../services/api.ts';

interface LessonViewProps {
  profile: UserProfile;
  plan: LessonPlan;
  onFinishLesson: (attempts: Array<{ question: Question; evaluation: AnswerEvaluation; userAnswer: string }>) => void;
  onOpenSummary: () => void;
}

export const LessonView: React.FC<LessonViewProps> = ({
  profile,
  plan,
  onFinishLesson,
  onOpenSummary
}) => {
  // Current section navigation
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(0);
  const activeSectionPlan = plan.sections[currentSectionIndex] || plan.sections[0];
  const currentSection = activeSectionPlan.section;

  // Question & State
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState<boolean>(true);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);

  // Lesson attempts accumulation
  const [lessonAttempts, setLessonAttempts] = useState<
    Array<{ question: Question; evaluation: AnswerEvaluation; userAnswer: string }>
  >([]);

  // Tutor Assist state
  const [tutorAssistData, setTutorAssistData] = useState<TutorAssistantResponse | null>(null);
  const [isLoadingAssist, setIsLoadingAssist] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);

  // Short session mode toggle
  const [isShortSession, setIsShortSession] = useState<boolean>(false);

  // Voice recording state for writing/speaking
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);

  // Check speech recognition capability
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setSpeechSupported(true);
    }
  }, []);

  // Fetch question whenever section changes
  useEffect(() => {
    loadNextQuestionForSection(currentSection);
  }, [currentSectionIndex]);

  const loadNextQuestionForSection = async (section: SectionType) => {
    setIsLoadingQuestion(true);
    setEvaluation(null);
    setUserAnswer('');
    setTutorAssistData(null);
    setShowHint(false);

    try {
      const q = await generateQuestion(section, activeSectionPlan.skill_target);
      setCurrentQuestion(q);
    } catch (err) {
      console.error('Failed to load question:', err);
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !userAnswer.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await evaluateAnswer(currentQuestion, userAnswer, plan.lesson_id);
      setEvaluation(result);

      // Record to lesson attempts
      setLessonAttempts(prev => [
        ...prev,
        {
          question: currentQuestion,
          evaluation: result,
          userAnswer
        }
      ]);
    } catch (err) {
      console.error('Failed to evaluate answer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTutorAction = async (action: 'hint' | 'simpler_explanation' | 'another_example' | 'clarify_ambiguity') => {
    if (!currentQuestion) return;
    if (action === 'hint') {
      setShowHint(!showHint);
      return;
    }
    setIsLoadingAssist(true);
    try {
      const res = await requestTutorAssist(currentQuestion, action);
      setTutorAssistData(res);
    } catch (err) {
      console.error('Tutor assist error:', err);
    } finally {
      setIsLoadingAssist(false);
    }
  };

  const handleNextQuestionOrSection = () => {
    // If not all sections completed, advance to next section
    const activeSections = isShortSession ? plan.sections.slice(0, 2) : plan.sections;
    if (currentSectionIndex < activeSections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    } else {
      // Done with all planned sections
      onFinishLesson(lessonAttempts);
    }
  };

  const handleRetryQuestion = () => {
    setEvaluation(null);
    setUserAnswer('');
  };

  const handleToggleVoiceInput = () => {
    if (!speechSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setUserAnswer(prev => (prev ? `${prev} ${transcript}` : transcript));
        setIsRecording(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('Speech recognition start error:', err);
      setIsRecording(false);
    }
  };

  const countSentences = (text: string) => {
    if (!text.trim()) return 0;
    const matches = text.match(/[^.!?]+[.!?]+(\s|$)/g);
    return matches ? matches.length : 1;
  };

  const getSectionTitle = (type: SectionType) => {
    switch (type) {
      case 'grammar': return 'Part A — Grammar in Context';
      case 'vocabulary': return 'Part B — Vocabulary & Collocations';
      case 'reading': return 'Part C — Reading & Inference';
      case 'writing': return 'Part D — Writing & Expression';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top lesson control bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Section Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {(isShortSession ? plan.sections.slice(0, 2) : plan.sections).map((sec, idx) => {
            const isActive = idx === currentSectionIndex;
            const isDone = idx < currentSectionIndex;
            return (
              <button
                key={sec.section}
                onClick={() => {
                  if (idx <= currentSectionIndex || evaluation) {
                    setCurrentSectionIndex(idx);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : isDone
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                    : 'bg-slate-800/60 text-slate-400 border border-slate-700/40 hover:text-slate-200'
                }`}
              >
                {isDone ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-slate-700/80 flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                )}
                <span className="capitalize">{sec.section}</span>
              </button>
            );
          })}
        </div>

        {/* Short session toggle & finish early */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsShortSession(!isShortSession)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
              isShortSession
                ? 'bg-amber-950/40 border-amber-600/60 text-amber-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Switch to a 2-part quick lesson today"
          >
            {isShortSession ? '⚡ Short Session (Active)' : '⚡ Short session today'}
          </button>

          <button
            onClick={() => onFinishLesson(lessonAttempts)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            title="Pause and view summary without losing progress"
          >
            <PauseCircle className="w-3.5 h-3.5" />
            <span>Finish early</span>
          </button>
        </div>
      </div>

      {/* Main Question / Teaching Area */}
      {isLoadingQuestion ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-9 h-9 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <div>
            <h3 className="text-base font-semibold text-white">Preparing your personalized question...</h3>
            <p className="text-xs text-slate-400 mt-1">
              Calibrating difficulty for {getSectionTitle(currentSection)}
            </p>
          </div>
        </div>
      ) : currentQuestion ? (
        <div className="space-y-6">
          {/* Section Heading & Target */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                {getSectionTitle(currentSection)}
              </span>
              <h2 className="text-lg font-bold text-white mt-0.5">
                {currentQuestion.skill_name}
              </h2>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 font-medium">
                {currentQuestion.context_topic === 'workplace_tech' ? '💼 Workplace / Tech' : '🌱 General'}
              </span>
              <span className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 font-mono text-[11px]">
                {currentQuestion.difficulty}
              </span>
            </div>
          </div>

          {/* Grammar Concept Intro (if present) */}
          {currentQuestion.concept_intro && (
            <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-2xl p-4 text-xs text-indigo-200 flex items-start space-x-3">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-indigo-300 font-semibold block mb-0.5">Key Concept</strong>
                <p className="leading-relaxed">{currentQuestion.concept_intro}</p>
              </div>
            </div>
          )}

          {/* Vocabulary Card (if present) */}
          {currentQuestion.vocab_card && (
            <VocabularyCard vocab={currentQuestion.vocab_card} />
          )}

          {/* Reading Passage (if present) */}
          {currentQuestion.reading_passage && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-md">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{currentQuestion.reading_passage.title}</span>
                </span>
                <span className="text-xs text-slate-400">
                  {currentQuestion.reading_passage.word_count} words
                </span>
              </div>
              <p className="text-sm md:text-base leading-relaxed text-slate-200 font-normal">
                {currentQuestion.reading_passage.text}
              </p>
            </div>
          )}

          {/* Question Card: ONE QUESTION AT A TIME */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl text-slate-100 space-y-6">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Active Question
              </span>
              <p className="text-base md:text-lg font-medium text-white whitespace-pre-line leading-relaxed">
                {currentQuestion.prompt}
              </p>
            </div>

            {/* Multiple Choice Options */}
            {currentQuestion.options && currentQuestion.options.length > 0 && (
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options.map(opt => {
                  const isSelected = userAnswer === opt.id || userAnswer === opt.text;
                  const isDisabled = Boolean(evaluation);

                  return (
                    <button
                      key={opt.id}
                      disabled={isDisabled}
                      onClick={() => setUserAnswer(opt.id)}
                      className={`w-full text-left p-4 rounded-2xl border transition flex items-center space-x-4 ${
                        isSelected
                          ? 'bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500 text-white'
                          : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                      } ${isDisabled ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {opt.id}
                      </span>
                      <span className="text-sm md:text-base font-medium">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Fill in the blank text input */}
            {currentQuestion.question_type === 'fill_in_blank' && (
              <div>
                <input
                  type="text"
                  disabled={Boolean(evaluation)}
                  placeholder="Type your answer here..."
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !evaluation && userAnswer.trim()) {
                      handleSubmitAnswer();
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Free Writing / Speaking Textarea */}
            {currentQuestion.question_type === 'free_writing' && (
              <div className="space-y-3">
                <div className="relative">
                  <textarea
                    rows={4}
                    disabled={Boolean(evaluation)}
                    placeholder="Write 2 to 3 sentences in English..."
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm md:text-base leading-relaxed"
                  />
                  {speechSupported && !evaluation && (
                    <button
                      onClick={handleToggleVoiceInput}
                      className={`absolute right-3 bottom-3 p-2 rounded-xl transition ${
                        isRecording
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                      title={isRecording ? 'Listening (click to stop)' : 'Speak your answer (Speech-to-Text)'}
                    >
                      {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Sentences: <strong className="text-slate-200">{countSentences(userAnswer)}</strong> (target: 2-3)</span>
                  {speechSupported && (
                    <span className="text-[11px] text-slate-500">
                      Mic uses browser voice dictation
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Answer submission button (if not evaluated yet) */}
            {!evaluation && (
              <div className="pt-2 flex justify-end">
                <button
                  disabled={!userAnswer.trim() || isSubmitting}
                  onClick={handleSubmitAnswer}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <span>Check Answer</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Tutor Controls: Hint, Simplify, Example, Ambiguous */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 font-medium">Tutor Assistance:</span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleTutorAction('hint')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center space-x-1.5"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>{showHint ? 'Hide Hint' : 'I need a hint'}</span>
              </button>

              <button
                disabled={isLoadingAssist}
                onClick={() => handleTutorAction('simpler_explanation')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                Explain it more simply
              </button>

              <button
                disabled={isLoadingAssist}
                onClick={() => handleTutorAction('another_example')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                Give me another example
              </button>

              <button
                disabled={isLoadingAssist}
                onClick={() => handleTutorAction('clarify_ambiguity')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition text-slate-400 hover:text-slate-200"
              >
                This seems ambiguous
              </button>
            </div>
          </div>

          {/* Hint Dropdown */}
          {showHint && currentQuestion.hint && (
            <div className="bg-amber-950/30 border border-amber-800/40 rounded-2xl p-4 text-xs text-amber-200 flex items-start space-x-3">
              <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300 font-semibold block mb-0.5">Gentle Clue:</strong>
                <p>{currentQuestion.hint}</p>
              </div>
            </div>
          )}

          {/* Tutor Assist Live Response Drawer */}
          {tutorAssistData && (
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 text-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-indigo-300">
                <span>Tutor Note</span>
                <button
                  onClick={() => setTutorAssistData(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-line">{tutorAssistData.content}</p>
              {tutorAssistData.example_sentence && (
                <div className="mt-2 bg-slate-900/80 p-3 rounded-xl border border-slate-700 text-xs text-slate-100 italic">
                  "{tutorAssistData.example_sentence}"
                </div>
              )}
            </div>
          )}

          {/* FEEDBACK STATE: AFTER ANSWER IS SUBMITTED */}
          {evaluation && (
            <div className={`rounded-3xl p-6 md:p-8 border shadow-2xl space-y-5 transition-all ${
              evaluation.verdict === 'correct'
                ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-100'
                : evaluation.verdict === 'partially_correct'
                ? 'bg-amber-950/20 border-amber-500/40 text-slate-100'
                : evaluation.verdict === 'ambiguous'
                ? 'bg-sky-950/20 border-sky-500/40 text-slate-100'
                : 'bg-rose-950/20 border-rose-500/40 text-slate-100'
            }`}>
              {/* Verdict header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  {evaluation.verdict === 'correct' ? (
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  ) : evaluation.verdict === 'partially_correct' ? (
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  ) : evaluation.verdict === 'ambiguous' ? (
                    <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                      <XCircle className="w-6 h-6" />
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-bold text-white capitalize">
                      {evaluation.verdict.replace('_', ' ')}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {evaluation.verdict === 'correct'
                        ? 'Accurate and natural usage.'
                        : 'Review the decisive rule and example below.'}
                    </p>
                  </div>
                </div>

                {/* Pronounce complete sentence */}
                {evaluation.full_correct_sentence && (
                  <button
                    onClick={() => playEnglishSpeech(evaluation.full_correct_sentence.replace(/\*/g, ''))}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition"
                    title="Listen to full correct sentence (browser voice)"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Listen</span>
                  </button>
                )}
              </div>

              {/* Decisive Clue */}
              {evaluation.decisive_clue && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
                  <span className="text-xs uppercase font-bold tracking-wider text-amber-400 block mb-1">
                    Decisive Clue
                  </span>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">
                    {evaluation.decisive_clue}
                  </p>
                </div>
              )}

              {/* Full Correct Sentence */}
              {evaluation.full_correct_sentence && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                  <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 block mb-1">
                    Complete Sentence
                  </span>
                  <p className="text-base font-semibold text-white">
                    {evaluation.full_correct_sentence}
                  </p>
                </div>
              )}

              {/* Detailed Explanation */}
              {evaluation.explanation && (
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block mb-1">
                    Explanation
                  </span>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                    {evaluation.explanation}
                  </p>
                </div>
              )}

              {/* Writing specific feedback: Natural version + corrections */}
              {evaluation.corrected_text && (
                <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-2xl p-4 space-y-3">
                  <span className="text-xs uppercase font-bold tracking-wider text-indigo-300 block">
                    Natural Native Phrasing (Preserving your voice)
                  </span>
                  <p className="text-sm text-indigo-100 italic">
                    "{evaluation.corrected_text}"
                  </p>

                  {evaluation.key_corrections && evaluation.key_corrections.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-indigo-900/50">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase">Key Adjustments:</span>
                      {evaluation.key_corrections.map((kc, i) => (
                        <div key={i} className="text-xs text-slate-300 flex items-start space-x-2">
                          <span className="text-rose-400 line-through">{kc.original}</span>
                          <span>→</span>
                          <span className="text-emerald-300 font-semibold">{kc.corrected}</span>
                          <span className="text-slate-400">({kc.reason})</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {evaluation.reusable_pattern && (
                    <div className="pt-2 text-xs text-amber-300">
                      <strong>Reusable Pattern: </strong>
                      <code>{evaluation.reusable_pattern}</code>
                    </div>
                  )}
                </div>
              )}

              {/* Contrast / tempting wrong answers */}
              {evaluation.contrast_explanation && (
                <div className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                  <span className="font-semibold text-slate-300">Why common alternatives fail: </span>
                  {evaluation.contrast_explanation}
                </div>
              )}

              {/* Action buttons: Next question / Retry */}
              <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
                {evaluation.verdict !== 'correct' ? (
                  <button
                    onClick={handleRetryQuestion}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold transition flex items-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Try Again</span>
                  </button>
                ) : <div />}

                <button
                  onClick={handleNextQuestionOrSection}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
                >
                  <span>
                    {currentSectionIndex < (isShortSession ? 1 : plan.sections.length - 1)
                      ? 'Next Section →'
                      : 'Finish Today\'s Lesson →'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
