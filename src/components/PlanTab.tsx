import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Droplets,
  Dumbbell,
  Footprints,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import type {
  LifestylePlan,
  MealRecord,
  ProfileTargets,
  UserProfile,
} from '../types/glucowise';
import { getTodayDateKey } from '../utils/storage';
import { WeeklyProgressChartSvg } from './Charts';

interface PlanTabProps {
  profile: UserProfile;
  targets: ProfileTargets;
  plan: LifestylePlan;
  meals: MealRecord[];
  activeWalkReminder: boolean;
  onDismissWalkReminder: () => void;
  onUpdatePlan: (updater: (prev: LifestylePlan) => LifestylePlan) => void;
}

export const PlanTab: React.FC<PlanTabProps> = ({
  profile,
  targets,
  plan,
  meals,
  activeWalkReminder,
  onDismissWalkReminder,
  onUpdatePlan,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(plan.postMealWalkMinutes * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          onUpdatePlan((p) => ({
            ...p,
            stepsToday: p.stepsToday + p.postMealWalkMinutes * 105,
            walkMinutesToday: p.walkMinutesToday + p.postMealWalkMinutes,
          }));
          return pSecondsFallback(plan.postMealWalkMinutes);
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, plan.postMealWalkMinutes, onUpdatePlan]);

  function pSecondsFallback(mins: number) {
    return mins * 60;
  }

  const todayKey = getTodayDateKey();
  const effectiveStepTarget = plan.dailyStepTarget || targets.dailySteps;
  const stepPct = Math.min(100, Math.round((plan.stepsToday / Math.max(1, effectiveStepTarget)) * 100));

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Tailored exercise recommendations based on user profile activity level & age
  const exercises = useMemo(() => {
    const isBeginner = profile.activityLevel === 'sedentary' || profile.age >= 65;
    const isHighActive = profile.activityLevel === 'active' || profile.activityLevel === 'very_active';

    return [
      {
        title: 'Post-Meal Brisk Walk',
        duration: `${plan.postMealWalkMinutes} min`,
        intensity: 'Light–Moderate',
        benefit:
          'Walking within 30 minutes after eating helps skeletal muscles absorb glucose directly, smoothing post-meal spikes.',
      },
      isBeginner
        ? {
            title: 'Seated & Standing Mobility Flow',
            duration: '15 min',
            intensity: 'Low-impact',
            benefit:
              'Chair squats, calf raises, and gentle resistance-band pulls tailored for joint comfort and steady insulin sensitivity.',
          }
        : {
            title: 'Major-Muscle Resistance Circuit',
            duration: isHighActive ? '35 min' : '25 min',
            intensity: isHighActive ? 'Moderate–Vigorous' : 'Moderate',
            benefit:
              'Goblet squats, incline push-ups, and rows build lean muscle glycogen storage capacity for up to 24–48 hours.',
          },
      {
        title: isHighActive ? 'Zone-2 Cycling or Tempo Walk' : 'Zone-2 Steady Walk or Cycling',
        duration: isHighActive ? '40 min' : '25 min',
        intensity: 'Aerobic Zone 2',
        benefit:
          'Sustained conversational-pace cardio supports cardiovascular health and your A1C goal of ' +
          profile.targetA1c +
          '%.',
      },
    ];
  }, [profile.activityLevel, profile.age, profile.targetA1c, plan.postMealWalkMinutes]);

  const weeklySummary = useMemo(() => {
    const days = plan.weeklyHistory;
    const count = Math.max(1, days.length);
    const avgTir = Math.round(days.reduce((s, d) => s + d.tirPercent, 0) / count);
    const avgSteps = Math.round(days.reduce((s, d) => s + d.steps, 0) / count);
    const avgSpike = Math.round(days.reduce((s, d) => s + d.avgSpikeScore, 0) / count);
    return { avgTir, avgSteps, avgSpike };
  }, [plan.weeklyHistory]);

  const latestMeal = meals[0];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f2419] dark:text-emerald-50">
          Lifestyle Planner
        </h1>
        <p className="text-sm text-[#476354] dark:text-emerald-200/75">
          Tailored to your <span className="capitalize">{profile.activityLevel.replace('_', ' ')}</span> profile · Suggested step target {targets.dailySteps.toLocaleString()} steps/day
        </p>
      </div>

      {/* Post-Meal Walk Reminder Banner */}
      {activeWalkReminder && (
        <div className="rounded-2xl bg-[#e8f1eb] dark:bg-[#192b21] border border-[#1b7a52]/30 dark:border-emerald-400/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-[#1b7a52] dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-[#0f2419] dark:text-emerald-50">
                Post-Meal Walk Reminder
              </div>
              <p className="text-xs text-[#476354] dark:text-emerald-200/80 mt-0.5">
                {latestMeal
                  ? `Your recent meal (${latestMeal.title}, Spike Score ${latestMeal.spikeScore}) benefits from a ${plan.postMealWalkMinutes}-minute gentle walk.`
                  : `A ${plan.postMealWalkMinutes}-minute walk after eating helps blunt post-meal glucose rises.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSecondsLeft(plan.postMealWalkMinutes * 60);
                setTimerRunning(true);
                onDismissWalkReminder();
              }}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1b7a52] dark:bg-emerald-500 text-white dark:text-[#07150e] text-xs font-semibold cursor-pointer"
            >
              Start Walk Timer
            </button>
            <button
              type="button"
              onClick={onDismissWalkReminder}
              className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium text-[#476354] dark:text-emerald-200/80 hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Top Grid: Daily Walking Target + Post-Meal Walk Timer + Water Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Daily Walking Target */}
        <section className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-[#0f2419] dark:text-emerald-50 flex items-center gap-2">
                <Footprints className="w-4 h-4 text-[#1b7a52] dark:text-emerald-400" />
                Daily Walking
              </h2>
              <p className="text-xs text-[#476354] dark:text-emerald-200/70 mt-0.5">
                {plan.walkMinutesToday} active min today
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdatePlan((p) => ({
                  ...p,
                  dailyStepTarget: targets.dailySteps,
                }))
              }
              className="text-xs font-medium text-[#1b7a52] dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Sync to Profile ({targets.dailySteps.toLocaleString()})
            </button>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="font-mono text-2xl font-semibold tabular-nums text-[#0f2419] dark:text-emerald-50">
                {plan.stepsToday.toLocaleString()}
              </span>
              <span className="text-xs font-mono tabular-nums text-[#476354] dark:text-emerald-200/75">
                Goal {effectiveStepTarget.toLocaleString()} ({stepPct}%)
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-emerald-950/8 dark:bg-emerald-100/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#1b7a52] dark:bg-emerald-400 transition-all duration-300"
                style={{ width: `${stepPct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              [500, 5],
              [1000, 10],
              [2500, 25],
            ].map(([steps, mins]) => (
              <button
                key={steps}
                type="button"
                onClick={() =>
                  onUpdatePlan((p) => ({
                    ...p,
                    stepsToday: p.stepsToday + steps,
                    walkMinutesToday: p.walkMinutesToday + mins,
                  }))
                }
                className="min-h-[44px] rounded-xl bg-[#f3f7f4] hover:bg-[#e8f1eb] dark:bg-[#192b21] dark:hover:bg-[#22392c] text-xs font-mono font-semibold text-[#0f2419] dark:text-emerald-100 cursor-pointer transition-colors"
              >
                +{steps.toLocaleString()}
              </button>
            ))}
          </div>
        </section>

        {/* Post-Meal Walk Timer & Reminder */}
        <section className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-[#0f2419] dark:text-emerald-50 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1b7a52] dark:text-emerald-400" />
                Post-Meal Walk Timer
              </h2>
              <p className="text-xs text-[#476354] dark:text-emerald-200/70 mt-0.5">
                Blunts glucose spikes after carbs
              </p>
            </div>
            <label className="inline-flex items-center gap-1.5 text-xs text-[#476354] dark:text-emerald-200/80 cursor-pointer">
              <input
                type="checkbox"
                checked={plan.postMealWalkEnabled}
                onChange={(e) =>
                  onUpdatePlan((p) => ({ ...p, postMealWalkEnabled: e.target.checked }))
                }
                className="w-4 h-4 accent-[#1b7a52] rounded"
              />
              Remind
            </label>
          </div>

          <div className="flex items-center justify-between gap-3 py-1">
            <span className="font-mono text-3xl font-semibold tabular-nums text-[#0f2419] dark:text-emerald-50">
              {formatTimer(secondsLeft)}
            </span>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#f3f7f4] dark:bg-[#192b21]">
              {[10, 15, 20].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    setTimerRunning(false);
                    setSecondsLeft(mins * 60);
                    onUpdatePlan((p) => ({ ...p, postMealWalkMinutes: mins }));
                  }}
                  className={`min-h-[36px] px-2.5 rounded-lg text-xs font-mono cursor-pointer transition-colors ${
                    plan.postMealWalkMinutes === mins
                      ? 'bg-white dark:bg-[#121f18] text-[#0f2419] dark:text-emerald-50 font-semibold shadow-sm'
                      : 'text-[#476354] dark:text-emerald-200/70'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTimerRunning((r) => !r)}
              className="flex-1 min-h-[44px] px-4 rounded-xl bg-[#1b7a52] hover:bg-[#156342] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-[#07150e] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {timerRunning ? 'Pause Walk' : 'Start Walk'}
            </button>
            <button
              type="button"
              onClick={() => {
                setTimerRunning(false);
                setSecondsLeft(plan.postMealWalkMinutes * 60);
              }}
              aria-label="Reset walk timer"
              className="min-h-[44px] min-w-[44px] rounded-xl bg-[#f3f7f4] hover:bg-[#e8f1eb] dark:bg-[#192b21] dark:hover:bg-[#22392c] flex items-center justify-center text-[#476354] dark:text-emerald-200 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Water Tracking */}
        <section className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-[#0f2419] dark:text-emerald-50 flex items-center gap-2">
                <Droplets className="w-4 h-4 text-[#1b7a52] dark:text-emerald-400" />
                Water Tracking
              </h2>
              <p className="text-xs text-[#476354] dark:text-emerald-200/70 mt-0.5">
                Hydration supports kidney glucose clearance
              </p>
            </div>
            <span className="font-mono text-sm font-semibold tabular-nums text-[#0f2419] dark:text-emerald-50">
              {plan.waterGlasses} / {plan.waterTarget}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: plan.waterTarget }).map((_, idx) => {
              const filled = idx < plan.waterGlasses;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    onUpdatePlan((p) => ({
                      ...p,
                      waterGlasses: idx + 1 === p.waterGlasses ? idx : idx + 1,
                    }))
                  }
                  aria-label={`Set water intake to ${idx + 1} cups`}
                  className={`min-h-[44px] rounded-xl border text-xs font-mono font-medium flex items-center justify-center transition-colors cursor-pointer ${
                    filled
                      ? 'bg-[#1b7a52] dark:bg-emerald-500 border-transparent text-white dark:text-[#07150e]'
                      : 'bg-[#f3f7f4] dark:bg-[#192b21] border-emerald-950/10 dark:border-emerald-200/15 text-[#476354] dark:text-emerald-200/70'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="text-xs text-[#476354] dark:text-emerald-200/75 tabular-nums">
            Approx. {(plan.waterGlasses * 250).toLocaleString()} ml of {(plan.waterTarget * 250).toLocaleString()} ml daily goal
          </div>
        </section>
      </div>

      {/* Exercise Recommendations + Meal Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <section className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[#0f2419] dark:text-emerald-50 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-[#1b7a52] dark:text-emerald-400" />
              Tailored Exercise Recommendations
            </h2>
            <span className="text-xs text-[#476354] dark:text-emerald-200/70 capitalize">
              {profile.activityLevel.replace('_', ' ')}
            </span>
          </div>

          <div className="space-y-2.5">
            {exercises.map((ex) => (
              <div
                key={ex.title}
                className="rounded-xl bg-[#f3f7f4] dark:bg-[#192b21] p-3.5 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#0f2419] dark:text-emerald-50">
                    {ex.title}
                  </span>
                  <span className="text-xs font-mono text-[#1b7a52] dark:text-emerald-400 shrink-0">
                    {ex.duration} · {ex.intensity}
                  </span>
                </div>
                <p className="text-xs text-[#476354] dark:text-emerald-200/80 leading-relaxed">
                  {ex.benefit}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Meal Schedule */}
        <section className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5 space-y-3">
          <div>
            <h2 className="text-base font-semibold text-[#0f2419] dark:text-emerald-50">
              Meal Schedule
            </h2>
            <p className="text-xs text-[#476354] dark:text-emerald-200/70">
              Consistent meal timing helps stabilize basal & post-meal glucose
            </p>
          </div>

          <div className="divide-y divide-emerald-950/8 dark:divide-emerald-200/10">
            {plan.mealSchedule.map((slot) => {
              const completed = slot.completedDate === todayKey;
              return (
                <div key={slot.id} className="py-2.5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePlan((p) => ({
                        ...p,
                        mealSchedule: p.mealSchedule.map((s) =>
                          s.id === slot.id
                            ? { ...s, completedDate: completed ? undefined : todayKey }
                            : s
                        ),
                      }))
                    }
                    className="min-h-[44px] flex items-center gap-2.5 text-left cursor-pointer"
                  >
                    <CheckCircle2
                      className={`w-5 h-5 shrink-0 ${
                        completed
                          ? 'text-[#1b7a52] dark:text-emerald-400'
                          : 'text-emerald-950/20 dark:text-emerald-200/25'
                      }`}
                    />
                    <div>
                      <div
                        className={`text-sm font-medium ${
                          completed
                            ? 'line-through text-[#476354] dark:text-emerald-200/60'
                            : 'text-[#0f2419] dark:text-emerald-50'
                        }`}
                      >
                        {slot.label}
                      </div>
                    </div>
                  </button>

                  <input
                    type="time"
                    value={slot.targetTime}
                    aria-label={`${slot.label} target time`}
                    onChange={(e) =>
                      onUpdatePlan((p) => ({
                        ...p,
                        mealSchedule: p.mealSchedule.map((s) =>
                          s.id === slot.id ? { ...s, targetTime: e.target.value } : s
                        ),
                      }))
                    }
                    className="min-h-[40px] px-2.5 py-1 rounded-lg bg-[#f3f7f4] dark:bg-[#192b21] border border-emerald-950/10 dark:border-emerald-200/15 font-mono text-xs text-[#0f2419] dark:text-emerald-50"
                  />
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Weekly Progress Report */}
      <section className="rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[#0f2419] dark:text-emerald-50">
              Weekly Progress Report
            </h2>
            <p className="text-xs text-[#476354] dark:text-emerald-200/70">
              7-day Time-in-Range % (70% goal line dashed) alongside step & spike averages
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums text-[#476354] dark:text-emerald-200/80">
            <span>Avg TIR: <strong className="font-mono text-[#1b7a52] dark:text-emerald-400">{weeklySummary.avgTir}%</strong></span>
            <span aria-hidden="true">·</span>
            <span>Avg Steps: <strong className="font-mono text-[#0f2419] dark:text-emerald-50">{weeklySummary.avgSteps.toLocaleString()}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Avg Meal Spike: <strong className="font-mono text-[#0f2419] dark:text-emerald-50">{weeklySummary.avgSpike}/100</strong></span>
          </div>
        </div>

        <WeeklyProgressChartSvg data={plan.weeklyHistory} />
      </section>
    </div>
  );
};
