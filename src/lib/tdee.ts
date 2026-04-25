import type { ActivityLevel, Goal, Intensity, Sex, Targets } from '../types';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedavé (žádný sport)',
  light: 'Lehká aktivita (1–3× týdně)',
  moderate: 'Střední (3–5× týdně)',
  active: 'Vysoká (6–7× týdně)',
  very_active: 'Velmi vysoká (2× denně)',
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose: 'Zhubnout',
  maintain: 'Udržovat',
  gain: 'Nabrat',
};

// Per-goal kcal adjust by intensity (MyFitnessPal-style).
// lose: −250 / −500 / −750  ≈  0.25 / 0.5 / 0.75 kg per week
// gain: +150 / +300 / +500  ≈  mírný / standardní / agresivní bulk
export const INTENSITY_KCAL: Record<Goal, Record<Intensity, number>> = {
  lose: { mild: -250, moderate: -500, aggressive: -750 },
  maintain: { mild: 0, moderate: 0, aggressive: 0 },
  gain: { mild: 150, moderate: 300, aggressive: 500 },
};

export const INTENSITY_LABEL: Record<Intensity, string> = {
  mild: 'Mírné',
  moderate: 'Standardní',
  aggressive: 'Agresivní',
};

export const INTENSITY_DETAIL: Record<Goal, Record<Intensity, string>> = {
  lose: {
    mild: '~0,25 kg / týden',
    moderate: '~0,5 kg / týden',
    aggressive: '~0,75 kg / týden',
  },
  gain: {
    mild: 'pozvolný nárůst',
    moderate: 'standardní bulk',
    aggressive: 'rychlý nárůst',
  },
  maintain: { mild: '', moderate: '', aggressive: '' },
};

// Backwards-compat shim: old callers passed only goal. Defaults to moderate.
export const GOAL_KCAL_ADJUST: Record<Goal, number> = {
  lose: INTENSITY_KCAL.lose.moderate,
  maintain: 0,
  gain: INTENSITY_KCAL.gain.moderate,
};

function adjustFor(goal: Goal, intensity: Intensity = 'moderate'): number {
  return INTENSITY_KCAL[goal][intensity];
}

export function mifflinStJeor(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

export function computeTargets(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  age: number,
  activity: ActivityLevel,
  goal: Goal,
  intensity: Intensity = 'moderate',
): Targets {
  const bmr = mifflinStJeor(sex, weightKg, heightCm, age);
  const tdee = bmr * ACTIVITY_FACTORS[activity];
  const kcal = Math.max(1200, Math.round(tdee + adjustFor(goal, intensity)));

  const protein_g = Math.round(weightKg * (goal === 'lose' ? 2.0 : 1.8));
  const fat_g = Math.round((kcal * 0.27) / 9);
  const carbs_g = Math.max(0, Math.round((kcal - protein_g * 4 - fat_g * 9) / 4));

  return { kcal, protein_g, carbs_g, fat_g };
}

// Dynamic TDEE: BMR × user's activity factor as baseline + extra kcal from
// activities logged today + goal adjust. Logged activities add on top of the
// baseline NEAT — they're not the only source of movement.
export function dynamicDailyTargets(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  age: number,
  activity: ActivityLevel,
  goal: Goal,
  burnedToday: number,
  intensity: Intensity = 'moderate',
): Targets {
  const bmr = mifflinStJeor(sex, weightKg, heightCm, age);
  const base = bmr * ACTIVITY_FACTORS[activity];
  const kcal = Math.max(1200, Math.round(base + Math.max(0, burnedToday) + adjustFor(goal, intensity)));
  const protein_g = Math.round(weightKg * (goal === 'lose' ? 2.0 : 1.8));
  const fat_g = Math.round((kcal * 0.27) / 9);
  const carbs_g = Math.max(0, Math.round((kcal - protein_g * 4 - fat_g * 9) / 4));
  return { kcal, protein_g, carbs_g, fat_g };
}
