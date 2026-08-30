// Explicit .ts so scripts/checks.ts can import this under plain node
// (--experimental-strip-types does not do extensionless resolution).
import { todayISO } from './date.ts';

/** The Gemini key runs on the free tier, which allows this many generate_content
 *  calls per day across photo analysis, name estimates, translations and the
 *  coach. Read off a live 429: `generate_content_free_tier_requests, limit: 20`. */
export const FREE_TIER_DAILY = 20;

const KEY = 'kaloriak:aiquota:v1';

interface QuotaState {
  day: string;
  used: number;
  /** Set once the server has actually reported the quota gone, which beats
   *  counting: the count is per device, the 429 is the truth for the key. */
  exhausted: boolean;
}

// ponytail: local tally, not the real server-side counter. It undercounts when
// the same account logs from a second device, and the free tier resets on
// Google's clock rather than local midnight — so the UI says "zhruba". Reading
// the true remaining count would need a call, which would itself cost one.
function read(): QuotaState {
  const fresh: QuotaState = { day: todayISO(), used: 0, exhausted: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh;
    const s = JSON.parse(raw) as QuotaState;
    return s.day === fresh.day ? s : fresh;
  } catch {
    return fresh;
  }
}

function write(s: QuotaState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage full */ }
}

export function noteAiCall() {
  const s = read();
  write({ ...s, used: s.used + 1 });
}

export function noteQuotaExhausted() {
  write({ ...read(), exhausted: true });
}

export interface AiQuota {
  used: number;
  remaining: number;
  exhausted: boolean;
}

export function aiQuota(): AiQuota {
  const s = read();
  return {
    used: s.used,
    remaining: s.exhausted ? 0 : Math.max(0, FREE_TIER_DAILY - s.used),
    exhausted: s.exhausted,
  };
}
