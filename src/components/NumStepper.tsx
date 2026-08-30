import { useEffect, useRef, useState } from 'react';
import { haptic } from '../lib/haptics';

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  bigStep?: number;
  unit?: string;
  // Optional preset chips below the stepper for quick jumps.
  presets?: number[];
  // Compact = no preset chips, smaller padding (good in dense forms).
  compact?: boolean;
}

// Touch-friendly numeric input with −/+ buttons. Tap the number to type
// directly via the OS keyboard. Long-press the −/+ buttons to step in
// larger increments (bigStep, default 10× step).
export default function NumStepper({
  value, onChange, min = 0, max = 9999, step = 5, bigStep, unit, presets, compact = false,
}: Props) {
  const big = bigStep ?? step * 10;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const holdTimer = useRef<number | null>(null);
  const repeatTimer = useRef<number | null>(null);

  useEffect(() => {
    if (editing) {
      setDraft(String(value));
      // tiny delay so iOS focuses reliably
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [editing, value]);

  function clamp(v: number) {
    if (Number.isNaN(v)) return min;
    return Math.max(min, Math.min(max, v));
  }

  function bump(delta: number) {
    haptic('tap');
    onChange(clamp(value + delta));
  }

  function startHold(delta: number) {
    // After 400 ms, auto-repeat at 80 ms with bigStep direction matching delta.
    holdTimer.current = window.setTimeout(() => {
      const d = delta > 0 ? big : -big;
      repeatTimer.current = window.setInterval(() => {
        onChange((v => clamp(v + d))(value));
      }, 90) as unknown as number;
    }, 400);
  }

  function endHold() {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
    if (repeatTimer.current) { clearInterval(repeatTimer.current); repeatTimer.current = null; }
  }

  function commit() {
    const n = parseFloat(draft.replace(',', '.'));
    onChange(clamp(Number.isFinite(n) ? n : value));
    setEditing(false);
  }

  return (
    <div className={`${compact ? 'space-y-2' : 'space-y-3'}`}>
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => bump(-step)}
          onPointerDown={() => startHold(-1)}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onPointerCancel={endHold}
          className={`${compact ? 'w-12' : 'w-14'} shrink-0 rounded-2xl bg-white/[0.04] ring-1 ring-white/10 text-ink active:scale-95 active:bg-white/[0.08] transition-all flex items-center justify-center`}
          aria-label="Snížit"
          disabled={value <= min}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14"/></svg>
        </button>

        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`flex-1 rounded-2xl bg-white/[0.04] ring-1 ring-white/10 text-center ${compact ? 'py-2.5' : 'py-3.5'} active:scale-[0.99] transition-transform`}
        >
          {editing ? (
            <input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
              className="w-full bg-transparent outline-none text-center text-2xl font-extrabold tabular-nums text-ink"
            />
          ) : (
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-2xl font-extrabold tabular-nums text-ink leading-none">
                {Number.isInteger(value) ? value : value.toFixed(1)}
              </span>
              {unit && <span className="text-[11px] text-ink-mute font-semibold">{unit}</span>}
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => bump(step)}
          onPointerDown={() => startHold(1)}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onPointerCancel={endHold}
          className={`${compact ? 'w-12' : 'w-14'} shrink-0 rounded-2xl bg-white/[0.04] ring-1 ring-white/10 text-ink active:scale-95 active:bg-white/[0.08] transition-all flex items-center justify-center`}
          aria-label="Zvýšit"
          disabled={value >= max}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>

      {presets && presets.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { haptic('tap'); onChange(clamp(p)); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                Math.round(value) === p ? 'bg-grad-coral text-white' : 'bg-white/5 text-ink-soft border border-white/5'
              }`}
            >
              {p}{unit ? ` ${unit}` : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
