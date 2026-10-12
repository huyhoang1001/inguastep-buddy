import React, { useState } from 'react';
import {
  Trophy,
  CheckCircle2,
  Sparkles,
  BookOpen,
  AlertCircle,
  ArrowRight,
  Volume2,
  ThumbsUp,
  Smile,
  Frown
} from 'lucide-react';
import { DailySummary } from '../types/learning.ts';
import { playEnglishSpeech } from '../services/api.ts';

interface LessonSummaryModalProps {
  summary: DailySummary;
  onClose: () => void;
  onStartNewLesson: () => void;
}

export const LessonSummaryModal: React.FC<LessonSummaryModalProps> = ({
  summary,
  onClose,
  onStartNewLesson
}) => {
  const [rating, setRating] = useState<'too_easy' | 'about_right' | 'too_difficult'>(
    summary.learner_rating || 'about_right'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
        {/* Celebration Header */}
        <div className="text-center pb-4 border-b border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-indigo-500 mx-auto flex items-center justify-center text-white shadow-xl shadow-amber-500/20 mb-3">
            <Trophy className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-white">Daily Session Complete!</h2>
          <p className="text-xs text-slate-400 mt-1">
            Lesson #{summary.lesson_number} • {new Date(summary.completed_at).toLocaleDateString()}
          </p>
        </div>

        {/* Primary Objective */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block mb-1">
            Today's Focus
          </span>
          <p className="text-sm font-semibold text-white">
            {summary.primary_objective}
          </p>
        </div>

        {/* Score & Sections practiced */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
            <span className="text-xs text-slate-400 block mb-0.5">Questions Completed</span>
            <strong className="text-lg font-bold text-emerald-400">{summary.questions_answered}</strong>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
            <span className="text-xs text-slate-400 block mb-0.5">Accuracy Rate</span>
            <strong className="text-lg font-bold text-sky-400">
              {Math.round(summary.accuracy_rate * 100)}%
            </strong>
          </div>
        </div>

        {/* Key Takeaways */}
        {summary.key_takeaways && summary.key_takeaways.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Key Patterns & Takeaways</span>
            </span>
            <ul className="space-y-2">
              {summary.key_takeaways.map((point, i) => (
                <li key={i} className="text-xs md:text-sm text-slate-200 flex items-start space-x-2.5 bg-slate-800/30 p-2.5 rounded-xl border border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Vocabulary learned with IPA & audio */}
        {summary.vocabulary_learned && summary.vocabulary_learned.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Vocabulary Practiced Today</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {summary.vocabulary_learned.map((wordStr, i) => {
                const cleanWord = wordStr.split(' ')[0];
                return (
                  <div
                    key={i}
                    className="flex items-center space-x-2 bg-indigo-950/40 border border-indigo-800/40 px-3 py-1.5 rounded-xl text-xs font-medium text-indigo-200"
                  >
                    <span>{wordStr}</span>
                    <button
                      onClick={() => playEnglishSpeech(cleanWord)}
                      title="Pronounce word"
                      className="p-1 rounded-md hover:bg-indigo-800/50 text-indigo-400 hover:text-white"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recurring mistakes flagged */}
        {summary.recurring_mistakes_flagged && summary.recurring_mistakes_flagged.length > 0 && (
          <div className="bg-rose-950/20 border border-rose-800/30 rounded-2xl p-4 text-xs space-y-1.5">
            <div className="flex items-center space-x-1.5 font-bold text-rose-400">
              <AlertCircle className="w-4 h-4" />
              <span>Keep In Mind for Next Sessions:</span>
            </div>
            {summary.recurring_mistakes_flagged.map((err, i) => (
              <p key={i} className="text-slate-300">
                • {err}
              </p>
            ))}
          </div>
        )}

        {/* Difficulty Feedback Rating */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
            How was today's difficulty?
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'too_easy', label: 'Too Easy', icon: Smile },
              { id: 'about_right', label: 'About Right', icon: ThumbsUp },
              { id: 'too_difficult', label: 'Too Difficult', icon: Frown }
            ].map(item => {
              const Icon = item.icon;
              const isSelected = rating === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setRating(item.id as any)}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center space-x-1.5 transition ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 text-xs font-semibold border border-slate-700 transition"
          >
            Review Later / Close
          </button>

          <button
            onClick={() => {
              onClose();
              onStartNewLesson();
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2"
          >
            <span>Start Next Lesson</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
