import { GoogleGenAI, Type } from '@google/genai';

export interface FoodAnalysis {
  name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: 'low' | 'medium' | 'high';
  note?: string;
}

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: 'Krátký název jídla v češtině.' },
    grams: { type: Type.NUMBER, description: 'Odhadovaná hmotnost porce v gramech.' },
    kcal: { type: Type.NUMBER, description: 'Celkové kalorie porce.' },
    protein_g: { type: Type.NUMBER, description: 'Bílkoviny v gramech.' },
    carbs_g: { type: Type.NUMBER, description: 'Sacharidy v gramech.' },
    fat_g: { type: Type.NUMBER, description: 'Tuky v gramech.' },
    confidence: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
    note: { type: Type.STRING, description: 'Stručná poznámka k odhadu (volitelné).' },
  },
  required: ['name', 'grams', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'confidence'],
};

const PROMPT = `Jsi nutriční expert. Analyzuj jídlo na fotce a odhadni nutriční hodnoty celé porce, kterou vidíš.
Vrať jeden JSON objekt podle schématu. Odhad dělej realisticky — zohledni velikost porce podle běžných referenčních objektů (talíř ~27 cm, vidlička, ruka).
Pokud je jídel více, spoj je do jednoho záznamu s názvem např. "Kuřecí s rýží a salátem".
Hodnoty zaokrouhli: kcal na celé číslo, makra na 1 desetinné místo, gramy na celé číslo.
Confidence: high = jasně viditelné a odhadnutelné, medium = běžný odhad, low = velmi nejisté.`;

export interface FoodEstimate {
  name: string;
  defaultGrams: number;
  kcal: number;       // per 100 g
  protein_g: number;  // per 100 g
  carbs_g: number;    // per 100 g
  fat_g: number;      // per 100 g
  confidence: 'low' | 'medium' | 'high';
  note?: string;
}

const ESTIMATE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: 'Vyčištěný a normalizovaný český název jídla.' },
    defaultGrams: { type: Type.NUMBER, description: 'Typická velikost běžné porce v gramech.' },
    kcal: { type: Type.NUMBER, description: 'Kalorie na 100 g.' },
    protein_g: { type: Type.NUMBER, description: 'Bílkoviny v gramech na 100 g.' },
    carbs_g: { type: Type.NUMBER, description: 'Sacharidy v gramech na 100 g.' },
    fat_g: { type: Type.NUMBER, description: 'Tuky v gramech na 100 g.' },
    confidence: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
    note: { type: Type.STRING, description: 'Volitelná stručná poznámka (např. způsob přípravy).' },
  },
  required: ['name', 'defaultGrams', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'confidence'],
};

const ESTIMATE_PROMPT = `Jsi nutriční expert. Z názvu jídla v češtině odhadni typické nutriční hodnoty na 100 g.
Pravidla:
- Hodnoty vždy uvažuj per 100 g (nebo 100 ml u nápojů a tekutých jídel).
- defaultGrams = typická 1 porce (např. řízek 180, talíř polévky 300, jablko 180, kafe 200).
- Pokud způsob přípravy není jasný, předpokládej běžný (grilované, vařené, pečené).
- Vrať pouze JSON podle schématu, žádný extra text.
- Hodnoty zaokrouhli: kcal na celé číslo, makra na 1 desetinné místo, gramy na celé číslo.
- confidence: high = běžné českévé/světové jídlo, medium = méně časté ale jasné, low = nejednoznačné.`;

// Gemini occasionally returns 503 / 429 when overloaded — the call is idempotent
// so we retry a couple of times with exponential backoff before bubbling up.
async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
      const retryable =
        msg.includes('503') || msg.includes('429') ||
        msg.includes('unavailable') || msg.includes('overloaded') ||
        msg.includes('high demand') || msg.includes('resource_exhausted');
      if (!retryable || i === maxRetries) throw e;
      await new Promise((r) => setTimeout(r, 700 * Math.pow(2, i))); // 700ms, 1.4s
    }
  }
  throw lastError;
}

// Map raw Gemini errors (often a JSON dump) to a short Czech message the UI
// can display directly.
export function humanizeGeminiError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const m = raw.toLowerCase();
  if (m.includes('503') || m.includes('unavailable') || m.includes('overloaded') || m.includes('high demand'))
    return 'Gemini je momentálně přetížený. Zkus to za chvíli, nebo přidej hodnoty ručně.';
  if (m.includes('429') || m.includes('resource_exhausted') || m.includes('quota'))
    return 'Vyčerpaný limit Gemini klíče. Počkej minutu nebo použij jiný klíč.';
  if (m.includes('401') || m.includes('api key') || m.includes('permission_denied') || m.includes('invalid_argument'))
    return 'Neplatný Gemini API klíč. Otevři profil a zkontroluj ho.';
  if (m.includes('safety'))
    return 'AI odmítla odpovědět (safety filter). Zkus jiný název nebo zadej ručně.';
  if (m.includes('network') || m.includes('failed to fetch'))
    return 'Bez připojení k internetu. Zkontroluj síť a zkus znovu.';
  return 'AI odhad selhal. Zkus to znovu nebo zadej hodnoty ručně.';
}

export async function estimateFoodFromName(apiKey: string, name: string): Promise<FoodEstimate> {
  if (!apiKey) throw new Error('Chybí Gemini API klíč. Nastav ho v profilu.');
  const q = name.trim();
  if (q.length < 2) throw new Error('Příliš krátký dotaz.');

  const ai = new GoogleGenAI({ apiKey });
  const response = await callWithRetry(() =>
    ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: `${ESTIMATE_PROMPT}\n\nNázev jídla: "${q}"` }] }],
      config: { responseMimeType: 'application/json', responseSchema: ESTIMATE_SCHEMA },
    })
  );

  const text = response.text;
  if (!text) throw new Error('AI nevrátila žádnou odpověď.');
  return JSON.parse(text) as FoodEstimate;
}

export async function analyzeFoodImage(apiKey: string, imageBase64: string, mimeType: string): Promise<FoodAnalysis> {
  if (!apiKey) throw new Error('Chybí Gemini API klíč. Nastav ho v profilu.');

  const ai = new GoogleGenAI({ apiKey });

  const response = await callWithRetry(() =>
    ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: PROMPT },
            { inlineData: { mimeType, data: imageBase64 } },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: SCHEMA,
      },
    })
  );

  const text = response.text;
  if (!text) throw new Error('AI nevrátila žádnou odpověď.');

  const parsed = JSON.parse(text) as FoodAnalysis;
  return parsed;
}

export function fileToBase64(file: File): Promise<{ base64: string; mimeType: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [meta, base64] = dataUrl.split(',');
      const mimeMatch = meta.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : file.type || 'image/jpeg';
      resolve({ base64, mimeType, dataUrl });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function compressImage(file: File, maxSize = 1024, quality = 0.82): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
  if (!blob) return file;
  return new File([blob], 'meal.jpg', { type: 'image/jpeg' });
}
