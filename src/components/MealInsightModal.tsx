import { useEffect } from 'react';
import type { MealInsight } from '../lib/mealInsights';

interface Props {
  insight: MealInsight | null;
  mealName: string;
  kcal: number;
  onClose: () => void;
  autoCloseMs?: number;
}

const TONE: Record<MealInsight['tone'], { glow: string; rim: string }> = {
  good: { glow: '#5ecf9e', rim: 'rgba(94,207,158,0.30)' },
  warn: { glow: '#e0a03f', rim: 'rgba(224,160,63,0.30)' },
  neutral: { glow: '#8f69e0', rim: 'rgba(143,105,224,0.30)' },
};

export default function MealInsightModal({ insight, mealName, kcal, onClose, autoCloseMs = 4500 }: Props) {
  useEffect(() => {
    if (!insight) return;
    const t = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(t);
  }, [insight, onClose, autoCloseMs]);

  if (!insight) return null;
  const tone = TONE[insight.tone];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-4 pb-safe pt-safe"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-card-lg overflow-hidden p-6 reveal"
        style={{ background: '#131215', border: `1px solid ${tone.rim}` }}
      >
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ top: '-40%', left: '-15%', width: '90%', height: '90%', background: tone.glow, filter: 'blur(90px)', opacity: 0.28 }}
        />

        <div className="relative">
          <div className="flex items-start gap-4">
            <div className="text-4xl leading-none">{insight.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="text-micro font-semibold uppercase tracking-label text-ink-mute tabular-nums">
                Přidáno · {kcal} kcal
              </div>
              <div className="text-h2 font-semibold text-ink mt-1 leading-tight truncate">{mealName}</div>
            </div>
          </div>

          <div className="mt-5 rounded-field bg-surface-2 p-4" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="text-h3 font-semibold text-ink">{insight.title}</div>
            <div className="text-sm text-ink-soft mt-1.5 leading-snug">{insight.message}</div>
          </div>

          <button onClick={onClose} className="btn btn-ghost w-full py-3 mt-4">
            Hotovo
          </button>
        </div>
      </div>
    </div>
  );
}
