// Run: node --experimental-strip-types scripts/portionMemory.check.ts
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
