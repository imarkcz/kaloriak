import type { ActivityLevel, Goal, Sex, Targets } from '../types';

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

export const GOAL_KCAL_ADJUST: Record<Goal, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

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
): Targets {
  const bmr = mifflinStJeor(sex, weightKg, heightCm, age);
  const tdee = bmr * ACTIVITY_FACTORS[activity];
  const kcal = Math.max(1200, Math.round(tdee + GOAL_KCAL_ADJUST[goal]));

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
): Targets {
  const bmr = mifflinStJeor(sex, weightKg, heightCm, age);
  const base = bmr * ACTIVITY_FACTORS[activity];
  const kcal = Math.max(1200, Math.round(base + Math.max(0, burnedToday) + GOAL_KCAL_ADJUST[goal]));
  const protein_g = Math.round(weightKg * (goal === 'lose' ? 2.0 : 1.8));
  const fat_g = Math.round((kcal * 0.27) / 9);
  const carbs_g = Math.max(0, Math.round((kcal - protein_g * 4 - fat_g * 9) / 4));
  return { kcal, protein_g, carbs_g, fat_g };
}
