import type { Meal } from '../types';
import { formatTime } from '../lib/date';
import FoodThumb from './FoodThumb';
import { categorize } from '../lib/foodCategory';

interface Props {
  meal: Meal;
  onClick?: () => void;
}

export default function MealCard({ meal, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full glass rounded-3xl p-3 flex gap-3 items-center active:scale-[0.99] transition-transform text-left animate-fade-up"
    >
      <FoodThumb src={meal.imageDataUrl} alt={meal.name} size="md" category={categorize(meal.name)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-ink truncate">{meal.name}</span>
          <span className="text-[11px] text-ink-mute shrink-0">{formatTime(meal.createdAt)}</span>
        </div>
        <div className="text-xs text-ink-mute mt-0.5 tabular-nums">{meal.grams} g</div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm font-bold tabular-nums text-ink">
            {Math.round(meal.kcal)}
            <span className="text-[10px] text-ink-mute font-medium ml-0.5">kcal</span>
          </span>
          <span className="w-1 h-1 rounded-full bg-border shrink-0" />
          <div className="flex items-center gap-1.5 text-[11px] tabular-nums">
            <span className="px-1.5 py-0.5 rounded-md bg-macro-protein/15 text-macro-protein font-semibold">B {meal.protein_g.toFixed(0)}</span>
            <span className="px-1.5 py-0.5 rounded-md bg-macro-carbs/15 text-macro-carbs font-semibold">S {meal.carbs_g.toFixed(0)}</span>
            <span className="px-1.5 py-0.5 rounded-md bg-macro-fat/15 text-macro-fat font-semibold">T {meal.fat_g.toFixed(0)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
