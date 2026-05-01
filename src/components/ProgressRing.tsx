import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  target: number;
  size?: number;
  stroke?: number;
  label?: string;
  hint?: string;
}

function gradientFor(pct: number, over: boolean): { from: string; mid: string; to: string } {
  if (over)      return { from: '#fbbf24', mid: '#fb923c', to: '#ef4444' };
  if (pct < 0.6) return { from: '#fdba74', mid: '#fb7185', to: '#f43f5e' };
  if (pct < 0.9) return { from: '#fb7185', mid: '#fb923c', to: '#fbbf24' };
  return         { from: '#fbbf24', mid: '#a3e635', to: '#10b981' };
}

export default function ProgressRing({
  value,
  target,
  size = 220,
  stroke = 12,
  label,
  hint,
}: Props) {
  const r = (size - stroke) / 2 - 4;
  const c = 2 * Math.PI * r;
  const targetPct = target > 0 ? Math.min(1, value / target) : 0;
  const over = value > target;
  const grad = gradientFor(targetPct, over);

  // Single animated value drives arc, dot, and number in perfect sync
  const [animPct, setAnimPct] = useState(0);
  const prevPct = useRef(0);
  useEffect(() => {
    const from = prevPct.current;
    const to = targetPct;
    const start = performance.now();
    const duration = 1000;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimPct(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else prevPct.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetPct]);

  const offset = c * (1 - animPct);
  const displayValue = Math.round(animPct * target);
  const remaining = Math.max(0, Math.round(target - value));

  // Glowing dot at the tip of the arc
  const endAngle = -Math.PI / 2 + animPct * 2 * Math.PI;
  const dotX = size / 2 + r * Math.cos(endAngle);
  const dotY = size / 2 + r * Math.sin(endAngle);
  const showDot = animPct > 0.02 && animPct < 0.99;

  return (
    <>
    <div className="relative" style={{ width: size, height: size }}>
      {/* Ambient glow — single, soft */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none animate-ring-pulse"
        style={{
          background: `radial-gradient(circle at 50% 55%, ${grad.mid}55 0%, transparent 62%)`,
          filter: 'blur(28px)',
        }}
      />

      <svg width={size} height={size} className="relative" viewBox={`0 0 ${size} ${size}`}>
        <defs>
          {/* Arc gradient */}
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={grad.from} />
            <stop offset="50%" stopColor={grad.mid} />
            <stop offset="100%" stopColor={grad.to} />
          </linearGradient>
          {/* Arc glow */}
          <filter id="arcGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Dot glow */}
          <filter id="dotGlow" x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke} fill="none"
        />

        {/* Progress arc */}
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2} cy={size / 2} r={r}
            stroke="url(#ringGrad)"
            strokeWidth={stroke} fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            filter="url(#arcGlow)"
          />
        </g>

        {/* Glowing endpoint dot */}
        {showDot && (
          <>
            {/* outer halo */}
            <circle cx={dotX} cy={dotY} r={stroke / 2 + 4} fill={grad.to} opacity={0.25} />
            {/* core dot */}
            <circle cx={dotX} cy={dotY} r={stroke / 2 - 0.5} fill="#fff" filter="url(#dotGlow)" />
          </>
        )}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[9px] uppercase tracking-[0.3em] text-ink-mute font-bold mb-1">
          {label ?? 'kalorie'}
        </span>

        {/* Main number */}
        <span
          className="tabular-nums leading-none font-bold font-display text-white"
          style={{
            fontSize: size * 0.285,
            letterSpacing: '-0.02em',
          }}
        >
          {displayValue}
        </span>

        {/* "/ target kcal" secondary line */}
        <div className="flex items-center gap-1 mt-1.5">
          <span className="text-[11px] tabular-nums text-ink-mute">/ {target} kcal</span>
        </div>

        {/* Status pill */}
        <div
          className={`mt-2.5 px-3 py-1 rounded-full text-[10px] font-semibold tabular-nums ring-1 ${
            over
              ? 'bg-red-500/15 text-red-300 ring-red-500/20'
              : animPct >= 1
                ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/20'
                : 'bg-white/[0.06] text-ink-soft ring-white/10'
          }`}
        >
          {over
            ? `+${Math.round(value - target)} nad cíl`
            : animPct >= 1
              ? 'Cíl splněn 🎯'
              : `${remaining} kcal zbývá`}
        </div>
      </div>
    </div>

    {hint && (
      <p className="mt-3 text-[10px] text-ink-mute text-center leading-snug max-w-[220px] px-2">
        {hint}
      </p>
    )}
    </>
  );
}
