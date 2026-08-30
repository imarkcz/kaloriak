import type { FoodCategory } from './foodCategory';
import type { FoodItem } from '../types';

// How a portion of this kind of food is actually measured and talked about.
// Without this every food got the same form: grams, presets 50/100/150/200/300,
// and a frying-method picker — which is nonsense on a cappuccino.
export interface PortionRule {
  /** Drinks are poured, not weighed. Nutrition stays per 100, the unit changes. */
  unit: 'g' | 'ml';
  /** Portions someone would actually pick for this category. */
  presets: number[];
  step: number;
  bigStep: number;
  max: number;
  /** Does the cooking method change the fat? Only true where frying is real. */
  allowsPrep: boolean;
}

const RULES: Record<FoodCategory, PortionRule> = {
  // espresso 30, malé 150, cappuccino/hrnek 200-250, plechovka 330, půllitr 500
  napoj:    { unit: 'ml', presets: [30, 150, 200, 250, 330, 500], step: 10, bigStep: 50, max: 3000, allowsPrep: false },
  maso:     { unit: 'g',  presets: [80, 100, 150, 200, 250],      step: 5,  bigStep: 50, max: 1500, allowsPrep: true },
  priloha:  { unit: 'g',  presets: [50, 100, 150, 200, 250],      step: 5,  bigStep: 50, max: 1500, allowsPrep: true },
  zelenina: { unit: 'g',  presets: [50, 100, 150, 200],           step: 5,  bigStep: 50, max: 1500, allowsPrep: true },
  hlavni:   { unit: 'g',  presets: [200, 300, 350, 400, 500],     step: 10, bigStep: 50, max: 2000, allowsPrep: true },
  pecivo:   { unit: 'g',  presets: [25, 43, 60, 80, 120],         step: 5,  bigStep: 25, max: 1000, allowsPrep: false },
  mlecne:   { unit: 'g',  presets: [30, 100, 150, 200, 250],      step: 5,  bigStep: 50, max: 1500, allowsPrep: false },
  ovoce:    { unit: 'g',  presets: [80, 100, 150, 200],           step: 5,  bigStep: 50, max: 1500, allowsPrep: false },
  snack:    { unit: 'g',  presets: [20, 30, 50, 75, 100],         step: 5,  bigStep: 25, max: 1000, allowsPrep: false },
  jine:     { unit: 'g',  presets: [50, 100, 150, 200, 300],      step: 5,  bigStep: 50, max: 2000, allowsPrep: false },
};

export function portionRule(category: FoodCategory | undefined): PortionRule {
  return RULES[category ?? 'jine'] ?? RULES.jine;
}

/** "Hmotnost porce" is wrong for a drink. */
export function portionLabel(rule: PortionRule): string {
  return rule.unit === 'ml' ? 'Objem porce' : 'Hmotnost porce';
}

/** Macro totals the photo-confirm fields currently describe. Normally the AI's
 *  whole-portion estimate; unticking a component of the plate shrinks it. */
export interface PortionBase {
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export function sumItems(items: FoodItem[]): PortionBase {
  return items.reduce<PortionBase>(
    (a, it) => ({
      grams: a.grams + it.grams,
      kcal: a.kcal + it.kcal,
      protein_g: +(a.protein_g + it.protein_g).toFixed(1),
      carbs_g: +(a.carbs_g + it.carbs_g).toFixed(1),
      fat_g: +(a.fat_g + it.fat_g).toFixed(1),
    }),
    { grams: 0, kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

/** A breakdown is only worth showing when there is something to untick and the
 *  parts add up to the whole. Three components summing to half the portion
 *  would silently halve the entry, so that response is ignored. */
export function usableItems(a: { grams: number; items?: FoodItem[] }): FoodItem[] | null {
  const items = a.items?.filter((it) => it && it.grams > 0);
  if (!items || items.length < 2) return null;
  const total = sumItems(items).grams;
  if (a.grams > 0 && Math.abs(total - a.grams) / a.grams > 0.4) return null;
  return items;
}
