import React, { useState } from 'react';
import { X, Save, Sliders, Globe, Clock, Target, Check } from 'lucide-react';
import { UserProfile, EnglishLevel, ExplanationLanguage, FeedbackStyle } from '../types/learning.ts';
import { updateProfile } from '../services/api.ts';

interface SettingsModalProps {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updated: UserProfile) => void;
  onRetakeOnboarding: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  profile,
  isOpen,
  onClose,
  onUpdated,
  onRetakeOnboarding
}) => {
  const [level, setLevel] = useState<EnglishLevel>(profile.current_level);
  const [targetLevel, setTargetLevel] = useState<EnglishLevel>(profile.target_level);
  const [language, setLanguage] = useState<ExplanationLanguage>(profile.explanation_language);
  const [dailyMinutes, setDailyMinutes] = useState<number>(profile.daily_minutes);
  const [generalRatio, setGeneralRatio] = useState<number>(profile.general_vs_work_ratio);
  const [feedbackStyle, setFeedbackStyle] = useState<FeedbackStyle>(profile.feedback_style || 'encouraging');
  const [goalSummary, setGoalSummary] = useState<string>(profile.goal_summary);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await updateProfile({
        current_level: level,
        target_level: targetLevel,
        explanation_language: language,
        daily_minutes: dailyMinutes,
        general_vs_work_ratio: generalRatio,
        feedback_style: feedbackStyle,
        goal_summary: goalSummary
      });
      onUpdated(updated);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to update settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl text-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Learner Profile & Preferences</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Levels */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Current Level
            </label>
            <select
              value={level}
              onChange={e => setLevel(e.target.value as EnglishLevel)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="A2">A2 Elementary</option>
              <option value="B1">B1 Intermediate</option>
              <option value="B2">B2 Upper-Intermediate</option>
              <option value="C1">C1 Advanced</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Target Level
            </label>
            <select
              value={targetLevel}
              onChange={e => setTargetLevel(e.target.value as EnglishLevel)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="B1">B1 Intermediate</option>
              <option value="B2">B2 Upper-Intermediate</option>
              <option value="C1">C1 Advanced</option>
            </select>
          </div>
        </div>

        {/* Explanation Language */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            Tutor Explanation Language
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setLanguage('vi')}
              className={`p-2.5 rounded-xl border text-xs font-medium text-center transition ${
                language === 'vi'
                  ? 'bg-indigo-950/60 border-indigo-500 text-white font-bold'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300'
              }`}
            >
              Tiếng Việt (Default)
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`p-2.5 rounded-xl border text-xs font-medium text-center transition ${
                language === 'en'
                  ? 'bg-indigo-950/60 border-indigo-500 text-white font-bold'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Available Minutes & Topic Ratio */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-semibold text-slate-400 uppercase tracking-wider">Session Length</span>
              <strong className="text-indigo-300">{dailyMinutes} minutes / day</strong>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { mins: 10, label: '10 mins', sub: 'Quick (4 Qs)' },
                { mins: 20, label: '20 mins', sub: 'Standard (7 Qs)' },
                { mins: 30, label: '30 mins', sub: 'Deep (12 Qs)' }
              ].map(opt => (
                <button
                  key={opt.mins}
                  onClick={() => setDailyMinutes(opt.mins)}
                  className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                    dailyMinutes === opt.mins
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span className="text-xs font-bold">{opt.label}</span>
                  <span className={`text-[10px] ${dailyMinutes === opt.mins ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {opt.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-semibold text-slate-400 uppercase tracking-wider">Topic Ratio</span>
              <strong className="text-indigo-300">
                {generalRatio}% General / {100 - generalRatio}% Workplace
              </strong>
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
          </div>
        </div>

        {/* Goal summary text */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            Learner Goal Summary
          </label>
          <textarea
            rows={2}
            value={goalSummary}
            onChange={e => setGoalSummary(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Retake Diagnostic link */}
        <div className="pt-1">
          <button
            onClick={() => {
              onClose();
              onRetakeOnboarding();
            }}
            className="text-xs text-sky-400 hover:text-sky-300 underline"
          >
            Retake conversational discovery & diagnostic test
          </button>
        </div>

        {/* Action button */}
        <div className="pt-3 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-300 hover:text-white text-xs font-medium bg-slate-800 hover:bg-slate-700"
          >
            Cancel
          </button>

          <button
            disabled={isSaving}
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-indigo-600/30"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
