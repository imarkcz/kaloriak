import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useSensor, useSensors, useDroppable, useDraggable,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';

import { useApp } from '../state/AppState';
import { todayISO, formatDateLabel } from '../lib/date';
import { dynamicDailyTargets } from '../lib/tdee';
import { ACTIVITY_LABEL } from '../lib/activityKcal';
import { categorize } from '../lib/foodCategory';
import { recentFoodsFromMeals } from '../lib/recentFoods';
import { MEAL_TYPE_META, MEAL_TYPE_ORDER, defaultMealTypeForNow, resolveMealType } from '../lib/mealType';
import { getDailyFeedback, type FeedbackContext } from '../lib/gemini';
import { haptic } from '../lib/haptics';
import type { Meal, MealType } from '../types';
import type { FoodSearchResult } from '../lib/foodSearch';

import ProgressRing from '../components/ProgressRing';
import MacroBar from '../components/MacroBar';
import WaterTracker from '../components/WaterTracker';
import FoodThumb from '../components/FoodThumb';
import Avatar from '../components/Avatar';
import EditMealSheet from '../components/EditMealSheet';
import Icon from '../components/Icon';

export default function Today() {
  const { data, addMeal, deleteMeal, updateMeal, deleteActivity, setWater } = useApp();
  const [date, setDate] = useState(() => todayISO());
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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

  // Snap back to today when the app returns from the background, so opening it
  // the next morning does not leave you on yesterday.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') setDate(todayISO());
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

  const recent = useMemo(() => recentFoodsFromMeals(data.meals, 6), [data.meals]);

  const profile = data.profile;
  const baseTargets = profile?.targets ?? { kcal: 2000, protein_g: 150, carbs_g: 220, fat_g: 65 };
  const targets = profile?.useDynamicTdee
    ? dynamicDailyTargets(profile.sex, profile.weightKg, profile.heightCm, profile.age, profile.activity, profile.goal, burned, profile.goalIntensity ?? 'moderate', profile.customMacroSplit)
    : { ...baseTargets, kcal: baseTargets.kcal + burned };

  const isToday = date === todayISO();

  function shiftDay(delta: number) {
    const [y, m, d] = date.split('-').map(Number);
    const nd = new Date(y, m - 1, d + delta);
    setDate(`${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}-${String(nd.getDate()).padStart(2, '0')}`);
  }

  // One tap re-logs something already eaten before, at its usual portion.
  function quickAdd(r: FoodSearchResult) {
    haptic('success');
    const grams = r.defaultGrams || 100;
    const ratio = grams / (r.per || 100);
    addMeal({
      id: crypto.randomUUID(),
      date: todayISO(),
      createdAt: Date.now(),
      name: r.name,
      grams,
      kcal: Math.round(r.kcal * ratio),
      protein_g: +(r.protein_g * ratio).toFixed(1),
      carbs_g: +(r.carbs_g * ratio).toFixed(1),
      fat_g: +(r.fat_g * ratio).toFixed(1),
      mealType: defaultMealTypeForNow(),
      imageDataUrl: r.imageUrl,
    });
  }

  return (
    <div className="min-h-dvh pt-safe pb-32">
      <header className="max-w-md mx-auto px-5 pt-5 pb-5 flex items-center justify-between reveal">
        <Link to="/profile" className="flex items-center gap-3 transition-transform duration-200 active:scale-[0.98]" aria-label="Otevřít profil">
          <Avatar src={profile?.avatarDataUrl} name={profile?.name} size={42} />
          <div>
            <div className="text-micro text-ink-mute">{profile?.name ?? 'Ahoj'}</div>
            <h1 className="text-h1 font-semibold text-ink capitalize leading-tight">{formatDateLabel(date)}</h1>
          </div>
        </Link>
        <div className="flex gap-1.5">
          <IconBtn onClick={() => shiftDay(-1)} label="Předchozí den"><Icon name="left" size={17} /></IconBtn>
          <IconBtn onClick={() => shiftDay(1)} label="Další den" disabled={isToday}><Icon name="right" size={17} /></IconBtn>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 space-y-3.5">

        {/* HERO — answers "how much can I still have" */}
        <section className="card card-lit p-6 flex flex-col items-center reveal" style={{ '--i': 1 } as React.CSSProperties}>
          <ProgressRing eaten={kcal} target={targets.kcal} size={216} stroke={10} />
          <p className="mt-5 text-sm text-ink-mute tabular-nums text-center">
            {Math.round(kcal)} snědeno
            {burned > 0 && <> · {burned} spáleno</>}
            {' · cíl '}{targets.kcal}
          </p>
          {profile?.useDynamicTdee && (
            <p className="mt-1 text-micro text-ink-dim text-center">
              {burned > 0 ? 'dynamický cíl, tréninky se přičítají' : 'dynamický cíl, zatím bez tréninku'}
            </p>
          )}
        </section>

        <MacroBar protein={protein} carbs={carbs} fat={fat} targets={targets} />

        {/* QUICK LOG — the shortest path to a logged meal */}
        {isToday && recent.length > 0 && (
          <section className="reveal" style={{ '--i': 3 } as React.CSSProperties}>
            <div className="flex items-baseline justify-between px-1 mb-2.5">
              <h2 className="text-micro font-semibold uppercase tracking-label text-ink-mute">Rychlý zápis</h2>
              <Link to="/add" className="text-micro text-violet-300 transition-opacity duration-200 active:opacity-60">
                Všechno jídlo
              </Link>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5" style={{ scrollbarWidth: 'none' }}>
              {recent.map((r) => (
                <button
                  key={r.id}
                  onClick={() => quickAdd(r)}
                  className="shrink-0 w-[132px] card p-3 text-left transition-transform duration-200 active:scale-[0.97]"
                >
                  <FoodThumb src={r.imageUrl} alt={r.name} size="sm" category={r.category ?? categorize(r.name)} />
                  <div className="mt-2.5 text-sm font-medium text-ink leading-tight line-clamp-2 h-[2.3rem]">
                    {r.name}
                  </div>
                  <div className="mt-1 text-micro text-ink-mute tabular-nums">
                    {r.defaultGrams} g · {Math.round(r.kcal * (r.defaultGrams / (r.per || 100)))} kcal
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* MEALS */}
        <section className="reveal" style={{ '--i': 4 } as React.CSSProperties}>
          <div className="flex items-baseline justify-between px-1 mb-2.5">
            <h2 className="text-micro font-semibold uppercase tracking-label text-ink-mute">Jídla</h2>
            <span className="text-micro text-ink-dim tabular-nums">{meals.length}</span>
          </div>

          {meals.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-h3 font-semibold text-ink">Dnes zatím nic</p>
              <p className="text-sm text-ink-mute mt-1.5 leading-snug">
                Vyfoť talíř, naskenuj obal nebo najdi jídlo v databázi.
              </p>
              <Link to="/add" className="btn btn-primary px-5 py-3 mt-5">
                <Icon name="plus" size={17} strokeWidth={2} />
                Přidat jídlo
              </Link>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              autoScroll={{ threshold: { x: 0, y: 0.18 }, interval: 5 }}
            >
              <div className="space-y-2.5">
                {MEAL_TYPE_ORDER.map((type) => {
                  const items = meals.filter((m) => resolveMealType(m) === type);
                  if (items.length === 0 && !draggingId) return null;
                  const meta = MEAL_TYPE_META[type];
                  const sectionKcal = items.reduce((s, m) => s + m.kcal, 0);
                  return (
                    <DroppableSection key={type} id={type} isDragging={!!draggingId}>
                      <div className="flex items-baseline gap-2 px-4 pt-3.5 pb-2.5">
                        <span className="text-h3 font-semibold text-ink">{meta.label}</span>
                        <span className="text-micro text-ink-dim tabular-nums">{meta.range}</span>
                        <span className="flex-1" />
                        <span className="text-sm font-semibold text-ink-soft tabular-nums">
                          {Math.round(sectionKcal)}
                          <span className="text-ink-dim font-normal"> kcal</span>
                        </span>
                      </div>
                      {items.map((m) => (
                        <MealRow
                          key={m.id}
                          meal={m}
                          onEdit={() => setEditingMeal(m)}
                          onDelete={() => { if (window.confirm(`Smazat „${m.name}"?`)) deleteMeal(m.id); }}
                        />
                      ))}
                      {items.length === 0 && draggingId && (
                        <div className="px-4 pb-5 pt-1 text-center text-micro text-ink-dim">Přetáhni sem</div>
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
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-field"
                      style={{ width: 216, background: '#1a181d', border: '1px solid rgba(143,105,224,0.45)' }}
                    >
                      <FoodThumb src={m.imageDataUrl} alt={m.name} size="sm" category={categorize(m.name)} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink truncate">{m.name}</div>
                        <div className="text-micro text-ink-mute tabular-nums">{Math.round(m.kcal)} kcal</div>
                      </div>
                    </div>
                  );
                })() : null}
              </DragOverlay>
            </DndContext>
          )}
        </section>

        <WaterTracker
          ml={data.water?.[date] ?? 0}
          goalMl={2000}
          servingMl={250}
          onAdd={(d) => setWater(date, (data.water?.[date] ?? 0) + d)}
          onRemove={(d) => setWater(date, Math.max(0, (data.water?.[date] ?? 0) - d))}
        />

        {/* ACTIVITIES */}
        <section className="reveal" style={{ '--i': 5 } as React.CSSProperties}>
          <div className="flex items-baseline justify-between px-1 mb-2.5">
            <h2 className="text-micro font-semibold uppercase tracking-label text-ink-mute">Aktivity</h2>
            <Link to="/activity" className="text-micro text-violet-300 transition-opacity duration-200 active:opacity-60">
              Přidat
            </Link>
          </div>

          {activities.length === 0 ? (
            <Link to="/activity" className="card p-4 flex items-center gap-3.5 transition-transform duration-200 active:scale-[0.99]">
              <span className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center text-violet-300 shrink-0"
                    style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                <Icon name="activity" size={18} />
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium text-ink">Zaznamenat trénink</div>
                <div className="text-micro text-ink-mute">Spálené kalorie navýší dnešní cíl.</div>
              </div>
              <Icon name="right" size={16} className="text-ink-dim" />
            </Link>
          ) : (
            <div className="card divide-y divide-white/[0.05]">
              {activities.map((a) => (
                <div key={a.id} className="flex items-center gap-3.5 p-4">
                  <span className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center text-violet-300 shrink-0"
                        style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                    <Icon name="activity" size={18} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink truncate">{a.name}</div>
                    <div className="text-micro text-ink-mute tabular-nums">
                      {a.name === ACTIVITY_LABEL[a.kind].label ? '' : `${ACTIVITY_LABEL[a.kind].label} · `}
                      {a.minutes} min
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-ok shrink-0">−{a.kcal}</div>
                  <button
                    onClick={() => { if (window.confirm(`Smazat aktivitu „${a.name}"?`)) deleteActivity(a.id); }}
                    className="shrink-0 w-8 h-8 rounded-full text-ink-dim hover:text-danger flex items-center justify-center transition-colors"
                    aria-label="Smazat aktivitu"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <DailyFeedbackCard
          date={date}
          kcal={kcal} protein={protein} carbs={carbs} fat={fat}
          targets={targets}
          meals={meals}
          goal={profile?.goal ?? 'maintain'}
          sex={profile?.sex ?? 'male'}
        />
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

function IconBtn({ children, onClick, label, disabled }: {
  children: React.ReactNode; onClick: () => void; label: string; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} className="btn btn-ghost w-10 h-10 rounded-full">
      {children}
    </button>
  );
}

function DroppableSection({ id, children, isDragging }: {
  id: MealType; children: React.ReactNode; isDragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className="card overflow-hidden transition-colors duration-200"
      style={isOver
        ? { borderColor: 'rgba(143,105,224,0.55)' }
        : isDragging ? { borderColor: 'rgba(255,255,255,0.12)' } : undefined}
    >
      {children}
    </div>
  );
}

function MealRow({ meal, onEdit, onDelete }: {
  meal: Meal; onEdit: () => void; onDelete: () => void;
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
      className="flex items-center gap-3 px-3 py-2.5 border-t border-white/[0.05]"
    >
      <button
        {...listeners}
        {...attributes}
        className="shrink-0 text-ink-dim hover:text-ink-mute touch-none transition-colors p-1 -m-1"
        tabIndex={-1}
        aria-label="Přetáhnout"
      >
        <Icon name="grip" size={16} strokeWidth={2.5} />
      </button>

      <FoodThumb src={meal.imageDataUrl} alt={meal.name} size="sm" category={categorize(meal.name)} />

      <button onClick={() => { if (!wasDragging.current) onEdit(); }} className="flex-1 min-w-0 text-left">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-sm font-medium text-ink truncate">{meal.name}</span>
          <span className="text-micro text-ink-dim shrink-0 tabular-nums">{meal.grams} g</span>
        </div>
        <div className="flex items-center gap-2.5 mt-1 text-micro tabular-nums text-ink-mute">
          <span><i className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-[1px]" style={{ background: '#f47da6' }} />{meal.protein_g.toFixed(0)}</span>
          <span><i className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-[1px]" style={{ background: '#e8b45f' }} />{meal.carbs_g.toFixed(0)}</span>
          <span><i className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-[1px]" style={{ background: '#6ec2f0' }} />{meal.fat_g.toFixed(0)}</span>
        </div>
      </button>

      <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">{Math.round(meal.kcal)}</span>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="shrink-0 w-8 h-8 rounded-full text-ink-dim hover:text-danger flex items-center justify-center transition-colors"
        aria-label="Smazat"
      >
        <Icon name="close" size={13} />
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
  const [error, setError] = useState(false);

  // load() closes over the current props, so the context is built at call time.
  function buildContext(): FeedbackContext {
    return {
      hour: new Date().getHours(),
      goal, sex,
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
    setLoading(true);
    setError(false);
    try {
      const msg = await getDailyFeedback(buildContext());
      setText(msg);
      sessionStorage.setItem(cacheKey, msg);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (meals.length > 0) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  if (meals.length === 0) return null;

  return (
    <section className="card p-4 reveal" style={{ '--i': 6 } as React.CSSProperties}>
      <div className="flex gap-3.5">
        <span className="shrink-0 w-9 h-9 rounded-xl bg-surface-2 flex items-center justify-center text-violet-300"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <Icon name="spark" size={17} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-micro font-semibold uppercase tracking-label text-ink-mute">Shrnutí dne</span>
            <button
              onClick={() => load(true)}
              disabled={loading}
              className="text-ink-dim hover:text-ink-soft transition-colors disabled:opacity-40"
              aria-label="Načíst znovu"
            >
              <Icon name="refresh" size={14} className={loading ? 'animate-spin-slow' : ''} />
            </button>
          </div>
          {loading && !text ? (
            <div className="space-y-2 py-1">
              <div className="h-2.5 rounded-full bg-surface-2 w-full" />
              <div className="h-2.5 rounded-full bg-surface-2 w-3/5" />
            </div>
          ) : error ? (
            <p className="text-sm text-ink-mute">Shrnutí se nepovedlo načíst.</p>
          ) : text ? (
            <p className="text-sm text-ink-soft leading-relaxed">{text}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
