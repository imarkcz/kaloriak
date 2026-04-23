import { useEffect, useState } from 'react';

interface Props {
  protein: number;
  carbs: number;
  fat: number;
  size?: number;
}

const COLORS = {
  protein: { from: '#fda4af', to: '#fb7185', glow: '#fb7185' },
  carbs:   { from: '#fde68a', to: '#fbbf24', glow: '#fbbf24' },
  fat:     { from: '#c4b5fd', to: '#a78bfa', glow: '#a78bfa' },
};

export default function MacroPie({ protein, carbs, fat, size = 120 }: Props) {
  const pKcal = protein * 4;
  const cKcal = carbs * 4;
  const fKcal = fat * 9;
  const total = pKcal + cKcal + fKcal;

  const segments = total > 0
    ? [
        { value: pKcal / total, c: COLORS.protein, key: 'p' },
        { value: cKcal / total, c: COLORS.carbs,   key: 'c' },
        { value: fKcal / total, c: COLORS.fat,     key: 'f' },
      ]
    : [];

  const stroke = Math.max(10, Math.round(size * 0.16));
  const r = (size - stroke) / 2 - 4;
  const c = 2 * Math.PI * r;

  // animation 0->1
  const [t, setT] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / duration);
      setT(1 - Math.pow(1 - k, 3));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [protein, carbs, fat]);

  let offset = 0;
  const cx = size / 2;
  const cy = size / 2;

  const protPct = total > 0 ? Math.round((pKcal / total) * 100) : 0;
  const dominantColor = total > 0
    ? (pKcal >= cKcal && pKcal >= fKcal ? COLORS.protein.glow
      : cKcal >= fKcal ? COLORS.carbs.glow
      : COLORS.fat.glow)
    : '#71717a';

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* Pulsing halo behind the pie */}
      {total > 0 && (
        <div
          className="absolute inset-0 rounded-full blur-2xl pointer-events-none animate-ring-pulse"
          style={{
            background: `radial-gradient(circle, ${dominantColor}80 0%, transparent 65%)`,
          }}
        />
      )}

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative -rotate-90">
        <defs>
          {segments.map((s) => (
            <linearGradient key={s.key} id={`pie-${s.key}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={s.c.from} />
              <stop offset="100%" stopColor={s.c.to} />
            </linearGradient>
          ))}
          <filter id="pieGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* base track */}
        <circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} fill="none" />

        {segments.map((s) => {
          const len = c * s.value * t;
          const dasharray = `${len} ${c - len}`;
          const dashoffset = -offset * t;
          offset += c * s.value;
          return (
            <circle
              key={s.key}
              cx={cx}
              cy={cy}
              r={r}
              stroke={`url(#pie-${s.key})`}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
              strokeLinecap="butt"
              filter="url(#pieGlow)"
            />
          );
        })}

        {/* inner glossy highlight */}
        <circle
          cx={cx}
          cy={cy}
          r={r - stroke / 2 - 2}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
          fill="none"
        />
      </svg>

      {total > 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[9px] uppercase tracking-[0.18em] text-ink-mute font-bold">protein</span>
          <span
            className="text-2xl font-extrabold tabular-nums leading-none mt-0.5"
            style={{
              backgroundImage: `linear-gradient(180deg, #fff 0%, ${COLORS.protein.glow} 130%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {protPct}<span className="text-sm">%</span>
          </span>
        </div>
      )}
    </div>
  );
}

export function MacroLegend({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const pKcal = protein * 4;
  const cKcal = carbs * 4;
  const fKcal = fat * 9;
  const total = pKcal + cKcal + fKcal;
  const items = [
    { name: 'Bílkoviny', value: protein, kcal: pKcal, color: COLORS.protein.glow },
    { name: 'Sacharidy', value: carbs,   kcal: cKcal, color: COLORS.carbs.glow },
    { name: 'Tuky',      value: fat,     kcal: fKcal, color: COLORS.fat.glow },
  ];
  return (
    <div className="space-y-2">
      {items.map((i) => {
        const pct = total > 0 ? Math.round((i.kcal / total) * 100) : 0;
        return (
          <div key={i.name} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: i.color, boxShadow: `0 0 6px ${i.color}` }}
              />
              <span className="text-sm text-ink-soft truncate">{i.name}</span>
            </div>
            <div className="flex items-baseline gap-1.5 shrink-0">
              <span className="font-semibold tabular-nums text-sm text-ink">{Math.round(i.value)} g</span>
              <span className="text-[10px] text-ink-mute tabular-nums w-7 text-right">{pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
