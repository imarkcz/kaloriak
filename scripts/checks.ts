// Run: node --experimental-strip-types scripts/checks.ts
import assert from 'node:assert';
import { usualPortion, differsEnough } from '../src/lib/portionMemory.ts';
import type { Meal } from '../src/types.ts';

let t = 0;
const meal = (name: string, grams: number): Meal =>
  ({ id: String(++t), date: '2026-08-30', createdAt: t, name, grams, kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }) as Meal;

// Median of the last five, not the mean — one 900 g outlier must not move it.
assert.deepStrictEqual(
  usualPortion([meal('Rýže', 150), meal('Rýže', 160), meal('Rýže', 900)], 'rýže'),
  { grams: 160, count: 3 },
);

// Diacritics, prep suffix and parenthesised brand all normalise away.
assert.strictEqual(usualPortion([meal('Kuřecí prsa — na pánvičce', 200)], 'Kuřecí prsa')?.grams, 200);
assert.strictEqual(usualPortion([meal('Řecký jogurt (Pilos)', 180)], 'Řecký jogurt')?.grams, 180);

// Only the last five count, newest first.
const many = [meal('Ovesná kaše', 500), meal('Ovesná kaše', 60), meal('Ovesná kaše', 60),
              meal('Ovesná kaše', 60), meal('Ovesná kaše', 60), meal('Ovesná kaše', 60)];
assert.deepStrictEqual(usualPortion(many, 'Ovesná kaše'), { grams: 60, count: 5 });

// Short names must not match by containment: "rum" inside "rumové pralinky".
assert.strictEqual(usualPortion([meal('Rumové pralinky', 40)], 'Rum'), null);
// But a real partial does match.
assert.strictEqual(usualPortion([meal('Kuřecí salát s dresinkem', 300)], 'Kuřecí salát')?.grams, 300);

assert.strictEqual(usualPortion([], 'cokoliv'), null);

assert.strictEqual(differsEnough(750, 800), false); // 6.7 % — no chip
assert.strictEqual(differsEnough(750, 400), true);
assert.strictEqual(differsEnough(0, 300), true);

console.log('portionMemory ok');

// --- plate breakdown ---------------------------------------------------
import { sumItems, usableItems } from '../src/lib/portion.ts';
import type { FoodItem } from '../src/types.ts';

const it = (name: string, g: number, kcal: number): FoodItem =>
  ({ name, grams: g, kcal, protein_g: 1, carbs_g: 2, fat_g: 0.5 });

const plate = [it('Řízek', 300, 750), it('Salát', 80, 100)];
assert.deepStrictEqual(sumItems(plate), { grams: 380, kcal: 850, protein_g: 2, carbs_g: 4, fat_g: 1 });

// The whole point: unticking a component shrinks the base.
assert.strictEqual(sumItems(plate.filter((_, i) => i !== 1)).kcal, 750);

assert.deepStrictEqual(usableItems({ grams: 380, items: plate }), plate);
// One item is nothing to untick.
assert.strictEqual(usableItems({ grams: 300, items: [it('Polévka', 300, 120)] }), null);
assert.strictEqual(usableItems({ grams: 380 }), null);
// Parts that do not add up to the whole would silently rewrite the total.
assert.strictEqual(usableItems({ grams: 900, items: plate }), null);
// 40 % is the tolerance, so a 15 % mismatch still passes.
assert.deepStrictEqual(usableItems({ grams: 440, items: plate }), plate);
// Zero-gram garnish rows drop out before counting.
assert.strictEqual(usableItems({ grams: 380, items: [...plate, it('Petržel', 0, 0)] })?.length, 2);

console.log('plate items ok');

// --- daily AI quota ----------------------------------------------------
// localStorage is the only browser API aiQuota touches, and only inside its
// functions, so a stub set up before the first call is enough.
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;

const { aiQuota, noteAiCall, noteQuotaExhausted, FREE_TIER_DAILY } = await import('../src/lib/aiQuota.ts');
const { todayISO } = await import('../src/lib/date.ts');

assert.deepStrictEqual(aiQuota(), { used: 0, remaining: FREE_TIER_DAILY, exhausted: false });

noteAiCall();
noteAiCall();
assert.deepStrictEqual(aiQuota(), { used: 2, remaining: FREE_TIER_DAILY - 2, exhausted: false });

// A 429 is the truth for the key and beats the local tally.
noteQuotaExhausted();
assert.deepStrictEqual(aiQuota(), { used: 2, remaining: 0, exhausted: true });

// Yesterday's tally must not carry over — including the exhausted flag, or the
// warning would stick around after the quota reset.
store.set('kaloriak:aiquota:v1', JSON.stringify({ day: '2000-01-01', used: 19, exhausted: true }));
assert.deepStrictEqual(aiQuota(), { used: 0, remaining: FREE_TIER_DAILY, exhausted: false });

// Corrupt or missing storage must not throw on a screen the user is looking at.
store.set('kaloriak:aiquota:v1', 'not json');
assert.strictEqual(aiQuota().remaining, FREE_TIER_DAILY);

// Overshooting the limit floors at zero rather than going negative.
store.set('kaloriak:aiquota:v1', JSON.stringify({ day: todayISO(), used: 99, exhausted: false }));
assert.strictEqual(aiQuota().remaining, 0);

console.log('ai quota ok');
