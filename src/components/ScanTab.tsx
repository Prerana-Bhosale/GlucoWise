import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  Footprints,
  Info,
  Loader2,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
} from 'lucide-react';
import type {
  FoodItem,
  MealAnalysisResponse,
  MealRecord,
  MealType,
  ProfileTargets,
  UserProfile,
} from '../types/glucowise';
import {
  calculateMealMetrics,
  compressImageFile,
  loadSampleImageAsBase64,
} from '../utils/nutrition';
import { SpikeScoreGaugeSvg } from './Charts';

import sampleSalmonImg from '../assets/images/sample_salmon_bowl_1794841732374.jpg';
import samplePancakeImg from '../assets/images/sample_pancake_breakfast_1794841732923.jpg';

interface ScanTabProps {
  profile: UserProfile;
  targets: ProfileTargets;
  meals: MealRecord[];
  onSaveMeal: (meal: MealRecord, startWalkReminder?: boolean) => void;
  onDeleteMeal: (id: string) => void;
}

export const ScanTab: React.FC<ScanTabProps> = ({
  profile,
  targets,
  meals,
  onSaveMeal,
  onDeleteMeal,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mealType, setMealType] = useState<MealType>('Lunch');
  const [mealNote, setMealNote] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<MealAnalysisResponse | null>(null);
  const [editableItems, setEditableItems] = useState<FoodItem[]>([]);
  const [portionScale, setPortionScale] = useState<number>(1);
  const [startWalkAfterSave, setStartWalkAfterSave] = useState<boolean>(true);

  const scaledItems = useMemo(
    () =>
      editableItems.map((it) => ({
        ...it,
        kcal: Math.round(it.kcal * portionScale),
        carbs: Math.round(it.carbs * portionScale * 10) / 10,
        fiber: Math.round(it.fiber * portionScale * 10) / 10,
        sugar: Math.round(it.sugar * portionScale * 10) / 10,
        protein: Math.round(it.protein * portionScale * 10) / 10,
        fat: Math.round(it.fat * portionScale * 10) / 10,
      })),
    [editableItems, portionScale]
  );

  const liveMetrics = useMemo(() => calculateMealMetrics(scaledItems), [scaledItems]);

  const runVisionAnalysis = async (dataUrl: string, mimeType: string) => {
    setError(null);
    setSavedNotice(null);
    setPreviewUrl(dataUrl);
    setIsAnalyzing(true);
    setAnalysis(null);
    setEditableItems([]);
    setPortionScale(1);

    try {
      const response = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType,
          mealNote: mealNote.trim() || undefined,
          profileContext: {
            activityLevel: profile.activityLevel,
            targetA1c: profile.targetA1c,
            glucoseLow: profile.glucoseLow,
            glucoseHigh: profile.glucoseHigh,
            dailyCalories: targets.dailyCalories,
          },
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Could not analyze food photo.');
      }

      const result = payload as MealAnalysisResponse;
      setAnalysis(result);
      setEditableItems(Array.isArray(result.items) ? result.items : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Vision analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 1200);
      await runVisionAnalysis(compressed.dataUrl, compressed.mimeType);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load image.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSampleScan = async (imgUrl: string, suggestedType: MealType) => {
    setMealType(suggestedType);
    try {
      const compressed = await loadSampleImageAsBase64(imgUrl);
      await runVisionAnalysis(compressed.dataUrl, compressed.mimeType);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load sample meal.');
    }
  };

  const handleRemoveItem = (idx: number) => {
    setEditableItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveToHistory = () => {
    if (scaledItems.length === 0 || !analysis) return;

    const title =
      scaledItems.length === 1
        ? scaledItems[0].name
        : `${scaledItems[0].name} + ${scaledItems.length - 1} more`;

    const newRecord: MealRecord = {
      id: `meal-${Date.now()}`,
      timestamp: new Date().toISOString(),
      mealType,
      title,
      items: scaledItems,
      totalKcal: liveMetrics.kcal,
      totalCarbs: liveMetrics.carbs,
      totalFiber: liveMetrics.fiber,
      totalSugar: liveMetrics.sugar,
      totalProtein: liveMetrics.protein,
      totalFat: liveMetrics.fat,
      spikeScore: liveMetrics.spikeScore,
      impactLevel: liveMetrics.impactLevel,
      mealSummary: analysis.mealSummary,
      alternatives: analysis.alternatives ?? [],
      imagePreview: previewUrl ?? undefined,
    };

    const shouldRemindWalk =
      startWalkAfterSave && (liveMetrics.impactLevel === 'Moderate' || liveMetrics.impactLevel === 'High');

    onSaveMeal(newRecord, shouldRemindWalk);
    setSavedNotice(
      shouldRemindWalk
        ? 'Saved to meal history and scheduled a 15-minute post-meal walk reminder in Plan.'
        : 'Saved to meal history.'
    );
  };

  const impactColor =
    liveMetrics.impactLevel === 'Low'
      ? 'text-[#1b7a52] dark:text-emerald-400'
      : liveMetrics.impactLevel === 'Moderate'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f2419] dark:text-emerald-50">
          AI Meal Intelligence
        </h1>
        <p className="text-sm text-[#476354] dark:text-emerald-200/75">
          Upload a meal photo for computer-vision item identification, macro estimates, Glucose Spike Score, and tailored swaps for your {profile.targetA1c}% A1C target.
        </p>
      </div>

      {/* Approximate Estimates Notice */}
      <div className="rounded-2xl bg-[#e8f1eb]/80 dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-3.5 flex items-start gap-2.5 text-xs text-[#476354] dark:text-emerald-200/80">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#1b7a52] dark:text-emerald-400" />
        <span>
          All calorie, macro, glycemic index, and spike score figures are <strong>approximate visual estimates</strong>, not laboratory measurements.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Upload & Controls */}
        <section className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[#0f2419] dark:text-emerald-50">
              Meal Photo
            </h2>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#f3f7f4] dark:bg-[#192b21]">
              {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as MealType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMealType(type)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    mealType === type
                      ? 'bg-white dark:bg-[#121f18] text-[#0f2419] dark:text-emerald-50 shadow-sm'
                      : 'text-[#476354] dark:text-emerald-200/70 hover:text-[#0f2419] dark:hover:text-emerald-50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="sr-only"
            id="meal-photo-upload"
          />

          {previewUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-emerald-950/10 dark:border-emerald-200/15 bg-[#f3f7f4] dark:bg-[#0b140f]">
              <img
                src={previewUrl}
                alt="Selected meal for analysis"
                className="w-full h-56 object-cover"
              />
              <div className="p-3 flex items-center justify-between gap-2 bg-white/95 dark:bg-[#121f18]/95 border-t border-emerald-950/8 dark:border-emerald-200/10">
                <span className="text-xs text-[#476354] dark:text-emerald-200/75">
                  {isAnalyzing ? 'Analyzing food items...' : 'Photo ready'}
                </span>
                <label
                  htmlFor="meal-photo-upload"
                  className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#e8f1eb] hover:bg-[#dcebe1] dark:bg-[#192b21] dark:hover:bg-[#22392c] text-xs font-semibold text-[#0f2419] dark:text-emerald-100 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Replace Photo
                </label>
              </div>
            </div>
          ) : (
            <label
              htmlFor="meal-photo-upload"
              className="flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed border-emerald-950/15 dark:border-emerald-200/20 bg-[#f3f7f4]/60 dark:bg-[#192b21]/40 hover:bg-[#e8f1eb]/70 dark:hover:bg-[#192b21]/70 p-8 min-h-[210px] transition-colors cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#1b7a52]/10 dark:bg-emerald-400/15 flex items-center justify-center text-[#1b7a52] dark:text-emerald-400 mb-3">
                <Camera className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-[#0f2419] dark:text-emerald-50">
                Tap to capture or upload a food photo
              </span>
              <span className="text-xs text-[#476354] dark:text-emerald-200/70 mt-1">
                JPEG, PNG, or mobile camera photos supported
              </span>
            </label>
          )}

          <div>
            <label htmlFor="meal-note" className="block text-xs font-medium text-[#476354] dark:text-emerald-200/80 mb-1.5">
              Optional portion or dressing note
            </label>
            <input
              id="meal-note"
              type="text"
              value={mealNote}
              onChange={(e) => setMealNote(e.target.value)}
              placeholder="e.g. dressing on side, brown rice instead of white"
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#f3f7f4] dark:bg-[#192b21] border border-emerald-950/10 dark:border-emerald-200/15 text-sm text-[#0f2419] dark:text-emerald-50 placeholder:text-[#476354]/60 dark:placeholder:text-emerald-200/40 focus:outline-none focus:ring-2 focus:ring-[#1b7a52] dark:focus:ring-emerald-400"
            />
          </div>

          {/* Sample Meal Photos for 1-Tap Real Vision Testing */}
          <div className="pt-2 border-t border-emerald-950/8 dark:border-emerald-200/10 space-y-2.5">
            <div className="text-xs font-medium text-[#476354] dark:text-emerald-200/75">
              Or test Vision AI with a sample plate:
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={() => handleSampleScan(sampleSalmonImg, 'Lunch')}
                className="min-h-[48px] rounded-xl border border-emerald-950/10 dark:border-emerald-200/15 bg-[#f3f7f4] hover:bg-[#e8f1eb] dark:bg-[#192b21] dark:hover:bg-[#22392c] p-2 flex items-center gap-2.5 text-left transition-colors cursor-pointer disabled:opacity-50"
              >
                <img
                  src={sampleSalmonImg}
                  alt="Sample salmon quinoa bowl"
                  className="w-10 h-10 rounded-lg object-cover shrink-0"
                />
                <span className="text-xs font-medium text-[#0f2419] dark:text-emerald-50 leading-tight">
                  Salmon Quinoa Bowl
                </span>
              </button>

              <button
                type="button"
                disabled={isAnalyzing}
                onClick={() => handleSampleScan(samplePancakeImg, 'Breakfast')}
                className="min-h-[48px] rounded-xl border border-emerald-950/10 dark:border-emerald-200/15 bg-[#f3f7f4] hover:bg-[#e8f1eb] dark:bg-[#192b21] dark:hover:bg-[#22392c] p-2 flex items-center gap-2.5 text-left transition-colors cursor-pointer disabled:opacity-50"
              >
                <img
                  src={samplePancakeImg}
                  alt="Sample pancake breakfast"
                  className="w-10 h-10 rounded-lg object-cover shrink-0"
                />
                <span className="text-xs font-medium text-[#0f2419] dark:text-emerald-50 leading-tight">
                  Pancakes & Juice
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Right: Vision Results */}
        <section className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5 space-y-5">
          {isAnalyzing && (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#1b7a52] dark:text-emerald-400" />
              <div className="text-sm font-semibold text-[#0f2419] dark:text-emerald-50">
                Identifying food items & estimating glycemic load...
              </div>
              <p className="text-xs text-[#476354] dark:text-emerald-200/70 max-w-sm">
                Calculating approximate calories, net carbs, fiber, sugars, protein, fat, and diabetes-friendly alternatives.
              </p>
            </div>
          )}

          {error && !isAnalyzing && (
            <div
              role="alert"
              className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 p-4 flex items-start gap-3 text-sm text-rose-900 dark:text-rose-100"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Analysis Error</div>
                <p className="text-xs mt-1">{error}</p>
              </div>
            </div>
          )}

          {!isAnalyzing && !analysis && !error && (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-2 text-[#476354] dark:text-emerald-200/75">
              <Sparkles className="w-7 h-7 text-[#1b7a52] dark:text-emerald-400 mb-1" />
              <h3 className="text-base font-semibold text-[#0f2419] dark:text-emerald-50">
                Ready for Meal Scan
              </h3>
              <p className="text-xs max-w-sm leading-relaxed">
                Upload a photo of your plate or choose a sample plate on the left. You will get an itemized nutrition breakdown, a 0–100 Glucose Spike Score, and healthier swaps.
              </p>
            </div>
          )}

          {!isAnalyzing && analysis && (
            <>
              {/* Spike Score & Summary */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-emerald-950/8 dark:border-emerald-200/10">
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className={`inline-flex items-center gap-1.5 text-sm font-semibold ${impactColor}`}>
                    <TrendingUp className="w-4 h-4" />
                    <span>{liveMetrics.impactLevel} Glucose Impact</span>
                  </div>
                  <p className="text-xs text-[#476354] dark:text-emerald-200/80 leading-relaxed max-w-md">
                    {analysis.mealSummary}
                  </p>
                  <div className="text-[11px] text-[#476354] dark:text-emerald-200/70 tabular-nums">
                    Approx. Glycemic Load: <strong className="font-mono">{liveMetrics.glycemicLoad}</strong> · Net Carbs: <strong className="font-mono">{liveMetrics.netCarbs}g</strong>
                  </div>
                </div>

                <SpikeScoreGaugeSvg score={liveMetrics.spikeScore} impactLevel={liveMetrics.impactLevel} />
              </div>

              {/* Approximate Macro Totals */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#0f2419] dark:text-emerald-100">
                    Approximate Meal Totals
                  </span>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-[#476354] dark:text-emerald-200/70 mr-1">Portion:</span>
                    {[0.5, 1, 1.5].map((mult) => (
                      <button
                        key={mult}
                        type="button"
                        onClick={() => setPortionScale(mult)}
                        className={`min-h-[36px] px-2.5 rounded-lg font-mono text-xs cursor-pointer transition-colors ${
                          portionScale === mult
                            ? 'bg-[#1b7a52] dark:bg-emerald-500 text-white dark:text-[#07150e] font-semibold'
                            : 'bg-[#f3f7f4] dark:bg-[#192b21] text-[#476354] dark:text-emerald-200/80'
                        }`}
                      >
                        {mult}×
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                  {[
                    ['Calories', `${liveMetrics.kcal} kcal`],
                    ['Carbs', `${liveMetrics.carbs}g`],
                    ['Fiber', `${liveMetrics.fiber}g`],
                    ['Sugar', `${liveMetrics.sugar}g`],
                    ['Protein', `${liveMetrics.protein}g`],
                    ['Fat', `${liveMetrics.fat}g`],
                  ].map(([label, val]) => (
                    <div key={label} className="rounded-xl bg-[#f3f7f4] dark:bg-[#192b21] p-2.5">
                      <div className="text-[11px] text-[#476354] dark:text-emerald-200/70">{label}</div>
                      <div className="font-mono text-sm font-semibold tabular-nums text-[#0f2419] dark:text-emerald-50 mt-0.5">
                        {val}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Identified Food Items */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-[#0f2419] dark:text-emerald-100">
                  Identified Items ({scaledItems.length})
                </h3>
                {scaledItems.length === 0 ? (
                  <p className="text-xs text-[#476354] dark:text-emerald-200/75 py-2">
                    No food items remain in this estimate. Upload another photo to scan again.
                  </p>
                ) : (
                  <div className="divide-y divide-emerald-950/8 dark:divide-emerald-200/10">
                    {scaledItems.map((item, idx) => (
                      <div key={`${item.name}-${idx}`} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[#0f2419] dark:text-emerald-50 truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-[#476354] dark:text-emerald-200/75 tabular-nums">
                            {item.portion} · {item.kcal} kcal · {item.carbs}g carbs · {item.fiber}g fiber · {item.sugar}g sugar · {item.protein}g pro · {item.fat}g fat · GI ~{item.gi}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          aria-label={`Remove ${item.name}`}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#476354] hover:text-rose-600 dark:text-emerald-200/60 dark:hover:text-rose-400 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Diabetes-Friendly Alternatives */}
              {analysis.alternatives && analysis.alternatives.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-emerald-950/8 dark:border-emerald-200/10">
                  <h3 className="text-xs font-semibold text-[#0f2419] dark:text-emerald-100">
                    Diabetes-Friendly Swaps & Pairings
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {analysis.alternatives.map((alt, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl bg-[#f3f7f4] dark:bg-[#192b21] p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#0f2419] dark:text-emerald-50">
                          <span>{alt.swap}</span>
                          <span className="text-[#1b7a52] dark:text-emerald-400 shrink-0">
                            {alt.spikeReduction}
                          </span>
                        </div>
                        <p className="text-xs text-[#476354] dark:text-emerald-200/75 leading-relaxed">
                          {alt.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Save Meal CTA */}
              {scaledItems.length > 0 && (
                <div className="pt-3 border-t border-emerald-950/8 dark:border-emerald-200/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-xs text-[#476354] dark:text-emerald-200/80 cursor-pointer min-h-[44px]">
                    <input
                      type="checkbox"
                      checked={startWalkAfterSave}
                      onChange={(e) => setStartWalkAfterSave(e.target.checked)}
                      className="w-4 h-4 accent-[#1b7a52] rounded"
                    />
                    <Footprints className="w-4 h-4 text-[#1b7a52] dark:text-emerald-400" />
                    <span>Schedule post-meal walk reminder if spike is Moderate/High</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleSaveToHistory}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1b7a52] hover:bg-[#156342] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-[#07150e] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Check className="w-4 h-4" />
                    Save to Meal History
                  </button>
                </div>
              )}

              {savedNotice && (
                <div className="rounded-xl bg-[#e8f1eb] dark:bg-emerald-950/60 border border-emerald-700/20 p-3 text-xs font-medium text-[#1b7a52] dark:text-emerald-300">
                  {savedNotice}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Meal History */}
      <section className="rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#0f2419] dark:text-emerald-50">
            Saved Meal History ({meals.length})
          </h2>
          <span className="text-xs text-[#476354] dark:text-emerald-200/70">
            Approximate estimates stored locally
          </span>
        </div>

        <div className="divide-y divide-emerald-950/8 dark:divide-emerald-200/10">
          {meals.map((m) => (
            <div key={m.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {m.imagePreview && (
                  <img
                    src={m.imagePreview}
                    alt={m.title}
                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-emerald-950/10 dark:border-emerald-200/10"
                  />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#0f2419] dark:text-emerald-50 truncate">
                    {m.title}
                  </div>
                  <div className="text-xs text-[#476354] dark:text-emerald-200/75 tabular-nums">
                    {m.mealType} · {new Date(m.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {m.totalKcal} kcal · {m.totalCarbs}g carbs · Spike {m.spikeScore}/100 ({m.impactLevel})
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDeleteMeal(m.id)}
                aria-label={`Delete ${m.title}`}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#476354] hover:text-rose-600 dark:text-emerald-200/60 dark:hover:text-rose-400 cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
