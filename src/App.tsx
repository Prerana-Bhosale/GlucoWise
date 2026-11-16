/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  CalendarCheck,
  Camera,
  LayoutDashboard,
  Moon,
  Sun,
  User,
} from 'lucide-react';
import type {
  AppSettings,
  GlucoseReading,
  LifestylePlan,
  MealRecord,
  Recipe,
  TabId,
  UserProfile,
} from './types/glucowise';
import { computeProfileTargets } from './utils/nutrition';
import {
  getDefaultLifestylePlan,
  getDefaultProfile,
  getDefaultSettings,
  getStarterGlucose,
  getStarterMeals,
  loadAppState,
  saveFavoriteRecipes,
  saveGlucose,
  saveMeals,
  savePlan,
  saveProfile,
  saveSettings,
} from './utils/storage';
import { TodayTab } from './components/TodayTab';
import { ScanTab } from './components/ScanTab';
import { GlucoseTab } from './components/GlucoseTab';
import { PlanTab } from './components/PlanTab';
import { RecipesTab } from './components/RecipesTab';
import { ProfileTab } from './components/ProfileTab';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'today', label: 'Today', icon: LayoutDashboard },
  { id: 'scan', label: 'Scan', icon: Camera },
  { id: 'glucose', label: 'Glucose', icon: Activity },
  { id: 'plan', label: 'Plan', icon: CalendarCheck },
  { id: 'recipes', label: 'Recipes', icon: BookOpen },
  { id: 'profile', label: 'Profile', icon: User },
];

export default function App() {
  const [initial] = useState(() => loadAppState());

  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [profile, setProfile] = useState<UserProfile>(initial.profile);
  const [settings, setSettings] = useState<AppSettings>(initial.settings);
  const [meals, setMeals] = useState<MealRecord[]>(initial.meals);
  const [readings, setReadings] = useState<GlucoseReading[]>(initial.glucose);
  const [plan, setPlan] = useState<LifestylePlan>(initial.plan);
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>(initial.favoriteRecipes);
  const [activeWalkReminder, setActiveWalkReminder] = useState(false);

  const targets = useMemo(() => computeProfileTargets(profile), [profile]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    saveMeals(meals);
  }, [meals]);

  useEffect(() => {
    saveGlucose(readings);
  }, [readings]);

  useEffect(() => {
    savePlan(plan);
  }, [plan]);

  useEffect(() => {
    saveFavoriteRecipes(favoriteRecipes);
  }, [favoriteRecipes]);

  const handleToggleTheme = () => {
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  const handleSaveProfile = (next: UserProfile) => {
    const nextTargets = computeProfileTargets(next);
    setProfile(next);
    setPlan((prev) => ({
      ...prev,
      dailyStepTarget: nextTargets.dailySteps,
    }));
  };

  const handleSaveMeal = (meal: MealRecord, startWalkReminder = false) => {
    setMeals((prev) => [meal, ...prev]);
    if (startWalkReminder && plan.postMealWalkEnabled) {
      setActiveWalkReminder(true);
    }
  };

  const handleDeleteMeal = (id: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAddReading = (reading: GlucoseReading) => {
    setReadings((prev) => [reading, ...prev]);
  };

  const handleImportReadings = (imported: GlucoseReading[], provider: AppSettings['cgmStatus']) => {
    setReadings((prev) => [...imported, ...prev]);
    setSettings((prev) => ({ ...prev, cgmStatus: provider }));
  };

  const handleDeleteReading = (id: string) => {
    setReadings((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdatePlan = useCallback((updater: (prev: LifestylePlan) => LifestylePlan) => {
    setPlan((prev) => updater(prev));
  }, []);

  const handleAddWater = () => {
    setPlan((prev) => ({
      ...prev,
      waterGlasses: Math.min(prev.waterTarget + 4, prev.waterGlasses + 1),
    }));
  };

  const handleAddWalkSteps = (steps: number, minutes: number) => {
    setPlan((prev) => ({
      ...prev,
      stepsToday: prev.stepsToday + steps,
      walkMinutesToday: prev.walkMinutesToday + minutes,
    }));
  };

  const handleToggleFavoriteRecipe = (recipe: Recipe) => {
    setFavoriteRecipes((prev) => {
      const exists = prev.some((r) => r.id === recipe.id);
      if (exists) {
        return prev.filter((r) => r.id !== recipe.id);
      }
      return [recipe, ...prev];
    });
  };

  const handleResetAppData = () => {
    const defProf = getDefaultProfile();
    setProfile(defProf);
    setSettings(getDefaultSettings());
    setMeals(getStarterMeals());
    setReadings(getStarterGlucose());
    setPlan(getDefaultLifestylePlan());
    setFavoriteRecipes([]);
    setActiveWalkReminder(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f7f4] dark:bg-[#0b140f] text-[#0f2419] dark:text-[#ebf5ee] transition-colors">
      {/* Top App Bar (3-zone contract on desktop, lean header on mobile) */}
      <header className="sticky top-0 z-30 h-14 pt-safe bg-[#f3f7f4]/90 dark:bg-[#0b140f]/90 backdrop-blur-md border-b border-emerald-950/8 dark:border-emerald-200/10">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className="text-lg font-bold tracking-tight text-[#0f2419] dark:text-emerald-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            GlucoWise
          </button>

          <nav className="hidden md:flex items-center gap-6" aria-label="Primary navigation">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-1.5 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                    active
                      ? 'border-[#1b7a52] dark:border-emerald-400 text-[#0f2419] dark:text-emerald-50'
                      : 'border-transparent text-[#476354] dark:text-emerald-200/75 hover:text-[#0f2419] dark:hover:text-emerald-50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label={settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#476354] hover:text-[#0f2419] dark:text-emerald-200/80 dark:hover:text-emerald-50 hover:bg-emerald-950/5 dark:hover:bg-emerald-200/10 transition-colors cursor-pointer"
            >
              {settings.theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 main-safe-bottom">
        {activeTab === 'today' && (
          <TodayTab
            profile={profile}
            targets={targets}
            meals={meals}
            readings={readings}
            plan={plan}
            onNavigate={setActiveTab}
            onAddWater={handleAddWater}
            onAddWalkSteps={handleAddWalkSteps}
          />
        )}

        {activeTab === 'scan' && (
          <ScanTab
            profile={profile}
            targets={targets}
            meals={meals}
            onSaveMeal={handleSaveMeal}
            onDeleteMeal={handleDeleteMeal}
          />
        )}

        {activeTab === 'glucose' && (
          <GlucoseTab
            profile={profile}
            settings={settings}
            readings={readings}
            onAddReading={handleAddReading}
            onImportReadings={handleImportReadings}
            onDeleteReading={handleDeleteReading}
            onUpdateCgmStatus={(cgmStatus) =>
              setSettings((prev) => ({ ...prev, cgmStatus }))
            }
          />
        )}

        {activeTab === 'plan' && (
          <PlanTab
            profile={profile}
            targets={targets}
            plan={plan}
            meals={meals}
            activeWalkReminder={activeWalkReminder}
            onDismissWalkReminder={() => setActiveWalkReminder(false)}
            onUpdatePlan={handleUpdatePlan}
          />
        )}

        {activeTab === 'recipes' && (
          <RecipesTab
            profile={profile}
            targets={targets}
            favoriteRecipes={favoriteRecipes}
            onToggleFavorite={handleToggleFavoriteRecipe}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileTab
            profile={profile}
            targets={targets}
            settings={settings}
            onSaveProfile={handleSaveProfile}
            onToggleTheme={handleToggleTheme}
            onResetAppData={handleResetAppData}
          />
        )}
      </main>

      {/* Fixed Mobile Bottom Tab Bar with Safe-Area Padding */}
      <nav
        aria-label="Mobile tab bar"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#121f18]/95 backdrop-blur-md border-t border-emerald-950/10 dark:border-emerald-200/10 pb-safe"
      >
        <div className="grid grid-cols-6 items-center h-16">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
                  active
                    ? 'text-[#1b7a52] dark:text-emerald-400'
                    : 'text-[#476354] dark:text-emerald-200/65'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium tracking-tight leading-none">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
