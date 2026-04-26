import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppState';
import { analyzeFoodImage, compressImage, estimateFoodFromName, fileToBase64, humanizeGeminiError } from '../lib/gemini';
import type { FoodAnalysis } from '../lib/gemini';
import { todayISO } from '../lib/date';
import { searchLocal, FOODS_DB } from '../lib/foodDb';
import { searchOFF, lookupBarcode, type FoodSearchResult } from '../lib/foodSearch';
import { categorize } from '../lib/foodCategory';
import { recentFoodsFromMeals, searchRecent } from '../lib/recentFoods';
import BarcodeScanner from '../components/BarcodeScanner';
import FoodThumb from '../components/FoodThumb';
import { haptic } from '../lib/haptics';
import { analyzeMeal, type MealInsight } from '../lib/mealInsights';
import MealInsightModal from '../components/MealInsightModal';
import NumStepper from '../components/NumStepper';
import { MEAL_TYPE_META, MEAL_TYPE_ORDER, defaultMealTypeForNow } from '../lib/mealType';
import type { MealType } from '../types';

type Mode = 'photo' | 'search' | 'manual';
type PhotoStage = 'pick' | 'analyzing' | 'confirm' | 'error';
type PrepMethod = 'asis' | 'airfryer' | 'oven' | 'boiled';

// Multipliers applied to AI's fat estimate when user corrects the cooking
// method. AI assumes the typical (often deep-fried) preparation; airfryer
// uses ~⅓ the oil, oven baking less still, boiled/steamed almost none.
// kcal is recomputed from removed fat (1 g fat ≈ 9 kcal) so protein/carbs
// are unaffected.
const FAT_MULT: Record<PrepMethod, number> = {
  asis: 1.0,
  airfryer: 0.6,
  oven: 0.75,
  boiled: 0.4,
};
const PREP_LABEL: Record<PrepMethod, string> = {
  asis: 'Bez úpravy',
  airfryer: 'Airfryer',
  oven: 'V troubě',
  boiled: 'Vařené',
};

export default function AddMeal() {
  const { data, addMeal } = useApp();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>('search');

  // photo state
  const [photoStage, setPhotoStage] = useState<PhotoStage>('pick');
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [photoError, setPhotoError] = useState<string>('');
  const [photoGrams, setPhotoGrams] = useState(0);
  const [prep, setPrep] = useState<PrepMethod>('asis');
  // Editable photo fields — initialized from AI analysis but user can override
  const [photoName, setPhotoName] = useState('');
  const [photoKcal, setPhotoKcal] = useState(0);
  const [photoProt, setPhotoProt] = useState(0);
  const [photoCarbs, setPhotoCarbs] = useState(0);
  const [photoFat, setPhotoFat] = useState(0);

  // After save: show one-shot insight popup, then navigate home on dismiss.
  const [insight, setInsight] = useState<MealInsight | null>(null);
  const [insightFor, setInsightFor] = useState<{ name: string; kcal: number } | null>(null);

  // Meal-time grouping (breakfast / lunch / snack / dinner). Default is
  // inferred from the local clock so most logging is one tap less.
  const [mealType, setMealType] = useState<MealType>(() => defaultMealTypeForNow());

  // search state
  const [query, setQuery] = useState('');
  const [offResults, setOffResults] = useState<FoodSearchResult[]>([]);
  const [offLoading, setOffLoading] = useState(false);
  const [picked, setPicked] = useState<FoodSearchResult | null>(null);
  const [pickedGrams, setPickedGrams] = useState(0);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState('');

  // manual state
  const [mName, setMName] = useState('');
  const [mGrams, setMGrams] = useState(150);
  const [mKcal, setMKcal] = useState(0);
  const [mProt, setMProt] = useState(0);
  const [mCarbs, setMCarbs] = useState(0);
  const [mFat, setMFat] = useState(0);

  const recent = useMemo(() => recentFoodsFromMeals(data.meals, 8), [data.meals]);

  // OFF search debounced
  useEffect(() => {
    if (mode !== 'search' || query.trim().length < 2) {
      setOffResults([]);
      setOffLoading(false);
      return;
    }
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      setOffLoading(true);
      try {
        const r = await searchOFF(query, ctrl.signal);
        setOffResults(r);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          console.warn('[OFF] search failed', e);
        }
        setOffResults([]);
      } finally {
        setOffLoading(false);
      }
    }, 350);
    return () => {
      ctrl.abort();
      clearTimeout(id);
    };
  }, [query, mode]);

  // Build merged list when query is non-empty
  const searchResults = useMemo<FoodSearchResult[]>(() => {
    if (!query.trim()) return [];
    const localRecent = searchRecent(data.meals, query, 4);
    const localDb = searchLocal(query).map<FoodSearchResult>((f) => ({
      source: 'local',
      id: `local:${f.id}`,
      name: f.name,
      per: 100,
      defaultGrams: f.defaultGrams,
      kcal: f.kcal,
      protein_g: f.protein_g,
      carbs_g: f.carbs_g,
      fat_g: f.fat_g,
      category: f.category,
      pieceGrams: f.pieceGrams,
      pieceLabel: f.pieceLabel,
    }));
    // dedupe by name
    const seen = new Set<string>();
    const dedupe = (arr: FoodSearchResult[]) =>
      arr.filter((r) => {
        const k = r.name.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    return [...dedupe(localRecent), ...dedupe(localDb), ...dedupe(offResults)];
  }, [query, data.meals, offResults]);

  async function handleFile(file: File) {
    try {
      setPhotoStage('analyzing');
      const compressed = await compressImage(file);
      const { base64, mimeType, dataUrl } = await fileToBase64(compressed);
      setImageDataUrl(dataUrl);
      const result = await analyzeFoodImage(data.geminiApiKey, base64, mimeType);
      setAnalysis(result);
      setPhotoGrams(Math.round(result.grams));
      setPrep('asis');
      // Seed editable fields from AI's per-portion estimate
      setPhotoName(result.name);
      setPhotoKcal(result.kcal);
      setPhotoProt(result.protein_g);
      setPhotoCarbs(result.carbs_g);
      setPhotoFat(result.fat_g);
      setPhotoStage('confirm');
    } catch (e) {
      setPhotoError(humanizeGeminiError(e));
      setPhotoStage('error');
    }
  }

  function showInsightThenNav(meal: { name: string; grams: number; kcal: number; protein_g: number; carbs_g: number; fat_g: number }) {
    setInsight(analyzeMeal(meal));
    setInsightFor({ name: meal.name, kcal: meal.kcal });
  }

  function handleSavePhoto() {
    if (!analysis) return;
    const ratio = analysis.grams > 0 ? photoGrams / analysis.grams : 1;
    const m = {
      name: photoName.trim() || analysis.name,
      grams: photoGrams,
      kcal: Math.max(0, Math.round(photoKcal * ratio)),
      protein_g: +(Math.max(0, photoProt) * ratio).toFixed(1),
      carbs_g: +(Math.max(0, photoCarbs) * ratio).toFixed(1),
      fat_g: +(Math.max(0, photoFat) * ratio).toFixed(1),
    };
    addMeal({
      id: crypto.randomUUID(),
      date: todayISO(),
      createdAt: Date.now(),
      mealType,
      ...m,
      imageDataUrl,
      note: analysis.note,
    });
    haptic('success');
    showInsightThenNav(m);
  }

  function handleSaveManual() {
    if (!mName.trim() || mKcal <= 0) return;
    const m = {
      name: mName.trim(),
      grams: mGrams,
      kcal: Math.round(mKcal),
      protein_g: +mProt.toFixed(1),
      carbs_g: +mCarbs.toFixed(1),
      fat_g: +mFat.toFixed(1),
    };
    addMeal({ id: crypto.randomUUID(), date: todayISO(), createdAt: Date.now(), mealType, ...m });
    haptic('success');
    showInsightThenNav(m);
  }

  function handlePickFood(f: FoodSearchResult) {
    setPicked(f);
    setPickedGrams(f.defaultGrams);
  }

  function handleSavePicked() {
    if (!picked) return;
    const ratio = picked.per > 0 ? pickedGrams / picked.per : 1;
    const m = {
      name: picked.brand ? `${picked.name} (${picked.brand})` : picked.name,
      grams: pickedGrams,
      kcal: Math.round(picked.kcal * ratio),
      protein_g: +(picked.protein_g * ratio).toFixed(1),
      carbs_g: +(picked.carbs_g * ratio).toFixed(1),
      fat_g: +(picked.fat_g * ratio).toFixed(1),
    };
    addMeal({ id: crypto.randomUUID(), date: todayISO(), createdAt: Date.now(), mealType, ...m, imageDataUrl: picked.imageUrl });
    haptic('success');
    showInsightThenNav(m);
  }

  async function handleAiEstimate() {
    const q = query.trim();
    if (!q || estimating) return;
    setEstimateError('');
    setEstimating(true);
    try {
      const e = await estimateFoodFromName(data.geminiApiKey, q);
      handlePickFood({
        source: 'local',
        id: `ai:${Date.now()}`,
        name: e.name,
        per: 100,
        defaultGrams: e.defaultGrams,
        kcal: e.kcal,
        protein_g: e.protein_g,
        carbs_g: e.carbs_g,
        fat_g: e.fat_g,
        category: categorize(e.name),
      });
    } catch (e) {
      setEstimateError(humanizeGeminiError(e));
    } finally {
      setEstimating(false);
    }
  }

  async function handleBarcodeDetected(code: string) {
    setScanOpen(false);
    setScanError('');
    try {
      const r = await lookupBarcode(code);
      if (!r) {
        setScanError(`Kód ${code} nenalezen v Open Food Facts. Zkus ručně.`);
        return;
      }
      handlePickFood(r);
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Chyba při hledání kódu.');
    }
  }

  // Whether to show mode tabs (only on initial pick/search/manual screens)
  const showTabs = (mode === 'photo' && photoStage === 'pick') || mode === 'search' || mode === 'manual';
  const showStickyManualBtn = mode === 'manual' && !picked;
  const showStickyPhotoBtn = mode === 'photo' && photoStage === 'confirm';
  const showStickyPickedBtn = !!picked;

  return (
    <div className="min-h-dvh pt-safe pb-safe flex flex-col">
      {/* HEADER */}
      <header className="max-w-md mx-auto w-full px-5 py-4 flex items-center justify-between">
        <button
          onClick={() => (picked ? setPicked(null) : navigate(-1))}
          className="w-10 h-10 rounded-full glass flex items-center justify-center text-ink active:scale-90 transition-transform"
          aria-label="Zpět"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <h1 className="text-lg font-bold text-ink">{picked ? 'Upravit porci' : 'Nové jídlo'}</h1>
        <div className="w-10" />
      </header>

      {/* MODE TABS */}
      {showTabs && !picked && (
        <div className="max-w-md mx-auto w-full px-5 mb-4">
          <div className="glass rounded-full p-1 flex">
            <ModeTab active={mode === 'search'} onClick={() => setMode('search')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
              </svg>
              Hledat
            </ModeTab>
            <ModeTab active={mode === 'photo'} onClick={() => setMode('photo')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Foto
            </ModeTab>
            <ModeTab active={mode === 'manual'} onClick={() => setMode('manual')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>
              </svg>
              Ručně
            </ModeTab>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-md mx-auto w-full px-5 pb-32 overflow-y-auto">
        {/* PICKED → CONFIGURE PORTION */}
        {picked && (
          <>
            <PickedConfig
              picked={picked}
              grams={pickedGrams}
              onGramsChange={setPickedGrams}
            />
            <div className="mt-3">
              <MealTypePicker value={mealType} onChange={setMealType} />
            </div>
          </>
        )}

        {/* SEARCH MODE */}
        {!picked && mode === 'search' && (
          <div className="animate-fade-up">
            {scanError && (
              <div className="mb-3 px-4 py-3 rounded-2xl bg-red-500/15 text-red-300 text-sm">
                {scanError}
              </div>
            )}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
                </svg>
                <input
                  className="field !pl-11"
                  placeholder="Hledat jídlo (např. rohlík)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 text-ink-mute flex items-center justify-center"
                    aria-label="Vyčistit"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                )}
              </div>
              <button
                onClick={() => { setScanError(''); setScanOpen(true); }}
                className="w-12 h-12 rounded-2xl bg-grad-coral text-white flex items-center justify-center shadow-coral-soft active:scale-95 transition-transform shrink-0"
                aria-label="Skenovat čárový kód"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 5v3m0 11v-3m6 5v-3m0-13v3m6 13v-3m0-13v3m6 13v-3m0-10v3"/>
                </svg>
              </button>
            </div>

            {/* Results / recent */}
            <div className="mt-4 space-y-2">
              {!query && recent.length > 0 && (
                <>
                  <SectionTitle>Nedávno</SectionTitle>
                  {recent.map((r) => <ResultCard key={r.id} item={r} onPick={handlePickFood} />)}
                </>
              )}

              {!query && recent.length === 0 && (
                <>
                  <SectionTitle>Tipy</SectionTitle>
                  {FOODS_DB.slice(0, 6).map((f) => (
                    <ResultCard
                      key={f.id}
                      item={{
                        source: 'local',
                        id: `local:${f.id}`,
                        name: f.name,
                        per: 100,
                        defaultGrams: f.defaultGrams,
                        kcal: f.kcal,
                        protein_g: f.protein_g,
                        carbs_g: f.carbs_g,
                        fat_g: f.fat_g,
                        category: f.category,
                      }}
                      onPick={handlePickFood}
                    />
                  ))}
                </>
              )}

              {query && (
                <>
                  {searchResults.map((r) => <ResultCard key={r.id} item={r} onPick={handlePickFood} />)}
                  {offLoading && (
                    <div className="flex items-center justify-center gap-2 py-3 text-ink-soft text-xs">
                      <svg className="animate-spin w-4 h-4 text-coral-400" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round"/>
                      </svg>
                      <span>Hledám i v Open Food Facts (3M produktů)…</span>
                    </div>
                  )}
                  {!offLoading && (
                    <AiEstimateBlock
                      query={query}
                      hasResults={searchResults.length > 0}
                      loading={estimating}
                      error={estimateError}
                      onEstimate={handleAiEstimate}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* PHOTO MODE */}
        {!picked && mode === 'photo' && photoStage === 'pick' && (
          <div className="animate-fade-up">
            <input ref={fileInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <input ref={galleryInput} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

            {/* Hero viewfinder frame */}
            <button
              type="button"
              onClick={() => { haptic('tap'); fileInput.current?.click(); }}
              className="relative w-full aspect-[4/5] rounded-[36px] overflow-hidden active:scale-[0.99] transition-transform group"
              aria-label="Vyfotit jídlo"
            >
              {/* Layered gradient mesh background */}
              <div className="absolute inset-0 bg-gradient-to-br from-coral-500/30 via-orange-500/15 to-rose-600/25" />
              <div className="absolute -top-20 -left-10 w-72 h-72 rounded-full bg-coral-400/40 blur-3xl" />
              <div className="absolute -bottom-24 -right-10 w-80 h-80 rounded-full bg-orange-500/30 blur-3xl" />
              <div className="absolute inset-0 bg-black/30 backdrop-blur-2xl" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[36px]" />

              {/* Corner brackets — viewfinder feel */}
              <CornerBracket className="top-5 left-5" />
              <CornerBracket className="top-5 right-5 rotate-90" />
              <CornerBracket className="bottom-5 right-5 rotate-180" />
              <CornerBracket className="bottom-5 left-5 -rotate-90" />

              {/* Centered content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-grad-coral blur-2xl opacity-60 rounded-full scale-110" />
                  <div className="relative w-20 h-20 rounded-full bg-grad-coral flex items-center justify-center shadow-coral-glow group-active:scale-95 transition-transform">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white mt-5 drop-shadow">Vyfoť své jídlo</h2>
                <p className="text-white/75 mt-2 max-w-[18rem] text-[13px] leading-snug">
                  AI rozpozná jídlo a odhadne kalorie i makra během pár sekund.
                </p>
              </div>

              {/* Bottom shimmer line */}
              <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </button>

            {/* Secondary action — gallery */}
            <button
              onClick={() => { haptic('tap'); galleryInput.current?.click(); }}
              className="mt-3 w-full py-4 rounded-2xl glass text-ink font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-5-5L5 21"/>
              </svg>
              Vybrat z galerie
            </button>
          </div>
        )}

        {!picked && mode === 'photo' && photoStage === 'analyzing' && (
          <div className="animate-fade-up">
            <div className="relative w-full aspect-[4/5] rounded-[36px] overflow-hidden ring-1 ring-white/10">
              {imageDataUrl ? (
                <img src={imageDataUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-grad-coral opacity-30" />
              )}
              {/* Frosted glass overlay */}
              <div className="absolute inset-0 bg-black/30 backdrop-blur-xl" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/40" />

              {/* Center spinner + text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-grad-coral blur-2xl opacity-50 rounded-full scale-125" />
                  <div className="relative w-20 h-20 rounded-full glass flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-[3px] border-white/20 border-t-coral-400 animate-spin" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-white mt-6 drop-shadow">Analyzuji jídlo…</h2>
                <p className="text-white/80 mt-1.5 text-sm">Moment, AI počítá kalorie.</p>
              </div>
            </div>
          </div>
        )}

        {!picked && mode === 'photo' && photoStage === 'confirm' && analysis && (
          <div className="animate-fade-up">
            {imageDataUrl && (
              <div className="rounded-[32px] overflow-hidden aspect-square mb-4 ring-1 ring-white/10">
                <img src={imageDataUrl} alt={analysis.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex items-start justify-between gap-2">
              <input
                value={photoName}
                onChange={(e) => setPhotoName(e.target.value)}
                className="text-2xl font-extrabold tracking-tight text-ink bg-transparent border-b border-white/10 focus:border-coral-400 outline-none flex-1 pb-1"
              />
              <ConfidenceBadge level={analysis.confidence} />
            </div>
            <p className="text-[11px] text-ink-mute mt-1.5">
              {analysis.note ? `${analysis.note} · ` : ''}Klepni na název nebo hodnoty pro úpravu.
            </p>
            <MealTypePicker value={mealType} onChange={setMealType} />

            <div className="mt-3 glass rounded-3xl p-5">
              <div className="text-sm font-medium text-ink mb-3">Hmotnost porce</div>
              <NumStepper
                value={photoGrams}
                onChange={setPhotoGrams}
                min={5}
                max={2000}
                step={5}
                bigStep={50}
                unit="g"
                presets={[100, 150, 200, 300, 500]}
              />
            </div>

            <div className="mt-3 glass rounded-3xl p-5">
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-sm font-medium text-ink">Způsob přípravy</span>
                <span className="text-[10px] text-ink-mute uppercase tracking-wider">upraví tuky a kcal</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(PREP_LABEL) as PrepMethod[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      haptic('tap');
                      setPrep(p);
                      // Recompute fat/kcal from AI baseline whenever prep is tapped.
                      // User's manual macro edits (protein/carbs) are preserved.
                      const fatNew = +(analysis.fat_g * FAT_MULT[p]).toFixed(1);
                      const kcalNew = Math.round(analysis.kcal - (analysis.fat_g - fatNew) * 9);
                      setPhotoFat(Math.max(0, fatNew));
                      setPhotoKcal(Math.max(0, kcalNew));
                    }}
                    className={`px-2 py-2 rounded-xl text-xs font-semibold transition-all ${
                      prep === p
                        ? 'bg-grad-coral text-white shadow-coral-soft'
                        : 'bg-white/[0.04] text-ink-soft border border-white/5'
                    }`}
                  >
                    {PREP_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 glass rounded-3xl p-5 space-y-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-mute">
                Nutriční hodnoty <span className="text-ink-mute/60 font-normal normal-case">(na celou porci, můžeš upravit)</span>
              </div>
              <NumField label="Kalorie" unit="kcal" value={photoKcal} onChange={setPhotoKcal} accent="text-ink" />
              <NumField label="Bílkoviny" unit="g" value={photoProt} onChange={setPhotoProt} accent="text-macro-protein" />
              <NumField label="Sacharidy" unit="g" value={photoCarbs} onChange={setPhotoCarbs} accent="text-macro-carbs" />
              <NumField label="Tuky" unit="g" value={photoFat} onChange={setPhotoFat} accent="text-macro-fat" />
            </div>

            {photoGrams !== analysis.grams && (
              <div className="mt-3 glass rounded-2xl p-3 flex items-center justify-between text-xs">
                <span className="text-ink-mute">Po přepočtu na {photoGrams} g:</span>
                <span className="font-bold text-ink tabular-nums">
                  {Math.round(photoKcal * (photoGrams / analysis.grams))} kcal
                </span>
              </div>
            )}
          </div>
        )}

        {!picked && mode === 'photo' && photoStage === 'error' && (
          <div className="flex flex-col items-center justify-center pt-12 text-center animate-fade-up">
            <div className="text-5xl mb-3">⚠️</div>
            <h2 className="text-xl font-bold text-ink">Nepovedlo se</h2>
            <p className="text-ink-soft mt-2 text-sm max-w-xs">{photoError}</p>
            <button
              onClick={() => { setPhotoError(''); setPhotoStage('pick'); }}
              className="mt-6 px-6 py-3 rounded-full bg-grad-coral text-white font-semibold shadow-coral-soft active:scale-95 transition-transform"
            >
              Zkusit znovu
            </button>
          </div>
        )}

        {/* MANUAL MODE */}
        {!picked && mode === 'manual' && (
          <div className="space-y-3 animate-fade-up">
            <div className="glass rounded-3xl p-5 space-y-4">
              <Field label="Název jídla">
                <input className="field" placeholder="např. Kuřecí salát" value={mName} onChange={(e) => setMName(e.target.value)} />
              </Field>
              <Field label="Hmotnost porce">
                <NumStepper value={mGrams} onChange={setMGrams} min={5} max={2000} step={5} bigStep={50} unit="g" presets={[100, 150, 200, 300]} />
              </Field>
            </div>
            <MealTypePicker value={mealType} onChange={setMealType} />
            <div className="glass rounded-3xl p-5 space-y-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-mute">Nutriční hodnoty</div>
              <NumField label="Kalorie" unit="kcal" value={mKcal} onChange={setMKcal} accent="text-ink" />
              <NumField label="Bílkoviny" unit="g" value={mProt} onChange={setMProt} accent="text-macro-protein" />
              <NumField label="Sacharidy" unit="g" value={mCarbs} onChange={setMCarbs} accent="text-macro-carbs" />
              <NumField label="Tuky" unit="g" value={mFat} onChange={setMFat} accent="text-macro-fat" />
            </div>
            {mKcal > 0 && (
              <div className="glass rounded-3xl p-4 flex items-center justify-between animate-fade-up">
                <span className="text-sm text-ink-soft">Celkem v porci</span>
                <span className="text-2xl font-extrabold tabular-nums text-ink">{Math.round(mKcal)} <span className="text-xs text-ink-mute font-medium">kcal</span></span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* STICKY ACTIONS */}
      {showStickyPhotoBtn && (
        <StickyBar>
          <button onClick={() => { setPhotoStage('pick'); setAnalysis(null); setImageDataUrl(''); }} className="flex-1 py-3.5 rounded-2xl font-semibold glass text-ink active:scale-[0.98] transition-transform">
            Zahodit
          </button>
          <button onClick={handleSavePhoto} className="flex-[2] py-3.5 rounded-2xl font-semibold bg-grad-coral text-white shadow-coral-soft active:scale-[0.98] transition-transform">
            Přidat do dne
          </button>
        </StickyBar>
      )}

      {showStickyManualBtn && (
        <StickyBar>
          <button onClick={handleSaveManual} disabled={!mName.trim() || mKcal <= 0} className="w-full py-4 rounded-2xl font-semibold bg-grad-coral text-white shadow-coral-soft active:scale-[0.98] transition-transform disabled:opacity-40 disabled:shadow-none">
            Přidat do dne
          </button>
        </StickyBar>
      )}

      {showStickyPickedBtn && (
        <StickyBar>
          <button onClick={() => setPicked(null)} className="flex-1 py-3.5 rounded-2xl font-semibold glass text-ink active:scale-[0.98] transition-transform">
            Zpět
          </button>
          <button onClick={handleSavePicked} className="flex-[2] py-3.5 rounded-2xl font-semibold bg-grad-coral text-white shadow-coral-soft active:scale-[0.98] transition-transform">
            Přidat do dne
          </button>
        </StickyBar>
      )}

      {scanOpen && (
        <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setScanOpen(false)} />
      )}

      <style>{`
        .field {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 0.875rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          color: #fafafa;
          outline: none;
          font-size: 1rem;
          transition: all 200ms;
        }
        .field::placeholder { color: #71717a; }
        .field:focus {
          border-color: #f97366;
          background: rgba(255,255,255,0.06);
          box-shadow: 0 0 0 4px rgba(249,115,102,0.12);
        }
      `}</style>

      <MealInsightModal
        insight={insight}
        mealName={insightFor?.name ?? ''}
        kcal={insightFor?.kcal ?? 0}
        onClose={() => {
          setInsight(null);
          setInsightFor(null);
          navigate('/', { replace: true });
        }}
      />
    </div>
  );
}

function StickyBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 inset-x-0 pb-safe pt-3 px-5 bg-gradient-to-t from-bg via-bg to-transparent">
      <div className="max-w-md mx-auto flex gap-2">{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-bold uppercase tracking-wider text-ink-mute px-1 pb-1 pt-2">{children}</div>;
}

function ResultCard({ item, onPick }: { item: FoodSearchResult; onPick: (i: FoodSearchResult) => void }) {
  const sourceMap = {
    recent: { label: 'Nedávno', cls: 'bg-coral-500/15 text-coral-300' },
    local: { label: 'CZ', cls: 'bg-emerald-500/15 text-emerald-400' },
    off: { label: 'OFF', cls: 'bg-blue-500/15 text-blue-300' },
  } as const;
  const s = sourceMap[item.source];
  return (
    <button
      onClick={() => onPick(item)}
      className="w-full glass rounded-2xl p-3 flex gap-3 items-center text-left active:scale-[0.99] transition-transform"
    >
      <FoodThumb src={item.imageUrl} alt={item.name} size="sm" category={item.category ?? categorize(item.name)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink truncate text-sm">{item.name}</span>
          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md shrink-0 ${s.cls}`}>{s.label}</span>
        </div>
        {item.brand && <div className="text-[11px] text-ink-mute truncate">{item.brand}</div>}
        <div className="text-xs text-ink-mute mt-0.5 tabular-nums">
          <span className="text-ink font-semibold">{item.kcal}</span> kcal / 100 g
        </div>
      </div>
      <svg className="text-ink-mute shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
    </button>
  );
}

function PickedConfig({ picked, grams, onGramsChange }: { picked: FoodSearchResult; grams: number; onGramsChange: (g: number) => void }) {
  const hasPieces = !!picked.pieceGrams && picked.pieceGrams > 0;
  const [unitMode, setUnitMode] = useState<'pieces' | 'grams'>(hasPieces ? 'pieces' : 'grams');
  const pg = picked.pieceGrams ?? 0;
  const pieces = pg > 0 ? Math.max(1, Math.round((grams / pg) * 2) / 2) : 1; // 0.5 step

  function setPieces(n: number) {
    const v = Math.max(0.5, Math.round(n * 2) / 2);
    onGramsChange(Math.round(v * pg));
  }

  return (
    <div className="animate-fade-up">
      <div className="glass rounded-3xl p-5 flex gap-4 items-center">
        <FoodThumb src={picked.imageUrl} alt={picked.name} size="lg" category={picked.category ?? categorize(picked.name)} />
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-ink leading-tight text-lg">{picked.name}</div>
          {picked.brand && <div className="text-xs text-ink-mute mt-0.5">{picked.brand}</div>}
          <div className="text-xs text-ink-mute mt-1 tabular-nums">{picked.kcal} kcal / 100 g</div>
        </div>
      </div>

      <div className="mt-3 glass rounded-3xl p-5">
        {hasPieces && (
          <div className="flex gap-1 p-1 rounded-full bg-white/5 ring-1 ring-white/5 mb-4">
            <button
              onClick={() => setUnitMode('pieces')}
              className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${unitMode === 'pieces' ? 'bg-grad-coral text-white shadow-coral-soft' : 'text-ink-soft'}`}
            >
              Počet ks
            </button>
            <button
              onClick={() => setUnitMode('grams')}
              className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${unitMode === 'grams' ? 'bg-grad-coral text-white shadow-coral-soft' : 'text-ink-soft'}`}
            >
              Gramy
            </button>
          </div>
        )}

        {unitMode === 'pieces' && hasPieces ? (
          <>
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold text-ink">Počet</span>
              <span className="text-2xl font-extrabold tabular-nums text-ink">
                {pieces % 1 === 0 ? pieces : pieces.toFixed(1)}{' '}
                <span className="text-sm text-ink-soft font-semibold">{pluralPiece(picked.pieceLabel ?? 'ks', pieces)}</span>
              </span>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => setPieces(pieces - 1)}
                disabled={pieces <= 1}
                className="w-12 h-12 rounded-full bg-white/8 text-ink text-xl font-bold active:scale-90 transition-transform disabled:opacity-30 ring-1 ring-white/10"
                aria-label="Méně"
              >
                −
              </button>
              <input
                type="range"
                min={0.5}
                max={12}
                step={0.5}
                value={pieces}
                onChange={(e) => setPieces(Number(e.target.value))}
                className="flex-1"
              />
              <button
                onClick={() => setPieces(pieces + 1)}
                className="w-12 h-12 rounded-full bg-white/8 text-ink text-xl font-bold active:scale-90 transition-transform ring-1 ring-white/10"
                aria-label="Více"
              >
                +
              </button>
            </div>
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {[1, 2, 3, 4, 6].map((n) => (
                <button
                  key={n}
                  onClick={() => setPieces(n)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    Math.abs(pieces - n) < 0.01 ? 'bg-grad-coral text-white' : 'bg-white/5 text-ink-soft border border-white/5'
                  }`}
                >
                  {n}× {picked.pieceLabel ?? 'ks'}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-ink-mute mt-3 tabular-nums">≈ {grams} g celkem</div>
          </>
        ) : (
          <>
            <div className="text-sm font-semibold text-ink mb-3">Hmotnost porce</div>
            <NumStepper
              value={grams}
              onChange={onGramsChange}
              min={5}
              max={2000}
              step={5}
              bigStep={50}
              unit="g"
              presets={[50, 100, 150, 200, 300]}
            />
          </>
        )}
      </div>

      <ScaledStats picked={picked} grams={grams} />
    </div>
  );
}

// Czech 1/2-4/5+ plural — "1 vejce / 2 vejce / 5 vajec".
function pluralPiece(singular: string, n: number): string {
  const map: Record<string, [string, string, string]> = {
    vejce: ['vejce', 'vejce', 'vajec'],
    oko: ['oko', 'oka', 'ok'],
    bílek: ['bílek', 'bílky', 'bílků'],
    žloutek: ['žloutek', 'žloutky', 'žloutků'],
    rohlík: ['rohlík', 'rohlíky', 'rohlíků'],
    houska: ['houska', 'housky', 'housek'],
    kaiserka: ['kaiserka', 'kaiserky', 'kaiserek'],
    krajíc: ['krajíc', 'krajíce', 'krajíců'],
    plátek: ['plátek', 'plátky', 'plátků'],
    bageta: ['bageta', 'bagety', 'baget'],
    croissant: ['croissant', 'croissanty', 'croissantů'],
    jablko: ['jablko', 'jablka', 'jablek'],
    banán: ['banán', 'banány', 'banánů'],
    pomeranč: ['pomeranč', 'pomeranče', 'pomerančů'],
    hruška: ['hruška', 'hrušky', 'hrušek'],
    broskev: ['broskev', 'broskve', 'broskví'],
    meruňka: ['meruňka', 'meruňky', 'meruněk'],
    švestka: ['švestka', 'švestky', 'švestek'],
    kiwi: ['kiwi', 'kiwi', 'kiwi'],
    mango: ['mango', 'manga', 'mang'],
    mandarinka: ['mandarinka', 'mandarinky', 'mandarinek'],
    ks: ['ks', 'ks', 'ks'],
  };
  const f = map[singular] ?? [singular, singular, singular];
  if (n === 1) return f[0];
  if (n >= 2 && n < 5 && n % 1 === 0) return f[1];
  return f[2];
}

function ModeTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-semibold transition-all ${active ? 'bg-grad-coral text-white shadow-coral-soft' : 'text-ink-soft'}`}>
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-mute mb-2">{label}</span>
      {children}
    </label>
  );
}

function NumField({ label, unit, value, onChange, accent }: { label: string; unit: string; value: number; onChange: (v: number) => void; accent: string }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className={`text-sm font-semibold ${accent}`}>{label}</span>
      <div className="flex items-center gap-1.5">
        <input type="number" inputMode="decimal" min={0} value={value || ''} onChange={(e) => onChange(Number(e.target.value) || 0)} className="w-20 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-right tabular-nums text-ink text-sm font-bold focus:border-coral-500 outline-none" placeholder="0" />
        <span className="text-xs text-ink-mute w-7">{unit}</span>
      </div>
    </label>
  );
}

function MealTypePicker({ value, onChange }: { value: MealType; onChange: (v: MealType) => void }) {
  return (
    <div className="glass rounded-3xl p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-mute mb-3">Kdy jíš?</div>
      <div className="grid grid-cols-4 gap-1.5">
        {MEAL_TYPE_ORDER.map((t) => {
          const m = MEAL_TYPE_META[t];
          const active = value === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => { haptic('tap'); onChange(t); }}
              className={`relative rounded-2xl py-2.5 px-1 flex flex-col items-center gap-1 overflow-hidden transition-all ${
                active ? 'ring-1 ring-white/15 shadow-coral-soft' : 'bg-white/[0.04] border border-white/5'
              }`}
            >
              {active && <span className={`absolute inset-0 bg-gradient-to-br ${m.tint}`} />}
              <span className="relative text-xl leading-none">{m.icon}</span>
              <span className={`relative text-[10px] font-bold leading-none ${active ? 'text-white' : 'text-ink-soft'}`}>{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CornerBracket({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`absolute w-7 h-7 text-white/50 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9V5a2 2 0 0 1 2-2h4" />
    </svg>
  );
}

function ConfidenceBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  const map = {
    high: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Jistý odhad' },
    medium: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Přibližný' },
    low: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Nejistý' },
  };
  const s = map[level];
  return <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${s.bg} ${s.text}`}>{s.label}</span>;
}

function ScaledStats({ picked, grams }: { picked: FoodSearchResult; grams: number }) {
  const ratio = picked.per > 0 ? grams / picked.per : 1;
  const kcal = Math.round(picked.kcal * ratio);
  const p = +(picked.protein_g * ratio).toFixed(1);
  const c = +(picked.carbs_g * ratio).toFixed(1);
  const f = +(picked.fat_g * ratio).toFixed(1);
  return (
    <div className="mt-3 grid grid-cols-2 gap-3">
      <div className="bg-grad-coral rounded-3xl p-4 text-white shadow-coral-soft">
        <div className="text-[11px] opacity-90 uppercase tracking-wider font-bold">Kalorie</div>
        <div className="text-4xl font-extrabold tabular-nums mt-1 leading-none">{kcal}</div>
        <div className="text-xs opacity-90 mt-1">kcal</div>
      </div>
      <div className="grid grid-cols-1 gap-2">
        <MacroMini label="Bílkoviny" value={p} color="text-macro-protein" bg="bg-macro-protein/15" />
        <MacroMini label="Sacharidy" value={c} color="text-macro-carbs" bg="bg-macro-carbs/15" />
        <MacroMini label="Tuky" value={f} color="text-macro-fat" bg="bg-macro-fat/15" />
      </div>
    </div>
  );
}

function AiEstimateBlock({
  query,
  hasResults,
  loading,
  error,
  onEstimate,
}: {
  query: string;
  hasResults: boolean;
  loading: boolean;
  error: string;
  onEstimate: () => void;
}) {
  return (
    <div className={`${hasResults ? 'mt-4' : 'mt-2'} animate-fade-up`}>
      {!hasResults && (
        <div className="text-center py-6 text-ink-mute text-sm">
          Nic nenalezeno v databázi.
        </div>
      )}
      <button
        onClick={onEstimate}
        disabled={loading}
        className="w-full glass rounded-2xl p-3.5 flex items-center gap-3 active:scale-[0.99] transition-transform disabled:opacity-60"
      >
        <div className="w-10 h-10 rounded-xl bg-grad-coral flex items-center justify-center shrink-0 shadow-coral-soft">
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          )}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-bold text-ink truncate">
            {loading ? 'AI počítá…' : `Odhadnout pomocí AI: "${query}"`}
          </div>
          <div className="text-[11px] text-ink-mute">
            {loading ? 'může to trvat pár sekund' : 'Gemini odhadne kcal a makra na 100 g'}
          </div>
        </div>
        {!loading && (
          <svg className="text-ink-mute shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
        )}
      </button>
      {error && (
        <div className="mt-2 px-3 py-2.5 rounded-xl bg-red-500/15 text-red-300 text-xs flex items-start gap-2">
          <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          <span className="flex-1 leading-relaxed">{error}</span>
          <button
            onClick={onEstimate}
            className="text-coral-300 font-bold underline-offset-2 hover:underline shrink-0"
          >
            Zkusit znovu
          </button>
        </div>
      )}
    </div>
  );
}

function MacroMini({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`rounded-2xl px-3 py-1.5 flex items-center justify-between ${bg}`}>
      <span className="text-[11px] text-ink-soft font-medium">{label}</span>
      <span className={`font-bold tabular-nums text-sm ${color}`}>{value} g</span>
    </div>
  );
}
