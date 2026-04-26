export type Sex = 'male' | 'female';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type Goal = 'lose' | 'maintain' | 'gain';

// How aggressive the deficit/surplus should be. MyFitnessPal-style:
// mild ≈ 0.25 kg/týden, moderate ≈ 0.5 kg/týden, aggressive ≈ 0.75 kg/týden.
export type Intensity = 'mild' | 'moderate' | 'aggressive';

export interface Targets {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface UserProfile {
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg?: number;
  activity: ActivityLevel;
  goal: Goal;
  goalIntensity?: Intensity;
  targets: Targets;
  // Optional override of macro split. When set, daily macro grams are
  // computed from kcal × these percentages (must sum to ~100). When unset,
  // we use the default split (high protein + 27% fat).
  customMacroSplit?: { proteinPct: number; carbsPct: number; fatPct: number };
  avatarDataUrl?: string;
  // When true, daily kcal target = BMR × user activity factor + logged
  // activity kcal + goal adjust (MyFitnessPal NEAT method). When false,
  // the static profile target is used and activities eaten back via Today.
  useDynamicTdee?: boolean;
}

// Mealtime grouping — MyFitnessPal style. Optional on existing meals
// (defaults inferred from createdAt time-of-day for legacy entries).
export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export interface Meal {
  id: string;
  date: string;
  createdAt: number;
  name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  mealType?: MealType;
  imageDataUrl?: string;
  note?: string;
}

export type ActivityKind = 'run' | 'walk' | 'bike' | 'swim' | 'gym' | 'other';

export interface Activity {
  id: string;
  date: string;
  createdAt: number;
  kind: ActivityKind;
  name: string;
  minutes: number;
  kcal: number;
}

// Water log per day (key = ISO date, value = ml drunk that day).
export type WaterLog = Record<string, number>;

export interface AppData {
  profile: UserProfile | null;
  meals: Meal[];
  activities: Activity[];
  water: WaterLog;
  geminiApiKey: string;
  onboarded: boolean;
}
