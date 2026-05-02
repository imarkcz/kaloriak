import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../state/AppState';
import { todayISO, formatDateLabel } from '../lib/date';
import ProgressRing from '../components/ProgressRing';
import MacroPie, { MacroLegend } from '../components/MacroPie';
import FoodThumb from '../components/FoodThumb';
import { Link } from 'react-router-dom';
import { ACTIVITY_LABEL } from '../lib/activityKcal';
import WaterTracker from '../components/WaterTracker';
import { dynamicDailyTargets } from '../lib/tdee';
import Avatar from '../components/Avatar';
import EditMealSheet from '../components/EditMealSheet';
import type { Meal, MealType } from '../types';
import { MEAL_TYPE_META, MEAL_TYPE_ORDER, resolveMealType } from '../lib/mealType';
import { categorize } from '../lib/foodCategory';
import { getDailyFeedback, type FeedbackContext } from '../lib/gemini';
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor,
  useSensor, useSensors, useDroppable, useDraggable,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';

export default function Today() {
  const { data, deleteMeal, updateMeal, deleteActivity, setWater } = useApp();
  const [date, setDate] = useState(() => todayISO());
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
  );

  function handleDragStart({ active }: DragStartEvent) {
    setDraggingId(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDraggingId(null);
    if (!over) return;
    const targetType = over.id as MealType;
    if (!MEAL_TYPE_ORDER.includes(targetType)) return;
    updateMeal(active.id as string, { mealType: targetType });
  }

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
  const targets = profile?.useDynamicTdee
    ? dynamicDailyTargets(profile.sex, profile.weightKg, profile.heightCm, profile.age, profile.activity, profile.goal, burned, profile.goalIntensity ?? 'moderate', profile.customMacroSplit)
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
        <section
          className="rounded-[32px] p-6 flex flex-col items-center animate-pop relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(249,115,102,0.10) 0%, rgba(255,255,255,0.04) 50%, rgba(139,92,246,0.07) 100%)',
            backdropFilter: 'blur(56px) saturate(170%)',
            WebkitBackdropFilter: 'blur(56px) saturate(170%)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.22) inset, 0 -1px 0 rgba(255,255,255,0.04) inset, 0 20px 60px -20px rgba(0,0,0,0.6), 0 0 80px rgba(249,115,102,0.05)',
          }}
        >
          <ProgressRing
            value={kcal}
            target={targets.kcal}
            size={224}
            stroke={12}
            hint={
              profile?.useDynamicTdee
                ? burned > 0
                  ? `dynamický cíl · BMR + ${burned} kcal z aktivit`
                  : 'dynamický cíl · zatím bez tréninku'
                : burned > 0
                  ? `cíl ${baseTargets.kcal} + ${burned} kcal z aktivit`
                  : undefined
            }
          />
          <div className="mt-5 w-full border-t border-white/[0.07] pt-4 grid grid-cols-3">
            <HeroStat label="Snědeno" value={Math.round(kcal)} unit="kcal" />
            <HeroStat label="Spáleno" value={burned} unit="kcal" accent="text-emerald-300" divider />
            <HeroStat
              label="Netto"
              value={Math.round(kcal - burned)}
              unit="kcal"
              accent={kcal - burned > baseTargets.kcal ? 'text-red-300' : undefined}
              divider
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

        {/* AI FEEDBACK */}
        <DailyFeedbackCard
          date={date}
          kcal={kcal}
          protein={protein}
          carbs={carbs}
          fat={fat}
          targets={targets}
          meals={meals}
          goal={profile?.goal ?? 'maintain'}
          sex={profile?.sex ?? 'male'}
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
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              autoScroll={{ threshold: { x: 0, y: 0.18 }, interval: 5 }}
            >
              <div className="space-y-3">
                {MEAL_TYPE_ORDER.map((type) => {
                  const items = meals.filter((m) => resolveMealType(m) === type);
                  if (items.length === 0 && !draggingId) return null;
                  const sectionKcal = items.reduce((s, m) => s + m.kcal, 0);
                  const meta = MEAL_TYPE_META[type];
                  return (
                    <DroppableSection key={type} id={type} isDragging={!!draggingId}>
                      <MealSectionHeader kcal={sectionKcal} count={items.length} meta={meta} />
                      {items.map((m) => (
                        <DraggableMealRow
                          key={m.id}
                          meal={m}
                          onEdit={() => setEditingMeal(m)}
                          onDelete={() => { if (window.confirm(`Smazat "${m.name}"?`)) deleteMeal(m.id); }}
                        />
                      ))}
                      {items.length === 0 && draggingId && (
                        <div className="px-4 py-5 flex items-center justify-center">
                          <span className="text-[11px] text-ink-mute italic">Přetáhni sem</span>
                        </div>
                      )}
                    </DroppableSection>
                  );
                })}
              </div>
              <DragOverlay dropAnimation={null} modifiers={[restrictToWindowEdges]}>
                {draggingId ? (() => {
                  const m = meals.find((meal) => meal.id === draggingId);
                  if (!m) return null;
                  return (
                    <div
                      className="flex items-center gap-2.5 px-3 py-2.5 glass rounded-2xl shadow-2xl ring-1 ring-coral-400/40"
                      style={{ width: 220, opacity: 0.96 }}
                    >
                      <FoodThumb src={m.imageDataUrl} alt={m.name} size="sm" category={categorize(m.name)} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-ink truncate">{m.name}</div>
                        <div className="text-[10px] text-ink-mute tabular-nums">{Math.round(m.kcal)} kcal</div>
                      </div>
                    </div>
                  );
                })() : null}
              </DragOverlay>
            </DndContext>
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

function HeroStat({ label, value, unit, accent, divider }: {
  label: string; value: number; unit: string; accent?: string; divider?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center gap-0.5 ${divider ? 'border-l border-white/[0.07]' : ''}`}>
      <span className="text-[9px] uppercase tracking-[0.2em] text-ink-mute font-bold">{label}</span>
      <span className={`text-base font-extrabold tabular-nums leading-none ${accent ?? 'text-ink'}`}>{value}</span>
      <span className="text-[10px] text-ink-mute">{unit}</span>
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

function MealSectionHeader({ kcal, count, meta }: {
  kcal: number;
  count: number;
  meta: typeof MEAL_TYPE_META[MealType];
}) {
  return (
    <div className="relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-r ${meta.tint}`} />
      <div className="absolute inset-0 bg-black/10" />
      <div className="relative flex items-center gap-3 px-4 py-3">
        <span className="text-xl leading-none">{meta.icon}</span>
        <span className="flex-1 font-bold text-sm text-white">{meta.label}</span>
        {count > 0 && (
          <span className="text-[10px] font-semibold bg-black/25 text-white/70 px-2 py-0.5 rounded-full tabular-nums">
            {count}×
          </span>
        )}
        <div className="shrink-0 text-right">
          <span className="font-extrabold text-sm tabular-nums text-white">{Math.round(kcal)}</span>
          <span className="text-[10px] text-white/60 ml-0.5">kcal</span>
        </div>
      </div>
    </div>
  );
}

function DroppableSection({ id, children, isDragging }: {
  id: MealType;
  children: React.ReactNode;
  isDragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={[
        'glass rounded-3xl overflow-hidden transition-all duration-200',
        isOver ? 'ring-2 ring-coral-400/50' : '',
        isDragging && !isOver ? 'ring-1 ring-white/[0.08]' : '',
      ].join(' ')}
    >
      {children}
    </div>
  );
}

function DraggableMealRow({ meal, onEdit, onDelete }: {
  meal: Meal;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: meal.id });
  const wasDragging = useRef(false);

  useEffect(() => {
    if (isDragging) {
      wasDragging.current = true;
    } else if (wasDragging.current) {
      const t = setTimeout(() => { wasDragging.current = false; }, 300);
      return () => clearTimeout(t);
    }
  }, [isDragging]);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0 : 1,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      } as React.CSSProperties}
      onContextMenu={(e) => e.preventDefault()}
      className="flex items-center gap-2.5 px-3 py-2.5 border-t border-white/[0.05] first:border-t-0"
    >
      {/* grip */}
      <button
        {...listeners}
        {...attributes}
        className="shrink-0 text-ink-mute/60 hover:text-ink-mute active:text-ink-soft touch-none transition-colors p-1 -m-1"
        tabIndex={-1}
        aria-label="Přetáhnout"
      >
        <svg width="11" height="15" viewBox="0 0 11 15" fill="currentColor">
          <circle cx="3.5" cy="1.5" r="1.3"/><circle cx="7.5" cy="1.5" r="1.3"/>
          <circle cx="3.5" cy="7.5" r="1.3"/><circle cx="7.5" cy="7.5" r="1.3"/>
          <circle cx="3.5" cy="13.5" r="1.3"/><circle cx="7.5" cy="13.5" r="1.3"/>
        </svg>
      </button>

      {/* thumbnail */}
      <FoodThumb src={meal.imageDataUrl} alt={meal.name} size="sm" category={categorize(meal.name)} />

      {/* name + macros — tappable for edit */}
      <button onClick={() => { if (!wasDragging.current) onEdit(); }} className="flex-1 min-w-0 text-left">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="font-semibold text-sm text-ink truncate leading-snug">{meal.name}</span>
          <span className="text-[11px] text-ink-mute shrink-0">{meal.grams}g</span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[10px] px-1.5 py-[2px] rounded-md bg-macro-protein/15 text-macro-protein font-semibold">B {meal.protein_g.toFixed(0)}</span>
          <span className="text-[10px] px-1.5 py-[2px] rounded-md bg-macro-carbs/15 text-macro-carbs font-semibold">S {meal.carbs_g.toFixed(0)}</span>
          <span className="text-[10px] px-1.5 py-[2px] rounded-md bg-macro-fat/15 text-macro-fat font-semibold">T {meal.fat_g.toFixed(0)}</span>
        </div>
      </button>

      {/* kcal */}
      <div className="shrink-0 text-right">
        <span className="font-extrabold text-sm tabular-nums text-ink">{Math.round(meal.kcal)}</span>
        <div className="text-[10px] text-ink-mute">kcal</div>
      </div>

      {/* delete */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="shrink-0 w-7 h-7 rounded-full bg-white/[0.04] text-ink-mute/60 hover:text-red-400 active:scale-90 flex items-center justify-center transition-colors"
        aria-label="Smazat"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
  );
}

function DailyFeedbackCard({ date, kcal, protein, carbs, fat, targets, meals, goal, sex }: {
  date: string;
  kcal: number; protein: number; carbs: number; fat: number;
  targets: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  meals: Meal[];
  goal: 'lose' | 'maintain' | 'gain';
  sex: 'male' | 'female';
}) {
  const cacheKey = `feedback:${date}:${meals.length}`;
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function buildCtx(): FeedbackContext {
    return {
      hour: new Date().getHours(),
      goal,
      sex,
      kcal: { eaten: Math.round(kcal), target: targets.kcal },
      protein: { eaten: Math.round(protein), target: targets.protein_g },
      carbs: { eaten: Math.round(carbs), target: targets.carbs_g },
      fat: { eaten: Math.round(fat), target: targets.fat_g },
      meals: meals.slice(0, 8).map((m) => m.name),
    };
  }

  async function load(force = false) {
    if (!force) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) { setText(cached); return; }
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const msg = await getDailyFeedback(buildCtx());
      setText(msg);
      sessionStorage.setItem(cacheKey, msg);
    } catch {
      setError('Feedback momentálně nedostupný.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (meals.length > 0) load();
    return () => { abortRef.current?.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  if (meals.length === 0) return null;

  return (
    <section className="animate-fade-up">
      <div className="glass rounded-3xl p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-coral-500/5 pointer-events-none" />
        <div className="relative flex gap-3">
          <div className="shrink-0 w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500/25 to-coral-500/25 ring-1 ring-white/10 flex items-center justify-center text-base">
            ✨
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-ink-mute">AI kouč</span>
              <button
                onClick={() => load(true)}
                disabled={loading}
                className="text-[11px] text-ink-mute hover:text-ink-soft active:scale-90 transition-all disabled:opacity-40 flex items-center gap-1"
              >
                {loading
                  ? <span className="inline-block w-3 h-3 border-2 border-white/20 border-t-coral-400 rounded-full animate-spin" />
                  : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
                }
                Obnovit
              </button>
            </div>
            {loading && !text ? (
              <div className="space-y-1.5 py-0.5">
                <div className="h-3 rounded-full bg-white/8 w-full animate-pulse" />
                <div className="h-3 rounded-full bg-white/8 w-3/4 animate-pulse" />
              </div>
            ) : error ? (
              <p className="text-xs text-ink-mute italic">{error}</p>
            ) : text ? (
              <p className="text-sm text-ink leading-relaxed">{text}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

// Suppress unused-import warning for MealType when no other usage exists.
export type { MealType };
