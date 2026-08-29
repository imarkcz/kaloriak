import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppState';
import { todayISO } from '../lib/date';
import { ACTIVITY_LABEL, estimateKcal } from '../lib/activityKcal';
import type { ActivityKind } from '../types';
import { haptic } from '../lib/haptics';
import Icon from '../components/Icon';

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
    addActivity({
      id: crypto.randomUUID(),
      date: todayISO(),
      createdAt: Date.now(),
      kind,
      name: kind === 'other' ? (customName.trim() || meta.label) : meta.label,
      minutes,
      kcal,
    });
    haptic('success');
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-dvh pt-safe pb-safe flex flex-col">
      <header className="max-w-md mx-auto w-full px-5 py-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="btn btn-ghost w-10 h-10 rounded-full" aria-label="Zpět">
          <Icon name="left" size={17} />
        </button>
        <h1 className="text-h3 font-semibold text-ink">Nová aktivita</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 pb-32 overflow-y-auto space-y-3.5">
        <div className="grid grid-cols-3 gap-2 reveal">
          {ORDER.map((k) => {
            const active = k === kind;
            return (
              <button
                key={k}
                onClick={() => { haptic('tap'); setKind(k); setKcalOverride(null); }}
                className="rounded-field py-3.5 text-sm font-medium transition-colors duration-200"
                style={active
                  ? { background: '#8f69e0', color: '#fff' }
                  : { background: '#1a181d', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {ACTIVITY_LABEL[k].label}
              </button>
            );
          })}
        </div>

        {kind === 'other' && (
          <div className="card p-4 reveal">
            <span className="block text-micro font-semibold uppercase tracking-label text-ink-mute mb-2">
              Název aktivity
            </span>
            <input
              className="field"
              placeholder="např. Tenis, lezení"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
          </div>
        )}

        <div className="card p-5 reveal" style={{ '--i': 1 } as React.CSSProperties}>
          <div className="flex justify-between items-baseline mb-3">
            <span className="text-micro font-semibold uppercase tracking-label text-ink-mute">Doba trvání</span>
            <span className="text-h2 font-semibold tabular-nums text-ink">
              {minutes}<span className="text-sm text-ink-mute font-normal ml-1">min</span>
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={240}
            step={5}
            value={minutes}
            onChange={(e) => { setMinutes(Number(e.target.value)); setKcalOverride(null); }}
            onWheel={(e) => e.currentTarget.blur()}
          />
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {[15, 30, 45, 60, 90].map((m) => (
              <button
                key={m}
                onClick={() => { haptic('tap'); setMinutes(m); setKcalOverride(null); }}
                className={`px-3 py-1.5 rounded-full text-micro font-medium transition-colors duration-200 ${
                  minutes === m ? 'bg-violet-500 text-white' : 'bg-surface-2 text-ink-soft border border-line'
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
        </div>

        <div className="card card-lit p-5 reveal relative overflow-hidden" style={{ '--i': 2 } as React.CSSProperties}>
          <div
            className="absolute rounded-full pointer-events-none"
            style={{ top: '-60%', left: '-10%', width: '70%', height: '160%', background: '#8f69e0', filter: 'blur(70px)', opacity: 0.3 }}
          />
          <div className="relative flex items-end justify-between gap-4">
            <div>
              <div className="text-micro font-semibold uppercase tracking-label text-ink-mute">Spáleno</div>
              <div className="text-hero font-semibold tabular-nums text-white leading-none mt-1.5">
                {kcal}<span className="text-base font-normal text-ink-mute ml-1.5">kcal</span>
              </div>
              <div className="text-micro text-ink-dim mt-2 tabular-nums">
                Odhad podle {weight} kg a {minutes} min
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
              className="field w-24 text-right tabular-nums shrink-0"
              style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', fontSize: '0.9375rem' }}
              aria-label="Vlastní počet kalorií"
            />
          </div>
        </div>
      </main>

      <div className="sticky bottom-0 inset-x-0 pb-safe pt-4 px-5"
           style={{ background: 'linear-gradient(to top, #0c0b0c 55%, transparent)' }}>
        <div className="max-w-md mx-auto">
          <button onClick={handleSave} disabled={kcal <= 0} className="btn btn-primary w-full py-4">
            Přidat aktivitu
          </button>
        </div>
      </div>
    </div>
  );
}
