import { useEffect, useState } from 'react';

interface Props {
  value: number;
  target: number;
  size?: number;
  stroke?: number;
  label?: string;
  hint?: string;
}

// Pick gradient stops based on how much of the target is consumed.
// 0–60% = coral/peach, 60–90% = coral→amber, 90–100% = amber→emerald,
// >100% = amber→red (over).
function gradientFor(pct: number, over: boolean): { from: string; via: string; to: string } {
  if (over) return { from: '#fbbf24', via: '#fb923c', to: '#ef4444' };
  if (pct < 0.6) return { from: '#fdba74', via: '#fb7185', to: '#f43f5e' };
  if (pct < 0.9) return { from: '#fb7185', via: '#fb923c', to: '#fbbf24' };
  return { from: '#fbbf24', via: '#a3e635', to: '#10b981' };
}

export default function ProgressRing({
  value,
  target,
  size = 220,
  stroke = 14,
  label,
  hint,
}: Props) {
  const r = (size - stroke) / 2 - 6; // leave room for tick ring
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const offset = c * (1 - pct);
  const remaining = Math.max(0, Math.round(target - value));
  const over = value > target;
  const grad = gradientFor(pct, over);

  // outer decorative tick ring
  const rTicks = (size - stroke) / 2;
  const cTicks = 2 * Math.PI * rTicks;
  // inner halo ring
  const rHalo = r - stroke / 2 - 6;

  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const from = displayValue;
    const to = Math.round(value);
    const duration = 900;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayValue(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Orbital particles & embers — pure decorative, no measurement
  const particles = [
    { r: r + stroke / 2 + 4, color: grad.from, size: 4, anim: 'animate-orbit-1' },
    { r: r + stroke / 2 + 4, color: grad.via,  size: 3, anim: 'animate-orbit-2' },
    { r: r - stroke,         color: grad.to,   size: 2.5, anim: 'animate-orbit-3' },
    { r: rTicks + 8,         color: grad.via,  size: 2,  anim: 'animate-orbit-2' },
  ];
  const embers = Array.from({ length: 6 }, (_, i) => ({
    delay: `${i * 0.45}s`,
    left: `${30 + i * 8}%`,
    drift: `${(i % 2 === 0 ? 1 : -1) * (8 + i * 2)}px`,
    color: i % 2 === 0 ? grad.from : grad.via,
  }));

  return (
    <>
    <div className="relative" style={{ width: size, height: size }}>
      {/* Slow rotating conic halo (holographic vibe) */}
      <div
        className="absolute inset-0 rounded-full blur-2xl pointer-events-none opacity-50 animate-ring-halo"
        style={{
          background: `conic-gradient(from 0deg, ${grad.from}00, ${grad.via}80, ${grad.to}40, ${grad.from}00 60%, ${grad.from}00)`,
        }}
      />
      {/* Pulsing aurora glow behind the ring */}
      <div
        className="absolute inset-0 rounded-full blur-3xl pointer-events-none animate-ring-pulse"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${grad.via}cc 0%, ${grad.from}66 35%, transparent 70%)`,
        }}
      />

      <svg width={size} height={size} className="relative" viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={grad.from} />
            <stop offset="55%" stopColor={grad.via} />
            <stop offset="100%" stopColor={grad.to} />
          </linearGradient>
          <linearGradient id="ringShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="50%" stopColor="white" stopOpacity="0.85" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <filter id="ringGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* outer ticks */}
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={rTicks}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={2}
            fill="none"
            strokeDasharray={`1 ${(cTicks / 60 - 1).toFixed(3)}`}
            strokeLinecap="round"
          />
        </g>

        {/* main track + progress (rotated so progress starts at 12 o'clock) */}
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="url(#ringGrad)"
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            filter="url(#ringGlow)"
            style={{ transition: 'stroke-dashoffset 1100ms cubic-bezier(.2,.8,.2,1)' }}
          />
          {/* Rotating shimmer dot riding the arc */}
          {pct > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke="url(#ringShimmer)"
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${c * 0.04} ${c * 0.96}`}
              className="animate-ring-shimmer"
              style={{ transformOrigin: '50% 50%' }}
            />
          )}
        </g>

        {/* inner halo ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={rHalo}
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={1}
          fill="none"
        />
      </svg>

      {/* Orbital particles riding around the ring */}
      <div className="absolute inset-0 pointer-events-none" style={{ perspective: '600px' }}>
        {particles.map((p, i) => (
          <span
            key={i}
            className={`absolute top-1/2 left-1/2 rounded-full ${p.anim}`}
            style={{
              width: p.size, height: p.size,
              marginLeft: -p.size / 2, marginTop: -p.size / 2,
              background: p.color,
              boxShadow: `0 0 8px ${p.color}, 0 0 16px ${p.color}90`,
              ['--orbit-r' as string]: `${p.r}px`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Bottom embers drifting upward */}
      <div className="absolute inset-x-0 bottom-2 h-24 pointer-events-none overflow-visible">
        {embers.map((e, i) => (
          <span
            key={i}
            className="absolute bottom-0 w-1 h-1 rounded-full animate-ember"
            style={{
              left: e.left,
              background: e.color,
              boxShadow: `0 0 6px ${e.color}, 0 0 12px ${e.color}80`,
              animationDelay: e.delay,
              ['--ember-x' as string]: e.drift,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] uppercase tracking-[0.22em] text-ink-mute font-bold">
          {label ?? 'kalorie'}
        </span>
        <span
          className="text-[56px] font-extrabold tabular-nums mt-1 leading-none"
          style={{
            backgroundImage: `linear-gradient(180deg, #ffffff 0%, ${grad.via} 130%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {displayValue}
        </span>
        <span
          className={`text-[11px] mt-2 font-semibold tabular-nums px-3 py-1 rounded-full ring-1 ${
            over
              ? 'bg-red-500/15 text-red-300 ring-red-500/20'
              : 'bg-white/5 text-ink-soft ring-white/10'
          }`}
        >
          {over ? `+${Math.round(value - target)} nad cíl` : `${remaining} zbývá`}
        </span>
      </div>
    </div>
    {hint && (
      <span className="mt-3 px-3 py-1 rounded-full bg-white/[0.06] text-ink-mute ring-1 ring-white/8 text-[10px] font-medium text-center leading-tight max-w-[240px]">
        {hint}
      </span>
    )}
    </>
  );
}
