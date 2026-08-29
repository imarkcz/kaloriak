import type { MealType } from '../types';

export const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

// Label plus the window it covers. The time range carries more information than
// the sunrise/moon emoji it replaces, and renders the same on every platform.
export const MEAL_TYPE_META: Record<MealType, { label: string; range: string }> = {
  breakfast: { label: 'Snídaně', range: '5–10' },
  lunch: { label: 'Oběd', range: '10–14' },
  snack: { label: 'Svačina', range: '14–17' },
  dinner: { label: 'Večeře', range: '17–23' },
};

// Default meal type from the local clock, so logging is one tap shorter.
export function defaultMealTypeForNow(d: Date = new Date()): MealType {
  const h = d.getHours();
  if (h >= 5 && h < 10) return 'breakfast';
  if (h >= 10 && h < 14) return 'lunch';
  if (h >= 14 && h < 17) return 'snack';
  if (h >= 17 && h < 23) return 'dinner';
  return 'snack';
}

// Meals saved before mealType existed: infer from createdAt.
export function resolveMealType(m: { mealType?: MealType; createdAt: number }): MealType {
  return m.mealType ?? defaultMealTypeForNow(new Date(m.createdAt));
}
