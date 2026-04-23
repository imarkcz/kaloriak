// Lightweight keyword classifier so OFF/recent results without an explicit
// category still get a sensible icon/colour in the thumbnail fallback.

export type FoodCategory =
  | 'pecivo' | 'maso' | 'mlecne' | 'ovoce' | 'zelenina'
  | 'priloha' | 'napoj' | 'snack' | 'hlavni' | 'jine';

export const CATEGORY_META: Record<FoodCategory, { emoji: string; gradient: string }> = {
  pecivo:   { emoji: '🥖', gradient: 'from-amber-400 to-orange-500' },
  maso:     { emoji: '🥩', gradient: 'from-rose-400 to-red-600' },
  mlecne:   { emoji: '🥛', gradient: 'from-sky-300 to-blue-500' },
  ovoce:    { emoji: '🍎', gradient: 'from-lime-400 to-green-500' },
  zelenina: { emoji: '🥬', gradient: 'from-emerald-400 to-teal-600' },
  priloha:  { emoji: '🍚', gradient: 'from-orange-300 to-amber-500' },
  napoj:    { emoji: '🥤', gradient: 'from-cyan-400 to-sky-600' },
  snack:    { emoji: '🍫', gradient: 'from-violet-400 to-purple-600' },
  hlavni:   { emoji: '🍝', gradient: 'from-pink-400 to-fuchsia-600' },
  jine:     { emoji: '🍽️', gradient: 'from-zinc-500 to-zinc-700' },
};

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const KEYWORDS: Array<[FoodCategory, string[]]> = [
  ['hlavni',   ['svickov', 'gulas', 'rizek', 'pizza', 'lasagn', 'spaget', 'burger', 'kebab', 'sushi', 'curry', 'risott', 'leco', 'omacka', 'polevk', 'soup', 'burrito', 'wrap', 'sandwich', 'koprovk', 'segedin', 'cevab', 'smazak', 'pecene kure', 'rajska', 'sunkofleky']],
  ['maso',     ['kureci', 'kuren', 'vepro', 'vepr', 'krkov', 'panenk', 'bok ', 'kotlet', 'hovez', 'mlete', 'salam', 'sunka', 'parky', 'tunak', 'losos', 'treska', 'krevet', 'slanin', 'klobas', 'spekac', 'jelito', 'jitrnic', 'kachn', 'krocan', 'krut', 'ryba']],
  ['pecivo',   ['rohlik', 'chleb', 'chleba', 'houska', 'bagetk', 'bagueta', 'bageta', 'toust', 'toast', 'kaiserk', 'pita', 'tortill', 'knack', 'croissant', 'preclik']],
  ['mlecne',   ['mleko', 'mlieko', 'jogurt', 'tvaroh', 'syr', 'eidam', 'gouda', 'mozzarell', 'parmazan', 'hermelin', 'niva', 'cottage', 'maslo', 'smetan', 'kefir', 'cheese', 'milk', 'yog']],
  ['ovoce',    ['jablk', 'banan', 'pomeranc', 'mandarink', 'hrusk', 'broskev', 'merunk', 'svestk', 'jahod', 'borůvk', 'boruvk', 'malin', 'kiwi', 'mango', 'ananas', 'meloun', 'hroznov', 'avokad', 'fik ', 'datle', 'rozinky']],
  ['zelenina', ['rajce', 'rajcat', 'okurk', 'paprik', 'mrkev', 'cibul', 'cesnek', 'brokol', 'kvetak', 'salat', 'spenat', 'cuket', 'lilek', 'kukuric', 'fazol', 'hras', 'oliv', 'reps', 'celer', 'porek']],
  ['priloha',  ['ryze', 'rice', 'tatest', 'testovin', 'pasta', 'kuskus', 'bulgur', 'quinoa', 'kvinoa', 'knedlik', 'brambor', 'pure ', 'puree', 'hranolk', 'fries', 'ovsen', 'oats']],
  ['napoj',    ['voda', 'water', 'pivo', 'beer', 'vino', 'wine', 'rum', 'whisky', 'vodka', 'cola', 'coca', 'fanta', 'sprite', 'kofol', 'dzus', 'juice', 'kava', 'coffee', 'caj', 'tea', 'mineral', 'limonad', 'shake', 'smoothie', 'protein']],
  ['snack',    ['cokolad', 'choc', 'sušenk', 'susenk', 'oplatk', 'horalk', 'tycink', 'bar ', 'orisk', 'oresk', 'mandle', 'arasid', 'kesu', 'chips', 'chipsy', 'popcorn', 'musli', 'snack', 'bombon', 'gumic', 'lentilk', 'dort', 'koblih']],
];

export function categorize(name: string): FoodCategory {
  const n = norm(name);
  for (const [cat, kws] of KEYWORDS) {
    if (kws.some((kw) => n.includes(kw))) return cat;
  }
  return 'jine';
}
