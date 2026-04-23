export type Sex = 'male' | 'female';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type Goal = 'lose' | 'maintain' | 'gain';

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
  targets: Targets;
  avatarDataUrl?: string;
  // When true, daily kcal target = BMR * 1.2 (sedentary baseline) + logged
  // activity kcal + goal adjust. When false, the static profile activity
  // multiplier is used and aktivity are eaten back via the Today ring math.
  useDynamicTdee?: boolean;
}

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
