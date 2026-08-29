import { useEffect, useRef, useState } from 'react';

interface Props {
  eaten: number;
  target: number;
  size?: number;
  stroke?: number;
}

// The ring answers "how much can I still have", not "how much have I eaten".
// Colour stays violet up to the target and turns amber past it — state, not
// decoration. The rotating highlight is a CSS-masked conic gradient, so there
// is no canvas and no per-frame JavaScript.
export default function ProgressRing({ eaten, target, size = 224, stroke = 10 }: Props) {
  const r = (size - stroke) / 2 - 4;
  const circumference = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, eaten / target) : 0;
  const over = eaten > target;
  const remaining = Math.round(target - eaten);

  // Animate the arc and the number together on change.
  const [t, setT] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 900);
      const eased = 1 - Math.pow(1 - k, 4);
      setT(a + (pct - a) * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = pct;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  const offset = circumference * (1 - t);
  const angle = -Math.PI / 2 + t * 2 * Math.PI;
  const dotX = size / 2 + r * Math.cos(angle);
  const dotY = size / 2 + r * Math.sin(angle);
  const showDot = t > 0.015 && t < 0.995;

  const arcFrom = over ? '#e8b45f' : '#b9a3ff';
  const arcTo = over ? '#f0765a' : '#8f69e0';
  const ringMask =
    `radial-gradient(farthest-side, transparent calc(100% - ${stroke + 1}px), #000 calc(100% - ${stroke + 1}px))`;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Ambient bloom behind the ring */}
      <div
        className="absolute rounded-full pointer-events-none animate-breathe"
        style={{
          inset: '8%',
          background: over ? '#e8b45f' : '#8f69e0',
          filter: 'blur(46px)',
          opacity: 0.42,
        }}
      />

      {/* Slow highlight travelling around the ring */}
      <div
        className="absolute rounded-full pointer-events-none animate-sweep"
        style={{
          inset: 4,
          background:
            'conic-gradient(from 0deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,0) 310deg, rgba(255,255,255,0.22) 350deg, rgba(255,255,255,0) 360deg)',
          WebkitMaskImage: ringMask,
          maskImage: ringMask,
        }}
      />

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative">
        <defs>
          <linearGradient id="ringArc" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={arcFrom} />
            <stop offset="100%" stopColor={arcTo} />
          </linearGradient>
          <filter id="ringGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none"
        />

        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2} cy={size / 2} r={r}
            stroke="url(#ringArc)" strokeWidth={stroke} fill="none" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            filter="url(#ringGlow)"
          />
        </g>

        {showDot && (
          <>
            <circle cx={dotX} cy={dotY} r={stroke / 2 + 5} fill={arcTo} opacity={0.28} />
            <circle cx={dotX} cy={dotY} r={stroke / 2 - 0.5} fill="#fff" />
          </>
        )}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-micro font-semibold uppercase tracking-label text-ink-mute">
          {over ? 'nad cíl' : 'zbývá'}
        </span>
        <span
          className="tabular-nums font-semibold text-white leading-none mt-1.5"
          style={{ fontSize: size * 0.27, letterSpacing: '-0.05em' }}
        >
          {Math.abs(remaining)}
        </span>
        <span className="text-sm text-ink-mute mt-1.5">kcal</span>
      </div>
    </div>
  );
}
