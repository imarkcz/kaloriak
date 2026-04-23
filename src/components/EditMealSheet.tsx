import { useEffect, useState } from 'react';
import type { Meal } from '../types';

interface Props {
  meal: Meal;
  onClose: () => void;
  onSave: (patch: Partial<Meal>) => void;
}

export default function EditMealSheet({ meal, onClose, onSave }: Props) {
  const [name, setName] = useState(meal.name);
  const [grams, setGrams] = useState(meal.grams);
  const [kcal, setKcal] = useState(meal.kcal);
  const [prot, setProt] = useState(meal.protein_g);
  const [carbs, setCarbs] = useState(meal.carbs_g);
  const [fat, setFat] = useState(meal.fat_g);
  const [linkScale, setLinkScale] = useState(true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // When linked, changing grams scales kcal+macros proportionally from the
  // original meal values. When unlinked, the user can override each field.
  function handleGrams(g: number) {
    const next = Math.max(1, Math.round(g));
    setGrams(next);
    if (linkScale && meal.grams > 0) {
      const r = next / meal.grams;
      setKcal(Math.round(meal.kcal * r));
      setProt(+(meal.protein_g * r).toFixed(1));
      setCarbs(+(meal.carbs_g * r).toFixed(1));
      setFat(+(meal.fat_g * r).toFixed(1));
    }
  }

  function handleSave() {
    onSave({
      name: name.trim() || meal.name,
      grams,
      kcal: Math.round(kcal),
      protein_g: +prot.toFixed(1),
      carbs_g: +carbs.toFixed(1),
      fat_g: +fat.toFixed(1),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-up"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-surface-1 rounded-t-[28px] p-5 pb-safe max-h-[90dvh] overflow-y-auto animate-pop ring-1 ring-white/5">
        <div className="w-12 h-1.5 rounded-full bg-white/15 mx-auto mb-4" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-ink">Upravit jídlo</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 text-ink-mute active:scale-90 transition-transform flex items-center justify-center"
            aria-label="Zavřít"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <label className="block mb-3">
          <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">Název</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field"
          />
        </label>

        <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/5 p-3 mb-3">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm font-semibold text-ink">Hmotnost</span>
            <span className="text-2xl font-extrabold tabular-nums text-ink">
              {grams} <span className="text-sm text-ink-soft font-semibold">g</span>
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={Math.max(1000, meal.grams * 3)}
            step={1}
            value={grams}
            onChange={(e) => handleGrams(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex items-center gap-2 mt-2">
            <input
              type="number"
              min={1}
              value={grams}
              onChange={(e) => handleGrams(Number(e.target.value))}
              className="field !py-2 !text-sm w-24"
            />
            <label className="flex-1 flex items-center gap-2 text-xs text-ink-soft cursor-pointer select-none font-medium">
              <input
                type="checkbox"
                checked={linkScale}
                onChange={(e) => setLinkScale(e.target.checked)}
                className="accent-coral-400 w-4 h-4"
              />
              Přepočítat makra podle gramů
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <NumField label="Kalorie" unit="kcal" value={kcal} onChange={setKcal} step={1} disabled={linkScale} />
          <NumField label="Bílkoviny" unit="g" value={prot} onChange={setProt} step={0.1} disabled={linkScale} />
          <NumField label="Sacharidy" unit="g" value={carbs} onChange={setCarbs} step={0.1} disabled={linkScale} />
          <NumField label="Tuky" unit="g" value={fat} onChange={setFat} step={0.1} disabled={linkScale} />
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3.5 rounded-2xl bg-grad-coral text-white font-semibold shadow-coral-soft active:scale-[0.98] transition-transform"
        >
          Uložit změny
        </button>
      </div>

      <style>{`
        .field {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 0.875rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          color: #fafafa;
          outline: none;
          font-size: 1rem;
          transition: all 200ms;
        }
        .field:focus {
          border-color: #f97366;
          background: rgba(255,255,255,0.06);
          box-shadow: 0 0 0 4px rgba(249,115,102,0.12);
        }
        .field:disabled { opacity: 0.5; }
      `}</style>
    </div>
  );
}

function NumField({
  label, unit, value, onChange, step, disabled,
}: {
  label: string; unit: string; value: number; onChange: (v: number) => void;
  step: number; disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-1">{label}</span>
      <div className="relative">
        <input
          type="number"
          min={0}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="field !py-2.5 !text-sm tabular-nums pr-10"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-ink-mute">{unit}</span>
      </div>
    </label>
  );
}
