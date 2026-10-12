import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  LessonPlan,
  DailySummary,
  Question,
  AnswerEvaluation
} from './types/learning.ts';
import { Header } from './components/Header.tsx';
import { OnboardingModal } from './components/OnboardingModal.tsx';
import { LessonView } from './components/LessonView.tsx';
import { LessonSummaryModal } from './components/LessonSummaryModal.tsx';
import { MemoryDrawer } from './components/MemoryDrawer.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { MilestonesModal } from './components/MilestonesModal.tsx';
import {
  getProfile,
  generateLessonPlan,
  generateLessonSummary,
  getMemory
} from './services/api.ts';
import { calculateMilestones } from './services/milestoneService.ts';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activePlan, setActivePlan] = useState<LessonPlan | null>(null);
  const [activeSummary, setActiveSummary] = useState<DailySummary | null>(null);
  const [mistakesCount, setMistakesCount] = useState<number>(0);
  const [milestonesData, setMilestonesData] = useState<ReturnType<typeof calculateMilestones> | null>(null);

  // Modals state
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [onboardingPhase, setOnboardingPhase] = useState<'discovery' | 'diagnostic' | 'report' | 'plan'>('discovery');
  const [showMemoryDrawer, setShowMemoryDrawer] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [showMilestonesModal, setShowMilestonesModal] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize application
  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    setIsLoading(true);
    try {
      const userProfile = await getProfile();
      setProfile(userProfile);

      // Check recurring errors count and milestones
      const mem = await getMemory();
      const totalErrors = mem.skills?.flatMap(s => s.recurring_errors)?.length || 0;
      setMistakesCount(totalErrors);

      const computedMilestones = calculateMilestones(mem);
      setMilestonesData(computedMilestones);

      if (!userProfile.onboarding_completed) {
        setOnboardingPhase('discovery');
        setShowOnboarding(true);
      } else {
        // Load or create active lesson plan
        if (mem.lessons && mem.lessons.length > 0) {
          const latest = mem.lessons[mem.lessons.length - 1];
          setActivePlan(latest);
        } else {
          const newPlan = await generateLessonPlan();
          setActivePlan(newPlan);
        }

        if (mem.summaries && mem.summaries.length > 0) {
          setActiveSummary(mem.summaries[mem.summaries.length - 1]);
        }
      }
    } catch (err) {
      console.error('Initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshMilestones = async () => {
    try {
      const mem = await getMemory();
      const computed = calculateMilestones(mem);
      setMilestonesData(computed);
      const totalErrors = mem.skills?.flatMap(s => s.recurring_errors)?.length || 0;
      setMistakesCount(totalErrors);
    } catch (err) {
      console.error('Failed to refresh milestones:', err);
    }
  };

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    setIsLoading(true);
    try {
      const userProfile = await getProfile();
      setProfile(userProfile);
      const newPlan = await generateLessonPlan();
      setActivePlan(newPlan);
      await refreshMilestones();
    } catch (err) {
      console.error('Failed to create initial lesson plan:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLessonFinished = async (
    attempts: Array<{ question: Question; evaluation: AnswerEvaluation; userAnswer: string }>,
    timeSpentMinutes?: number
  ) => {
    if (!activePlan) return;
    setIsLoading(true);
    try {
      const summary = await generateLessonSummary(activePlan, attempts, timeSpentMinutes);
      setActiveSummary(summary);
      setShowSummaryModal(true);

      // Refresh memory stats & milestones
      await refreshMilestones();
    } catch (err) {
      console.error('Failed to generate summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNewLesson = async () => {
    setIsLoading(true);
    try {
      const newPlan = await generateLessonPlan();
      setActivePlan(newPlan);
      await refreshMilestones();
    } catch (err) {
      console.error('Failed to generate new plan:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-medium">Loading LinguaStep Tutor...</h2>
        <p className="text-xs text-slate-400 mt-1">Checking persistent learning memory</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* App Header with Milestone Progress Badge */}
      <Header
        profile={profile}
        mistakesCount={mistakesCount}
        featuredBadge={milestonesData?.featuredBadge || null}
        nextBadge={milestonesData?.nextBadge || null}
        unlockedCount={milestonesData?.unlockedBadges.length || 0}
        totalBadgesCount={milestonesData?.allBadges.length || 10}
        onOpenMilestones={() => setShowMilestonesModal(true)}
        onOpenMemory={() => setShowMemoryDrawer(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenSummary={() => setShowSummaryModal(true)}
        hasActiveSummary={Boolean(activeSummary)}
        onRestartOnboarding={() => {
          setOnboardingPhase('discovery');
          setShowOnboarding(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activePlan ? (
          <LessonView
            profile={profile}
            plan={activePlan}
            onFinishLesson={handleLessonFinished}
            onOpenSummary={() => setShowSummaryModal(true)}
          />
        ) : (
          <div className="max-w-md mx-auto px-4 py-20 text-center">
            <h3 className="text-lg font-bold text-white mb-2">No Active Lesson Plan</h3>
            <p className="text-xs text-slate-400 mb-6">
              Ready to begin today's personalized English session?
            </p>
            <button
              onClick={handleStartNewLesson}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition"
            >
              Start Today's Lesson
            </button>
          </div>
        )}
      </main>

      {/* Milestones Showcase Modal */}
      {milestonesData && (
        <MilestonesModal
          isOpen={showMilestonesModal}
          onClose={() => setShowMilestonesModal(false)}
          allBadges={milestonesData.allBadges}
          unlockedBadges={milestonesData.unlockedBadges}
          stats={milestonesData.stats}
          onJumpToPractice={() => setShowMilestonesModal(false)}
        />
      )}

      {/* Conversational Discovery & Adaptive Diagnostic Modal */}
      {showOnboarding && (
        <OnboardingModal
          currentProfile={profile}
          initialPhase={onboardingPhase}
          onComplete={handleOnboardingComplete}
        />
      )}

      {showSummaryModal && activeSummary && (
        <LessonSummaryModal
          summary={activeSummary}
          onClose={() => setShowSummaryModal(false)}
          onStartNewLesson={handleStartNewLesson}
        />
      )}

      <MemoryDrawer
        isOpen={showMemoryDrawer}
        onClose={() => setShowMemoryDrawer(false)}
        onResetComplete={initApp}
        onRetakeDiagnostic={() => {
          setOnboardingPhase('diagnostic');
          setShowOnboarding(true);
        }}
      />

      <SettingsModal
        profile={profile}
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onUpdated={async (updated) => {
          const durationChanged = updated.daily_minutes !== profile.daily_minutes;
          setProfile(updated);
          if (durationChanged) {
            setIsLoading(true);
            try {
              const newPlan = await generateLessonPlan();
              setActivePlan(newPlan);
            } catch (err) {
              console.error('Failed to regenerate lesson plan for new duration:', err);
            } finally {
              setIsLoading(false);
            }
          }
        }}
        onRetakeOnboarding={() => {
          setOnboardingPhase('discovery');
          setShowOnboarding(true);
        }}
      />
    </div>
  );
}
