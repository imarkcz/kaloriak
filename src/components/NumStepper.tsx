import { useEffect, useRef, useState } from 'react';
import { haptic } from '../lib/haptics';
import Icon from './Icon';

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  bigStep?: number;
  unit?: string;
  presets?: number[];
  compact?: boolean;
}

// Touch-friendly numeric input. Tap the number to type on the OS keyboard,
// hold −/+ to auto-repeat in bigger increments.
export default function NumStepper({
  value, onChange, min = 0, max = 9999, step = 5, bigStep, unit, presets, compact = false,
}: Props) {
  const big = bigStep ?? step * 10;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const holdTimer = useRef<number | null>(null);
  const repeatTimer = useRef<number | null>(null);
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  useEffect(() => {
    if (!editing) return;
    setDraft(String(valueRef.current));
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [editing]);

  function clamp(v: number) {
    return Number.isNaN(v) ? min : Math.max(min, Math.min(max, v));
  }

  function bump(delta: number) {
    haptic('tap');
    onChange(clamp(valueRef.current + delta));
  }

  function startHold(dir: number) {
    holdTimer.current = window.setTimeout(() => {
      const d = dir > 0 ? big : -big;
      repeatTimer.current = window.setInterval(() => {
        onChange(clamp(valueRef.current + d));
      }, 90) as unknown as number;
    }, 400);
  }

  function endHold() {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
    if (repeatTimer.current) { clearInterval(repeatTimer.current); repeatTimer.current = null; }
  }

  function commit() {
    const n = parseFloat(draft.replace(',', '.'));
    onChange(clamp(Number.isFinite(n) ? n : valueRef.current));
    setEditing(false);
  }

  const sideBtn = `${compact ? 'w-12' : 'w-14'} shrink-0 btn btn-ghost`;

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => bump(-step)}
          onPointerDown={() => startHold(-1)}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onPointerCancel={endHold}
          className={sideBtn}
          aria-label="Snížit"
          disabled={value <= min}
        >
          <Icon name="minus" size={18} strokeWidth={2.25} />
        </button>

        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`flex-1 rounded-field bg-surface-2 text-center ${compact ? 'py-2.5' : 'py-3.5'} transition-transform duration-200 active:scale-[0.99]`}
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
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
              className="w-full bg-transparent outline-none text-center text-h1 font-semibold tabular-nums text-ink"
            />
          ) : (
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-h1 font-semibold tabular-nums text-ink leading-none">
                {Number.isInteger(value) ? value : value.toFixed(1)}
              </span>
              {unit && <span className="text-micro text-ink-mute font-medium">{unit}</span>}
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
          className={sideBtn}
          aria-label="Zvýšit"
          disabled={value >= max}
        >
          <Icon name="plus" size={18} strokeWidth={2.25} />
        </button>
      </div>

      {presets && presets.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { haptic('tap'); onChange(clamp(p)); }}
              className={`px-3 py-1.5 rounded-full text-micro font-medium transition-colors duration-200 ${
                Math.round(value) === p
                  ? 'bg-violet-500 text-white'
                  : 'bg-surface-2 text-ink-soft border border-line'
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
