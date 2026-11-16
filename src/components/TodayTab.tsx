import React, { useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronRight,
  Droplets,
  Footprints,
  Plus,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import type {
  GlucoseReading,
  LifestylePlan,
  MealRecord,
  ProfileTargets,
  TabId,
  UserProfile,
} from '../types/glucowise';
import { calculateGlucoseStats, classifyGlucose } from '../utils/nutrition';
import { getTodayDateKey } from '../utils/storage';
import { CalorieRingSvg, SpikeScoreGaugeSvg } from './Charts';

interface TodayTabProps {
  profile: UserProfile;
  targets: ProfileTargets;
  meals: MealRecord[];
  readings: GlucoseReading[];
  plan: LifestylePlan;
  onNavigate: (tab: TabId) => void;
  onAddWater: () => void;
  onAddWalkSteps: (steps: number, minutes: number) => void;
}

export const TodayTab: React.FC<TodayTabProps> = ({
  profile,
  targets,
  meals,
  readings,
  plan,
  onNavigate,
  onAddWater,
  onAddWalkSteps,
}) => {
  const [selectedMeal, setSelectedMeal] = useState<MealRecord | null>(null);

  const todayKey = getTodayDateKey();
  const todaysMeals = meals.filter((m) => getTodayDateKey(new Date(m.timestamp)) === todayKey);

  const totals = todaysMeals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.totalKcal,
      carbs: acc.carbs + m.totalCarbs,
      fiber: acc.fiber + m.totalFiber,
      sugar: acc.sugar + m.totalSugar,
      protein: acc.protein + m.totalProtein,
      fat: acc.fat + m.totalFat,
    }),
    { kcal: 0, carbs: 0, fiber: 0, sugar: 0, protein: 0, fat: 0 }
  );

  const netCarbs = Math.max(0, Math.round((totals.carbs - totals.fiber) * 10) / 10);

  const sortedReadings = [...readings].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const latestGlucose = sortedReadings[0] ?? null;
  const glucoseStatus = latestGlucose
    ? classifyGlucose(latestGlucose.value, profile.glucoseLow, profile.glucoseHigh)
    : null;
  const tirStats = calculateGlucoseStats(readings, profile.glucoseLow, profile.glucoseHigh);

  const remainingKcal = Math.max(0, targets.dailyCalories - Math.round(totals.kcal));
  const effectiveStepGoal = plan.dailyStepTarget || targets.dailySteps;
  const stepPct = Math.min(100, Math.round((plan.stepsToday / Math.max(1, effectiveStepGoal)) * 100));

  const macroRows = [
    { label: 'Carbs', value: Math.round(totals.carbs), target: targets.carbsG, unit: 'g' },
    { label: 'Fiber', value: Math.round(totals.fiber), target: targets.fiberG, unit: 'g' },
    { label: 'Protein', value: Math.round(totals.protein), target: targets.proteinG, unit: 'g' },
    { label: 'Fat', value: Math.round(totals.fat), target: targets.fatG, unit: 'g' },
  ];

  const impactStyle = (level: MealRecord['impactLevel']) => {
    if (level === 'Low') return 'text-[#1b7a52] dark:text-emerald-400';
    if (level === 'Moderate') return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  return (
    <div className="space-y-5">
      {/* Greeting & Profile Anchor */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f2419] dark:text-emerald-50 text-balance">
            Today, {profile.name || 'Friend'}
          </h1>
          <p className="text-sm text-[#476354] dark:text-emerald-200/75">
            Target A1C {profile.targetA1c}% · Range {profile.glucoseLow}–{profile.glucoseHigh} mg/dL · {targets.dailyCalories} kcal goal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('scan')}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1b7a52] hover:bg-[#156342] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-[#07150e] text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Camera className="w-4 h-4" />
            Scan Meal
          </button>
        </div>
      </div>

      {/* Abnormal Latest Glucose Alert */}
      {latestGlucose && glucoseStatus?.isAbnormal && (
        <div
          role="alert"
          className={`rounded-2xl p-4 border flex items-start gap-3 ${
            glucoseStatus.status === 'severe-low' || glucoseStatus.status === 'low'
              ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-950 dark:text-rose-100'
              : 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-950 dark:text-amber-100'
          }`}
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <div className="font-semibold">
              {glucoseStatus.label}: Latest reading {latestGlucose.value} mg/dL ({latestGlucose.context.replace('-', ' ')})
            </div>
            <p className="text-xs opacity-90 leading-relaxed">{glucoseStatus.guidance}</p>
          </div>
        </div>
      )}

      {/* Primary 2-Column Hero Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Nutrition & Calorie Ring Card */}
        <section className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5 flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#0f2419] dark:text-emerald-50">
                Daily Nutrition
              </h2>
              <p className="text-xs text-[#476354] dark:text-emerald-200/70">
                Approximate meal estimates · {todaysMeals.length} meal{todaysMeals.length === 1 ? '' : 's'} today
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-[#476354] dark:text-emerald-200/75">
              {remainingKcal} kcal left
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <CalorieRingSvg consumed={Math.round(totals.kcal)} target={targets.dailyCalories} />

            <div className="flex-1 w-full space-y-3">
              {macroRows.map((macro) => {
                const pct = Math.min(100, Math.round((macro.value / Math.max(1, macro.target)) * 100));
                return (
                  <div key={macro.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#0f2419] dark:text-emerald-100">{macro.label}</span>
                      <span className="font-mono tabular-nums text-[#476354] dark:text-emerald-200/75">
                        {macro.value}{macro.unit} / {macro.target}{macro.unit}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-emerald-950/8 dark:bg-emerald-100/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#1b7a52] dark:bg-emerald-400 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#476354] dark:text-emerald-200/75">
                <span className="tabular-nums">Net carbs: <strong className="font-mono text-[#0f2419] dark:text-emerald-50">{netCarbs}g</strong></span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">Sugar: <strong className="font-mono text-[#0f2419] dark:text-emerald-50">{Math.round(totals.sugar)}g</strong></span>
              </div>
            </div>
          </div>
        </section>

        {/* Latest Glucose & Quick Habit Card */}
        <section className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#0f2419] dark:text-emerald-50">
                Latest Glucose
              </h2>
              <p className="text-xs text-[#476354] dark:text-emerald-200/70">
                Time-in-range: <span className="font-mono tabular-nums font-medium">{tirStats.inRangePct}%</span> ({tirStats.count} logs)
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('glucose')}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-[#e8f1eb] hover:bg-[#dcebe1] dark:bg-[#192b21] dark:hover:bg-[#22392c] text-[#0f2419] dark:text-emerald-100 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Glucose
            </button>
          </div>

          {latestGlucose && glucoseStatus ? (
            <div className="flex items-baseline justify-between gap-4 py-2 border-y border-emerald-950/8 dark:border-emerald-200/10">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-[#0f2419] dark:text-emerald-50">
                    {latestGlucose.value}
                  </span>
                  <span className="text-xs font-medium text-[#476354] dark:text-emerald-200/70">mg/dL</span>
                </div>
                <div className="text-xs text-[#476354] dark:text-emerald-200/75 mt-1">
                  <span className="capitalize">{latestGlucose.context.replace('-', ' ')}</span>
                  <span aria-hidden="true"> · </span>
                  <span>
                    {new Date(latestGlucose.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div
                  className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                    glucoseStatus.isAbnormal
                      ? glucoseStatus.status === 'low' || glucoseStatus.status === 'severe-low'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-amber-600 dark:text-amber-400'
                      : 'text-[#1b7a52] dark:text-emerald-400'
                  }`}
                >
                  {glucoseStatus.isAbnormal ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{glucoseStatus.label}</span>
                </div>
                <div className="text-[11px] text-[#476354] dark:text-emerald-200/70 mt-0.5 tabular-nums">
                  Avg {tirStats.avg} mg/dL
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#476354] dark:text-emerald-200/75 py-4">
              No readings logged yet. Tap Log Glucose to start tracking.
            </p>
          )}

          {/* Quick Hydration & Steps Strip */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onAddWater}
              className="min-h-[56px] rounded-xl bg-[#f3f7f4] hover:bg-[#e8f1eb] dark:bg-[#192b21] dark:hover:bg-[#21372b] p-3 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs text-[#476354] dark:text-emerald-200/75">
                <span className="inline-flex items-center gap-1 font-medium">
                  <Droplets className="w-3.5 h-3.5 text-[#1b7a52] dark:text-emerald-400" />
                  Water
                </span>
                <span>+1 cup</span>
              </div>
              <div className="font-mono text-base font-semibold tabular-nums text-[#0f2419] dark:text-emerald-50 mt-1">
                {plan.waterGlasses} / {plan.waterTarget} cups
              </div>
            </button>

            <button
              type="button"
              onClick={() => onAddWalkSteps(1000, 10)}
              className="min-h-[56px] rounded-xl bg-[#f3f7f4] hover:bg-[#e8f1eb] dark:bg-[#192b21] dark:hover:bg-[#21372b] p-3 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs text-[#476354] dark:text-emerald-200/75">
                <span className="inline-flex items-center gap-1 font-medium">
                  <Footprints className="w-3.5 h-3.5 text-[#1b7a52] dark:text-emerald-400" />
                  Steps
                </span>
                <span>+1k</span>
              </div>
              <div className="font-mono text-base font-semibold tabular-nums text-[#0f2419] dark:text-emerald-50 mt-1">
                {plan.stepsToday.toLocaleString()} <span className="text-xs font-normal text-[#476354] dark:text-emerald-200/70">({stepPct}%)</span>
              </div>
            </button>
          </div>
        </section>
      </div>

      {/* Recent Meals with Spike Scores */}
      <section className="rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#0f2419] dark:text-emerald-50">
              Recent Meals & Spike Scores
            </h2>
            <p className="text-xs text-[#476354] dark:text-emerald-200/70">
              Estimated glycemic impact (0–100) · Approximate, not lab measurements
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('scan')}
            className="min-h-[44px] px-3 text-xs font-semibold text-[#1b7a52] dark:text-emerald-400 hover:underline cursor-pointer whitespace-nowrap"
          >
            Add via Scan
          </button>
        </div>

        {meals.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#476354] dark:text-emerald-200/75">
            No meals recorded yet. Use the Scan tab to analyze a meal photo.
          </div>
        ) : (
          <div className="divide-y divide-emerald-950/8 dark:divide-emerald-200/10">
            {meals.slice(0, 5).map((meal) => (
              <button
                key={meal.id}
                type="button"
                onClick={() => setSelectedMeal(selectedMeal?.id === meal.id ? null : meal)}
                className="w-full min-h-[64px] py-3 flex items-center justify-between gap-4 text-left hover:bg-[#f3f7f4]/70 dark:hover:bg-[#192b21]/60 px-2 -mx-2 rounded-xl transition-colors cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-[#0f2419] dark:text-emerald-50 truncate">
                    {meal.title}
                  </div>
                  <div className="text-xs text-[#476354] dark:text-emerald-200/75 mt-0.5 truncate tabular-nums">
                    {meal.mealType} · {new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {meal.totalKcal} kcal · {meal.totalCarbs}g carbs · {meal.totalFiber}g fiber
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="font-mono text-base font-semibold tabular-nums text-[#0f2419] dark:text-emerald-50">
                      {meal.spikeScore}
                      <span className="text-[11px] font-normal text-[#476354] dark:text-emerald-200/70">/100</span>
                    </div>
                    <div className={`text-xs font-semibold inline-flex items-center gap-1 ${impactStyle(meal.impactLevel)}`}>
                      <TrendingUp className="w-3 h-3" />
                      {meal.impactLevel}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#476354] dark:text-emerald-200/60" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Inline Expanded Meal Details */}
        {selectedMeal && (
          <div className="mt-3 pt-4 border-t border-emerald-950/10 dark:border-emerald-200/15 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-[#0f2419] dark:text-emerald-50">
                  {selectedMeal.title} Breakdown
                </h3>
                <p className="text-xs text-[#476354] dark:text-emerald-200/80 mt-1">
                  {selectedMeal.mealSummary}
                </p>
              </div>
              <SpikeScoreGaugeSvg score={selectedMeal.spikeScore} impactLevel={selectedMeal.impactLevel} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
              {[
                ['Calories', `${selectedMeal.totalKcal} kcal`],
                ['Carbs', `${selectedMeal.totalCarbs}g`],
                ['Fiber', `${selectedMeal.totalFiber}g`],
                ['Sugar', `${selectedMeal.totalSugar}g`],
                ['Protein', `${selectedMeal.totalProtein}g`],
                ['Fat', `${selectedMeal.totalFat}g`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-[#f3f7f4] dark:bg-[#192b21] p-2.5">
                  <div className="text-[11px] text-[#476354] dark:text-emerald-200/70">{k}</div>
                  <div className="font-mono text-sm font-semibold tabular-nums text-[#0f2419] dark:text-emerald-50">{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Medical Disclaimer */}
      <footer className="rounded-2xl bg-[#e8f1eb]/70 dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-4 flex items-start gap-3 text-xs text-[#476354] dark:text-emerald-200/75">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-[#1b7a52] dark:text-emerald-400" />
        <p className="leading-relaxed">
          <strong className="text-[#0f2419] dark:text-emerald-100">Medical Disclaimer:</strong> GlucoWise provides educational nutrition estimates and lifestyle tracking only. AI food macro and Glucose Spike Score figures are approximate visual estimates, not laboratory measurements. Always consult your physician or registered dietitian before adjusting medications, insulin doses, or clinical targets.
        </p>
      </footer>
    </div>
  );
};
