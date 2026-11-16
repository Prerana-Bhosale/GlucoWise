import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  ChefHat,
  Clock,
  Info,
  Loader2,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import type {
  MealType,
  ProfileTargets,
  Recipe,
  UserProfile,
} from '../types/glucowise';
import { calculateMealMetrics } from '../utils/nutrition';
import { getCuratedRecipes } from '../utils/storage';

interface RecipesTabProps {
  profile: UserProfile;
  targets: ProfileTargets;
  favoriteRecipes: Recipe[];
  onToggleFavorite: (recipe: Recipe) => void;
}

const PANTRY_SUGGESTIONS = [
  'salmon',
  'chicken',
  'spinach',
  'avocado',
  'cauliflower',
  'chia',
  'lentils',
  'eggs',
  'greek yogurt',
];

export const RecipesTab: React.FC<RecipesTabProps> = ({
  profile,
  targets,
  favoriteRecipes,
  onToggleFavorite,
}) => {
  const curated = useMemo(() => getCuratedRecipes(), []);

  const [query, setQuery] = useState('');
  const [ingredientsInput, setIngredientsInput] = useState('');
  const [mealFilter, setMealFilter] = useState<'All' | MealType>('All');
  const [viewMode, setViewMode] = useState<'browse' | 'favorites'>('browse');

  const [aiRecipes, setAiRecipes] = useState<Recipe[]>([]);
  const [isSearchingAi, setIsSearchingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(curated[0] ?? null);

  const favoriteIds = useMemo(
    () => new Set(favoriteRecipes.map((r) => r.id)),
    [favoriteRecipes]
  );

  const combinedBrowseList = useMemo(() => {
    const map = new Map<string, Recipe>();
    for (const r of aiRecipes) map.set(r.id, r);
    for (const r of curated) {
      if (!map.has(r.id)) map.set(r.id, r);
    }
    return Array.from(map.values());
  }, [aiRecipes, curated]);

  const filteredRecipes = useMemo(() => {
    const source = viewMode === 'favorites' ? favoriteRecipes : combinedBrowseList;
    const q = query.trim().toLowerCase();
    const ingTerms = ingredientsInput
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    return source.filter((rec) => {
      if (mealFilter !== 'All' && rec.mealType !== mealFilter) return false;
      if (q) {
        const hay = `${rec.title} ${rec.description} ${rec.ingredients.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (ingTerms.length > 0 && aiRecipes.length === 0) {
        const ingHay = `${rec.title} ${rec.ingredients.join(' ')}`.toLowerCase();
        const matchesAny = ingTerms.some((term) => ingHay.includes(term));
        if (!matchesAny) return false;
      }
      return true;
    });
  }, [viewMode, favoriteRecipes, combinedBrowseList, mealFilter, query, ingredientsInput, aiRecipes.length]);

  const handleToggleIngredientChip = (ing: string) => {
    const existing = ingredientsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const lower = existing.map((e) => e.toLowerCase());
    if (lower.includes(ing.toLowerCase())) {
      setIngredientsInput(existing.filter((e) => e.toLowerCase() !== ing.toLowerCase()).join(', '));
    } else {
      setIngredientsInput([...existing, ing].join(', '));
    }
  };

  const handleGenerateCustomRecipes = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAiError(null);
    setIsSearchingAi(true);
    setViewMode('browse');

    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim() || undefined,
          ingredients: ingredientsInput.trim() || undefined,
          mealType: mealFilter,
          profileContext: {
            targetA1c: profile.targetA1c,
            glucoseLow: profile.glucoseLow,
            glucoseHigh: profile.glucoseHigh,
            activityLevel: profile.activityLevel,
            dailyCalories: targets.dailyCalories,
          },
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Could not generate recipes.');
      }

      const rawRecipes = Array.isArray(payload.recipes) ? payload.recipes : [];
      const normalized: Recipe[] = rawRecipes.map((r: Record<string, unknown>, idx: number) => {
        const kcal = Number(r.kcal) || 350;
        const carbs = Number(r.carbs) || 20;
        const fiber = Number(r.fiber) || 6;
        const sugar = Number(r.sugar) || 4;
        const protein = Number(r.protein) || 25;
        const fat = Number(r.fat) || 14;
        const gi = Number(r.gi) || 35;

        const metrics = calculateMealMetrics([
          {
            name: String(r.title || 'Recipe'),
            portion: '1 serving',
            kcal,
            carbs,
            fiber,
            sugar,
            protein,
            fat,
            gi,
          },
        ]);

        const mType = String(r.mealType || 'Dinner');
        const validMealType: MealType =
          mType === 'Breakfast' || mType === 'Lunch' || mType === 'Dinner' || mType === 'Snack'
            ? mType
            : 'Dinner';

        return {
          id: `ai-rec-${Date.now()}-${idx}`,
          title: String(r.title || 'Diabetes-Friendly Recipe'),
          mealType: validMealType,
          prepMinutes: Number(r.prepMinutes) || 20,
          servings: Number(r.servings) || 2,
          description: String(r.description || ''),
          ingredients: Array.isArray(r.ingredients) ? r.ingredients.map(String) : [],
          instructions: Array.isArray(r.instructions) ? r.instructions.map(String) : [],
          nutrition: { kcal, carbs, fiber, sugar, protein, fat, gi },
          spikeScore: metrics.spikeScore,
          impactLevel: metrics.impactLevel,
          diabetesTip: String(r.diabetesTip || ''),
        };
      });

      setAiRecipes(normalized);
      if (normalized[0]) {
        setSelectedRecipe(normalized[0]);
      }
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'Recipe search failed.');
    } finally {
      setIsSearchingAi(false);
    }
  };

  const impactColor = (level: Recipe['impactLevel']) => {
    if (level === 'Low') return 'text-[#1b7a52] dark:text-emerald-400';
    if (level === 'Moderate') return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f2419] dark:text-emerald-50">
            Diabetes-Friendly Recipes
          </h1>
          <p className="text-sm text-[#476354] dark:text-emerald-200/75">
            Search low-glycemic recipes or enter ingredients on hand, tailored for your {targets.carbsG}g/day carb budget.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 self-start">
          <button
            type="button"
            onClick={() => setViewMode('browse')}
            className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
              viewMode === 'browse'
                ? 'bg-[#1b7a52] dark:bg-emerald-500 text-white dark:text-[#07150e]'
                : 'text-[#476354] dark:text-emerald-200/75'
            }`}
          >
            Browse
          </button>
          <button
            type="button"
            onClick={() => setViewMode('favorites')}
            className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
              viewMode === 'favorites'
                ? 'bg-[#1b7a52] dark:bg-emerald-500 text-white dark:text-[#07150e]'
                : 'text-[#476354] dark:text-emerald-200/75'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            Favorites ({favoriteRecipes.length})
          </button>
        </div>
      </div>

      {/* Search & Ingredients Filter Card */}
      <form
        onSubmit={handleGenerateCustomRecipes}
        className="rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <label htmlFor="recipe-search" className="block text-xs font-medium text-[#476354] dark:text-emerald-200/80 mb-1">
              Search dish, flavor, or dietary focus
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#476354] dark:text-emerald-200/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="recipe-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. quick sheet-pan dinner, high fiber"
                className="w-full min-h-[44px] pl-10 pr-3.5 py-2 rounded-xl bg-[#f3f7f4] dark:bg-[#192b21] border border-emerald-950/10 dark:border-emerald-200/15 text-sm text-[#0f2419] dark:text-emerald-50 placeholder:text-[#476354]/60 dark:placeholder:text-emerald-200/40 focus:outline-none focus:ring-2 focus:ring-[#1b7a52] dark:focus:ring-emerald-400"
              />
            </div>
          </div>

          <div className="md:col-span-5">
            <label htmlFor="recipe-ingredients" className="block text-xs font-medium text-[#476354] dark:text-emerald-200/80 mb-1">
              Ingredients on hand (optional, comma-separated)
            </label>
            <input
              id="recipe-ingredients"
              type="text"
              value={ingredientsInput}
              onChange={(e) => setIngredientsInput(e.target.value)}
              placeholder="e.g. chicken, broccoli, garlic, olive oil"
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#f3f7f4] dark:bg-[#192b21] border border-emerald-950/10 dark:border-emerald-200/15 text-sm text-[#0f2419] dark:text-emerald-50 placeholder:text-[#476354]/60 dark:placeholder:text-emerald-200/40 focus:outline-none focus:ring-2 focus:ring-[#1b7a52] dark:focus:ring-emerald-400"
            />
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={isSearchingAi}
              className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#1b7a52] hover:bg-[#156342] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-[#07150e] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              {isSearchingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isSearchingAi ? 'Finding...' : 'Find Recipes'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-[#476354] dark:text-emerald-200/70 mr-1">Quick pantry:</span>
            {PANTRY_SUGGESTIONS.map((ing) => {
              const active = ingredientsInput.toLowerCase().includes(ing);
              return (
                <button
                  key={ing}
                  type="button"
                  onClick={() => handleToggleIngredientChip(ing)}
                  className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium capitalize cursor-pointer transition-colors ${
                    active
                      ? 'bg-[#1b7a52] dark:bg-emerald-500 text-white dark:text-[#07150e]'
                      : 'bg-[#f3f7f4] hover:bg-[#e8f1eb] dark:bg-[#192b21] dark:hover:bg-[#22392c] text-[#476354] dark:text-emerald-200/80'
                  }`}
                >
                  {ing}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#f3f7f4] dark:bg-[#192b21]">
            {(['All', 'Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setMealFilter(cat)}
                className={`min-h-[34px] px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  mealFilter === cat
                    ? 'bg-white dark:bg-[#121f18] text-[#0f2419] dark:text-emerald-50 shadow-sm'
                    : 'text-[#476354] dark:text-emerald-200/70'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {aiError && (
          <p className="text-xs text-rose-600 dark:text-rose-400">{aiError}</p>
        )}
      </form>

      {/* Master-Detail Recipe Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Recipe List */}
        <section className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-4 space-y-2">
          <div className="flex items-center justify-between px-1 pb-1">
            <h2 className="text-sm font-semibold text-[#0f2419] dark:text-emerald-50">
              {viewMode === 'favorites' ? 'Saved Favorites' : 'Matching Recipes'} ({filteredRecipes.length})
            </h2>
            {aiRecipes.length > 0 && viewMode === 'browse' && (
              <button
                type="button"
                onClick={() => setAiRecipes([])}
                className="text-xs text-[#1b7a52] dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Clear AI results
              </button>
            )}
          </div>

          {filteredRecipes.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#476354] dark:text-emerald-200/75 px-3">
              {viewMode === 'favorites'
                ? 'No saved favorite recipes yet. Tap Save on any recipe to keep it here.'
                : 'No local matches found — tap "Find Recipes" above to generate custom diabetes-friendly recipes for your ingredients!'}
            </div>
          ) : (
            <div className="divide-y divide-emerald-950/8 dark:divide-emerald-200/10">
              {filteredRecipes.map((rec) => {
                const isSelected = selectedRecipe?.id === rec.id;
                const isFav = favoriteIds.has(rec.id);
                return (
                  <div
                    key={rec.id}
                    className={`py-3 px-2.5 rounded-xl transition-colors ${
                      isSelected ? 'bg-[#e8f1eb]/70 dark:bg-[#192b21]' : 'hover:bg-[#f3f7f4]/70 dark:hover:bg-[#192b21]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedRecipe(rec)}
                        className="flex-1 text-left cursor-pointer min-w-0"
                      >
                        <div className="text-sm font-semibold text-[#0f2419] dark:text-emerald-50">
                          {rec.title}
                        </div>
                        <div className="text-xs text-[#476354] dark:text-emerald-200/75 mt-1 tabular-nums">
                          {rec.mealType} · {rec.prepMinutes} min · {rec.nutrition.kcal} kcal · {rec.nutrition.carbs}g carbs ·{' '}
                          <span className={`font-semibold ${impactColor(rec.impactLevel)}`}>
                            Spike {rec.spikeScore} ({rec.impactLevel})
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleFavorite(rec)}
                        aria-label={isFav ? `Remove ${rec.title} from favorites` : `Save ${rec.title} to favorites`}
                        className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl cursor-pointer shrink-0 ${
                          isFav
                            ? 'text-[#1b7a52] dark:text-emerald-400'
                            : 'text-[#476354]/60 dark:text-emerald-200/40 hover:text-[#0f2419] dark:hover:text-emerald-50'
                        }`}
                      >
                        <Bookmark className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recipe Detail View */}
        <section className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5 space-y-5">
          {selectedRecipe ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-emerald-950/8 dark:border-emerald-200/10">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-[#476354] dark:text-emerald-200/75">
                    <span>{selectedRecipe.mealType}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {selectedRecipe.prepMinutes} min
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {selectedRecipe.servings} serving{selectedRecipe.servings === 1 ? '' : 's'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-[#0f2419] dark:text-emerald-50">
                    {selectedRecipe.title}
                  </h2>
                  <p className="text-xs text-[#476354] dark:text-emerald-200/80 leading-relaxed">
                    {selectedRecipe.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleFavorite(selectedRecipe)}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                    favoriteIds.has(selectedRecipe.id)
                      ? 'bg-[#1b7a52] dark:bg-emerald-500 text-white dark:text-[#07150e]'
                      : 'bg-[#f3f7f4] hover:bg-[#e8f1eb] dark:bg-[#192b21] dark:hover:bg-[#22392c] text-[#0f2419] dark:text-emerald-100'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${favoriteIds.has(selectedRecipe.id) ? 'fill-current' : ''}`} />
                  {favoriteIds.has(selectedRecipe.id) ? 'Saved' : 'Save Favorite'}
                </button>
              </div>

              {/* Estimated Nutrition Per Serving */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#0f2419] dark:text-emerald-100 inline-flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-[#1b7a52] dark:text-emerald-400" />
                    Approximate Nutrition per Serving (Not Lab Measurements)
                  </span>
                  <span className={`font-semibold inline-flex items-center gap-1 ${impactColor(selectedRecipe.impactLevel)}`}>
                    <TrendingUp className="w-3.5 h-3.5" />
                    Spike {selectedRecipe.spikeScore}/100 ({selectedRecipe.impactLevel})
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 text-center">
                  {[
                    ['Calories', `${selectedRecipe.nutrition.kcal}`],
                    ['Carbs', `${selectedRecipe.nutrition.carbs}g`],
                    ['Fiber', `${selectedRecipe.nutrition.fiber}g`],
                    ['Sugar', `${selectedRecipe.nutrition.sugar}g`],
                    ['Protein', `${selectedRecipe.nutrition.protein}g`],
                    ['Fat', `${selectedRecipe.nutrition.fat}g`],
                    ['Est. GI', `${selectedRecipe.nutrition.gi}`],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-[#f3f7f4] dark:bg-[#192b21] p-2.5">
                      <div className="text-[11px] text-[#476354] dark:text-emerald-200/70">{k}</div>
                      <div className="font-mono text-sm font-semibold tabular-nums text-[#0f2419] dark:text-emerald-50 mt-0.5">
                        {v}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedRecipe.diabetesTip && (
                <div className="rounded-xl bg-[#e8f1eb]/80 dark:bg-[#192b21] p-3.5 text-xs text-[#0f2419] dark:text-emerald-100 leading-relaxed">
                  <strong>Glycemic Note:</strong> {selectedRecipe.diabetesTip}
                </div>
              )}

              {/* Ingredients & Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-[#0f2419] dark:text-emerald-50">
                    Ingredients
                  </h3>
                  <ul className="space-y-1.5 text-xs text-[#476354] dark:text-emerald-200/85">
                    {selectedRecipe.ingredients.map((ing, i) => (
                      <li key={i} className="flex items-start gap-2 leading-relaxed">
                        <span aria-hidden="true" className="text-[#1b7a52] dark:text-emerald-400 font-bold">·</span>
                        <span>{ing}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-[#0f2419] dark:text-emerald-50">
                    Instructions
                  </h3>
                  <ol className="space-y-2.5 text-xs text-[#476354] dark:text-emerald-200/85">
                    {selectedRecipe.instructions.map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                        <span className="font-mono font-semibold text-[#1b7a52] dark:text-emerald-400 shrink-0">
                          {i + 1}.
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-2 text-[#476354] dark:text-emerald-200/75">
              <ChefHat className="w-7 h-7 text-[#1b7a52] dark:text-emerald-400" />
              <p className="text-sm font-medium text-[#0f2419] dark:text-emerald-50">
                Select a recipe to view ingredients, instructions, and nutrition
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
