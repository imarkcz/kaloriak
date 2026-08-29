import { useEffect, useState } from 'react';
import type { Meal } from '../types';
import Icon from './Icon';

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
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Linked: grams scale kcal and macros proportionally from the original meal.
  // Unlinked: every field is edited by hand.
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-md rounded-t-[28px] p-5 pb-safe max-h-[90dvh] overflow-y-auto reveal"
        style={{ background: '#131215', borderTop: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-5" />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-h2 font-semibold text-ink">Upravit jídlo</h2>
          <button onClick={onClose} className="btn btn-ghost w-9 h-9 rounded-full" aria-label="Zavřít">
            <Icon name="close" size={15} />
          </button>
        </div>

        <label className="block mb-4">
          <span className="block text-micro font-semibold uppercase tracking-label text-ink-mute mb-2">Název</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="field" />
        </label>

        <div className="rounded-field bg-surface-2 p-4 mb-4" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex justify-between items-baseline mb-3">
            <span className="text-micro font-semibold uppercase tracking-label text-ink-mute">Hmotnost</span>
            <span className="text-h1 font-semibold tabular-nums text-ink leading-none">
              {grams}<span className="text-base text-ink-mute font-normal ml-1">g</span>
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={Math.max(1000, meal.grams * 3)}
            step={1}
            value={grams}
            onChange={(e) => handleGrams(Number(e.target.value))}
            onWheel={(e) => e.currentTarget.blur()}
          />
          <label className="flex items-center gap-2.5 text-sm text-ink-soft cursor-pointer select-none mt-2">
            <input
              type="checkbox"
              checked={linkScale}
              onChange={(e) => setLinkScale(e.target.checked)}
              className="w-4 h-4 accent-violet-500"
            />
            Přepočítat makra podle gramů
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <NumField label="Kalorie" unit="kcal" value={kcal} onChange={setKcal} step={1} disabled={linkScale} />
          <NumField label="Bílkoviny" unit="g" value={prot} onChange={setProt} step={0.1} disabled={linkScale} />
          <NumField label="Sacharidy" unit="g" value={carbs} onChange={setCarbs} step={0.1} disabled={linkScale} />
          <NumField label="Tuky" unit="g" value={fat} onChange={setFat} step={0.1} disabled={linkScale} />
        </div>

        <button onClick={handleSave} className="btn btn-primary w-full py-3.5">
          Uložit změny
        </button>
      </div>
    </div>
  );
}

function NumField({ label, unit, value, onChange, step, disabled }: {
  label: string; unit: string; value: number; onChange: (v: number) => void;
  step: number; disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-micro font-semibold uppercase tracking-label text-ink-mute mb-1.5">{label}</span>
      <div className="relative">
        <input
          type="number"
          min={0}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="field tabular-nums"
          style={{ paddingTop: '0.6rem', paddingBottom: '0.6rem', paddingRight: '2.6rem', fontSize: '0.9375rem' }}
        />
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-micro text-ink-dim">{unit}</span>
      </div>
    </label>
  );
}
