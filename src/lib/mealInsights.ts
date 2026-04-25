import type { Meal } from '../types';

export type InsightTone = 'good' | 'warn' | 'neutral';

export interface MealInsight {
  emoji: string;
  title: string;
  message: string;
  tone: InsightTone;
}

interface MealLike {
  name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

// Heuristic analysis of a logged meal. Returns the most relevant insight
// (or a benign default) so user always sees a small "did you know" tile.
export function analyzeMeal(meal: MealLike): MealInsight {
  const grams = Math.max(1, meal.grams);
  const ratio = 100 / grams;
  const p100 = meal.protein_g * ratio;
  const f100 = meal.fat_g * ratio;
  const k100 = meal.kcal * ratio;

  // % of kcal from each macro (relative to the porce, not per 100g)
  const totalMacroKcal = meal.protein_g * 4 + meal.carbs_g * 4 + meal.fat_g * 9;
  const pPct = totalMacroKcal > 0 ? (meal.protein_g * 4) / totalMacroKcal : 0;
  const fPct = totalMacroKcal > 0 ? (meal.fat_g * 9) / totalMacroKcal : 0;
  const cPct = totalMacroKcal > 0 ? (meal.carbs_g * 4) / totalMacroKcal : 0;

  // Highest priority — extreme cases first
  if (k100 >= 450 && f100 >= 25) {
    return {
      emoji: '⚠️',
      title: 'Energeticky velmi vydatné',
      message: `${Math.round(k100)} kcal a ${Math.round(f100)} g tuků na 100 g. Hodně silné jídlo — pohlídej si zbytek dne.`,
      tone: 'warn',
    };
  }

  if (p100 >= 20 || (meal.protein_g >= 30 && pPct >= 0.30)) {
    return {
      emoji: '💪',
      title: 'Bohaté na bílkoviny',
      message: `${meal.protein_g.toFixed(0)} g bílkovin v této porci. Skvělé pro regeneraci a sytost.`,
      tone: 'good',
    };
  }

  if (k100 <= 80 && grams >= 150) {
    return {
      emoji: '🥗',
      title: 'Lehké a sytící',
      message: `Jen ${meal.kcal} kcal za ${grams} g. Velký objem za málo kalorií.`,
      tone: 'good',
    };
  }

  if (fPct >= 0.55 && f100 >= 15) {
    return {
      emoji: '🧈',
      title: 'Hodně tuků',
      message: `${Math.round(fPct * 100)} % energie pochází z tuků (${meal.fat_g.toFixed(0)} g). Dobré pro hormony, ale opatrně.`,
      tone: 'warn',
    };
  }

  if (cPct >= 0.65 && meal.carbs_g >= 40) {
    return {
      emoji: '🍞',
      title: 'Sacharidová bomba',
      message: `${meal.carbs_g.toFixed(0)} g sacharidů. Ideální energie před tréninkem.`,
      tone: 'neutral',
    };
  }

  if (k100 >= 350) {
    return {
      emoji: '⚡',
      title: 'Kaloricky vydatné',
      message: `${Math.round(k100)} kcal na 100 g. Energeticky bohaté, hlídej velikost porce.`,
      tone: 'warn',
    };
  }

  if (pPct >= 0.20 && fPct <= 0.35 && cPct >= 0.30) {
    return {
      emoji: '⚖️',
      title: 'Vyvážené jídlo',
      message: 'Pěkný poměr makroživin — bílkoviny, sacharidy i tuky v rozumném zastoupení.',
      tone: 'good',
    };
  }

  if (meal.kcal <= 100) {
    return {
      emoji: '🍃',
      title: 'Lehká svačinka',
      message: `Pouhých ${meal.kcal} kcal. Nezatíží denní bilanci.`,
      tone: 'good',
    };
  }

  return {
    emoji: '✓',
    title: 'Zaznamenáno',
    message: `${meal.kcal} kcal • ${meal.protein_g.toFixed(0)} P / ${meal.carbs_g.toFixed(0)} C / ${meal.fat_g.toFixed(0)} F`,
    tone: 'neutral',
  };
}

export function analyzeFromMeal(m: Meal): MealInsight {
  return analyzeMeal({
    name: m.name,
    grams: m.grams,
    kcal: m.kcal,
    protein_g: m.protein_g,
    carbs_g: m.carbs_g,
    fat_g: m.fat_g,
  });
}
