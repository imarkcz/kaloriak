import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  opacitySpeed: number;
  r: number;
  g: number;
  b: number;
  isOrb: boolean;
}

const PALETTE: [number, number, number][] = [
  [249, 115, 102],
  [251, 113, 133],
  [255, 160, 80],
  [251, 191, 36],
  [251, 191, 36],
  [255, 220, 130],
  [255, 255, 255],
  [255, 255, 255],
];

function createOrb(W: number, H: number): Particle {
  const [r, g, b] = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  return {
    x: Math.random() * W,
    y: Math.random() * H,
    size: Math.random() * 35 + 18,
    speedX: (Math.random() - 0.5) * 0.05,
    speedY: (Math.random() - 0.5) * 0.05,
    opacity: Math.random() * 0.22 + 0.06,
    opacitySpeed: (Math.random() * 0.002 + 0.001) * (Math.random() < 0.5 ? 1 : -1),
    r, g, b,
    isOrb: true,
  };
}

function createStar(W: number, H: number): Particle {
  const [r, g, b] = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  return {
    x: Math.random() * W,
    y: Math.random() * H,
    size: Math.random() * 2 + 0.5,
    speedX: (Math.random() - 0.5) * 0.28,
    speedY: (Math.random() - 0.5) * 0.28,
    opacity: Math.random() * 0.85,
    opacitySpeed: (Math.random() * 0.014 + 0.004) * (Math.random() < 0.5 ? 1 : -1),
    r, g, b,
    isOrb: false,
  };
}

export default function SparklesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particles: Particle[] = [];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const area = canvas.width * canvas.height;
      const orbCount = Math.min(Math.floor(area / 18000), 28);
      const starCount = Math.min(Math.floor(area / 7000), 100);
      particles = [
        ...Array.from({ length: orbCount }, () => createOrb(canvas.width, canvas.height)),
        ...Array.from({ length: starCount }, () => createStar(canvas.width, canvas.height)),
      ];
    }

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.speedX;
        p.y += p.speedY;
        p.opacity += p.opacitySpeed;

        if (p.opacity <= 0) { p.opacity = 0; p.opacitySpeed *= -1; }
        if (p.opacity >= (p.isOrb ? 0.28 : 1)) { p.opacity = p.isOrb ? 0.28 : 1; p.opacitySpeed *= -1; }
        if (p.x < -p.size) p.x = canvas.width + p.size;
        if (p.x > canvas.width + p.size) p.x = -p.size;
        if (p.y < -p.size) p.y = canvas.height + p.size;
        if (p.y > canvas.height + p.size) p.y = -p.size;

        if (p.isOrb) {
          const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          grd.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${p.opacity.toFixed(3)})`);
          grd.addColorStop(0.45, `rgba(${p.r},${p.g},${p.b},${(p.opacity * 0.35).toFixed(3)})`);
          grd.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
          ctx.fillStyle = grd;
          ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.opacity.toFixed(2)})`;
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
