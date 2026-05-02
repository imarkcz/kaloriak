import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  opacitySpeed: number;
  color: string;
}

const COLORS = [
  'rgba(249,115,102,',  // coral
  'rgba(251,113,133,',  // rose
  'rgba(251,113,133,',  // rose (weighted)
  'rgba(167,139,250,',  // violet
  'rgba(139,92,246,',   // deep violet
  'rgba(251,191,36,',   // amber
  'rgba(255,255,255,',  // white
  'rgba(255,255,255,',  // white
];

function createParticle(W: number, H: number): Particle {
  return {
    x: Math.random() * W,
    y: Math.random() * H,
    size: Math.random() * 2.0 + 0.5,
    speedX: (Math.random() - 0.5) * 0.22,
    speedY: (Math.random() - 0.5) * 0.22,
    opacity: Math.random() * 0.8,
    opacitySpeed: (Math.random() * 0.012 + 0.004) * (Math.random() < 0.5 ? 1 : -1),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
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
      const count = Math.floor((canvas.width * canvas.height) / 8000);
      particles = Array.from({ length: Math.min(count, 140) }, () =>
        createParticle(canvas.width, canvas.height)
      );
    }

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.speedX;
        p.y += p.speedY;
        p.opacity += p.opacitySpeed;

        if (p.opacity <= 0) { p.opacity = 0; p.opacitySpeed *= -1; }
        if (p.opacity >= 1) { p.opacity = 1; p.opacitySpeed *= -1; }
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.opacity.toFixed(2)})`;
        ctx.fill();
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
      className="fixed inset-0 -z-10 pointer-events-none"
      aria-hidden="true"
    />
  );
}
