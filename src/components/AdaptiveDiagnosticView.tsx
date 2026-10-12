import React, { useState, useEffect } from 'react';
import {
  Compass,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  PauseCircle,
  FileText,
  Sparkles,
  Clock,
  Mic,
  MicOff,
  Flag,
  RotateCcw,
  BookOpen,
  Layers,
  HelpCircle
} from 'lucide-react';
import {
  Question,
  DiagnosticSession,
  DiagnosticMode,
  AnswerEvaluation,
  WritingRubricScore,
  DiagnosticReport,
  PersonalizedStudyPlan
} from '../types/learning.ts';
import {
  getDiagnosticSession,
  startDiagnosticSession,
  getNextDiagnosticQuestion,
  submitDiagnosticAnswer,
  pauseDiagnosticSession,
  completeDiagnosticSession
} from '../services/api.ts';

interface AdaptiveDiagnosticViewProps {
  onAssessmentCompleted: (report: DiagnosticReport, studyPlan: PersonalizedStudyPlan) => void;
  onPaused?: () => void;
}

export const AdaptiveDiagnosticView: React.FC<AdaptiveDiagnosticViewProps> = ({
  onAssessmentCompleted,
  onPaused
}) => {
  const [session, setSession] = useState<DiagnosticSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [lastEvaluation, setLastEvaluation] = useState<AnswerEvaluation | null>(null);
  const [lastRubric, setLastRubric] = useState<WritingRubricScore | null>(null);
  const [canStop, setCanStop] = useState<boolean>(false);
  const [flagged, setFlagged] = useState<boolean>(false);
  const [pausedMessage, setPausedMessage] = useState<string>('');

  // Speech recording
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setSpeechSupported(true);
    }
    loadExistingSession();
  }, []);

  const loadExistingSession = async () => {
    setIsLoading(true);
    try {
      const data = await getDiagnosticSession();
      if (data.session && data.session.status === 'in_progress') {
        setSession(data.session);
        if (data.session.currentQuestion) {
          setCurrentQuestion(data.session.currentQuestion);
        } else {
          loadNextQuestion();
        }
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartMode = async (mode: DiagnosticMode) => {
    setIsLoading(true);
    try {
      const newSession = await startDiagnosticSession(mode);
      setSession(newSession);
      setCurrentQuestion(newSession.currentQuestion || null);
      setUserAnswer('');
      setLastEvaluation(null);
      setLastRubric(null);
      setCanStop(false);
    } catch (err) {
      console.error('Failed to start diagnostic:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNextQuestion = async () => {
    setIsLoading(true);
    setUserAnswer('');
    setLastEvaluation(null);
    setLastRubric(null);
    setFlagged(false);

    try {
      const data = await getNextDiagnosticQuestion();
      setCurrentQuestion(data.question);
      setSession(data.session);
    } catch (err) {
      console.error('Failed to load next question:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !userAnswer.trim() || isEvaluating) return;

    setIsEvaluating(true);
    try {
      const result = await submitDiagnosticAnswer(currentQuestion, userAnswer);
      setLastEvaluation(result.evaluation);
      if (result.writingRubric) {
        setLastRubric(result.writingRubric);
      }
      setCanStop(result.canStop);

      if (result.mustStop) {
        handleFinishAssessment();
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handlePause = async () => {
    try {
      await pauseDiagnosticSession();
      setPausedMessage('Assessment progress saved! You can resume whenever you are ready.');
      if (onPaused) onPaused();
    } catch (err) {
      console.error('Failed to pause assessment:', err);
    }
  };

  const handleFinishAssessment = async () => {
    setIsLoading(true);
    try {
      const { report, studyPlan } = await completeDiagnosticSession();
      onAssessmentCompleted(report, studyPlan);
    } catch (err) {
      console.error('Failed to complete assessment:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const countSentences = (text: string) => {
    if (!text.trim()) return 0;
    const matches = text.match(/[^.!?]+[.!?]+(\s|$)/g);
    return matches ? matches.length : 1;
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
      console.warn('Speech recognition error:', err);
      setIsRecording(false);
    }
  };

  // ----------------------------------------------------
  // MODE SELECTION SCREEN (IF NO ACTIVE SESSION)
  // ----------------------------------------------------
  if (!session || session.status !== 'in_progress') {
    return (
      <div className="py-6 text-slate-100 space-y-6">
        <div>
          <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
            Placement Assessment
          </span>
          <h2 className="text-2xl font-bold text-white mt-1">
            Choose Your Diagnostic Assessment Mode
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1.5 leading-relaxed">
            Our adaptive engine evaluates your active English across Grammar, Vocabulary, Reading, and original Writing.
            Questions adjust dynamically based on your performance to estimate your genuine CEFR range.
          </p>
        </div>

        {pausedMessage && (
          <div className="bg-emerald-950/40 border border-emerald-800/40 p-4 rounded-2xl text-xs text-emerald-300">
            {pausedMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Quick Mode */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-600 transition">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-sky-400">Quick Probe</span>
                <span className="text-xs text-slate-400 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>5-10m</span>
                </span>
              </div>
              <h3 className="text-base font-bold text-white">Preliminary Calibration</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                5 to 8 focused questions covering core grammar and vocabulary. Best if you want a fast starting baseline.
              </p>
            </div>
            <button
              onClick={() => handleStartMode('quick')}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition"
            >
              Start Quick (5-8 Qs)
            </button>
          </div>

          {/* Standard Mode (Recommended) */}
          <div className="bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border-2 border-indigo-500/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl shadow-indigo-950/40 relative">
            <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500 text-white tracking-wider">
              Recommended
            </span>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-indigo-400">Standard Assessment</span>
                <span className="text-xs text-slate-400 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>15-25m</span>
                </span>
              </div>
              <h3 className="text-base font-bold text-white">Full 4-Dimension Diagnostic</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                8 to 14 adaptive items covering Grammar, Collocations, Reading passage comprehension, and original Writing with multi-dimensional rubric feedback.
              </p>
            </div>
            <button
              onClick={() => handleStartMode('standard')}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition flex items-center justify-center space-x-2"
            >
              <span>Start Standard Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Comprehensive Mode */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-600 transition">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-amber-400">Deep Diagnostic</span>
                <span className="text-xs text-slate-400 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>30-45m</span>
                </span>
              </div>
              <h3 className="text-base font-bold text-white">Comprehensive Assessment</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                15 to 22 questions providing rigorous confidence across edge-case conditionals, complex reading inference, and workplace writing.
              </p>
            </div>
            <button
              onClick={() => handleStartMode('comprehensive')}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition"
            >
              Start Comprehensive
            </button>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 leading-relaxed flex items-start space-x-3">
          <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-300 font-semibold block mb-0.5">Honest Capability Guarantee:</strong>
            Speaking and listening are evaluated exclusively through live acoustic audio exercises when enabled. In text diagnostic mode, they will be honestly marked as <em>Not Assessed</em> so your profile reflects genuine evidence.
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // ACTIVE QUESTION CARD
  // ----------------------------------------------------
  const historyCount = session.history.length;
  const targetCount = session.minQuestions;
  const progressPct = Math.min(100, Math.round((historyCount / targetCount) * 100));

  const countBySection = (sec: string) => session.history.filter(h => h.question.section === sec).length;

  return (
    <div className="py-4 text-slate-100 space-y-5">
      {/* Top Session Progress Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {session.mode} Diagnostic
            </span>
            <span className="text-xs font-semibold text-white">
              Question {historyCount + 1} of ~{targetCount}
            </span>
          </div>
          {/* Section evidence pills */}
          <div className="flex items-center space-x-2 mt-2 text-[11px] text-slate-400">
            <span className={countBySection('grammar') > 0 ? 'text-emerald-300' : 'text-slate-500'}>
              Grammar ({countBySection('grammar')})
            </span>
            <span>•</span>
            <span className={countBySection('vocabulary') > 0 ? 'text-emerald-300' : 'text-slate-500'}>
              Vocab ({countBySection('vocabulary')})
            </span>
            <span>•</span>
            <span className={countBySection('reading') > 0 ? 'text-emerald-300' : 'text-slate-500'}>
              Reading ({countBySection('reading')})
            </span>
            <span>•</span>
            <span className={countBySection('writing') > 0 ? 'text-emerald-300' : 'text-slate-500'}>
              Writing ({countBySection('writing')})
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {canStop && (
            <button
              onClick={handleFinishAssessment}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-600/30 flex items-center space-x-1.5"
            >
              <span>Complete & View Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handlePause}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            title="Pause and resume later"
          >
            <PauseCircle className="w-3.5 h-3.5" />
            <span>Pause</span>
          </button>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-indigo-500 h-full rounded-full transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Active Question Container */}
      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center space-y-3 bg-slate-900 border border-slate-800 rounded-3xl">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Selecting next adaptive diagnostic item...</p>
        </div>
      ) : currentQuestion ? (
        <div className="space-y-5">
          {/* Question Metadata */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                {currentQuestion.section.toUpperCase()} • {currentQuestion.skill_name}
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Target Difficulty: <strong className="text-slate-200">{currentQuestion.difficulty}</strong>
              </p>
            </div>

            <button
              onClick={() => setFlagged(!flagged)}
              className={`p-1.5 rounded-lg text-xs transition flex items-center space-x-1 ${
                flagged ? 'text-amber-400 bg-amber-950/40' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Flag this question as ambiguous or unclear"
            >
              <Flag className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">{flagged ? 'Flagged' : 'Flag Question'}</span>
            </button>
          </div>

          {/* Reading Passage View (if present) */}
          {currentQuestion.reading_passage && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between text-xs text-sky-400 font-bold border-b border-slate-800 pb-2">
                <span className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>{currentQuestion.reading_passage.title}</span>
                </span>
                <span className="text-slate-500 text-[11px]">{currentQuestion.reading_passage.word_count} words</span>
              </div>
              <p className="text-sm md:text-base text-slate-200 leading-relaxed font-normal">
                {currentQuestion.reading_passage.text}
              </p>
            </div>
          )}

          {/* Question Prompt */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Assessment Item
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
                  const isDisabled = Boolean(lastEvaluation);

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
                  disabled={Boolean(lastEvaluation)}
                  placeholder="Type your answer here..."
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !lastEvaluation && userAnswer.trim()) {
                      handleSubmitAnswer();
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Free Writing Textarea */}
            {currentQuestion.question_type === 'free_writing' && (
              <div className="space-y-3">
                <div className="relative">
                  <textarea
                    rows={4}
                    disabled={Boolean(lastEvaluation)}
                    placeholder="Write 3 to 4 sentences in English..."
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm md:text-base leading-relaxed"
                  />
                  {speechSupported && !lastEvaluation && (
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
                  <span>
                    Sentences: <strong className="text-slate-200">{countSentences(userAnswer)}</strong> (target: 3-4)
                  </span>
                  <span>Word count: <strong className="text-slate-200">{userAnswer.trim().split(/\s+/).filter(Boolean).length}</strong></span>
                </div>
              </div>
            )}

            {/* Submit button (if not evaluated yet) */}
            {!lastEvaluation && (
              <div className="pt-2 flex justify-end">
                <button
                  disabled={!userAnswer.trim() || isEvaluating}
                  onClick={handleSubmitAnswer}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
                >
                  {isEvaluating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Assessing...</span>
                    </>
                  ) : (
                    <>
                      <span>Check & Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* ITEM FEEDBACK STATE */}
          {lastEvaluation && (
            <div className={`rounded-3xl p-6 md:p-8 border shadow-2xl space-y-5 transition-all ${
              lastEvaluation.verdict === 'correct'
                ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-100'
                : lastEvaluation.verdict === 'partially_correct'
                ? 'bg-amber-950/20 border-amber-500/40 text-slate-100'
                : 'bg-rose-950/20 border-rose-500/40 text-slate-100'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {lastEvaluation.verdict === 'correct' ? (
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : lastEvaluation.verdict === 'partially_correct' ? (
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                      <XCircle className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h4 className="text-base font-bold text-white capitalize">
                      {lastEvaluation.verdict.replace('_', ' ')}
                    </h4>
                    <span className="text-xs text-slate-400">Answer recorded into diagnostic profile</span>
                  </div>
                </div>

                <button
                  onClick={loadNextQuestion}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-md shadow-indigo-600/30 flex items-center space-x-2"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Decisive Clue & Explanation */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-xs space-y-1.5">
                <span className="text-amber-400 font-bold uppercase tracking-wider block">Decisive Clue</span>
                <p className="text-slate-200 leading-relaxed font-medium">{lastEvaluation.decisive_clue}</p>
                {lastEvaluation.explanation && (
                  <p className="text-slate-400 pt-1 border-t border-slate-800">{lastEvaluation.explanation}</p>
                )}
              </div>

              {/* Multi-Dimensional Writing Rubric Scorecard (if free writing) */}
              {lastRubric && (
                <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-2xl p-4 space-y-3">
                  <span className="text-xs uppercase font-bold tracking-wider text-indigo-300 block">
                    Writing Rubric Breakdown (Scale 1 to 5)
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Grammar Accuracy</span>
                      <strong className="text-emerald-400">{lastRubric.accuracy}/5</strong>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Vocabulary Range</span>
                      <strong className="text-sky-400">{lastRubric.vocabularyRange}/5</strong>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Complexity</span>
                      <strong className="text-indigo-300">{lastRubric.sentenceComplexity}/5</strong>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Coherence</span>
                      <strong className="text-amber-300">{lastRubric.coherence}/5</strong>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Naturalness</span>
                      <strong className="text-purple-300">{lastRubric.naturalness}/5</strong>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Task Completion</span>
                      <strong className="text-teal-300">{lastRubric.taskCompletion}/5</strong>
                    </div>
                  </div>

                  {lastRubric.correctedVersion && (
                    <div className="pt-2">
                      <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Native Phrasing Model:</span>
                      <p className="text-xs text-indigo-100 italic bg-slate-900/70 p-3 rounded-xl border border-slate-800">
                        "{lastRubric.correctedVersion}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
