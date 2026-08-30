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

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

interface Spore {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  maxLife: number;
  size: number;
  r: number; g: number; b: number;
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

  const endAngle = -Math.PI / 2 + animPct * 2 * Math.PI;
  const dotX = size / 2 + r * Math.cos(endAngle);
  const dotY = size / 2 + r * Math.sin(endAngle);
  const showDot = animPct > 0.02 && animPct < 0.99;

  // Canvas comet + spores
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gradRef = useRef(grad);
  gradRef.current = grad;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Non-null assertion plus the runtime guard: TypeScript cannot carry the
    // narrowing into the nested draw/spawn closures below, which is what made
    // the build fail with 14x TS18047.
    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;

    const cx = size / 2;
    const cy = size / 2;
    const ORBIT_PERIOD = 5.5; // seconds per full orbit
    let cometAngle = -Math.PI / 2;
    let spores: Spore[] = [];
    let spawnTimer = 0;
    let lastTime = 0;
    let animId = 0;

    function spawnSpore() {
      const sx = cx + r * Math.cos(cometAngle);
      const sy = cy + r * Math.sin(cometAngle);
      // Radially outward direction from center
      const dx = sx - cx;
      const dy = sy - cy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dx / len;
      const ny = dy / len;
      // Speed: slow outward drift with slight random spread
      const speed = Math.random() * 10 + 8;
      const spread = 0.35;
      const [rr, gg, bb] = hexToRgb(
        [gradRef.current.from, gradRef.current.mid, gradRef.current.to, '#ffffff'][
          Math.floor(Math.random() * 4)
        ]
      );
      spores.push({
        x: sx, y: sy,
        vx: nx * speed + (Math.random() - 0.5) * spread * speed,
        vy: ny * speed + (Math.random() - 0.5) * spread * speed,
        life: 1,
        maxLife: Math.random() * 0.6 + 0.8,
        size: Math.random() * 2 + 1,
        r: rr, g: gg, b: bb,
      });
    }

    function draw(time: number) {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      ctx.clearRect(0, 0, size, size);

      // Advance comet
      cometAngle += (2 * Math.PI / ORBIT_PERIOD) * dt;

      // Spawn spores
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnSpore();
        if (Math.random() < 0.5) spawnSpore();
        spawnTimer = 0.07 + Math.random() * 0.04;
      }

      // Draw + update spores
      spores = spores.filter((s) => s.life > 0 && s.size > 0.15);
      for (const s of spores) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt / s.maxLife;
        s.size *= Math.pow(0.88, dt * 60);
        const alpha = Math.max(0, s.life) * 0.75;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${alpha.toFixed(3)})`;
        ctx.fill();
      }

      // Comet glow halo
      const cx2 = cx + r * Math.cos(cometAngle);
      const cy2 = cy + r * Math.sin(cometAngle);
      const grd = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, stroke * 2.2);
      const [cr, cg, cb] = hexToRgb(gradRef.current.to);
      grd.addColorStop(0,   `rgba(255,255,255,0.95)`);
      grd.addColorStop(0.25, `rgba(${cr},${cg},${cb},0.7)`);
      grd.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath();
      ctx.arc(cx2, cy2, stroke * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Comet core
      ctx.beginPath();
      ctx.arc(cx2, cy2, stroke / 2 - 0.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fill();

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame((t) => { lastTime = t; draw(t); });
    return () => cancelAnimationFrame(animId);
  // size and r are stable; grad is accessed via ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, r, stroke]);

  return (
    <>
    <div className="relative" style={{ width: size, height: size }}>
      {/* Ambient glow */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none animate-ring-pulse"
        style={{
          background: `radial-gradient(circle at 50% 55%, ${grad.mid}cc 0%, transparent 62%)`,
          filter: 'blur(28px)',
        }}
      />

      <svg width={size} height={size} className="relative" viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={grad.from} />
            <stop offset="50%" stopColor={grad.mid} />
            <stop offset="100%" stopColor={grad.to} />
          </linearGradient>
          <filter id="arcGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="dotGlow" x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="rgba(255,255,255,0.07)"
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
            <circle cx={dotX} cy={dotY} r={stroke / 2 + 4} fill={grad.to} opacity={0.25} />
            <circle cx={dotX} cy={dotY} r={stroke / 2 - 0.5} fill="#fff" filter="url(#dotGlow)" />
          </>
        )}
      </svg>

      {/* Canvas comet + spores overlay */}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[9px] uppercase tracking-[0.3em] text-ink-mute font-bold mb-1">
          {label ?? 'kalorie'}
        </span>

        <span
          className="tabular-nums leading-none font-bold font-display text-white"
          style={{ fontSize: size * 0.285, letterSpacing: '-0.02em' }}
        >
          {displayValue}
        </span>

        <div className="flex items-center gap-1 mt-1.5">
          <span className="text-[11px] tabular-nums text-ink-mute">/ {target} kcal</span>
        </div>

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
