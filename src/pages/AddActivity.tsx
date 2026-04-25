import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppState';
import { todayISO } from '../lib/date';
import { ACTIVITY_LABEL, estimateKcal } from '../lib/activityKcal';
import type { ActivityKind } from '../types';
import { haptic } from '../lib/haptics';

const ORDER: ActivityKind[] = ['run', 'walk', 'bike', 'swim', 'gym', 'other'];

export default function AddActivity() {
  const { data, addActivity } = useApp();
  const navigate = useNavigate();
  const weight = data.profile?.weightKg ?? 75;

  const [kind, setKind] = useState<ActivityKind>('run');
  const [minutes, setMinutes] = useState(30);
  const [kcalOverride, setKcalOverride] = useState<number | null>(null);
  const [customName, setCustomName] = useState('');

  const estimated = useMemo(() => estimateKcal(kind, minutes, weight), [kind, minutes, weight]);
  const kcal = kcalOverride ?? estimated;
  const meta = ACTIVITY_LABEL[kind];

  function handleSave() {
    if (kcal <= 0) return;
    const name = kind === 'other' ? (customName.trim() || meta.label) : meta.label;
    addActivity({
      id: crypto.randomUUID(),
      date: todayISO(),
      createdAt: Date.now(),
      kind,
      name,
      minutes,
      kcal,
    });
    haptic('success');
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-dvh pt-safe pb-safe flex flex-col">
      <header className="max-w-md mx-auto w-full px-5 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full glass flex items-center justify-center text-ink active:scale-90 transition-transform"
          aria-label="Zpět"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-ink">Nová aktivita</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 pb-32 overflow-y-auto space-y-4">
        {/* Kind picker */}
        <div className="grid grid-cols-3 gap-2 animate-fade-up">
          {ORDER.map((k) => {
            const m = ACTIVITY_LABEL[k];
            const active = k === kind;
            return (
              <button
                key={k}
                onClick={() => { setKind(k); setKcalOverride(null); }}
                className={`relative rounded-2xl p-3 flex flex-col items-center gap-1 transition-all ${
                  active
                    ? 'ring-1 ring-white/15 shadow-coral-soft'
                    : 'glass'
                }`}
                style={
                  active
                    ? { backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))` }
                    : undefined
                }
              >
                {active && (
                  <span className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${m.tint} opacity-90`} />
                )}
                <span className="relative text-2xl leading-none">{m.icon}</span>
                <span className={`relative text-[11px] font-bold ${active ? 'text-white' : 'text-ink-soft'}`}>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Custom name only for 'other' */}
        {kind === 'other' && (
          <div className="glass rounded-3xl p-4 animate-fade-up">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-mute mb-2">Název aktivity</span>
            <input
              className="field"
              placeholder="např. Tenis, lezení…"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
          </div>
        )}

        {/* Minutes slider */}
        <div className="glass rounded-3xl p-5 animate-fade-up">
          <div className="flex justify-between items-baseline mb-3">
            <span className="text-sm font-medium text-ink">Doba trvání</span>
            <span className="text-base font-bold tabular-nums text-ink">
              {minutes} <span className="text-xs text-ink-mute font-medium">min</span>
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={240}
            step={5}
            value={minutes}
            onChange={(e) => { setMinutes(Number(e.target.value)); setKcalOverride(null); }}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-ink-mute mt-1 tabular-nums">
            <span>5 min</span>
            <span>4 h</span>
          </div>
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {[15, 30, 45, 60, 90].map((m) => (
              <button
                key={m}
                onClick={() => { setMinutes(m); setKcalOverride(null); }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  minutes === m ? 'bg-grad-coral text-white' : 'bg-white/5 text-ink-soft border border-white/5'
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
        </div>

        {/* Kcal estimate / override */}
        <div className={`relative rounded-3xl p-5 animate-fade-up overflow-hidden`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${meta.tint} opacity-90`} />
          <div className="absolute inset-0 bg-black/15" />
          <div className="relative flex items-end justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-bold text-white/85">Spáleno</div>
              <div className="text-5xl font-extrabold tabular-nums text-white leading-none mt-1">
                {kcal}
                <span className="text-base font-semibold text-white/85 ml-1">kcal</span>
              </div>
              <div className="text-[11px] text-white/80 mt-1">
                Odhad ({weight} kg • {minutes} min)
              </div>
            </div>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={5000}
              value={kcalOverride ?? ''}
              placeholder="ručně"
              onChange={(e) => {
                const v = Number(e.target.value);
                setKcalOverride(Number.isFinite(v) && v > 0 ? v : null);
              }}
              className="w-24 px-3 py-2 rounded-xl bg-white/20 backdrop-blur border border-white/30 text-right tabular-nums text-white font-bold placeholder:text-white/60 outline-none focus:bg-white/30"
            />
          </div>
        </div>
      </main>

      <div className="sticky bottom-0 inset-x-0 pb-safe pt-3 px-5 bg-gradient-to-t from-bg via-bg to-transparent">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleSave}
            disabled={kcal <= 0}
            className="w-full py-4 rounded-2xl font-semibold bg-grad-coral text-white shadow-coral-soft active:scale-[0.98] transition-transform disabled:opacity-40 disabled:shadow-none"
          >
            Přidat aktivitu
          </button>
        </div>
      </div>

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
    </div>
  );
}
