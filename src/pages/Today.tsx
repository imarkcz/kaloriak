import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../state/AppState';
import { todayISO, formatDateLabel } from '../lib/date';
import ProgressRing from '../components/ProgressRing';
import MacroPie, { MacroLegend } from '../components/MacroPie';
import MealCard from '../components/MealCard';
import { Link } from 'react-router-dom';
import { ACTIVITY_LABEL } from '../lib/activityKcal';
import WaterTracker from '../components/WaterTracker';
import { dynamicDailyTargets } from '../lib/tdee';
import Avatar from '../components/Avatar';
import EditMealSheet from '../components/EditMealSheet';
import type { Meal } from '../types';

export default function Today() {
  const { data, deleteMeal, updateMeal, deleteActivity, setWater } = useApp();
  const [date, setDate] = useState(() => todayISO());
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  // Reset to today when the app becomes visible again (PWA returns from
  // background, browser tab refocused). Without this, opening the app the
  // next morning leaves the user on yesterday's date.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') {
        setDate(todayISO());
      }
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  const { kcal, protein, carbs, fat, meals } = useMemo(() => {
    const dayMeals = data.meals.filter((m) => m.date === date);
    return {
      meals: dayMeals.slice().sort((a, b) => b.createdAt - a.createdAt),
      kcal: dayMeals.reduce((s, m) => s + m.kcal, 0),
      protein: dayMeals.reduce((s, m) => s + m.protein_g, 0),
      carbs: dayMeals.reduce((s, m) => s + m.carbs_g, 0),
      fat: dayMeals.reduce((s, m) => s + m.fat_g, 0),
    };
  }, [data.meals, date]);

  const { burned, activities } = useMemo(() => {
    const list = (data.activities ?? []).filter((a) => a.date === date);
    return {
      activities: list.slice().sort((a, b) => b.createdAt - a.createdAt),
      burned: list.reduce((s, a) => s + a.kcal, 0),
    };
  }, [data.activities, date]);

  const profile = data.profile;
  const baseTargets = profile?.targets ?? { kcal: 2000, protein_g: 150, carbs_g: 220, fat_g: 65 };
  // Two models for the day's calorie target:
  //  1. Dynamic (default if profile opted in): BMR × sedentary + actual burned.
  //     Avoids double-counting a static activity multiplier.
  //  2. Static + eat-back: profile target plus burned added on top.
  const targets = profile?.useDynamicTdee
    ? dynamicDailyTargets(profile.sex, profile.weightKg, profile.heightCm, profile.age, profile.goal, burned)
    : { ...baseTargets, kcal: baseTargets.kcal + burned };

  const waterMl = data.water?.[date] ?? 0;
  const waterGoalMl = 2000;

  function shiftDay(delta: number) {
    const [y, m, d] = date.split('-').map(Number);
    const nd = new Date(y, m - 1, d + delta);
    const iso = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}-${String(nd.getDate()).padStart(2, '0')}`;
    setDate(iso);
  }

  return (
    <div className="min-h-dvh pt-safe pb-32">
      <header className="max-w-md mx-auto px-5 pt-5 pb-4 flex items-center justify-between animate-fade-up">
        <Link to="/profile" className="flex items-center gap-3 active:scale-[0.98] transition-transform" aria-label="Otevřít profil">
          <Avatar src={profile?.avatarDataUrl} name={profile?.name} size={44} />
          <div>
            <div className="text-[10px] text-ink-mute uppercase tracking-[0.22em] font-bold">
              Ahoj, {profile?.name ?? 'uživateli'}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight capitalize text-ink leading-tight">
              {formatDateLabel(date)}
            </h1>
          </div>
        </Link>
        <div className="flex gap-1.5">
          <IconBtn onClick={() => shiftDay(-1)} ariaLabel="Předchozí den">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
          </IconBtn>
          <IconBtn onClick={() => shiftDay(1)} ariaLabel="Další den" disabled={date >= todayISO()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
          </IconBtn>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 space-y-4">
        {/* HERO RING */}
        <section className="glass rounded-[32px] p-6 flex flex-col items-center animate-pop">
          <ProgressRing
            value={kcal}
            target={targets.kcal}
            size={220}
            stroke={16}
            hint={
              profile?.useDynamicTdee
                ? burned > 0
                  ? `dynamický cíl · BMR + ${burned} z aktivit`
                  : 'dynamický cíl · zatím bez tréninku'
                : burned > 0
                  ? `cíl ${baseTargets.kcal} + ${burned} z aktivit`
                  : `cíl ${baseTargets.kcal} kcal`
            }
          />
          <div className="mt-5 grid grid-cols-3 gap-2 w-full">
            <Chip label="Snědeno" value={`${Math.round(kcal)}`} unit="kcal" />
            <Chip label="Spáleno" value={`${burned}`} unit="kcal" tint="text-emerald-300" />
            <Chip
              label="Netto"
              value={`${Math.round(kcal - burned)}`}
              unit="kcal"
              tint={kcal - burned > baseTargets.kcal ? 'text-red-300' : 'text-ink'}
            />
          </div>
        </section>

        {/* MACRO PILLS */}
        <section className="grid grid-cols-3 gap-2.5 animate-fade-up">
          <MacroPill
            label="Bílkoviny"
            value={protein}
            target={targets.protein_g}
            gradient="bg-grad-protein"
          />
          <MacroPill
            label="Sacharidy"
            value={carbs}
            target={targets.carbs_g}
            gradient="bg-grad-carbs"
          />
          <MacroPill
            label="Tuky"
            value={fat}
            target={targets.fat_g}
            gradient="bg-grad-fat"
          />
        </section>

        {/* PIE CARD */}
        <section className="glass rounded-3xl p-5 animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-ink">Rozložení dne</h2>
              <p className="text-[11px] text-ink-mute mt-0.5">poměr makroživin v kaloriích</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <MacroPie protein={protein} carbs={carbs} fat={fat} size={120} />
            <div className="flex-1 min-w-0">
              <MacroLegend protein={protein} carbs={carbs} fat={fat} />
            </div>
          </div>
        </section>

        {/* WATER */}
        <WaterTracker
          ml={waterMl}
          goalMl={waterGoalMl}
          servingMl={250}
          onAdd={(d) => setWater(date, waterMl + d)}
          onRemove={(d) => setWater(date, Math.max(0, waterMl - d))}
        />

        {/* ACTIVITIES */}
        <section className="animate-fade-up">
          <div className="flex items-baseline justify-between px-1 mb-3">
            <h2 className="font-bold text-lg text-ink">Aktivity</h2>
            <Link
              to="/activity"
              className="text-xs font-semibold text-coral-300 active:scale-95 transition-transform inline-flex items-center gap-1"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              Přidat
            </Link>
          </div>
          {activities.length === 0 ? (
            <Link
              to="/activity"
              className="glass rounded-3xl p-4 flex items-center gap-3 active:scale-[0.99] transition-transform"
            >
              <div className="w-11 h-11 rounded-full bg-grad-coral flex items-center justify-center text-xl">⚡</div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-ink">Zaznamenat trénink</div>
                <div className="text-[11px] text-ink-mute">spálené kalorie navýší dnešní cíl</div>
              </div>
              <svg className="text-ink-mute" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
            </Link>
          ) : (
            <div className="space-y-2">
              {activities.map((a) => {
                const meta = ACTIVITY_LABEL[a.kind];
                return (
                  <div key={a.id} className="relative group glass rounded-2xl p-3 flex items-center gap-3 animate-fade-up">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${meta.tint} flex items-center justify-center text-2xl shrink-0`}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink text-sm truncate">{a.name}</div>
                      <div className="text-[11px] text-ink-mute tabular-nums">{a.minutes} min</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-extrabold tabular-nums text-emerald-300">−{a.kcal}</div>
                      <div className="text-[10px] text-ink-mute">kcal</div>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm(`Smazat aktivitu "${a.name}"?`)) deleteActivity(a.id);
                      }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-surface-3/80 text-ink-mute hover:text-red-400 active:scale-90 flex items-center justify-center backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Smazat aktivitu"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* MEALS */}
        <section className="animate-fade-up">
          <div className="flex items-baseline justify-between px-1 mb-3">
            <h2 className="font-bold text-lg text-ink">Jídla</h2>
            <span className="text-xs text-ink-mute tabular-nums">{meals.length} {meals.length === 1 ? 'položka' : meals.length >= 2 && meals.length <= 4 ? 'položky' : 'položek'}</span>
          </div>
          {meals.length === 0 ? (
            <div className="glass rounded-3xl p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-grad-glow opacity-50 pointer-events-none" />
              <div className="relative">
                <div className="text-5xl mb-3 animate-pop">🍽️</div>
                <p className="text-ink font-semibold text-base">
                  {data.meals.length === 0 ? 'Začni svůj den s Kaloriak!' : 'Zapiš si první jídlo dne'}
                </p>
                <p className="text-ink-soft text-xs mt-1.5">
                  {data.meals.length === 0
                    ? 'Vyfoť, naskenuj nebo najdi v databázi.'
                    : 'Foť, skenuj kód, nebo vyhledej v databázi.'}
                </p>
                <Link
                  to="/add"
                  className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-full bg-grad-coral text-white font-semibold text-sm shadow-coral-glow active:scale-95 transition-transform"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                  Přidat jídlo
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {meals.map((m) => (
                <div key={m.id} className="relative group">
                  <MealCard meal={m} onClick={() => setEditingMeal(m)} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Smazat "${m.name}"?`)) deleteMeal(m.id);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-surface-3/80 text-ink-mute hover:text-red-400 active:scale-90 flex items-center justify-center backdrop-blur"
                    aria-label="Smazat jídlo"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {editingMeal && (
        <EditMealSheet
          meal={editingMeal}
          onClose={() => setEditingMeal(null)}
          onSave={(patch) => updateMeal(editingMeal.id, patch)}
        />
      )}
    </div>
  );
}

function Chip({ label, value, unit, tint = 'text-ink' }: { label: string; value: string; unit: string; tint?: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.07] ring-1 ring-white/10 px-3 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wider font-bold text-ink-soft">{label}</div>
      <div className={`mt-0.5 text-sm font-extrabold tabular-nums ${tint}`}>
        {value}
        <span className="text-[10px] font-semibold text-ink-soft ml-0.5">{unit}</span>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, ariaLabel, disabled }: { children: React.ReactNode; onClick: () => void; ariaLabel: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="w-10 h-10 rounded-full glass flex items-center justify-center text-ink-soft active:scale-90 transition-transform disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function MacroPill({ label, value, target, gradient }: { label: string; value: number; target: number; gradient: string }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const v = Math.round(value);
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onTouchStart={() => setHover(true)}
      onTouchEnd={() => setHover(false)}
      className="glass rounded-2xl p-3 relative overflow-hidden"
    >
      {/* fill glow */}
      <div
        className={`absolute inset-x-0 bottom-0 ${gradient} opacity-90`}
        style={{ height: `${pct * 0.55}%`, transition: 'height 700ms cubic-bezier(.2,.8,.2,1)', filter: 'blur(18px)' }}
      />
      {/* soft glow halo on hover */}
      {hover && (
        <div
          className="absolute inset-0 pointer-events-none opacity-0 pill-halo"
          style={{
            background: 'radial-gradient(circle at 50% 60%, rgba(255,255,255,0.18), transparent 65%)',
          }}
        />
      )}
      <div className="relative">
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">{label}</div>
        <div className="flex items-baseline gap-0.5 mt-1">
          <span className="text-xl font-extrabold tabular-nums text-ink leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{v}</span>
          <span className="text-[10px] font-semibold text-white/75 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">/{target}g</span>
        </div>
        <div className="h-1 rounded-full bg-black/30 mt-2 overflow-hidden ring-1 ring-white/5">
          <div
            className={`h-full ${gradient} rounded-full`}
            style={{ width: `${pct}%`, transition: 'width 700ms cubic-bezier(.2,.8,.2,1)' }}
          />
        </div>
      </div>
    </div>
  );
}
