import type { Meal } from '../types';

/** Every meal already carries the grams the user settled on, so "learn my usual
 *  portion" needs no new storage — just a read over the log. */

const norm = (s: string) =>
  s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+—.*$/, '')        // drop the " — na pánvičce" prep suffix
    .replace(/\([^)]*\)/g, ' ')     // and "(bún chả)" / "(Lidl)"
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export interface UsualPortion {
  /** Median of the user's last few portions of this food. */
  grams: number;
  /** How many past entries it is based on — 1 is a guess, 5 is a habit. */
  count: number;
}

// Containment only counts when the shorter name is long enough to mean
// something. Without this, "rum" matches "rumové pralinky" and every
// three-letter food poisons the lookup.
const MIN_PARTIAL = 5;

function matches(a: string, b: string): boolean {
  if (a === b) return true;
  const short = a.length <= b.length ? a : b;
  const long = a.length <= b.length ? b : a;
  return short.length >= MIN_PARTIAL && long.includes(short);
}

export function usualPortion(meals: Meal[], name: string): UsualPortion | null {
  const q = norm(name);
  if (q.length < 3) return null;

  const grams = meals
    .filter((m) => m.grams > 0 && matches(norm(m.name), q))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)
    .map((m) => m.grams)
    .sort((a, b) => a - b);

  if (!grams.length) return null;
  return { grams: Math.round(grams[Math.floor(grams.length / 2)]), count: grams.length };
}

/** True when the AI estimate is far enough from the user's habit to be worth
 *  offering the swap. Below this the two agree and a chip would be noise. */
export function differsEnough(estimate: number, usual: number): boolean {
  if (estimate <= 0) return true;
  return Math.abs(estimate - usual) / estimate > 0.15;
}
