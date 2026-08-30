import type { FoodCategory } from './foodCategory';

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
