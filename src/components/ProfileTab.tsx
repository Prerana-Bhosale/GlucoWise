import React, { useState } from 'react';
import {
  Check,
  Moon,
  RotateCcw,
  ShieldAlert,
  Sun,
  User,
} from 'lucide-react';
import type {
  ActivityLevel,
  AppSettings,
  ProfileTargets,
  UserProfile,
} from '../types/glucowise';
import { computeProfileTargets } from '../utils/nutrition';

interface ProfileTabProps {
  profile: UserProfile;
  targets: ProfileTargets;
  settings: AppSettings;
  onSaveProfile: (next: UserProfile) => void;
  onToggleTheme: () => void;
  onResetAppData: () => void;
}

const ACTIVITY_OPTIONS: { id: ActivityLevel; label: string; desc: string }[] = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Mostly seated, minimal daily exercise' },
  { id: 'lightly_active', label: 'Lightly Active', desc: 'Light walks or gentle activity 1–3×/wk' },
  { id: 'active', label: 'Active', desc: 'Moderate exercise 3–5×/wk' },
  { id: 'very_active', label: 'Very Active', desc: 'Daily vigorous training or physical job' },
];

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profile,
  targets,
  settings,
  onSaveProfile,
  onToggleTheme,
  onResetAppData,
}) => {
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [savedFlag, setSavedFlag] = useState(false);

  const previewTargets = computeProfileTargets(draft);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(draft);
    setSavedFlag(true);
    window.setTimeout(() => setSavedFlag(false), 3000);
  };

  const weightLbs = Math.round(draft.weightKg * 2.20462);
  const totalInches = Math.round(draft.heightCm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f2419] dark:text-emerald-50">
            Personal Profile & Targets
          </h1>
          <p className="text-sm text-[#476354] dark:text-emerald-200/75">
            Your metrics calibrate daily calories, carb budgets, step goals, AI meal swaps, and recipe portions.
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-white dark:bg-[#121f18] border border-emerald-950/10 dark:border-emerald-200/15 text-xs font-semibold text-[#0f2419] dark:text-emerald-50 inline-flex items-center gap-2 cursor-pointer self-start"
        >
          {settings.theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#1b7a52]" />}
          {settings.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Profile Input Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5 space-y-5"
        >
          <div className="flex items-center gap-2 text-base font-semibold text-[#0f2419] dark:text-emerald-50">
            <User className="w-4 h-4 text-[#1b7a52] dark:text-emerald-400" />
            Biometrics & Clinical Targets
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prof-name" className="block text-xs font-medium text-[#476354] dark:text-emerald-200/80 mb-1">
                First Name
              </label>
              <input
                id="prof-name"
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#f3f7f4] dark:bg-[#192b21] border border-emerald-950/10 dark:border-emerald-200/15 text-sm text-[#0f2419] dark:text-emerald-50 focus:outline-none focus:ring-2 focus:ring-[#1b7a52]"
              />
            </div>

            <div>
              <label htmlFor="prof-age" className="block text-xs font-medium text-[#476354] dark:text-emerald-200/80 mb-1">
                Age (years)
              </label>
              <input
                id="prof-age"
                type="number"
                min={14}
                max={105}
                value={draft.age}
                onChange={(e) => setDraft({ ...draft, age: Number(e.target.value) || 0 })}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#f3f7f4] dark:bg-[#192b21] border border-emerald-950/10 dark:border-emerald-200/15 font-mono text-sm text-[#0f2419] dark:text-emerald-50 focus:outline-none focus:ring-2 focus:ring-[#1b7a52]"
              />
            </div>

            <div>
              <label htmlFor="prof-weight" className="block text-xs font-medium text-[#476354] dark:text-emerald-200/80 mb-1">
                Weight (kg) <span className="opacity-75">· ~{weightLbs} lbs</span>
              </label>
              <input
                id="prof-weight"
                type="number"
                min={35}
                max={250}
                step="0.5"
                value={draft.weightKg}
                onChange={(e) => setDraft({ ...draft, weightKg: Number(e.target.value) || 0 })}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#f3f7f4] dark:bg-[#192b21] border border-emerald-950/10 dark:border-emerald-200/15 font-mono text-sm text-[#0f2419] dark:text-emerald-50 focus:outline-none focus:ring-2 focus:ring-[#1b7a52]"
              />
            </div>

            <div>
              <label htmlFor="prof-height" className="block text-xs font-medium text-[#476354] dark:text-emerald-200/80 mb-1">
                Height (cm) <span className="opacity-75">· {feet}′{inches}″</span>
              </label>
              <input
                id="prof-height"
                type="number"
                min={120}
                max={230}
                value={draft.heightCm}
                onChange={(e) => setDraft({ ...draft, heightCm: Number(e.target.value) || 0 })}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#f3f7f4] dark:bg-[#192b21] border border-emerald-950/10 dark:border-emerald-200/15 font-mono text-sm text-[#0f2419] dark:text-emerald-50 focus:outline-none focus:ring-2 focus:ring-[#1b7a52]"
              />
            </div>
          </div>

          {/* Activity Level */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-[#476354] dark:text-emerald-200/80">
              Activity Level
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ACTIVITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDraft({ ...draft, activityLevel: opt.id })}
                  className={`min-h-[56px] p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    draft.activityLevel === opt.id
                      ? 'border-[#1b7a52] dark:border-emerald-400 bg-[#e8f1eb]/70 dark:bg-[#192b21]'
                      : 'border-emerald-950/10 dark:border-emerald-200/15 bg-[#f3f7f4]/50 dark:bg-[#192b21]/40'
                  }`}
                >
                  <div className="text-xs font-semibold text-[#0f2419] dark:text-emerald-50">
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-[#476354] dark:text-emerald-200/75 mt-0.5">
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Personal A1C & Glucose Range Targets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-emerald-950/8 dark:border-emerald-200/10">
            <div>
              <label htmlFor="prof-a1c" className="block text-xs font-medium text-[#476354] dark:text-emerald-200/80 mb-1">
                Personal A1C Target (%)
              </label>
              <input
                id="prof-a1c"
                type="number"
                min={4.5}
                max={10}
                step="0.1"
                value={draft.targetA1c}
                onChange={(e) => setDraft({ ...draft, targetA1c: Number(e.target.value) || 6.5 })}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#f3f7f4] dark:bg-[#192b21] border border-emerald-950/10 dark:border-emerald-200/15 font-mono text-sm text-[#0f2419] dark:text-emerald-50 focus:outline-none focus:ring-2 focus:ring-[#1b7a52]"
              />
            </div>

            <div>
              <label htmlFor="prof-low" className="block text-xs font-medium text-[#476354] dark:text-emerald-200/80 mb-1">
                Target Range Low (mg/dL)
              </label>
              <input
                id="prof-low"
                type="number"
                min={55}
                max={100}
                value={draft.glucoseLow}
                onChange={(e) => setDraft({ ...draft, glucoseLow: Number(e.target.value) || 70 })}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#f3f7f4] dark:bg-[#192b21] border border-emerald-950/10 dark:border-emerald-200/15 font-mono text-sm text-[#0f2419] dark:text-emerald-50 focus:outline-none focus:ring-2 focus:ring-[#1b7a52]"
              />
            </div>

            <div>
              <label htmlFor="prof-high" className="block text-xs font-medium text-[#476354] dark:text-emerald-200/80 mb-1">
                Target Range High (mg/dL)
              </label>
              <input
                id="prof-high"
                type="number"
                min={120}
                max={240}
                value={draft.glucoseHigh}
                onChange={(e) => setDraft({ ...draft, glucoseHigh: Number(e.target.value) || 180 })}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#f3f7f4] dark:bg-[#192b21] border border-emerald-950/10 dark:border-emerald-200/15 font-mono text-sm text-[#0f2419] dark:text-emerald-50 focus:outline-none focus:ring-2 focus:ring-[#1b7a52]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1b7a52] hover:bg-[#156342] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-[#07150e] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Check className="w-4 h-4" />
              Save Profile & Update Targets
            </button>

            {savedFlag && (
              <span className="text-xs font-medium text-[#1b7a52] dark:text-emerald-400">
                Profile saved and planner targets updated.
              </span>
            )}
          </div>
        </form>

        {/* Computed Targets & Data Management */}
        <div className="lg:col-span-5 space-y-5">
          <section className="rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-[#0f2419] dark:text-emerald-50">
                Tailored Daily Targets
              </h2>
              <p className="text-xs text-[#476354] dark:text-emerald-200/70">
                Automatically derived from your saved biometrics & A1C goal ({targets.bmi} BMI · {targets.bmiCategory})
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                ['Daily Calories', `${previewTargets.dailyCalories} kcal`],
                ['Daily Steps Goal', `${previewTargets.dailySteps.toLocaleString()} steps`],
                ['Carbohydrate Cap', `${previewTargets.carbsG}g`],
                ['Dietary Fiber Goal', `${previewTargets.fiberG}g`],
                ['Protein Target', `${previewTargets.proteinG}g`],
                ['Healthy Fat Target', `${previewTargets.fatG}g`],
              ].map(([label, val]) => (
                <div key={label} className="rounded-xl bg-[#f3f7f4] dark:bg-[#192b21] p-3">
                  <div className="text-[11px] text-[#476354] dark:text-emerald-200/70">{label}</div>
                  <div className="font-mono text-sm font-semibold tabular-nums text-[#0f2419] dark:text-emerald-50 mt-0.5">
                    {val}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[#0f2419] dark:text-emerald-50">
              Local Data & Medical Notice
            </h2>
            <p className="text-xs text-[#476354] dark:text-emerald-200/75 leading-relaxed">
              Your meals, glucose readings, favorite recipes, and profile settings are saved privately on this device via browser localStorage.
            </p>
            <button
              type="button"
              onClick={onResetAppData}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#f3f7f4] hover:bg-rose-50 dark:bg-[#192b21] dark:hover:bg-rose-950/40 text-xs font-semibold text-[#476354] hover:text-rose-700 dark:text-emerald-200/80 dark:hover:text-rose-300 inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Demo Data to Defaults
            </button>
          </section>

          <div className="rounded-2xl bg-[#e8f1eb]/70 dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-4 flex items-start gap-2.5 text-xs text-[#476354] dark:text-emerald-200/75">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-[#1b7a52] dark:text-emerald-400" />
            <p className="leading-relaxed">
              Calorie, macro, and glycemic targets are general educational estimates and should be personalized with your clinician or diabetes care educator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
