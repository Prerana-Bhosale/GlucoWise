import type {
  ActivityLevel,
  FoodItem,
  GlucoseReading,
  ImpactLevel,
  ProfileTargets,
  UserProfile,
} from '../types/glucowise';

export interface MealTotals {
  kcal: number;
  carbs: number;
  fiber: number;
  sugar: number;
  protein: number;
  fat: number;
  netCarbs: number;
  glycemicLoad: number;
  spikeScore: number;
  impactLevel: ImpactLevel;
}

export function calculateMealMetrics(items: FoodItem[]): MealTotals {
  if (items.length === 0) {
    return {
      kcal: 0,
      carbs: 0,
      fiber: 0,
      sugar: 0,
      protein: 0,
      fat: 0,
      netCarbs: 0,
      glycemicLoad: 0,
      spikeScore: 0,
      impactLevel: 'Low',
    };
  }

  let kcal = 0;
  let carbs = 0;
  let fiber = 0;
  let sugar = 0;
  let protein = 0;
  let fat = 0;
  let weightedGl = 0;

  for (const item of items) {
    const itemCarbs = Math.max(0, Number(item.carbs) || 0);
    const itemFiber = Math.max(0, Number(item.fiber) || 0);
    const itemSugar = Math.max(0, Number(item.sugar) || 0);
    const itemProtein = Math.max(0, Number(item.protein) || 0);
    const itemFat = Math.max(0, Number(item.fat) || 0);
    const itemKcal = Math.max(0, Number(item.kcal) || 0);
    const itemGi = Math.min(100, Math.max(0, Number(item.gi) || 50));

    kcal += itemKcal;
    carbs += itemCarbs;
    fiber += itemFiber;
    sugar += itemSugar;
    protein += itemProtein;
    fat += itemFat;

    const itemNetCarbs = Math.max(0, itemCarbs - itemFiber);
    weightedGl += (itemNetCarbs * itemGi) / 100;
  }

  const netCarbs = Math.max(0, carbs - fiber);

  // Spike Score (0-100): glycemic load + simple sugar acceleration, softened by fiber, protein, and healthy fats
  const rawLoadPoints = weightedGl * 2.15 + sugar * 0.65;
  const buffering = Math.min(28, fiber * 1.15 + protein * 0.35 + fat * 0.25);
  const score = Math.round(Math.min(100, Math.max(4, rawLoadPoints - buffering * 0.55)));

  let impactLevel: ImpactLevel = 'Low';
  if (score >= 65) {
    impactLevel = 'High';
  } else if (score >= 35) {
    impactLevel = 'Moderate';
  }

  return {
    kcal: Math.round(kcal),
    carbs: Math.round(carbs * 10) / 10,
    fiber: Math.round(fiber * 10) / 10,
    sugar: Math.round(sugar * 10) / 10,
    protein: Math.round(protein * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    netCarbs: Math.round(netCarbs * 10) / 10,
    glycemicLoad: Math.round(weightedGl * 10) / 10,
    spikeScore: score,
    impactLevel,
  };
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  active: 1.55,
  very_active: 1.725,
};

const ACTIVITY_STEPS: Record<ActivityLevel, number> = {
  sedentary: 6000,
  lightly_active: 7500,
  active: 9500,
  very_active: 11500,
};

export function computeProfileTargets(profile: UserProfile): ProfileTargets {
  const age = Math.min(105, Math.max(14, Number(profile.age) || 40));
  const weightKg = Math.min(250, Math.max(35, Number(profile.weightKg) || 72));
  const heightCm = Math.min(230, Math.max(120, Number(profile.heightCm) || 170));

  // Neutral Mifflin-St Jeor midpoint (-78 constant between +5 and -161)
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 78;
  const multiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel] ?? 1.375;
  const rawCalories = Math.round((bmr * multiplier) / 25) * 25;
  const dailyCalories = Math.min(3600, Math.max(1200, rawCalories));

  // Diabetes-conscious macro distribution:
  // Stricter A1C goal (<6.5%) slightly shifts energy from carbs toward fiber-rich veggies, protein, and healthy fats
  const carbShare = profile.targetA1c <= 6.5 ? 0.34 : 0.38;
  const proteinShare = 0.25;
  const fatShare = 1 - carbShare - proteinShare;

  const carbsG = Math.round((dailyCalories * carbShare) / 4);
  const proteinG = Math.round((dailyCalories * proteinShare) / 4);
  const fatG = Math.round((dailyCalories * fatShare) / 9);
  const fiberG = Math.max(25, Math.round((dailyCalories / 1000) * 14));

  const heightM = heightCm / 100;
  const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  let bmiCategory = 'Healthy range';
  if (bmi < 18.5) bmiCategory = 'Underweight';
  else if (bmi >= 30) bmiCategory = 'Elevated';
  else if (bmi >= 25) bmiCategory = 'Slightly above range';

  const dailySteps = ACTIVITY_STEPS[profile.activityLevel] ?? 7500;

  return {
    dailyCalories,
    carbsG,
    proteinG,
    fatG,
    fiberG,
    dailySteps,
    bmi,
    bmiCategory,
  };
}

export interface GlucoseClassification {
  status: 'severe-low' | 'low' | 'in-range' | 'high' | 'very-high';
  label: string;
  guidance: string;
  isAbnormal: boolean;
}

export function classifyGlucose(
  value: number,
  lowThreshold = 70,
  highThreshold = 180
): GlucoseClassification {
  if (value < 54) {
    return {
      status: 'severe-low',
      label: 'Urgent Low',
      guidance:
        'Below 54 mg/dL is critically low. If symptomatic or confirmed, consume 15g fast-acting carbs immediately, recheck in 15 minutes, and contact urgent medical support if needed.',
      isAbnormal: true,
    };
  }
  if (value < lowThreshold) {
    return {
      status: 'low',
      label: 'Below Range',
      guidance:
        `Reading is below your ${lowThreshold} mg/dL target. Confirm with a fingerstick check if needed, consider 15g fast-acting carbohydrates, and retest in 15 minutes.`,
      isAbnormal: true,
    };
  }
  if (value > 250) {
    return {
      status: 'very-high',
      label: 'Very High',
      guidance:
        'Reading exceeds 250 mg/dL. Hydrate with water, check for ketones if advised by your care team, avoid vigorous exercise until levels settle, and follow your clinical plan.',
      isAbnormal: true,
    };
  }
  if (value > highThreshold) {
    return {
      status: 'high',
      label: 'Above Range',
      guidance:
        `Reading is above your ${highThreshold} mg/dL upper target. Consider drinking water and taking a gentle 10-15 minute walk if appropriate for your care plan.`,
      isAbnormal: true,
    };
  }
  return {
    status: 'in-range',
    label: 'In Range',
    guidance: `Within your ${lowThreshold}-${highThreshold} mg/dL target band.`,
    isAbnormal: false,
  };
}

export interface GlucoseStats {
  count: number;
  inRangePct: number;
  lowPct: number;
  highPct: number;
  avg: number;
  min: number;
  max: number;
  gmi: number;
}

export function calculateGlucoseStats(
  readings: GlucoseReading[],
  lowThreshold = 70,
  highThreshold = 180
): GlucoseStats {
  if (readings.length === 0) {
    return {
      count: 0,
      inRangePct: 0,
      lowPct: 0,
      highPct: 0,
      avg: 0,
      min: 0,
      max: 0,
      gmi: 0,
    };
  }

  let inRange = 0;
  let low = 0;
  let high = 0;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;

  for (const r of readings) {
    sum += r.value;
    if (r.value < min) min = r.value;
    if (r.value > max) max = r.value;

    if (r.value < lowThreshold) {
      low += 1;
    } else if (r.value > highThreshold) {
      high += 1;
    } else {
      inRange += 1;
    }
  }

  const count = readings.length;
  const avg = Math.round(sum / count);
  const inRangePct = Math.round((inRange / count) * 100);
  const lowPct = Math.round((low / count) * 100);
  const highPct = Math.max(0, 100 - inRangePct - lowPct);
  const gmi = Math.round((3.31 + 0.02392 * avg) * 10) / 10;

  return {
    count,
    inRangePct,
    lowPct,
    highPct,
    avg,
    min,
    max,
    gmi,
  };
}

export interface GlucoseTrendBucket {
  date: Date;
  label: string;
  avg: number;
  sd: number;
  upperSd: number;
  lowerSd: number;
  trendAvg: number;
  count: number;
}

export interface GlucoseWindowSummary {
  days: 7 | 30 | 90;
  count: number;
  avg: number;
  sd: number;
  cv: number;
  inRangePct: number;
  trendDelta: number | null;
}

export function computeGlucoseWindowSummary(
  readings: GlucoseReading[],
  days: 7 | 30 | 90,
  lowThreshold = 70,
  highThreshold = 180
): GlucoseWindowSummary {
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  const cutoff = now - days * msPerDay;
  const prevCutoff = now - days * 2 * msPerDay;

  const currentReadings = readings.filter((r) => {
    const t = new Date(r.timestamp).getTime();
    return t >= cutoff && t <= now;
  });

  const prevReadings = readings.filter((r) => {
    const t = new Date(r.timestamp).getTime();
    return t >= prevCutoff && t < cutoff;
  });

  if (currentReadings.length === 0) {
    return {
      days,
      count: 0,
      avg: 0,
      sd: 0,
      cv: 0,
      inRangePct: 0,
      trendDelta: null,
    };
  }

  const values = currentReadings.map((r) => r.value);
  const count = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / count;
  const variance =
    count > 1
      ? values.reduce((s, v) => s + (v - mean) ** 2, 0) / (count - 1)
      : 0;
  const sd = Math.round(Math.sqrt(variance) * 10) / 10;
  const avg = Math.round(mean);
  const cv = mean > 0 ? Math.round((Math.sqrt(variance) / mean) * 1000) / 10 : 0;

  const inRange = values.filter((v) => v >= lowThreshold && v <= highThreshold).length;
  const inRangePct = Math.round((inRange / count) * 100);

  let trendDelta: number | null = null;
  if (prevReadings.length >= 2) {
    const prevAvg = prevReadings.reduce((s, r) => s + r.value, 0) / prevReadings.length;
    trendDelta = Math.round(mean - prevAvg);
  } else if (currentReadings.length >= 4) {
    // Compare second half of window vs first half if prior window has insufficient logs
    const sorted = [...currentReadings].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const mid = Math.floor(sorted.length / 2);
    const earlyAvg = sorted.slice(0, mid).reduce((s, r) => s + r.value, 0) / mid;
    const lateAvg = sorted.slice(mid).reduce((s, r) => s + r.value, 0) / (sorted.length - mid);
    trendDelta = Math.round(lateAvg - earlyAvg);
  }

  return {
    days,
    count,
    avg,
    sd,
    cv,
    inRangePct,
    trendDelta,
  };
}

export function buildGlucoseTrendSeries(
  readings: GlucoseReading[],
  days: 7 | 30 | 90
): GlucoseTrendBucket[] {
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  const cutoff = now - days * msPerDay;

  const inWindow = readings
    .filter((r) => new Date(r.timestamp).getTime() >= cutoff)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (inWindow.length === 0) return [];

  // Group into daily buckets for 7d/30d, or 3-day buckets for 90d when dense
  const bucketSpanDays = days === 90 ? 3 : 1;
  const buckets = new Map<string, { date: Date; values: number[] }>();

  for (const r of inWindow) {
    const dt = new Date(r.timestamp);
    const dayIndex = Math.floor((dt.getTime() - cutoff) / (bucketSpanDays * msPerDay));
    const bucketDate = new Date(cutoff + dayIndex * bucketSpanDays * msPerDay);
    bucketDate.setHours(12, 0, 0, 0);
    const key = `${bucketDate.getFullYear()}-${bucketDate.getMonth()}-${bucketDate.getDate()}`;

    const existing = buckets.get(key);
    if (existing) {
      existing.values.push(r.value);
    } else {
      buckets.set(key, { date: bucketDate, values: [r.value] });
    }
  }

  const rawBuckets = Array.from(buckets.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((b) => {
      const n = b.values.length;
      const mean = b.values.reduce((s, v) => s + v, 0) / n;
      const variance =
        n > 1 ? b.values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1) : 0;
      const sd = Math.round(Math.sqrt(variance) * 10) / 10;
      const avg = Math.round(mean * 10) / 10;
      return {
        date: b.date,
        label: b.date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        avg,
        sd,
        upperSd: Math.round((avg + sd) * 10) / 10,
        lowerSd: Math.max(40, Math.round((avg - sd) * 10) / 10),
        count: n,
      };
    });

  // 3-point smoothed rolling trend average
  return rawBuckets.map((item, idx) => {
    const start = Math.max(0, idx - 1);
    const end = Math.min(rawBuckets.length - 1, idx + 1);
    const slice = rawBuckets.slice(start, end + 1);
    const trendAvg =
      Math.round((slice.reduce((s, p) => s + p.avg, 0) / slice.length) * 10) / 10;
    return {
      ...item,
      trendAvg,
    };
  });
}

export function compressImageFile(file: File, maxDimension = 1200): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported or corrupted image format.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({ dataUrl, mimeType: 'image/jpeg' });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export async function loadSampleImageAsBase64(url: string): Promise<{ dataUrl: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to load sample meal photo.');
  }
  const blob = await res.blob();
  const file = new File([blob], 'sample.jpg', { type: blob.type || 'image/jpeg' });
  return compressImageFile(file, 1200);
}
