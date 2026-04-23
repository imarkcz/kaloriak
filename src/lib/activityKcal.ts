import type { ActivityKind } from '../types';

// MET = Metabolic Equivalent of Task. kcal/min ≈ MET × weightKg × 0.0175.
// Values are typical mid-intensity from Compendium of Physical Activities.
const MET: Record<ActivityKind, number> = {
  run: 9.8,    // ~9 km/h
  walk: 3.8,   // brisk walk
  bike: 7.5,   // ~20 km/h leisure
  swim: 8.0,   // freestyle moderate
  gym: 5.0,    // general weight training
  other: 5.0,
};

export const ACTIVITY_LABEL: Record<ActivityKind, { label: string; icon: string; tint: string }> = {
  run:   { label: 'Běh',         icon: '🏃', tint: 'from-coral-400 to-rose-500' },
  walk:  { label: 'Chůze',       icon: '🚶', tint: 'from-emerald-400 to-teal-500' },
  bike:  { label: 'Cyklistika',  icon: '🚴', tint: 'from-sky-400 to-blue-500' },
  swim:  { label: 'Plavání',     icon: '🏊', tint: 'from-cyan-400 to-indigo-500' },
  gym:   { label: 'Fitko',       icon: '🏋️', tint: 'from-violet-400 to-purple-600' },
  other: { label: 'Jiné',        icon: '⚡',  tint: 'from-amber-400 to-orange-500' },
};

export function estimateKcal(kind: ActivityKind, minutes: number, weightKg: number): number {
  if (minutes <= 0 || weightKg <= 0) return 0;
  const met = MET[kind] ?? 5.0;
  return Math.round(met * weightKg * 0.0175 * minutes);
}
