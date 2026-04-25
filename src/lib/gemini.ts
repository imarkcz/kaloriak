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

// Map raw AI errors to a short Czech message the UI can display directly.
// Provider-agnostic (works for Gemini/OpenAI/Claude fallback chain).
export function humanizeGeminiError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const m = raw.toLowerCase();
  if (m.includes('všechny ai') || m.includes('přetížené'))
    return 'AI je dočasně nedostupná. Zkus to za chvíli, nebo zadej hodnoty ručně.';
  if (m.includes('503') || m.includes('unavailable') || m.includes('overloaded') || m.includes('high demand'))
    return 'AI je momentálně přetížená. Zkus to za chvíli, nebo zadej hodnoty ručně.';
  if (m.includes('429') || m.includes('resource_exhausted') || m.includes('quota') || m.includes('rate limit'))
    return 'Denní limit AI je vyčerpaný. Zkus to za chvíli nebo zadej ručně.';
  if (m.includes('safety'))
    return 'AI odmítla odpovědět (safety filter). Zkus jiný název nebo zadej ručně.';
  if (m.includes('network') || m.includes('failed to fetch'))
    return 'Bez připojení k internetu. Zkontroluj síť a zkus znovu.';
  return 'AI odhad selhal. Zkus to znovu nebo zadej hodnoty ručně.';
}

async function callProxy(body: object): Promise<unknown> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Chyba serveru.');
  return json;
}

export async function estimateFoodFromName(_apiKey: string, name: string): Promise<FoodEstimate> {
  const q = name.trim();
  if (q.length < 2) throw new Error('Příliš krátký dotaz.');
  return await callWithRetry(() => callProxy({ type: 'name', name: q })) as FoodEstimate;
}

export async function analyzeFoodImage(_apiKey: string, imageBase64: string, mimeType: string): Promise<FoodAnalysis> {
  return await callWithRetry(() => callProxy({ type: 'image', imageBase64, mimeType })) as FoodAnalysis;
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
