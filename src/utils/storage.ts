import type {
  AppSettings,
  GlucoseReading,
  LifestylePlan,
  MealRecord,
  Recipe,
  UserProfile,
} from '../types/glucowise';
import { calculateMealMetrics } from './nutrition';

const KEYS = {
  meals: 'glucowise_meals_v1',
  glucose: 'glucowise_glucose_v1',
  plan: 'glucowise_plan_v1',
  settings: 'glucowise_settings_v1',
  profile: 'glucowise_profile_v1',
  favoriteRecipes: 'glucowise_favorite_recipes_v1',
};

export function getTodayDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function safeLoad<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`localStorage read failed for ${key}:`, err);
    return fallback;
  }
}

export function safeSave<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`localStorage write failed for ${key}:`, err);
  }
}

export function getDefaultProfile(): UserProfile {
  return {
    name: 'Alex',
    age: 42,
    weightKg: 74,
    heightCm: 172,
    activityLevel: 'lightly_active',
    targetA1c: 6.5,
    fastingTargetMax: 120,
    glucoseLow: 70,
    glucoseHigh: 180,
  };
}

export function getDefaultSettings(): AppSettings {
  return {
    theme: 'light',
    cgmStatus: 'disconnected',
  };
}

export function getStarterMeals(): MealRecord[] {
  const now = Date.now();
  return [
    {
      id: 'meal-starter-1',
      timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      mealType: 'Lunch',
      title: 'Grilled Salmon & Quinoa Bowl',
      items: [
        {
          name: 'Grilled Salmon Fillet',
          portion: '150g',
          kcal: 310,
          carbs: 0,
          fiber: 0,
          sugar: 0,
          protein: 34,
          fat: 18,
          gi: 0,
        },
        {
          name: 'Cooked Quinoa',
          portion: '140g (3/4 cup)',
          kcal: 168,
          carbs: 30,
          fiber: 4,
          sugar: 1,
          protein: 6,
          fat: 2.5,
          gi: 53,
        },
        {
          name: 'Avocado & Steamed Broccoli',
          portion: '160g',
          kcal: 155,
          carbs: 10,
          fiber: 6.5,
          sugar: 2,
          protein: 4,
          fat: 11,
          gi: 15,
        },
      ],
      totalKcal: 633,
      totalCarbs: 40,
      totalFiber: 10.5,
      totalSugar: 3,
      totalProtein: 44,
      totalFat: 31.5,
      spikeScore: 22,
      impactLevel: 'Low',
      mealSummary:
        'High protein, fiber-rich vegetables, and healthy fats slow carbohydrate absorption for a steady glycemic response.',
      alternatives: [
        {
          swap: 'Keep quinoa to 1/2 cup and add extra leafy greens',
          reason: 'Further lowers net carbohydrate load while boosting potassium and fiber.',
          spikeReduction: 'Lower GL',
        },
      ],
    },
    {
      id: 'meal-starter-2',
      timestamp: new Date(now - 7.5 * 60 * 60 * 1000).toISOString(),
      mealType: 'Breakfast',
      title: 'Greek Yogurt Berry Parfait',
      items: [
        {
          name: 'Plain Greek Yogurt (2%)',
          portion: '170g',
          kcal: 130,
          carbs: 7,
          fiber: 0,
          sugar: 6,
          protein: 17,
          fat: 3.5,
          gi: 12,
        },
        {
          name: 'Mixed Blueberries & Chia',
          portion: '85g',
          kcal: 95,
          carbs: 15,
          fiber: 5,
          sugar: 7,
          protein: 2.5,
          fat: 3,
          gi: 40,
        },
        {
          name: 'Toasted Rolled Oats & Walnuts',
          portion: '35g',
          kcal: 165,
          carbs: 17,
          fiber: 2.5,
          sugar: 1,
          protein: 4.5,
          fat: 9,
          gi: 55,
        },
      ],
      totalKcal: 390,
      totalCarbs: 39,
      totalFiber: 7.5,
      totalSugar: 14,
      totalProtein: 24,
      totalFat: 15.5,
      spikeScore: 36,
      impactLevel: 'Moderate',
      mealSummary:
        'Balanced morning bowl with yogurt protein and walnut fats moderating fruit and oat absorption.',
      alternatives: [
        {
          swap: 'Swap half the oats for extra walnuts or flaxseed',
          reason: 'Increases satiety and flattens morning post-breakfast glucose rise.',
          spikeReduction: '-8 pts',
        },
      ],
    },
  ];
}

export function getStarterGlucose(): GlucoseReading[] {
  const now = Date.now();
  const h = 60 * 60 * 1000;
  const d = 24 * h;

  const recent: GlucoseReading[] = [
    {
      id: 'g-1',
      timestamp: new Date(now - 34 * h).toISOString(),
      value: 104,
      context: 'fasting',
      note: 'Morning baseline',
      source: 'manual',
    },
    {
      id: 'g-2',
      timestamp: new Date(now - 30 * h).toISOString(),
      value: 152,
      context: 'post-meal',
      note: '2h after lunch',
      source: 'manual',
    },
    {
      id: 'g-3',
      timestamp: new Date(now - 24 * h).toISOString(),
      value: 121,
      context: 'random',
      note: 'Afternoon check',
      source: 'manual',
    },
    {
      id: 'g-4',
      timestamp: new Date(now - 19 * h).toISOString(),
      value: 186,
      context: 'post-meal',
      note: 'Pasta dinner peak',
      source: 'manual',
    },
    {
      id: 'g-5',
      timestamp: new Date(now - 10 * h).toISOString(),
      value: 98,
      context: 'fasting',
      note: 'Waking fasting',
      source: 'manual',
    },
    {
      id: 'g-6',
      timestamp: new Date(now - 6 * h).toISOString(),
      value: 138,
      context: 'post-meal',
      note: '2h after yogurt parfait',
      source: 'manual',
    },
    {
      id: 'g-7',
      timestamp: new Date(now - 1.5 * h).toISOString(),
      value: 118,
      context: 'post-meal',
      note: '2h after salmon bowl + 15m walk',
      source: 'manual',
    },
  ];

  // Historical readings over days 3..88 showing gradual glycemic improvement & realistic SD
  const historicalOffsets: Array<{ daysAgo: number; fasting: number; postMeal: number }> = [
    { daysAgo: 3, fasting: 102, postMeal: 146 },
    { daysAgo: 5, fasting: 108, postMeal: 162 },
    { daysAgo: 6, fasting: 101, postMeal: 141 },
    { daysAgo: 9, fasting: 110, postMeal: 168 },
    { daysAgo: 12, fasting: 105, postMeal: 155 },
    { daysAgo: 15, fasting: 114, postMeal: 174 },
    { daysAgo: 18, fasting: 112, postMeal: 166 },
    { daysAgo: 21, fasting: 109, postMeal: 159 },
    { daysAgo: 24, fasting: 116, postMeal: 184 },
    { daysAgo: 27, fasting: 113, postMeal: 171 },
    { daysAgo: 32, fasting: 119, postMeal: 188 },
    { daysAgo: 36, fasting: 121, postMeal: 179 },
    { daysAgo: 41, fasting: 118, postMeal: 192 },
    { daysAgo: 46, fasting: 124, postMeal: 185 },
    { daysAgo: 52, fasting: 122, postMeal: 196 },
    { daysAgo: 58, fasting: 126, postMeal: 190 },
    { daysAgo: 64, fasting: 129, postMeal: 204 },
    { daysAgo: 70, fasting: 125, postMeal: 198 },
    { daysAgo: 76, fasting: 131, postMeal: 208 },
    { daysAgo: 82, fasting: 128, postMeal: 201 },
    { daysAgo: 87, fasting: 134, postMeal: 212 },
  ];

  const historical: GlucoseReading[] = [];
  historicalOffsets.forEach((pt, idx) => {
    historical.push({
      id: `g-hist-f-${idx}`,
      timestamp: new Date(now - pt.daysAgo * d - 8 * h).toISOString(),
      value: pt.fasting,
      context: 'fasting',
      note: 'Morning fasting',
      source: 'manual',
    });
    historical.push({
      id: `g-hist-p-${idx}`,
      timestamp: new Date(now - pt.daysAgo * d - 2 * h).toISOString(),
      value: pt.postMeal,
      context: 'post-meal',
      note: '2h post-meal',
      source: 'manual',
    });
  });

  return [...recent, ...historical];
}

export function getDefaultLifestylePlan(): LifestylePlan {
  const todayKey = getTodayDateKey();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyHistory = [];
  const sampleTir = [78, 82, 74, 86, 84, 89, 86];
  const sampleSteps = [6400, 7900, 5800, 8600, 8100, 9200, 5420];
  const sampleSpikes = [44, 38, 49, 34, 36, 31, 29];

  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const idx = 6 - i;
    weeklyHistory.push({
      dayLabel: i === 0 ? 'Today' : dayNames[d.getDay()],
      dateKey: getTodayDateKey(d),
      steps: sampleSteps[idx],
      tirPercent: sampleTir[idx],
      avgSpikeScore: sampleSpikes[idx],
    });
  }

  return {
    dailyStepTarget: 7500,
    stepsToday: 5420,
    stepsDateKey: todayKey,
    walkMinutesToday: 42,
    waterGlasses: 5,
    waterTarget: 8,
    waterDateKey: todayKey,
    postMealWalkEnabled: true,
    postMealWalkMinutes: 15,
    mealSchedule: [
      { id: 'slot-breakfast', label: 'Breakfast', targetTime: '08:00', enabled: true, completedDate: todayKey },
      { id: 'slot-lunch', label: 'Lunch', targetTime: '12:30', enabled: true, completedDate: todayKey },
      { id: 'slot-snack', label: 'Snack', targetTime: '16:00', enabled: true },
      { id: 'slot-dinner', label: 'Dinner', targetTime: '19:00', enabled: true },
    ],
    weeklyHistory,
  };
}

export function getCuratedRecipes(): Recipe[] {
  const seeds = [
    {
      id: 'rec-mediterranean-chickpea-bowl',
      title: 'Lemon Herb Chicken & Cauliflower Rice Skillet',
      mealType: 'Dinner' as const,
      prepMinutes: 22,
      servings: 2,
      description: 'Tender seared chicken thighs over garlicky cauliflower rice, spinach, and toasted pine nuts.',
      ingredients: [
        '280g boneless skinless chicken breast or thighs, cubed',
        '300g riced cauliflower',
        '2 cups baby spinach',
        '1 tbsp extra virgin olive oil',
        '2 cloves garlic, minced',
        'Juice & zest of 1 lemon',
        '2 tbsp toasted pine nuts or almonds',
        'Salt, black pepper, and dried oregano',
      ],
      instructions: [
        'Heat olive oil in a large skillet over medium-high heat. Season chicken with salt, pepper, and oregano, then sear 5–6 minutes until golden and cooked through.',
        'Remove chicken briefly, add garlic and riced cauliflower, and sauté 4 minutes until tender-crisp.',
        'Fold in baby spinach, lemon juice, zest, and return chicken to the pan for 1–2 minutes until spinach wilts.',
        'Top with toasted pine nuts before serving.',
      ],
      nutrition: { kcal: 410, carbs: 14, fiber: 5.5, sugar: 4, protein: 42, fat: 21, gi: 18 },
      diabetesTip: 'Swapping white rice for cauliflower rice cuts digestible carbs by ~35g while keeping meal volume satisfying.',
    },
    {
      id: 'rec-chia-almond-overnight',
      title: 'Cinnamon Chia & Walnut Breakfast Pudding',
      mealType: 'Breakfast' as const,
      prepMinutes: 10,
      servings: 1,
      description: 'Creamy, high-fiber chia pudding gently spiced with Ceylon cinnamon and topped with blackberries.',
      ingredients: [
        '3 tbsp chia seeds',
        '3/4 cup unsweetened almond milk',
        '1/3 cup plain Greek yogurt (2%)',
        '1/2 tsp ground cinnamon',
        '1/3 cup fresh blackberries or raspberries',
        '1 tbsp chopped walnuts',
      ],
      instructions: [
        'Whisk chia seeds, almond milk, Greek yogurt, and cinnamon in a jar until smooth.',
        'Rest 5 minutes, whisk once more to prevent clumping, then refrigerate at least 2 hours or overnight.',
        'Top with fresh berries and chopped walnuts just before eating.',
      ],
      nutrition: { kcal: 335, carbs: 21, fiber: 12.5, sugar: 5, protein: 16, fat: 21, gi: 22 },
      diabetesTip: 'High soluble fiber from chia seeds forms a gentle gel that slows morning glucose absorption.',
    },
    {
      id: 'rec-salmon-avocado-greens',
      title: 'Seared Salmon, Edamame & Sesame Greens',
      mealType: 'Lunch' as const,
      prepMinutes: 18,
      servings: 1,
      description: 'Omega-3 rich salmon paired with shelled edamame, crisp broccoli, and sesame-ginger dressing.',
      ingredients: [
        '150g salmon fillet',
        '1/2 cup shelled edamame',
        '1.5 cups broccoli florets',
        '1/2 ripe avocado, sliced',
        '1 tsp toasted sesame oil',
        '1 tsp rice vinegar & 1 tsp low-sodium tamari',
      ],
      instructions: [
        'Steam broccoli and edamame for 4–5 minutes until bright green and crisp-tender.',
        'Pan-sear salmon skin-side down for 4 minutes, flip, and cook 3 minutes more.',
        'Whisk sesame oil, rice vinegar, and tamari; drizzle over greens and serve with sliced avocado.',
      ],
      nutrition: { kcal: 495, carbs: 18, fiber: 9, sugar: 3, protein: 38, fat: 30, gi: 15 },
      diabetesTip: 'Pairing fibrous greens with salmon and avocado produces minimal post-prandial glucose excursion.',
    },
    {
      id: 'rec-lentil-spinach-soup',
      title: 'Spiced Red Lentil & Kale Turmeric Soup',
      mealType: 'Lunch' as const,
      prepMinutes: 28,
      servings: 3,
      description: 'Warming plant-protein soup packed with lentils, chopped kale, tomatoes, and cumin.',
      ingredients: [
        '1 cup dry red lentils, rinsed',
        '4 cups low-sodium vegetable broth',
        '2 cups chopped lacinato kale',
        '1 cup diced tomatoes',
        '1 small onion & 2 cloves garlic, diced',
        '1 tsp turmeric, 1 tsp cumin, 1 tbsp olive oil',
      ],
      instructions: [
        'Sauté onion and garlic in olive oil for 4 minutes until translucent; stir in turmeric and cumin for 30 seconds.',
        'Add rinsed lentils, diced tomatoes, and broth. Bring to a boil, then simmer 16–18 minutes until lentils soften.',
        'Stir in chopped kale and simmer 3 more minutes before serving.',
      ],
      nutrition: { kcal: 310, carbs: 42, fiber: 12, sugar: 5, protein: 18, fat: 6.5, gi: 32 },
      diabetesTip: 'Lentils contain resistant starch and 12g fiber per bowl, resulting in a slow, steady energy release.',
    },
    {
      id: 'rec-cottage-cucumber-crunch',
      title: 'Herbed Cottage Cheese & Seeded Veggie Plate',
      mealType: 'Snack' as const,
      prepMinutes: 6,
      servings: 1,
      description: 'Savory high-protein afternoon snack with cucumber, bell pepper strips, and pumpkin seeds.',
      ingredients: [
        '1/2 cup low-fat cottage cheese',
        '1/2 cucumber, sliced into rounds',
        '1/2 red bell pepper, sliced',
        '1 tbsp roasted pumpkin seeds (pepitas)',
        'Fresh dill, cracked pepper, pinch of sumac or lemon',
      ],
      instructions: [
        'Spoon cottage cheese into a small bowl and top with fresh dill, black pepper, and pumpkin seeds.',
        'Arrange sliced cucumber and bell pepper alongside for dipping.',
      ],
      nutrition: { kcal: 195, carbs: 11, fiber: 3, sugar: 5, protein: 17, fat: 8.5, gi: 20 },
      diabetesTip: 'A protein-forward afternoon snack prevents late-day hunger crashes without spiking blood sugar.',
    },
  ];

  return seeds.map((s) => {
    const metrics = calculateMealMetrics([
      {
        name: s.title,
        portion: '1 serving',
        ...s.nutrition,
      },
    ]);
    return {
      ...s,
      spikeScore: metrics.spikeScore,
      impactLevel: metrics.impactLevel,
    };
  });
}

export function loadAppState() {
  const profile = safeLoad<UserProfile>(KEYS.profile, getDefaultProfile());
  const settings = safeLoad<AppSettings>(KEYS.settings, getDefaultSettings());
  const meals = safeLoad<MealRecord[]>(KEYS.meals, getStarterMeals());
  const glucose = safeLoad<GlucoseReading[]>(KEYS.glucose, getStarterGlucose());
  const plan = safeLoad<LifestylePlan>(KEYS.plan, getDefaultLifestylePlan());
  const favoriteRecipes = safeLoad<Recipe[]>(KEYS.favoriteRecipes, []);

  const todayKey = getTodayDateKey();
  if (plan.stepsDateKey !== todayKey) {
    plan.stepsToday = 0;
    plan.walkMinutesToday = 0;
    plan.stepsDateKey = todayKey;
  }
  if (plan.waterDateKey !== todayKey) {
    plan.waterGlasses = 0;
    plan.waterDateKey = todayKey;
  }

  return { profile, settings, meals, glucose, plan, favoriteRecipes };
}

export function saveProfile(profile: UserProfile) {
  safeSave(KEYS.profile, profile);
}

export function saveSettings(settings: AppSettings) {
  safeSave(KEYS.settings, settings);
}

export function saveMeals(meals: MealRecord[]) {
  safeSave(KEYS.meals, meals);
}

export function saveGlucose(readings: GlucoseReading[]) {
  safeSave(KEYS.glucose, readings);
}

export function savePlan(plan: LifestylePlan) {
  safeSave(KEYS.plan, plan);
}

export function saveFavoriteRecipes(recipes: Recipe[]) {
  safeSave(KEYS.favoriteRecipes, recipes);
}
