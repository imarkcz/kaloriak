import { useEffect, useState } from 'react';

interface Props {
  ml: number;
  goalMl: number;
  servingMl?: number;
  onAdd: (ml: number) => void;
  onRemove: (ml: number) => void;
}

const GLASS_PATH = 'M 25 10 L 22 128 Q 22 136 30 136 L 70 136 Q 78 136 78 128 L 75 10 Z';

export default function WaterTracker({
  ml,
  goalMl,
  servingMl = 250,
  onAdd,
  onRemove,
}: Props) {
  const safeGoal = Math.max(1, goalMl);
  const fillPct = Math.min(1, ml / safeGoal);

  // Animated fill 0→target ratio for smooth level transitions
  const [t, setT] = useState(fillPct);
  useEffect(() => {
    const start = performance.now();
    const from = t;
    const to = fillPct;
    const duration = 700;
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setT(from + (to - from) * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillPct]);

  // Water surface Y inside the SVG viewBox (top of fill is higher when more water).
  // Glass interior spans roughly y = 12 (top) to y = 134 (bottom).
  const TOP = 14;
  const BOTTOM = 134;
  const waterY = BOTTOM - (BOTTOM - TOP) * t;

  const remainingGlasses = Math.max(0, Math.ceil((safeGoal - ml) / servingMl));
  const drunkGlasses = Math.round(ml / servingMl);
  const goalGlasses = Math.round(safeGoal / servingMl);

  return (
    <div className="glass rounded-3xl p-5 animate-fade-up">
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <h2 className="font-bold text-ink">Pitný režim</h2>
          <p className="text-[11px] text-ink-mute mt-0.5">
            {Math.round(ml)} / {safeGoal} ml
            <span className="text-cyan-300"> · {drunkGlasses}/{goalGlasses} sklenic</span>
          </p>
        </div>
        <div
          className="text-2xl font-extrabold tabular-nums"
          style={{
            backgroundImage: 'linear-gradient(180deg, #fff 0%, #38bdf8 130%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {Math.round(fillPct * 100)}<span className="text-sm">%</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Glass */}
        <div className="relative w-24 h-32 shrink-0">
          {/* Pulsing aqua glow behind the glass */}
          <div
            className="absolute inset-0 rounded-full blur-2xl opacity-60 animate-ring-pulse pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.6) 0%, transparent 70%)' }}
          />
          <svg viewBox="0 0 100 145" className="relative w-full h-full overflow-visible">
            <defs>
              <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
              <linearGradient id="glassRim" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
              </linearGradient>
              <clipPath id="glassClip">
                <path d={GLASS_PATH} />
              </clipPath>
            </defs>

            {/* Glass body background (subtle inner sheen) */}
            <path
              d={GLASS_PATH}
              fill="rgba(255,255,255,0.03)"
              stroke="url(#glassRim)"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />

            {/* Water (clipped to glass) */}
            <g clipPath="url(#glassClip)">
              {/* solid water body */}
              <rect x="0" y={waterY} width="100" height="200" fill="url(#waterGrad)" />

              {/* wave layer 1 — wider, faster */}
              <g transform={`translate(0 ${waterY})`}>
                <path
                  d="M -100 0 q 12.5 -4 25 0 t 25 0 t 25 0 t 25 0 t 25 0 t 25 0 t 25 0 t 25 0 t 25 0 t 25 0 v 200 h -300 z"
                  fill="url(#waterGrad)"
                  className="animate-water-wave"
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                />
              </g>

              {/* wave layer 2 — slower, lighter, slight vertical offset */}
              <g transform={`translate(0 ${waterY - 1.5})`}>
                <path
                  d="M -100 0 q 18 -3 36 0 t 36 0 t 36 0 t 36 0 t 36 0 t 36 0 t 36 0 v 200 h -300 z"
                  fill="rgba(255,255,255,0.18)"
                  className="animate-water-wave-slow"
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                />
              </g>

              {/* tiny bubbles drifting upward (decorative) */}
              {[
                { cx: 38, cy: 110, r: 1.4, delay: '0s' },
                { cx: 60, cy: 122, r: 1.0, delay: '1.4s' },
                { cx: 48, cy: 95,  r: 1.6, delay: '2.6s' },
                { cx: 65, cy: 100, r: 1.0, delay: '3.5s' },
              ].map((b, i) => (
                <circle
                  key={i}
                  cx={b.cx}
                  cy={b.cy}
                  r={b.r}
                  fill="rgba(255,255,255,0.55)"
                  className="animate-ember"
                  style={{ animationDelay: b.delay, animationDuration: '4.5s' } as React.CSSProperties}
                />
              ))}
            </g>

            {/* Glass outline on top so rim is crisp */}
            <path
              d={GLASS_PATH}
              fill="none"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {/* Inner top highlight */}
            <path
              d="M 32 16 L 35 60"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>

        {/* Right side: glass dots + buttons */}
        <div className="flex-1 min-w-0">
          {/* Glass dots */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {Array.from({ length: goalGlasses }).map((_, i) => {
              const filled = i < drunkGlasses;
              return (
                <span
                  key={i}
                  className={`w-2.5 h-2.5 rounded-sm transition-all ${
                    filled
                      ? 'bg-gradient-to-b from-cyan-300 to-sky-600 shadow-[0_0_6px_rgba(56,189,248,0.6)]'
                      : 'bg-white/8 ring-1 ring-white/10'
                  }`}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRemove(servingMl)}
              disabled={ml <= 0}
              className="w-10 h-10 rounded-full bg-white/6 ring-1 ring-white/10 text-ink active:scale-90 transition-transform disabled:opacity-30 flex items-center justify-center"
              aria-label="Ubrat sklenici"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/></svg>
            </button>
            <button
              onClick={() => onAdd(servingMl)}
              className="flex-1 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-sky-600 text-white font-bold text-sm shadow-[0_8px_24px_-8px_rgba(56,189,248,0.6)] active:scale-[0.97] transition-transform flex items-center justify-center gap-1.5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              {servingMl} ml
            </button>
          </div>
          <div className="text-[11px] text-ink-mute mt-2 tabular-nums">
            {ml >= safeGoal
              ? '🎉 Cíl splněn, dobrá práce.'
              : `Zbývá ${remainingGlasses} ${remainingGlasses === 1 ? 'sklenice' : remainingGlasses < 5 ? 'sklenice' : 'sklenic'}`}
          </div>
        </div>
      </div>
    </div>
  );
}
