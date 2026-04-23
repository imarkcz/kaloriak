import { GoogleGenAI, Type } from '@google/genai';

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    grams: { type: Type.NUMBER },
    kcal: { type: Type.NUMBER },
    protein_g: { type: Type.NUMBER },
    carbs_g: { type: Type.NUMBER },
    fat_g: { type: Type.NUMBER },
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

const IMAGE_PROMPT = `Jsi nutriční expert. Analyzuj jídlo na fotce a odhadni nutriční hodnoty celé porce, kterou vidíš.
Vrať jeden JSON objekt podle schématu. Odhad dělej realisticky — zohledni velikost porce podle běžných referenčních objektů (talíř ~27 cm, vidlička, ruka).
Pokud je jídel více, spoj je do jednoho záznamu s názvem např. "Kuřecí s rýží a salátem".
Hodnoty zaokrouhli: kcal na celé číslo, makra na 1 desetinné místo, gramy na celé číslo.
Confidence: high = jasně viditelné a odhadnutelné, medium = běžný odhad, low = velmi nejisté.`;

const NAME_PROMPT = `Jsi nutriční expert. Z názvu jídla v češtině odhadni typické nutriční hodnoty na 100 g.
Pravidla:
- Hodnoty vždy uvažuj per 100 g (nebo 100 ml u nápojů a tekutých jídel).
- defaultGrams = typická 1 porce (např. řízek 180, talíř polévky 300, jablko 180, kafe 200).
- Pokud způsob přípravy není jasný, předpokládej běžný (grilované, vařené, pečené).
- Vrať pouze JSON podle schématu, žádný extra text.
- Hodnoty zaokrouhli: kcal na celé číslo, makra na 1 desetinné místo, gramy na celé číslo.
- confidence: high = běžné české/světové jídlo, medium = méně časté ale jasné, low = nejednoznačné.`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Gemini API klíč není nastaven na serveru.' });

  const { type, name, imageBase64, mimeType } = req.body ?? {};
  const ai = new GoogleGenAI({ apiKey });

  try {
    if (type === 'name') {
      if (!name) return res.status(400).json({ error: 'Chybí název jídla.' });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: `${NAME_PROMPT}\n\nNázev jídla: "${name}"` }] }],
        config: { responseMimeType: 'application/json', responseSchema: ESTIMATE_SCHEMA },
      });
      return res.status(200).json(JSON.parse(response.text ?? '{}'));
    }

    if (type === 'image') {
      if (!imageBase64 || !mimeType) return res.status(400).json({ error: 'Chybí obrázek.' });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{
          role: 'user',
          parts: [{ text: IMAGE_PROMPT }, { inlineData: { mimeType, data: imageBase64 } }],
        }],
        config: { responseMimeType: 'application/json', responseSchema: SCHEMA },
      });
      return res.status(200).json(JSON.parse(response.text ?? '{}'));
    }

    return res.status(400).json({ error: 'Neznámý typ požadavku.' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }
}
