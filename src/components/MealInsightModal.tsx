import { useEffect } from 'react';
import type { MealInsight } from '../lib/mealInsights';

interface Props {
  insight: MealInsight | null;
  mealName: string;
  kcal: number;
  onClose: () => void;
  autoCloseMs?: number;
}

const TONE_GRADIENT: Record<MealInsight['tone'], string> = {
  good: 'from-emerald-500/30 via-teal-500/20 to-emerald-600/30',
  warn: 'from-amber-500/30 via-orange-500/20 to-rose-500/30',
  neutral: 'from-coral-500/30 via-orange-500/15 to-rose-500/25',
};

const TONE_RING: Record<MealInsight['tone'], string> = {
  good: 'ring-emerald-400/30',
  warn: 'ring-amber-400/30',
  neutral: 'ring-white/15',
};

export default function MealInsightModal({ insight, mealName, kcal, onClose, autoCloseMs = 4500 }: Props) {
  useEffect(() => {
    if (!insight) return;
    const t = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(t);
  }, [insight, onClose, autoCloseMs]);

  if (!insight) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-4 pb-safe pt-safe animate-fade-up"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-sm rounded-[32px] overflow-hidden ring-1 ${TONE_RING[insight.tone]} shadow-2xl shadow-black/50`}
      >
        {/* Layered gradient bg */}
        <div className={`absolute inset-0 bg-gradient-to-br ${TONE_GRADIENT[insight.tone]}`} />
        <div className="absolute -top-20 -left-10 w-60 h-60 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-2xl" />

        <div className="relative p-6">
          <div className="flex items-start gap-4">
            <div className="text-5xl leading-none drop-shadow">{insight.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                Přidáno • {kcal} kcal
              </div>
              <div className="text-lg font-extrabold text-white mt-1 leading-tight truncate">
                {mealName}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-white/10 backdrop-blur p-4 ring-1 ring-white/10">
            <div className="text-base font-bold text-white">{insight.title}</div>
            <div className="text-[13px] text-white/85 mt-1 leading-snug">{insight.message}</div>
          </div>

          <button
            onClick={onClose}
            className="mt-5 w-full py-3 rounded-2xl bg-white/15 hover:bg-white/20 backdrop-blur text-white font-semibold text-sm active:scale-[0.98] transition-all"
          >
            Hotovo
          </button>
        </div>
      </div>
    </div>
  );
}
