export type TabId = 'today' | 'scan' | 'glucose' | 'plan' | 'recipes' | 'profile';

export type ImpactLevel = 'Low' | 'Moderate' | 'High';

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export type GlucoseContext = 'fasting' | 'post-meal' | 'random';

export type ActivityLevel = 'sedentary' | 'lightly_active' | 'active' | 'very_active';

export interface UserProfile {
  name: string;
  age: number;
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  targetA1c: number;
  fastingTargetMax: number;
  glucoseLow: number;
  glucoseHigh: number;
}

export interface ProfileTargets {
  dailyCalories: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  fiberG: number;
  dailySteps: number;
  bmi: number;
  bmiCategory: string;
}

export interface FoodItem {
  name: string;
  portion: string;
  kcal: number;
  carbs: number;
  fiber: number;
  sugar: number;
  protein: number;
  fat: number;
  gi: number;
}

export interface MealAlternative {
  swap: string;
  reason: string;
  spikeReduction: string;
}

export interface MealAnalysisResponse {
  items: FoodItem[];
  mealSummary: string;
  alternatives: MealAlternative[];
}

export interface MealRecord {
  id: string;
  timestamp: string;
  mealType: MealType;
  title: string;
  items: FoodItem[];
  totalKcal: number;
  totalCarbs: number;
  totalFiber: number;
  totalSugar: number;
  totalProtein: number;
  totalFat: number;
  spikeScore: number;
  impactLevel: ImpactLevel;
  mealSummary: string;
  alternatives: MealAlternative[];
  imagePreview?: string;
}

export interface GlucoseReading {
  id: string;
  timestamp: string;
  value: number;
  context: GlucoseContext;
  note?: string;
  source: 'manual' | 'cgm-import';
}

export interface MealScheduleSlot {
  id: string;
  label: MealType;
  targetTime: string;
  enabled: boolean;
  completedDate?: string;
}

export interface WeeklyDayPoint {
  dayLabel: string;
  dateKey: string;
  steps: number;
  tirPercent: number;
  avgSpikeScore: number;
}

export interface LifestylePlan {
  dailyStepTarget: number;
  stepsToday: number;
  stepsDateKey: string;
  walkMinutesToday: number;
  waterGlasses: number;
  waterTarget: number;
  waterDateKey: string;
  postMealWalkEnabled: boolean;
  postMealWalkMinutes: number;
  mealSchedule: MealScheduleSlot[];
  weeklyHistory: WeeklyDayPoint[];
}

export interface Recipe {
  id: string;
  title: string;
  mealType: MealType;
  prepMinutes: number;
  servings: number;
  description: string;
  ingredients: string[];
  instructions: string[];
  nutrition: {
    kcal: number;
    carbs: number;
    fiber: number;
    sugar: number;
    protein: number;
    fat: number;
    gi: number;
  };
  spikeScore: number;
  impactLevel: ImpactLevel;
  diabetesTip: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  cgmStatus: 'disconnected' | 'dexcom-ready' | 'libre-ready' | 'health-sync';
}
