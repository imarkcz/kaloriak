import type { MealType } from '../types';

export const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

export const MEAL_TYPE_META: Record<MealType, { label: string; icon: string; tint: string }> = {
  breakfast: { label: 'Snídaně', icon: '🌅', tint: 'from-amber-500/30 to-orange-500/20' },
  lunch:     { label: 'Oběd',    icon: '☀️', tint: 'from-yellow-500/30 to-amber-500/20' },
  snack:     { label: 'Svačina', icon: '🥨', tint: 'from-rose-500/25 to-coral-500/20' },
  dinner:    { label: 'Večeře',  icon: '🌙', tint: 'from-indigo-500/25 to-violet-500/20' },
};

// Default meal type from current local time. Used as initial selection when
// the user opens the Add screen so most logging is one tap less.
export function defaultMealTypeForNow(d: Date = new Date()): MealType {
  const h = d.getHours();
  if (h >= 5 && h < 10) return 'breakfast';
  if (h >= 10 && h < 14) return 'lunch';
  if (h >= 14 && h < 17) return 'snack';
  if (h >= 17 && h < 23) return 'dinner';
  return 'snack';
}

// For meals saved before mealType existed: infer from createdAt.
export function resolveMealType(m: { mealType?: MealType; createdAt: number }): MealType {
  return m.mealType ?? defaultMealTypeForNow(new Date(m.createdAt));
}
