import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Calendar,
  Clock,
  BookOpen,
  ArrowRight,
  Sliders,
  Layers,
  X,
  Award
} from 'lucide-react';
import { PersonalizedStudyPlan, UserProfile } from '../types/learning.ts';
import { approveStudyPlan } from '../services/api.ts';

interface StudyPlanModalProps {
  plan: PersonalizedStudyPlan;
  profile: UserProfile;
  onPlanApproved: (updatedProfile: UserProfile) => void;
  onClose?: () => void;
}

export const StudyPlanModal: React.FC<StudyPlanModalProps> = ({
  plan,
  profile,
  onPlanApproved,
  onClose
}) => {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(profile.daily_minutes || 20);
  const [isApproving, setIsApproving] = useState<boolean>(false);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const result = await approveStudyPlan(selectedMinutes);
      onPlanApproved(result.profile);
    } catch (err) {
      console.error('Failed to approve study plan:', err);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white">Your Evidence-Grounded Study Plan</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                  Personalized
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Calibrated to your goals and adaptive assessment results
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Objective & Diagnostic Rationale */}
        <div className="bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/40 rounded-2xl p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block">
            Primary Learning Objective
          </span>
          <p className="text-base font-bold text-white leading-relaxed">
            {plan.overallObjective}
          </p>
          {plan.diagnosticSummary && (
            <p className="text-xs text-slate-300 pt-1 border-t border-slate-800 leading-relaxed">
              <strong>Assessment Context: </strong>
              {plan.diagnosticSummary}
            </p>
          )}
        </div>

        {/* Prioritized Skills with Rationale */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Prioritized Skills & Pedagogical Rationale</span>
          </h4>

          <div className="space-y-2.5">
            {plan.prioritizedSkills.map((sk, idx) => (
              <div
                key={idx}
                className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white">{sk.skillName}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.2 rounded-full bg-slate-700 text-slate-300">
                      {sk.category}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                      {sk.priority} Priority
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong className="text-indigo-300">Why selected: </strong>
                    {sk.rationale}
                  </p>
                </div>

                <div className="text-xs text-slate-400 shrink-0 text-right">
                  <span>Current: <strong>{sk.currentLevel}</strong></span>
                  <span className="block mt-0.5">Target: <strong className="text-emerald-400">{sk.targetLevel}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4-Part Daily Lesson Routine */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <BookOpen className="w-4 h-4 text-sky-400" />
            <span>Flexible Daily 4-Part Structure</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {plan.dailyRoutineTemplate.map((sec, idx) => (
              <div
                key={idx}
                className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 flex items-start space-x-3"
              >
                <span className="w-6 h-6 rounded-lg bg-indigo-900/60 border border-indigo-700/50 flex items-center justify-center font-bold text-[11px] text-indigo-300 shrink-0">
                  {idx + 1}
                </span>
                <div>
                  <h5 className="font-bold text-white">{sec.title}</h5>
                  <p className="text-slate-400 text-[11px] mt-0.5">{sec.target}</p>
                  <span className="text-[10px] text-indigo-400 font-semibold block mt-1">~{sec.minutes} mins</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Milestones & Spaced Review Strategy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
              <Award className="w-4 h-4" />
              <span>Short-Term Milestones</span>
            </span>
            <ul className="space-y-1.5 text-xs text-slate-200">
              {plan.shortTermMilestones.map((ms, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{ms}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
              <Clock className="w-4 h-4" />
              <span>Retention & Review Strategy</span>
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {plan.spacedReviewStrategy}
            </p>
            <span className="block text-[11px] text-slate-400 pt-1 border-t border-slate-700/60">
              Progress re-assessment checkpoint every <strong>{plan.progressCheckIntervalDays} days</strong>.
            </span>
          </div>
        </div>

        {/* Pace Adjustments */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-300">Daily Study Time:</span>
          </div>

          <div className="flex items-center space-x-2">
            {[15, 20, 30].map(m => (
              <button
                key={m}
                onClick={() => setSelectedMinutes(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  selectedMinutes === m
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {m} mins/day
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
          <p className="text-xs text-slate-400">
            You can adjust preferences or review past reports in Settings anytime.
          </p>

          <button
            disabled={isApproving}
            onClick={handleApprove}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2"
          >
            <span>{isApproving ? 'Activating Plan...' : 'Approve Plan & Begin Day 1'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
