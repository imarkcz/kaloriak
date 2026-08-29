import { useEffect, useRef, useState } from 'react';
import { haptic } from '../lib/haptics';
import { useApp, type SyncStatus } from '../state/AppState';
import type { ActivityLevel, Goal, Intensity, Sex } from '../types';
import { ACTIVITY_FACTORS, ACTIVITY_LABELS, GOAL_LABELS, INTENSITY_DETAIL, INTENSITY_KCAL, INTENSITY_LABEL, computeTargets, dynamicDailyTargets, mifflinStJeor } from '../lib/tdee';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import Icon, { type IconName } from '../components/Icon';
import NumStepper from '../components/NumStepper';

export default function Profile() {
  const { data, user, setProfile, resetAll, signOutUser, setWeight, reloadFromCloud, forceUploadToCloud, syncStatus } = useApp();
  const [syncMsg, setSyncMsg] = useState('');
  const [syncing, setSyncing] = useState(false);

  async function handleReload() {
    setSyncing(true);
    setSyncMsg('');
    const count = await reloadFromCloud();
    setSyncMsg(count === null ? 'Musíš být přihlášen' : `Načteno ${count} jídel`);
    setSyncing(false);
    setTimeout(() => setSyncMsg(''), 4000);
  }

  async function handleUpload() {
    setSyncing(true);
    setSyncMsg('');
    const ok = await forceUploadToCloud();
    setSyncMsg(ok ? 'Nahráno do cloudu' : 'Nahrání selhalo');
    setSyncing(false);
    setTimeout(() => setSyncMsg(''), 3000);
  }

  const navigate = useNavigate();
  const p = data.profile;

  const [name, setName] = useState(p?.name ?? '');
  const [sex, setSex] = useState<Sex>(p?.sex ?? 'male');
  const [age, setAge] = useState(p?.age ?? 30);
  const [heightCm, setHeightCm] = useState(p?.heightCm ?? 175);
  const [weightKg, setWeightKg] = useState(p?.weightKg ?? 75);
  const [targetWeightKg, setTargetWeightKg] = useState(p?.targetWeightKg ?? p?.weightKg ?? 75);
  const [activity, setActivityLocal] = useState<ActivityLevel>(p?.activity ?? 'moderate');
  const [goal, setGoalLocal] = useState<Goal>(p?.goal ?? 'maintain');
  const [intensity, setIntensityLocal] = useState<Intensity>(p?.goalIntensity ?? 'moderate');
  const [useDynamicTdee, setUseDynamicTdeeLocal] = useState<boolean>(p?.useDynamicTdee ?? true);
  const [customSplit, setCustomSplitLocal] = useState<{ proteinPct: number; carbsPct: number; fatPct: number } | undefined>(p?.customMacroSplit);

  // Goal/activity/toggle auto-save — they directly affect daily targets,
  // so requiring an extra "Save" click was confusing (users changed goal
  // but kcal target didn't budge).
  function setUseDynamicTdee(v: boolean) {
    setUseDynamicTdeeLocal(v);
    if (p) setProfile({ ...p, useDynamicTdee: v });
  }
  function setGoal(g: Goal) {
    setGoalLocal(g);
    if (p) {
      const newTargets = computeTargets(sex, weightKg, heightCm, age, activity, g, intensity);
      setProfile({ ...p, sex, weightKg, heightCm, age, goal: g, goalIntensity: intensity, targets: newTargets });
    }
  }
  function setActivity(a: ActivityLevel) {
    setActivityLocal(a);
    if (p) {
      const newTargets = computeTargets(sex, weightKg, heightCm, age, a, goal, intensity);
      setProfile({ ...p, sex, weightKg, heightCm, age, activity: a, goalIntensity: intensity, targets: newTargets });
    }
  }
  function setIntensity(i: Intensity) {
    setIntensityLocal(i);
    if (p) {
      const newTargets = computeTargets(sex, weightKg, heightCm, age, activity, goal, i, customSplit);
      setProfile({ ...p, sex, weightKg, heightCm, age, goal, goalIntensity: i, targets: newTargets });
    }
  }
  function setCustomSplit(s: { proteinPct: number; carbsPct: number; fatPct: number } | undefined) {
    setCustomSplitLocal(s);
    if (p) {
      const newTargets = computeTargets(sex, weightKg, heightCm, age, activity, goal, intensity, s);
      setProfile({ ...p, sex, weightKg, heightCm, age, goal, goalIntensity: intensity, targets: newTargets, customMacroSplit: s });
    }
  }

  // Mirror Today.tsx: when dynamic mode is on, compute target the same way
  // (BMR × sedentary + goal_adjust, ignoring activity multiplier — burned=0
  // here since this is a preview without today's actual activity log).
  // Otherwise calorie shown in Profile won't match what user sees on Today.
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(p?.avatarDataUrl);
  const [saved, setSaved] = useState(false);

  if (!p) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-ink">
        <p>Profil nenalezen.</p>
      </div>
    );
  }

  function handleSave() {
    const targets = computeTargets(sex, weightKg, heightCm, age, activity, goal, intensity, customSplit);
    setProfile({
      name: name.trim() || 'Já',
      sex, age, heightCm, weightKg,
      targetWeightKg,
      activity, goal, goalIntensity: intensity, targets,
      avatarDataUrl,
      useDynamicTdee,
      customMacroSplit: customSplit,
    });
    haptic('success');
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  function handleReset() {
    if (window.confirm('Opravdu smazat všechna data (profil i jídla)?')) {
      resetAll();
      navigate('/onboarding', { replace: true });
    }
  }

  const targets = useDynamicTdee
    ? dynamicDailyTargets(sex, weightKg, heightCm, age, activity, goal, 0, intensity, customSplit)
    : computeTargets(sex, weightKg, heightCm, age, activity, goal, intensity, customSplit);

  return (
    <div className="min-h-dvh pt-safe pb-32">
      <header className="max-w-md mx-auto px-5 pt-5 pb-3 reveal">
        <h1 className="text-h1 font-semibold text-ink">Profil</h1>
        <p className="text-ink-soft text-sm mt-1">Uprav své údaje.</p>
      </header>

      <main className="max-w-md mx-auto px-5 space-y-3">
        {/* Avatar hero */}
        <section className="card p-5 flex items-center gap-5 reveal">
          <Avatar
            src={avatarDataUrl}
            name={name || p.name}
            size={88}
            editable
            onChange={setAvatarDataUrl}
            onRemove={() => setAvatarDataUrl(undefined)}
          />
          <div className="min-w-0 flex-1">
            <div className="text-micro font-semibold uppercase tracking-label text-ink-mute">profil</div>
            <div className="text-h2 font-semibold text-ink truncate mt-0.5">
              {name || p.name || 'Já'}
            </div>
            <div className="text-xs text-ink-mute mt-1 tabular-nums">
              {weightKg.toFixed(1)} kg · {heightCm} cm · {age} let
            </div>
          </div>
        </section>

        <Card title="Osobní údaje">
          <Row label="Jméno">
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Row>
          <Row label="Pohlaví">
            <div className="grid grid-cols-2 gap-2">
              <Choice active={sex === 'male'} onClick={() => setSex('male')}>Muž</Choice>
              <Choice active={sex === 'female'} onClick={() => setSex('female')}>Žena</Choice>
            </div>
          </Row>
          <Slider label="Věk" value={age} unit="let" min={14} max={90} step={1} onChange={setAge} />
          <Slider label="Výška" value={heightCm} unit="cm" min={140} max={220} step={1} onChange={setHeightCm} />
          <Slider label="Hmotnost" value={weightKg} unit="kg" min={40} max={180} step={0.5} onChange={setWeightKg} decimals={1} />
          <Slider label="Cílová hmotnost" value={targetWeightKg} unit="kg" min={40} max={180} step={0.5} onChange={setTargetWeightKg} decimals={1} />
          <WeightDelta current={weightKg} target={targetWeightKg} />
        </Card>

        <Card title="Aktivita a cíl">
          <Row label="Aktivita">
            <div className="grid grid-cols-1 gap-1.5">
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
                <Choice key={a} active={activity === a} onClick={() => setActivity(a)} full>
                  {ACTIVITY_LABELS[a]}
                </Choice>
              ))}
            </div>
            {useDynamicTdee && (
              <p className="text-micro text-ink-mute mt-2 leading-snug">
                Tvoje úroveň aktivity tvoří základ denního cíle. Logované tréninky se přičítají navíc.
              </p>
            )}
          </Row>
          <Row label="Cíl">
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
                <Choice key={g} active={goal === g} onClick={() => setGoal(g)}>
                  {GOAL_LABELS[g]}
                </Choice>
              ))}
            </div>
          </Row>
          {goal !== 'maintain' && (
            <Row label={goal === 'lose' ? 'Tempo hubnutí' : 'Tempo nabírání'}>
              <div className="grid grid-cols-3 gap-2">
                {(['mild', 'moderate', 'aggressive'] as Intensity[]).map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { haptic('tap'); setIntensity(i); }}
                    className={`px-2 py-2.5 rounded-2xl font-semibold text-xs transition-all ${
                      intensity === i
                        ? 'bg-violet-500 text-white'
                        : 'bg-surface-2 text-ink-soft border border-white/5'
                    }`}
                  >
                    <div className="leading-none">{INTENSITY_LABEL[i]}</div>
                    <div className={`text-micro mt-1 font-medium tabular-nums ${intensity === i ? 'text-white/85' : 'text-ink-mute'}`}>
                      {INTENSITY_DETAIL[goal][i]}
                    </div>
                  </button>
                ))}
              </div>
            </Row>
          )}
          <ToggleRow
            label="Dynamický cíl podle aktivit"
            description="Cíl kcal se počítá z BMR + skutečně spálených kalorií místo statického multiplikátoru. Přesnější než pevně nastavená úroveň aktivity."
            value={useDynamicTdee}
            onChange={setUseDynamicTdee}
          />
        </Card>

        <Card title="Denní cíl (přepočteno)">
          <div className="bg-violet-500 rounded-2xl p-4 -m-1 mb-1">
            <div className="text-micro uppercase tracking-label text-white/80 font-semibold">Kalorie</div>
            <div className="text-4xl font-semibold tabular-nums text-white mt-1 leading-none">{targets.kcal}</div>
            <div className="text-xs text-white/80 mt-1">kcal / den</div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <Stat label="Bílkoviny" value={targets.protein_g} unit="g" color="text-macro-protein" bg="bg-macro-protein/15" />
            <Stat label="Sacharidy" value={targets.carbs_g} unit="g" color="text-macro-carbs" bg="bg-macro-carbs/15" />
            <Stat label="Tuky" value={targets.fat_g} unit="g" color="text-macro-fat" bg="bg-macro-fat/15" />
          </div>
          <CalcBreakdown
            sex={sex}
            weightKg={weightKg}
            heightCm={heightCm}
            age={age}
            activity={activity}
            goal={goal}
            intensity={intensity}
          />
        </Card>

        <MacroSplitCard
          totalKcal={targets.kcal}
          split={customSplit}
          onChange={setCustomSplit}
        />

        <WeightCard
          log={data.weightLog ?? {}}
          current={p.weightKg}
          target={targetWeightKg}
          onLog={(kg) => { setWeight(kg); setWeightKg(kg); }}
        />

        <button
          onClick={handleSave}
          className="w-full py-4 rounded-2xl bg-violet-500 text-white font-semibold active:scale-[0.98] transition-transform mt-2"
        >
          {saved ? '✓ Uloženo' : 'Uložit změny'}
        </button>

        <button
          onClick={handleReset}
          className="w-full py-3 rounded-2xl text-danger text-sm font-medium active:scale-95 transition-transform"
        >
          Smazat všechna data
        </button>

        <UpdateCard />

        {user && (
          <>
            <SyncCard
              syncing={syncing}
              syncMsg={syncMsg}
              status={syncStatus}
              onReload={handleReload}
              onUpload={handleUpload}
            />

            <button
              onClick={signOutUser}
              className="w-full py-3 rounded-2xl text-ink-mute text-sm font-medium active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              Odhlásit se ({user.email})
            </button>
          </>
        )}

        <p className="text-center text-micro text-ink-mute pt-2 font-mono tabular-nums">
          Kaloriak • build {__BUILD_ID__}
        </p>
      </main>
    </div>
  );
}

function CalcBreakdown({
  sex, weightKg, heightCm, age, activity, goal, intensity,
}: {
  sex: Sex; weightKg: number; heightCm: number; age: number;
  activity: ActivityLevel; goal: Goal; intensity: Intensity;
}) {
  const bmr = Math.round(mifflinStJeor(sex, weightKg, heightCm, age));
  const factor = ACTIVITY_FACTORS[activity];
  const tdee = Math.round(bmr * factor);
  const adjust = INTENSITY_KCAL[goal][intensity];
  const isLose = adjust < 0;
  const total = Math.max(1200, tdee + adjust);

  const goalLabel = goal === 'maintain'
    ? 'Udržuješ váhu'
    : `${goal === 'lose' ? 'Hubneš' : 'Nabíráš'} v tempu „${INTENSITY_LABEL[intensity].toLowerCase()}"`;
  const adjustText = adjust === 0
    ? 'beze změny'
    : `${isLose ? '−' : '+'}${Math.abs(adjust)} kcal ${isLose ? 'denně' : 'denně'}`;

  return (
    <div className="mt-4 space-y-2">
      <p className="text-micro font-semibold uppercase tracking-label text-ink-mute px-1">Jak jsme to spočítali</p>

      <div className="grid grid-cols-3 gap-2">
        <Tile icon="flame" label="Klidový metabolismus" value={bmr} unit="kcal" />
        <Tile icon="activity" label="Po aktivitě" value={tdee} unit="kcal" />
        <Tile icon="chart" label="Tvůj cíl" value={total} unit="kcal" highlight />
      </div>

      <div className="card p-3.5 flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-surface-2 flex items-center justify-center text-violet-300 shrink-0"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <Icon name="chart" size={17} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink leading-tight">{goalLabel}</div>
          <div className="text-micro text-ink-mute mt-0.5">{adjustText}</div>
        </div>
      </div>
    </div>
  );
}

function Tile({ icon, label, value, unit, highlight = false }: {
  icon: IconName; label: string; value: number; unit: string; highlight?: boolean;
}) {
  return (
    <div
      className="rounded-field p-3.5"
      style={highlight
        ? { background: '#8f69e0' }
        : { background: '#1a181d', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <span className={highlight ? 'text-white/80' : 'text-violet-300'}>
        <Icon name={icon} size={16} />
      </span>
      <div className={`text-micro leading-tight mt-2 ${highlight ? 'text-white/80' : 'text-ink-mute'}`}>{label}</div>
      <div className={`text-h2 font-semibold tabular-nums mt-1 leading-none ${highlight ? 'text-white' : 'text-ink'}`}>
        {value}
      </div>
      <div className={`text-micro mt-1 ${highlight ? 'text-white/70' : 'text-ink-dim'}`}>{unit}</div>
    </div>
  );
}

function MacroSplitCard({
  totalKcal, split, onChange,
}: {
  totalKcal: number;
  split: { proteinPct: number; carbsPct: number; fatPct: number } | undefined;
  onChange: (s: { proteinPct: number; carbsPct: number; fatPct: number } | undefined) => void;
}) {
  const enabled = !!split;
  const current = split ?? { proteinPct: 30, carbsPct: 40, fatPct: 30 };

  // Adjust one macro: rebalance the other two proportionally so the total
  // stays at 100. If the others were both 0, split equally.
  function setPct(key: 'proteinPct' | 'carbsPct' | 'fatPct', newVal: number) {
    const v = Math.max(5, Math.min(80, Math.round(newVal)));
    const otherKeys = (['proteinPct', 'carbsPct', 'fatPct'] as const).filter((k) => k !== key);
    const remaining = 100 - v;
    const oldSum = current[otherKeys[0]] + current[otherKeys[1]];
    let a: number, b: number;
    if (oldSum <= 0) { a = b = Math.round(remaining / 2); }
    else {
      a = Math.round(remaining * (current[otherKeys[0]] / oldSum));
      b = remaining - a;
    }
    onChange({ ...current, [key]: v, [otherKeys[0]]: a, [otherKeys[1]]: b } as typeof current);
  }

  const protein_g = Math.round((totalKcal * current.proteinPct / 100) / 4);
  const carbs_g = Math.round((totalKcal * current.carbsPct / 100) / 4);
  const fat_g = Math.round((totalKcal * current.fatPct / 100) / 9);

  const presets = [
    { name: 'Vyvážený', p: 30, c: 40, f: 30 },
    { name: 'Hubnoucí', p: 40, c: 30, f: 30 },
    { name: 'Low-carb',  p: 35, c: 20, f: 45 },
    { name: 'Keto',      p: 25, c: 5,  f: 70 },
  ];

  return (
    <section className="card p-5 reveal">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-micro font-semibold uppercase tracking-label text-ink-mute">Rozložení makroživin</h2>
        <button
          type="button"
          onClick={() => { haptic('tap'); onChange(enabled ? undefined : current); }}
          className={`text-micro font-semibold px-3 py-1.5 rounded-full transition-all ${
            enabled ? 'bg-violet-500 text-white' : 'bg-surface-2 text-ink-soft ring-1 ring-line-2'
          }`}
        >
          {enabled ? 'Vlastní' : 'Automatické'}
        </button>
      </div>

      {!enabled && (
        <p className="text-xs text-ink-soft leading-snug">
          Makra se počítají automaticky podle tvé váhy a cíle. Klepni nahoře pro vlastní nastavení.
        </p>
      )}

      {enabled && (
        <div className="space-y-4">
          <MacroSlider label="Bílkoviny" pct={current.proteinPct} grams={protein_g} accent="bg-macro-protein" textColor="text-macro-protein" onChange={(v) => setPct('proteinPct', v)} />
          <MacroSlider label="Sacharidy" pct={current.carbsPct}   grams={carbs_g}   accent="bg-macro-carbs"   textColor="text-macro-carbs"   onChange={(v) => setPct('carbsPct', v)} />
          <MacroSlider label="Tuky"      pct={current.fatPct}     grams={fat_g}     accent="bg-macro-fat"     textColor="text-macro-fat"     onChange={(v) => setPct('fatPct', v)} />

          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <span className="text-micro text-ink-mute">Součet</span>
            <span className={`text-xs font-semibold tabular-nums ${current.proteinPct + current.carbsPct + current.fatPct === 100 ? 'text-ok' : 'text-warn'}`}>
              {current.proteinPct + current.carbsPct + current.fatPct} %
            </span>
          </div>

          <div className="flex gap-1.5 flex-wrap pt-1">
            {presets.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => { haptic('tap'); onChange({ proteinPct: p.p, carbsPct: p.c, fatPct: p.f }); }}
                className="px-3 py-1.5 rounded-full text-micro font-semibold bg-surface-2 text-ink-soft border border-white/5 active:scale-95 transition-transform"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function MacroSlider({ label, pct, grams, accent, textColor, onChange }: {
  label: string; pct: number; grams: number; accent: string; textColor: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className={`text-sm font-semibold ${textColor}`}>{label}</span>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold tabular-nums text-ink">{pct}%</span>
          <span className="text-micro text-ink-mute tabular-nums">{grams} g</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(pct - 5)} className="w-9 h-9 rounded-full bg-surface-2 ring-1 ring-line-2 text-ink active:scale-90 transition-transform shrink-0 flex items-center justify-center" aria-label="Méně">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14"/></svg>
        </button>
        <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
          <div className={`h-full ${accent} rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <button type="button" onClick={() => onChange(pct + 5)} className="w-9 h-9 rounded-full bg-surface-2 ring-1 ring-line-2 text-ink active:scale-90 transition-transform shrink-0 flex items-center justify-center" aria-label="Více">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
    </div>
  );
}

function UpdateCard() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'uptodate'>('idle');

  async function check() {
    setStatus('checking');
    haptic('tap');
    try {
      const res = await fetch('/build.txt', { cache: 'no-store' });
      const serverBuild = (await res.text()).trim();
      if (serverBuild !== __BUILD_ID__) {
        // New version on server — trigger SW update so the banner appears,
        // then fall through to show "uptodate" in case SW update is slow.
        const trigger = (window as unknown as { __kaloriakCheckUpdate?: () => Promise<void> }).__kaloriakCheckUpdate;
        if (trigger) await trigger().catch(() => {});
      }
    } catch { /* network error — just show uptodate */ }
    setStatus('uptodate');
    setTimeout(() => setStatus('idle'), 2400);
  }

  // Hard reset — unregister SW + clear all caches + reload. Keeps localStorage
  // (so user stays logged in / keeps profile). Cloud data is untouched.
  async function hardReset() {
    if (!window.confirm('Toto vynutí stažení nejnovější verze. Tvoje data v cloudu i přihlášení zůstanou. Pokračovat?')) return;
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } finally {
      // Cache-busting query param forces the browser (and iOS PWA) to make
      // a real network request rather than serving from disk cache.
      window.location.href = '/?_=' + Date.now();
    }
  }

  return (
    <section className="card p-5">
      <h3 className="text-h3 font-semibold text-ink">Verze aplikace</h3>
      <p className="text-sm text-ink-mute mt-1.5 leading-snug">
        Novou verzi ohlásí proužek nahoře. Když máš pocit, že ti visí stará, vynuť stažení.
      </p>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <button onClick={check} disabled={status === 'checking'} className="btn btn-ghost py-2.5 text-sm">
          {status === 'checking' ? (
            <><Icon name="refresh" size={15} className="animate-spin-slow" />Hledám</>
          ) : status === 'uptodate' ? (
            <><Icon name="check" size={15} />Aktuální</>
          ) : (
            <><Icon name="refresh" size={15} />Zkontrolovat</>
          )}
        </button>
        <button onClick={hardReset} className="btn btn-ghost py-2.5 text-sm">
          <Icon name="trash" size={15} />
          Smazat cache
        </button>
      </div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 reveal">
      <h2 className="text-micro font-semibold uppercase tracking-label text-ink-mute mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="block text-sm font-medium text-ink-soft mb-2">{label}</span>
      {children}
    </div>
  );
}

function Slider({
  label, value, unit, min, max, step, onChange, decimals = 0,
}: {
  label: string; value: number; unit: string; min: number; max: number; step: number;
  onChange: (v: number) => void; decimals?: number;
}) {
  const lastTick = useRef(value);
  const inputRef = useRef<HTMLInputElement>(null);
  // On touch devices, range inputs capture scroll gestures and change values
  // while the user is just scrolling past. Require an explicit tap to activate.
  const [active, setActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function activate() {
    setActive(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setActive(false), 4000);
    inputRef.current?.focus();
  }

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    // Non-passive wheel handler so we can actually prevent it
    const onWheel = (e: WheelEvent) => { e.preventDefault(); el.blur(); setActive(false); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <label className="block" onClick={activate}>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm font-medium text-ink-soft">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-ink">{value.toFixed(decimals)} <span className="text-xs text-ink-mute font-medium">{unit}</span></span>
      </div>
      <div className="relative">
        <input
          ref={inputRef}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            if (!active) return;
            const v = Number(e.target.value);
            onChange(v);
            if (Math.floor(v) !== Math.floor(lastTick.current)) {
              haptic('tick');
              lastTick.current = v;
            }
          }}
          onBlur={() => setActive(false)}
          className="w-full"
          style={{ pointerEvents: active ? 'auto' : 'none' }}
        />
        {!active && (
          <div className="absolute inset-0 flex items-center justify-end pr-1 pointer-events-none">
            <span className="text-micro text-ink-mute bg-surface-2 px-2 py-0.5 rounded-full">klepni pro úpravu</span>
          </div>
        )}
      </div>
    </label>
  );
}

function Choice({ active, onClick, children, full }: { active: boolean; onClick: () => void; children: React.ReactNode; full?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => { haptic('tap'); onClick(); }}
      className={`${full ? 'w-full text-left px-4' : 'px-3'} py-2.5 rounded-xl font-semibold text-sm transition-all ${
        active
          ? 'bg-violet-500 text-white'
          : 'bg-surface-2 text-ink-soft border border-white/5'
      }`}
    >
      {children}
    </button>
  );
}

function WeightDelta({ current, target }: { current: number; target: number }) {
  const delta = +(target - current).toFixed(1);
  if (Math.abs(delta) < 0.1) {
    return <p className="text-sm text-ok">Jsi přesně na svém cíli.</p>;
  }
  return (
    <p className="text-sm text-ink-mute tabular-nums">
      {delta < 0 ? 'Zhubnout' : 'Nabrat'}{' '}
      <strong className="text-violet-300 font-semibold">{Math.abs(delta).toFixed(1)} kg</strong> do cíle.
    </p>
  );
}

// Weight is the one honest feedback loop when losing or gaining, so it gets a
// dated log and a 7-day moving average rather than a single overwritten number.
function WeightCard({ log, current, target, onLog }: {
  log: Record<string, number>;
  current: number;
  target: number;
  onLog: (kg: number) => void;
}) {
  const [draft, setDraft] = useState(current);
  const points = Object.entries(log).sort(([a], [b]) => a.localeCompare(b));
  const today = new Date().toISOString().slice(0, 10);
  const loggedToday = today in log;

  const recent = points.slice(-7).map(([, kg]) => kg);
  const avg = recent.length ? recent.reduce((s, v) => s + v, 0) / recent.length : current;
  const first = points.length ? points[0][1] : current;
  const change = +(current - first).toFixed(1);

  // Sparkline over the last 30 entries.
  const series = points.slice(-30).map(([, kg]) => kg);
  const lo = Math.min(...series, target, current);
  const hi = Math.max(...series, target, current);
  const span = Math.max(0.5, hi - lo);
  const path = series.length > 1
    ? series.map((kg, i) => {
        const x = 1 + (i / (series.length - 1)) * 98;
        const y = 30 - ((kg - lo) / span) * 26 - 2;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      }).join(' ')
    : '';

  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-micro font-semibold uppercase tracking-label text-ink-mute">Váha</h2>
        {points.length > 1 && (
          <span className="text-micro tabular-nums text-ink-mute">
            {change > 0 ? '+' : ''}{change} kg od začátku
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-hero font-semibold tabular-nums text-ink leading-none">{current.toFixed(1)}</span>
        <span className="text-base text-ink-mute">kg</span>
        <span className="flex-1" />
        <span className="text-micro text-ink-dim tabular-nums">cíl {target.toFixed(1)} kg</span>
      </div>

      {series.length > 1 ? (
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-16 mt-4" aria-hidden="true">
          <defs>
            <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8f69e0" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#8f69e0" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${path} L99,30 L1,30 Z`} fill="url(#weightFill)" stroke="none" />
          <path d={path} fill="none" stroke="#b9a3ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <circle
            cx="99"
            cy={30 - ((series[series.length - 1] - lo) / span) * 26 - 2}
            r="2"
            fill="#b9a3ff"
          />
        </svg>
      ) : (
        <p className="text-micro text-ink-dim mt-4">Zapiš váhu pár dní po sobě a uvidíš tady křivku.</p>
      )}

      <p className="text-micro text-ink-mute mt-1 tabular-nums">
        Průměr posledních {recent.length || 1}: <span className="text-ink-soft">{avg.toFixed(1)} kg</span>
      </p>

      <div className="mt-4">
        <NumStepper value={draft} onChange={setDraft} min={30} max={250} step={0.1} bigStep={1} unit="kg" compact />
        <button
          onClick={() => { onLog(draft); haptic('success'); }}
          className="btn btn-primary w-full py-3 mt-2"
        >
          {loggedToday ? 'Přepsat dnešní váhu' : 'Zapsat dnešní váhu'}
        </button>
      </div>
    </section>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="rounded-2xl bg-surface-2 ring-1 ring-line p-3.5 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-ink">{label}</div>
        {description && <div className="text-micro text-ink-mute mt-0.5 leading-relaxed">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative w-[52px] h-8 rounded-full transition-colors shrink-0 ring-1 ${
          value ? 'bg-violet-500 ring-white/20' : 'bg-white/10 ring-white/10'
        }`}
      >
        <span
          className="absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-lg transition-transform duration-200 ease-out"
          style={{ transform: value ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  );
}

function Stat({ label, value, unit, color, bg }: { label: string; value: number; unit: string; color: string; bg: string }) {
  return (
    <div className={`rounded-2xl p-3 text-center ${bg}`}>
      <div className={`tabular-nums text-h2 font-semibold leading-none ${color}`}>{value}</div>
      <div className="text-micro text-ink-mute uppercase tracking-label mt-1.5 font-semibold">{label}</div>
      <div className="text-micro text-ink-mute">{unit}</div>
    </div>
  );
}

function SyncCard({ syncing, syncMsg, status, onReload, onUpload }: {
  syncing: boolean;
  syncMsg: string;
  status: SyncStatus;
  onReload: () => void;
  onUpload: () => void;
}) {
  const label: Record<SyncStatus, string> = {
    idle: 'Nepřihlášen',
    pending: 'Ukládám…',
    synced: 'Vše uložené v cloudu',
    offline: 'Offline, doručí se samo',
    error: 'Cloud odmítá zápis',
  };
  const colour: Record<SyncStatus, string> = {
    idle: 'text-ink-mute',
    pending: 'text-violet-300',
    synced: 'text-ok',
    offline: 'text-ink-mute',
    error: 'text-danger',
  };

  return (
    <section className="card p-5">
      <div className="flex items-center gap-2.5 mb-1.5">
        <span className={colour[status]}><Icon name="cloud" size={17} /></span>
        <h3 className="text-h3 font-semibold text-ink">Synchronizace</h3>
      </div>
      <p className={`text-sm ${colour[status]}`}>{label[status]}</p>
      <p className="text-micro text-ink-mute mt-2 leading-snug">
        Zápisy se ukládají do telefonu okamžitě a Firestore je doručí sám, i po zavření aplikace.
        Tlačítka níž potřebuješ jen výjimečně.
      </p>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button onClick={onReload} disabled={syncing} className="btn btn-ghost py-2.5 text-sm">
          <Icon name="refresh" size={15} className={syncing ? 'animate-spin-slow' : ''} />
          Načíst
        </button>
        <button onClick={onUpload} disabled={syncing} className="btn btn-ghost py-2.5 text-sm">
          <Icon name="cloud" size={15} />
          Nahrát
        </button>
      </div>

      {syncMsg && <p className="text-center text-micro text-ink-mute mt-2.5">{syncMsg}</p>}
    </section>
  );
}
