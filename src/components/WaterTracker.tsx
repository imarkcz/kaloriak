import { haptic } from '../lib/haptics';
import Icon from './Icon';

interface Props {
  ml: number;
  goalMl: number;
  servingMl?: number;
  onAdd: (ml: number) => void;
  onRemove: (ml: number) => void;
}

// Compact strip. The fill animates through a CSS transition rather than a
// requestAnimationFrame loop driving setState 60 times a second.
export default function WaterTracker({ ml, goalMl, servingMl = 250, onAdd, onRemove }: Props) {
  const goal = Math.max(1, goalMl);
  const pct = Math.min(100, (ml / goal) * 100);
  const glasses = Math.round(ml / servingMl);
  const goalGlasses = Math.round(goal / servingMl);

  return (
    <section className="card p-5 reveal" style={{ '--i': 4 } as React.CSSProperties}>
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-2.5">
            <h2 className="text-micro font-semibold uppercase tracking-label text-ink-mute">Pitný režim</h2>
            <span className="text-sm tabular-nums">
              <span className="font-semibold text-ink">{Math.round(ml)}</span>
              <span className="text-ink-mute"> / {goal} ml</span>
            </span>
          </div>

          <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #6ec2f0, #8f69e0)',
                transition: 'width 600ms cubic-bezier(0.16,1,0.3,1)',
              }}
            />
          </div>

          <p className="text-micro text-ink-mute mt-2 tabular-nums">
            {glasses} z {goalGlasses} sklenic po {servingMl} ml
          </p>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={() => { haptic('tap'); onAdd(servingMl); }}
            className="btn btn-primary w-11 h-11 rounded-full"
            aria-label={`Přidat ${servingMl} ml`}
          >
            <Icon name="plus" size={18} strokeWidth={2} />
          </button>
          <button
            onClick={() => { haptic('tap'); onRemove(servingMl); }}
            disabled={ml <= 0}
            className="btn btn-ghost w-11 h-11 rounded-full"
            aria-label={`Odebrat ${servingMl} ml`}
          >
            <Icon name="minus" size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
    </section>
  );
}
