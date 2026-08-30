import { GoogleGenAI, Type } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    grams: { type: Type.NUMBER },
    kcal: { type: Type.NUMBER },
    protein_g: { type: Type.NUMBER },
    carbs_g: { type: Type.NUMBER },
    fat_g: { type: Type.NUMBER },
    portionDesc: { type: Type.STRING },
    servingsVisible: { type: Type.NUMBER },
    confidence: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
    note: { type: Type.STRING },
  },
  required: ['name', 'grams', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'confidence'],
};

const ESTIMATE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    defaultGrams: { type: Type.NUMBER },
    kcal: { type: Type.NUMBER },
    protein_g: { type: Type.NUMBER },
    carbs_g: { type: Type.NUMBER },
    fat_g: { type: Type.NUMBER },
    confidence: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
    note: { type: Type.STRING },
  },
  required: ['name', 'defaultGrams', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'confidence'],
};

const IMAGE_PROMPT = `Jsi nutriční expert. Na fotce je jídlo. Odhadni nutriční hodnoty JEDNÉ PORCE PRO JEDNOHO ČLOVĚKA.

NEJDŮLEŽITĚJŠÍ PRAVIDLO — kolik toho počítat:
- Vždy odhaduj jen to, co sní jeden člověk. Nikdy nesčítej celý stůl.
- Fotky z restaurací (hlavně asijských) často zachycují sdílené mísy nebo prostřený stůl pro víc lidí. V takovém případě odhadni JEDNU porci a do servingsVisible napiš, kolik porcí na fotce celkem vidíš.
- Když je na fotce jasně jeden talíř pro jednoho, servingsVisible = 1.
- Přílohy a omáčky, které k jídlu evidentně patří, do porce počítej. Cizí talíře, společné mísy navíc a věci mimo hlavní jídlo ne.

Odhad velikosti podle nádobí (použij jako kalibraci):
- mělký talíř Ø 26–28 cm, běžně naložený: 350–500 g
- hluboký talíř nebo miska polévky: 300–400 g
- velká asijská miska (pho, ramen, bun bo): 600–900 g včetně vývaru
- řízek nebo steak: 150–220 g samotného masa
- vařená rýže nebo nudle jako příloha: 150–250 g
- salát nebo zelenina jako příloha: 80–150 g
- sklenice nápoje: 200–330 ml

Kalorie u tekutin:
- Vývar má jen 5–15 kcal na 100 g. U polévek proto vyjde velká hmotnost, ale málo kalorií. Nepřepočítávej kalorie podle celkové hmotnosti.

Formát odpovědi:
- Odpovídej vždy česky, i u cizích jídel. Zavedený původní název dej do závorky, např. "Grilované vepřové s nudlemi (bún chả)".
- portionDesc = porce lidskou mírou, např. "1 hluboká miska", "1 talíř", "1 řízek s bramborem".
- Když je jídel na talíři víc, spoj je do jednoho záznamu, např. "Kuřecí s rýží a salátem".
- Hodnoty zaokrouhli: kcal a gramy na celé číslo, makra na 1 desetinné místo.
- confidence: high = jasně viditelná porce známého jídla, medium = běžný odhad, low = špatně viditelné nebo neznámé jídlo.\`;

const NAME_PROMPT = `Jsi nutriční expert. Z názvu jídla v češtině odhadni typické nutriční hodnoty na 100 g.
Pravidla:
- Hodnoty vždy uvažuj per 100 g (nebo 100 ml u nápojů a tekutých jídel).
- defaultGrams = typická 1 porce (např. řízek 180, talíř polévky 300, jablko 180, kafe 200).
- Pokud způsob přípravy není jasný, předpokládej běžný (grilované, vařené, pečené).
- Vrať pouze JSON podle schématu, žádný extra text.
- Hodnoty zaokrouhli: kcal na celé číslo, makra na 1 desetinné místo, gramy na celé číslo.
- confidence: high = běžné české/světové jídlo, medium = méně časté ale jasné, low = nejednoznačné.`;

// JSON schemas in plain text for OpenAI/Anthropic (they don't take Type enums)
const NAME_JSON_SHAPE = `{"name":string,"defaultGrams":number,"kcal":number,"protein_g":number,"carbs_g":number,"fat_g":number,"confidence":"low"|"medium"|"high","note"?:string}`;
const IMAGE_JSON_SHAPE = `{"name":string,"grams":number,"kcal":number,"protein_g":number,"carbs_g":number,"fat_g":number,"portionDesc":string,"servingsVisible":number,"confidence":"low"|"medium"|"high","note"?:string}`;

type ProviderResult = unknown;

// === FEEDBACK ===

interface FeedbackContext {
  hour: number;
  goal: string;
  sex: 'male' | 'female';
  kcal: { eaten: number; target: number };
  protein: { eaten: number; target: number };
  carbs: { eaten: number; target: number };
  fat: { eaten: number; target: number };
  meals: string[];
}

const FEEDBACK_SYSTEM = `Jsi přátelský nutriční kouč aplikace Kaloriak. Píšeš spisovnou, gramaticky správnou češtinou.

PRAVIDLA (DŮLEŽITÉ — porušení znamená nevalidní odpověď):
1. Odpověz POUZE česky. Nepoužívej anglická ani jiná cizí slova (kromě zavedených: "fitness", "kcal").
2. Pohlaví uživatele je uvedeno v promptu. Skloňuj DŮSLEDNĚ podle něj v celé odpovědi:
   - muž: "ty jsi udělal", "byl jsi", "měl jsi", "snědl jsi", "mohl bys"
   - žena: "ty jsi udělala", "byla jsi", "měla jsi", "snědla jsi", "mohla bys"
3. NIKDY nemíchej rody v jedné větě.
4. Používej jen běžnou českou slovní zásobu — žádné novotvary, žádná vymyšlená slova.
5. Kontroluj diakritiku (čárky, háčky) na všech slovech.
6. Délka: 1–2 věty, maximálně 30 slov.
7. Nezačínej slovy "Skvěle!", "Výborně!", "Bravo!".
8. Holý text — žádný markdown, žádné emoji, žádné odrážky.

Příklady správné odpovědi (muž): "Jsi v pohodě na cíli, jen ti chybí trochu bílkovin — přidej k večeři tvaroh nebo vejce." / "Snědl jsi dnes hodně sacharidů — zkus k snídani místo pečiva ovesnou kaši s vejci."
Příklady správné odpovědi (žena): "Jsi v pohodě na cíli, jen ti chybí trochu bílkovin — přidej k večeři tvaroh nebo vejce." / "Snědla jsi dnes hodně sacharidů — zkus k snídani místo pečiva ovesnou kaši s vejci."`;

// Naïve regex check: catches obvious English/markdown leaks. If the model
// produces a malformed response, the next provider in the fallback chain
// gets a chance instead of shipping garbage to the user.
function feedbackLooksValid(s: string): boolean {
  if (!s || s.length < 10) return false;
  if (s.length > 280) return false;
  if (/[*_#`]/.test(s)) return false; // markdown
  // English giveaways
  if (/\b(you|your|the|with|and|for|today|great|good|nice|keep|going|protein|carbs|fats|meal|breakfast|lunch|dinner|snack|need|should|could|would|have|been|done)\b/i.test(s)) return false;
  return true;
}

function buildFeedbackPrompt(ctx: FeedbackContext): string {
  const goalCz = ctx.goal === 'lose' ? 'hubnutí' : ctx.goal === 'gain' ? 'nabírání svalů' : 'udržování váhy';
  const rem = ctx.kcal.target - ctx.kcal.eaten;
  const remStr = rem >= 0 ? `${rem} kcal zbývá` : `${Math.abs(rem)} kcal přes cíl`;
  const timeLabel = ctx.hour < 11 ? 'ráno' : ctx.hour < 15 ? 'dopoledne' : ctx.hour < 18 ? 'odpoledne' : ctx.hour < 21 ? 'večer' : 'pozdě večer';
  const sexLabel = ctx.sex === 'male' ? 'muž (skloňuj mužsky, např. "udělal jsi", "byl jsi")' : 'žena (skloňuj žensky, např. "udělala jsi", "byla jsi")';
  return `Pohlaví uživatele: ${sexLabel}\nČas: ${timeLabel} (${ctx.hour}:00)\nCíl: ${goalCz}\nKalorie: ${ctx.kcal.eaten}/${ctx.kcal.target} kcal (${remStr})\nBílkoviny: ${ctx.protein.eaten}/${ctx.protein.target} g\nSacharidy: ${ctx.carbs.eaten}/${ctx.carbs.target} g\nTuky: ${ctx.fat.eaten}/${ctx.fat.target} g\nDnešní jídla: ${ctx.meals.length ? ctx.meals.join(', ') : 'žádná'}`;
}

async function geminiFeedback(ctx: FeedbackContext): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: `${FEEDBACK_SYSTEM}\n\n${buildFeedbackPrompt(ctx)}` }] }],
  });
  return (res.text ?? '').trim();
}

async function groqFeedback(ctx: FeedbackContext): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');
  const client = new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' });
  const res = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 120,
    messages: [{ role: 'system', content: FEEDBACK_SYSTEM }, { role: 'user', content: buildFeedbackPrompt(ctx) }],
  });
  return (res.choices[0]?.message?.content ?? '').trim();
}

async function openAIFeedback(ctx: FeedbackContext): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
  const client = new OpenAI({ apiKey });
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 120,
    messages: [{ role: 'system', content: FEEDBACK_SYSTEM }, { role: 'user', content: buildFeedbackPrompt(ctx) }],
  });
  return (res.choices[0]?.message?.content ?? '').trim();
}

async function claudeFeedback(ctx: FeedbackContext): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 120,
    system: FEEDBACK_SYSTEM,
    messages: [{ role: 'user', content: buildFeedbackPrompt(ctx) }],
  });
  return (res.content.find((b) => b.type === 'text')?.text ?? '').trim();
}

async function feedbackWithFallback(ctx: FeedbackContext): Promise<string> {
  // Gemini and Claude handle Czech grammar significantly better than Llama/4o-mini,
  // so we put them at the top. Groq/OpenAI remain as fallback if quota hits.
  const providers = [
    { name: 'gemini', fn: () => geminiFeedback(ctx) },
    { name: 'claude', fn: () => claudeFeedback(ctx) },
    { name: 'openai', fn: () => openAIFeedback(ctx) },
    { name: 'groq',   fn: () => groqFeedback(ctx)   },
  ];
  const errors: string[] = [];
  for (const p of providers) {
    try {
      const text = await p.fn();
      if (!feedbackLooksValid(text)) {
        errors.push(`${p.name}: invalid response: ${text.substring(0, 60)}`);
        continue; // try next provider
      }
      return text;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${p.name}: ${msg.substring(0, 80)}`);
      if (isQuotaError(e) || msg.includes('not configured')) continue;
      throw e;
    }
  }
  throw new Error(`Všechny AI služby přetížené: ${errors.join(' | ')}`);
}

function isQuotaError(e: unknown): boolean {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted')
    || msg.includes('503') || msg.includes('overloaded') || msg.includes('unavailable')
    || msg.includes('rate limit') || msg.includes('500');
}

// === GEMINI ===
async function geminiCall(type: 'name' | 'image', input: { name?: string; imageBase64?: string; mimeType?: string }): Promise<ProviderResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
  const ai = new GoogleGenAI({ apiKey });

  if (type === 'name') {
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: `${NAME_PROMPT}\n\nNázev jídla: "${input.name}"` }] }],
      config: { responseMimeType: 'application/json', responseSchema: ESTIMATE_SCHEMA },
    });
    return JSON.parse(res.text ?? '{}');
  }

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{
      role: 'user',
      parts: [{ text: IMAGE_PROMPT }, { inlineData: { mimeType: input.mimeType!, data: input.imageBase64! } }],
    }],
    config: { responseMimeType: 'application/json', responseSchema: SCHEMA },
  });
  return JSON.parse(res.text ?? '{}');
}

// === OPENAI ===
async function openaiCall(type: 'name' | 'image', input: { name?: string; imageBase64?: string; mimeType?: string }): Promise<ProviderResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
  const client = new OpenAI({ apiKey });

  if (type === 'name') {
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `${NAME_PROMPT}\nVrať JSON podle tvaru: ${NAME_JSON_SHAPE}` },
        { role: 'user', content: `Název jídla: "${input.name}"` },
      ],
    });
    return JSON.parse(res.choices[0]?.message?.content ?? '{}');
  }

  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: `${IMAGE_PROMPT}\nVrať JSON podle tvaru: ${IMAGE_JSON_SHAPE}` },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyzuj toto jídlo:' },
          { type: 'image_url', image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}` } },
        ],
      },
    ],
  });
  return JSON.parse(res.choices[0]?.message?.content ?? '{}');
}

// === GROQ ===
async function groqCall(type: 'name' | 'image', input: { name?: string; imageBase64?: string; mimeType?: string }): Promise<ProviderResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');
  const client = new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' });

  if (type === 'name') {
    const res = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `${NAME_PROMPT}\nVrať JSON podle tvaru: ${NAME_JSON_SHAPE}` },
        { role: 'user', content: `Název jídla: "${input.name}"` },
      ],
    });
    return JSON.parse(res.choices[0]?.message?.content ?? '{}');
  }

  const res = await client.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: `${IMAGE_PROMPT}\nVrať JSON podle tvaru: ${IMAGE_JSON_SHAPE}` },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyzuj toto jídlo:' },
          { type: 'image_url', image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}` } },
        ],
      },
    ],
  });
  return JSON.parse(res.choices[0]?.message?.content ?? '{}');
}

// === ANTHROPIC ===
async function claudeCall(type: 'name' | 'image', input: { name?: string; imageBase64?: string; mimeType?: string }): Promise<ProviderResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
  const client = new Anthropic({ apiKey });

  if (type === 'name') {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: `${NAME_PROMPT}\nVrať POUZE valid JSON podle tvaru: ${NAME_JSON_SHAPE}. Žádný markdown, žádný komentář.`,
      messages: [{ role: 'user', content: `Název jídla: "${input.name}"` }],
    });
    const text = res.content.find((b) => b.type === 'text')?.text ?? '{}';
    return JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''));
  }

  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: `${IMAGE_PROMPT}\nVrať POUZE valid JSON podle tvaru: ${IMAGE_JSON_SHAPE}. Žádný markdown, žádný komentář.`,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: input.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: input.imageBase64! } },
        { type: 'text', text: 'Analyzuj toto jídlo.' },
      ],
    }],
  });
  const text = res.content.find((b) => b.type === 'text')?.text ?? '{}';
  return JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''));
}

// === TRANSLATE ===
// Translates a foreign-language food product name to natural Czech.
// Used when an Open Food Facts result lacks a Czech name field — we don't
// want "Chocolate Milk Pudding" appearing in a Czech meal log.
const TRANSLATE_SYSTEM = `Přelož název potraviny do češtiny. Zachovej značku (např. "Milka", "Lidl", "Pilos"). Zbytek (popis produktu) přelož do běžné češtiny. Vrať POUZE přeložený název, žádný komentář, žádné uvozovky, max 60 znaků.

Příklady:
"Milka Chocolate Milk" → "Milka mléčná čokoláda"
"Pilos Greek Yogurt 10%" → "Pilos řecký jogurt 10%"
"Chef Select Crispy Chicken" → "Chef Select křupavé kuře"
"Naturalny jogurt grecki" → "Přírodní řecký jogurt"
"Vollmilch 3,5%" → "Plnotučné mléko 3,5 %"`;

async function geminiTranslate(name: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: `${TRANSLATE_SYSTEM}\n\nNázev: "${name}"` }] }],
  });
  return (res.text ?? '').trim().replace(/^["']|["']$/g, '');
}

async function claudeTranslate(name: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 80,
    system: TRANSLATE_SYSTEM,
    messages: [{ role: 'user', content: `Název: "${name}"` }],
  });
  return (res.content.find((b) => b.type === 'text')?.text ?? '').trim().replace(/^["']|["']$/g, '');
}

async function openAITranslate(name: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
  const client = new OpenAI({ apiKey });
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 80,
    messages: [{ role: 'system', content: TRANSLATE_SYSTEM }, { role: 'user', content: `Název: "${name}"` }],
  });
  return (res.choices[0]?.message?.content ?? '').trim().replace(/^["']|["']$/g, '');
}

async function translateWithFallback(name: string): Promise<string> {
  const providers = [
    { name: 'gemini', fn: () => geminiTranslate(name) },
    { name: 'claude', fn: () => claudeTranslate(name) },
    { name: 'openai', fn: () => openAITranslate(name) },
  ];
  for (const p of providers) {
    try {
      const text = await p.fn();
      if (text && text.length >= 2 && text.length <= 80) return text;
    } catch (e) {
      if (isQuotaError(e) || (e instanceof Error && e.message.includes('not configured'))) continue;
      throw e;
    }
  }
  throw new Error('Překlad selhal — všechny služby přetížené.');
}

// Fallback chain — try each provider in order, skip on quota errors
const PROVIDERS = [
  { name: 'gemini', call: geminiCall },
  { name: 'groq',   call: groqCall   },
  { name: 'openai', call: openaiCall },
  { name: 'claude', call: claudeCall },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, name, imageBase64, mimeType } = req.body ?? {};
  if (type !== 'name' && type !== 'image' && type !== 'feedback' && type !== 'translate') {
    return res.status(400).json({ error: 'Neznámý typ požadavku.' });
  }

  if (type === 'feedback') {
    try {
      const text = await feedbackWithFallback(req.body as FeedbackContext);
      return res.status(200).json({ feedback: text });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(503).json({ error: msg });
    }
  }

  if (type === 'translate') {
    if (!name) return res.status(400).json({ error: 'Chybí název pro překlad.' });
    try {
      const text = await translateWithFallback(name);
      return res.status(200).json({ translated: text });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(503).json({ error: msg });
    }
  }

  if (type === 'name' && !name) return res.status(400).json({ error: 'Chybí název jídla.' });
  if (type === 'image' && (!imageBase64 || !mimeType)) {
    return res.status(400).json({ error: 'Chybí obrázek.' });
  }

  const errors: string[] = [];
  for (const p of PROVIDERS) {
    try {
      const result = await p.call(type, { name, imageBase64, mimeType });
      return res.status(200).json(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${p.name}: ${msg.substring(0, 120)}`);
      // Skip to next provider if quota/overload, also if API key missing
      if (isQuotaError(e) || msg.includes('not configured')) continue;
      // Other errors (validation, safety) — fail immediately
      return res.status(500).json({ error: msg, providersTried: errors });
    }
  }
  return res.status(503).json({ error: 'Všechny AI služby jsou momentálně přetížené. Zkus to za chvíli.', providersTried: errors });
}
