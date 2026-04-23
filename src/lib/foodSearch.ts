// Open Food Facts API — free, no key
// https://wiki.openfoodfacts.org/API
//
// Search uses the new search.openfoodfacts.org service (the legacy
// /cgi/search.pl endpoint returns 503 to browser clients). Barcode
// lookup uses the v2 product endpoint, which has CORS enabled.

import type { FoodCategory } from './foodCategory';
import { categorize } from './foodCategory';

export interface FoodSearchResult {
  source: 'off' | 'local' | 'recent';
  id: string;
  name: string;
  brand?: string;
  per: number;
  defaultGrams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  imageUrl?: string;
  barcode?: string;
  category?: FoodCategory;
  pieceGrams?: number;
  pieceLabel?: string;
}

interface OFFNutriments {
  'energy-kcal_100g'?: number;
  'energy-kcal'?: number;
  energy_100g?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
}

// Shape returned by /api/v2/product/{barcode}
interface OFFProduct {
  code?: string;
  product_name?: string;
  product_name_cs?: string;
  generic_name_cs?: string;
  brands?: string;
  image_thumb_url?: string;
  image_small_url?: string;
  serving_quantity?: number;
  serving_size?: string;
  nutriments?: OFFNutriments;
}

// Shape returned by search.openfoodfacts.org — `brands` is an array, not a CSV.
interface OFFSearchHit {
  code?: string;
  product_name?: string;
  product_name_cs?: string;
  generic_name_cs?: string;
  brands?: string[];
  image_thumb_url?: string;
  image_small_url?: string;
  serving_quantity?: number;
  nutriments?: OFFNutriments;
}

function pickName(p: { product_name_cs?: string; generic_name_cs?: string; product_name?: string }): string {
  return (p.product_name_cs || p.generic_name_cs || p.product_name || 'Bez názvu').trim();
}

// Heuristic: did this product come with a Czech name, or did we fall back to
// the foreign default? Used to rerank Czech hits to the top.
function hasCzechName(p: { product_name_cs?: string; generic_name_cs?: string }): boolean {
  return !!(p.product_name_cs?.trim() || p.generic_name_cs?.trim());
}

// Detect names that are clearly written in a non-Czech, non-Slovak language —
// flagged so we can demote them in the result list.
function looksForeign(name: string): boolean {
  const n = name.toLowerCase();
  // German umlauts / sharp s
  if (/[äöüß]/.test(n)) return true;
  // Polish letters
  if (/[ąęłńóśźż]/.test(n)) return true;
  // Hungarian
  if (/[őű]/.test(n)) return true;
  // Romanian / Turkish-ish
  if (/[țșâîă]/.test(n)) return true;
  // Common foreign-only words
  if (/\b(mit|und|für|der|die|das|ohne|aus|naturalny|polski|dla|kein|ohne)\b/.test(n)) return true;
  return false;
}

// OFF stores multiple image sizes per product. The thumb URL is 100×100 and
// blurry; we rewrite it to the 400×400 variant which renders crisp on retina.
function upgradeImage(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace(/\.(\d+)\.jpg(\?.*)?$/i, '.400.jpg$2');
}

function pickKcal(n: OFFNutriments): number {
  if (typeof n['energy-kcal_100g'] === 'number') return n['energy-kcal_100g'];
  if (typeof n['energy-kcal'] === 'number') return n['energy-kcal'];
  if (typeof n.energy_100g === 'number') return Math.round(n.energy_100g / 4.184);
  return 0;
}

interface RankedResult extends FoodSearchResult {
  _rank: number;
}

function buildResult(args: {
  code?: string;
  name: string;
  brand?: string;
  servingQuantity?: number;
  imageUrl?: string;
  nutriments: OFFNutriments;
  czech: boolean;
}): RankedResult | null {
  const kcal = pickKcal(args.nutriments);
  if (!kcal) return null;
  // Lower rank = better. Czech-named first, then unknown, foreign-named last.
  const rank = args.czech ? 0 : looksForeign(args.name) ? 2 : 1;
  return {
    source: 'off',
    id: `off:${args.code ?? Math.random()}`,
    name: args.name,
    brand: args.brand,
    per: 100,
    defaultGrams: args.servingQuantity && args.servingQuantity > 0 ? Math.round(args.servingQuantity) : 100,
    kcal: Math.round(kcal),
    protein_g: +(args.nutriments.proteins_100g ?? 0).toFixed(1),
    carbs_g: +(args.nutriments.carbohydrates_100g ?? 0).toFixed(1),
    fat_g: +(args.nutriments.fat_100g ?? 0).toFixed(1),
    imageUrl: upgradeImage(args.imageUrl),
    barcode: args.code,
    category: categorize(args.name),
    _rank: rank,
  };
}

function productToResult(p: OFFProduct): RankedResult | null {
  if (!p.nutriments) return null;
  return buildResult({
    code: p.code,
    name: pickName(p),
    brand: p.brands?.split(',')[0]?.trim(),
    servingQuantity: p.serving_quantity,
    imageUrl: p.image_thumb_url || p.image_small_url,
    nutriments: p.nutriments,
    czech: hasCzechName(p),
  });
}

function hitToResult(h: OFFSearchHit): RankedResult | null {
  if (!h.nutriments) return null;
  return buildResult({
    code: h.code,
    name: pickName(h),
    brand: h.brands?.[0]?.trim(),
    servingQuantity: h.serving_quantity,
    imageUrl: h.image_thumb_url || h.image_small_url,
    nutriments: h.nutriments,
    czech: hasCzechName(h),
  });
}

const SEARCH_FIELDS = 'code,product_name,product_name_cs,generic_name_cs,brands,image_thumb_url,image_small_url,serving_quantity,nutriments';
const PRODUCT_FIELDS = 'code,product_name,product_name_cs,generic_name_cs,brands,image_thumb_url,image_small_url,serving_quantity,serving_size,nutriments';

// search.openfoodfacts.org has the best fulltext but no CORS — proxy in dev,
// in prod it will fail and we fall back to the v2 brand search below.
const SEARCH_BASE = import.meta.env.DEV ? '/off-search' : 'https://search.openfoodfacts.org';
// world.openfoodfacts.org/api/v2/search has Access-Control-Allow-Origin: *
// — works in dev AND prod, but only does structured (tag) search, not fulltext.
const V2_BASE = 'https://world.openfoodfacts.org/api/v2/search';

async function searchFulltext(q: string, signal?: AbortSignal): Promise<RankedResult[]> {
  // langs=cs biases the fulltext matching to Czech-language fields.
  const url = `${SEARCH_BASE}/search?q=${encodeURIComponent(q)}&langs=cs&page_size=30&fields=${SEARCH_FIELDS}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OFF fulltext ${res.status}`);
  const data = await res.json();
  const hits: OFFSearchHit[] = data.hits ?? [];
  return hits.map(hitToResult).filter((x): x is RankedResult => x !== null);
}

// Word→tag form: "Pilos" → "pilos", "Chef Select" → "chef-select".
// OFF tags are lowercase, accent-stripped, hyphenated.
function toTag(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// CORS-enabled, no fulltext — only brand-tag lookup. Cheap and reliable.
async function searchByBrand(brand: string, signal?: AbortSignal): Promise<RankedResult[]> {
  const tag = toTag(brand);
  if (tag.length < 2) return [];
  const url = `${V2_BASE}?brands_tags=${encodeURIComponent(tag)}&page_size=40&sort_by=popularity_key&fields=${PRODUCT_FIELDS}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OFF v2 brand ${res.status}`);
  const data = await res.json();
  const products: OFFProduct[] = data.products ?? [];
  return products.map(productToResult).filter((x): x is RankedResult => x !== null);
}

// Czech/EU retail brands and store chains commonly searched. If a query word
// matches one of these, we add a v2 brand lookup to the search.
const KNOWN_BRANDS = new Set([
  // Lidl
  'pilos', 'milbona', 'combino', 'chef', 'crownfield', 'fin-carre', 'freeway',
  'deluxe', 'vitafit', 'dulano', 'cien',
  // Kaufland
  'k-classic', 'k-bio', 'k-favourites', 'k-purland', 'k-take',
  // Albert / Tesco / Billa private labels
  'albert', 'tesco', 'billa', 'clever', 'ja',
  // CZ producers
  'olma', 'madeta', 'milko', 'hollandia', 'kunin', 'mlekarna', 'lucina',
  'apetito', 'president', 'hame', 'globus', 'penny',
  // protein/sport
  'nutrend', 'reflex', 'optimum', 'biotech', 'extrifit', 'prom-in',
]);

export async function searchOFF(query: string, signal?: AbortSignal): Promise<FoodSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length >= 2);

  // Run fulltext + brand lookups for every word in parallel. Brand lookups
  // hit a CORS-enabled endpoint so they work in production even if the
  // fulltext one is blocked.
  const tasks: Promise<RankedResult[]>[] = [
    searchFulltext(q, signal).catch((e) => {
      console.warn('[OFF] fulltext failed', e);
      return [];
    }),
  ];
  for (const w of words) {
    if (KNOWN_BRANDS.has(w) || words.length === 1) {
      tasks.push(
        searchByBrand(w, signal).catch((e) => {
          console.warn('[OFF] brand', w, 'failed', e);
          return [];
        })
      );
    }
  }

  const lists = await Promise.all(tasks);
  const merged: RankedResult[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const r of list) {
      const key = r.barcode ?? r.id;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(r);
    }
  }

  // Client-side AND filter: every query word must appear somewhere in
  // name+brand. Drops "Lapte Pilos" when the user typed "pilos protein".
  const filtered = words.length > 1
    ? merged.filter((r) => {
        const hay = `${r.name} ${r.brand ?? ''}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
    : merged;

  // Prefer the strict-match list, but if it nuked everything, fall back to
  // the unfiltered merge so the user still sees something.
  const pool = filtered.length ? filtered : merged;

  // Sort: Czech-named first, foreign-language demoted to the bottom.
  // Drop the internal _rank field before returning.
  pool.sort((a, b) => a._rank - b._rank);
  return pool.slice(0, 20).map(({ _rank, ...rest }) => {
    void _rank;
    return rest;
  });
}

// Barcode lookup uses the v2 product endpoint — has CORS, safe to call directly.
export async function lookupBarcode(barcode: string, signal?: AbortSignal): Promise<FoodSearchResult | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}?fields=${PRODUCT_FIELDS}`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  return productToResult(data.product);
}
