interface Props {
  protein: number;
  carbs: number;
  fat: number;
  targets: { protein_g: number; carbs_g: number; fat_g: number };
}

const MACROS = [
  { key: 'protein', label: 'Bílkoviny', color: '#f47da6', kcalPerG: 4 },
  { key: 'carbs', label: 'Sacharidy', color: '#e8b45f', kcalPerG: 4 },
  { key: 'fat', label: 'Tuky', color: '#6ec2f0', kcalPerG: 9 },
] as const;

// One card replaces the three identical macro pills and the separate pie:
// the top bar answers "what is today made of", the rows answer "am I on track".
export default function MacroBar({ protein, carbs, fat, targets }: Props) {
  const eaten = { protein, carbs, fat };
  const target = { protein: targets.protein_g, carbs: targets.carbs_g, fat: targets.fat_g };
  const totalKcal = protein * 4 + carbs * 4 + fat * 9;

  return (
    <section className="card p-5 reveal" style={{ '--i': 2 } as React.CSSProperties}>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-micro font-semibold uppercase tracking-label text-ink-mute">Makra</h2>
        <span className="text-micro text-ink-dim tabular-nums">
          {totalKcal > 0
            ? MACROS.map((m) => `${Math.round((eaten[m.key] * m.kcalPerG / totalKcal) * 100)} %`).join(' · ')
            : 'zatím nic'}
        </span>
      </div>

      {/* Composition of today's calories */}
      <div className="flex h-2 rounded-full overflow-hidden bg-surface-2 mb-5">
        {totalKcal > 0
          ? MACROS.map((m) => (
              <div
                key={m.key}
                style={{
                  width: `${(eaten[m.key] * m.kcalPerG / totalKcal) * 100}%`,
                  background: m.color,
                  transition: 'width 600ms cubic-bezier(0.16,1,0.3,1)',
                }}
              />
            ))
          : null}
      </div>

      <div className="space-y-3.5">
        {MACROS.map((m) => {
          const has = Math.round(eaten[m.key]);
          const goal = Math.max(1, Math.round(target[m.key]));
          const pct = Math.min(100, (has / goal) * 100);
          const done = has >= goal;
          return (
            <div key={m.key}>
              <div className="flex items-baseline justify-between mb-2">
                <span className="flex items-center gap-2 text-sm text-ink-soft">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.color }} />
                  {m.label}
                </span>
                <span className="tabular-nums text-sm">
                  <span className="font-semibold text-ink">{has}</span>
                  <span className="text-ink-mute"> / {goal} g</span>
                </span>
              </div>
              <div className="h-1 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: m.color,
                    opacity: done ? 1 : 0.75,
                    transition: 'width 600ms cubic-bezier(0.16,1,0.3,1)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
