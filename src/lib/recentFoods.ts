import type { Meal } from '../types';
import type { FoodSearchResult } from './foodSearch';
import { categorize } from './foodCategory';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

export function recentFoodsFromMeals(meals: Meal[], limit = 10): FoodSearchResult[] {
  const byName = new Map<string, Meal>();
  // sort newest first, keep first occurrence of each name
  const sorted = meals.slice().sort((a, b) => b.createdAt - a.createdAt);
  for (const m of sorted) {
    const k = norm(m.name);
    if (!k || byName.has(k)) continue;
    byName.set(k, m);
    if (byName.size >= limit) break;
  }
  return Array.from(byName.values()).map((m) => mealToSearchResult(m));
}

export function searchRecent(meals: Meal[], query: string, limit = 5): FoodSearchResult[] {
  const q = norm(query);
  if (!q) return [];
  const seen = new Set<string>();
  const results: FoodSearchResult[] = [];
  const sorted = meals.slice().sort((a, b) => b.createdAt - a.createdAt);
  for (const m of sorted) {
    const k = norm(m.name);
    if (seen.has(k)) continue;
    if (!k.includes(q)) continue;
    seen.add(k);
    results.push(mealToSearchResult(m));
    if (results.length >= limit) break;
  }
  return results;
}

function mealToSearchResult(m: Meal): FoodSearchResult {
  const ratio = m.grams > 0 ? 100 / m.grams : 1;
  return {
    source: 'recent',
    id: `recent:${m.id}`,
    name: m.name,
    per: 100,
    defaultGrams: m.grams,
    kcal: Math.round(m.kcal * ratio),
    protein_g: +(m.protein_g * ratio).toFixed(1),
    carbs_g: +(m.carbs_g * ratio).toFixed(1),
    fat_g: +(m.fat_g * ratio).toFixed(1),
    imageUrl: m.imageDataUrl,
    category: categorize(m.name),
  };
}
