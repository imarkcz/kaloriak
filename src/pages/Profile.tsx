import { useRef, useState } from 'react';
import { haptic } from '../lib/haptics';
import { useApp } from '../state/AppState';
import type { ActivityLevel, Goal, Intensity, Sex } from '../types';
import { ACTIVITY_FACTORS, ACTIVITY_LABELS, GOAL_LABELS, INTENSITY_DETAIL, INTENSITY_KCAL, INTENSITY_LABEL, computeTargets, dynamicDailyTargets, mifflinStJeor } from '../lib/tdee';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';

export default function Profile() {
  const { data, user, setProfile, setApiKey, resetAll, signOutUser, reloadFromCloud, forceUploadToCloud } = useApp();
  const [syncMsg, setSyncMsg] = useState('');
  const [syncing, setSyncing] = useState(false);

  async function handleReload() {
    setSyncing(true);
    setSyncMsg('');
    const ok = await reloadFromCloud();
    setSyncMsg(ok ? '✓ Data načtena z cloudu' : 'V cloudu nejsou žádná data');
    setSyncing(false);
    setTimeout(() => setSyncMsg(''), 3000);
  }

  async function handleUpload() {
    setSyncing(true);
    setSyncMsg('');
    const ok = await forceUploadToCloud();
    setSyncMsg(ok ? '✓ Data nahrána do cloudu' : 'Musíš být přihlášen');
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
  const [apiKey] = useState(data.geminiApiKey);
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
    setApiKey(apiKey.trim());
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
      <header className="max-w-md mx-auto px-5 pt-5 pb-3 animate-fade-up">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Profil</h1>
        <p className="text-ink-soft text-sm mt-1">Uprav své údaje a API klíč.</p>
      </header>

      <main className="max-w-md mx-auto px-5 space-y-3">
        {/* Avatar hero */}
        <section className="glass rounded-3xl p-5 flex items-center gap-5 animate-fade-up">
          <Avatar
            src={avatarDataUrl}
            name={name || p.name}
            size={88}
            editable
            onChange={setAvatarDataUrl}
            onRemove={() => setAvatarDataUrl(undefined)}
          />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-mute">profil</div>
            <div className="text-2xl font-extrabold tracking-tight text-ink truncate mt-0.5">
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
              <p className="text-[11px] text-ink-mute mt-2 leading-snug">
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
                        ? 'bg-grad-coral text-white shadow-coral-soft'
                        : 'bg-white/[0.04] text-ink-soft border border-white/5'
                    }`}
                  >
                    <div className="leading-none">{INTENSITY_LABEL[i]}</div>
                    <div className={`text-[9px] mt-1 font-medium tabular-nums ${intensity === i ? 'text-white/85' : 'text-ink-mute'}`}>
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
          <div className="bg-grad-coral rounded-2xl p-4 -m-1 mb-1 shadow-coral-soft">
            <div className="text-[11px] uppercase tracking-wider text-white/80 font-bold">Kalorie</div>
            <div className="text-4xl font-extrabold tabular-nums text-white mt-1 leading-none">{targets.kcal}</div>
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


        <button
          onClick={handleSave}
          className="w-full py-4 rounded-2xl bg-grad-coral text-white font-semibold shadow-coral-soft active:scale-[0.98] transition-transform mt-2"
        >
          {saved ? '✓ Uloženo' : 'Uložit změny'}
        </button>

        <button
          onClick={handleReset}
          className="w-full py-3 rounded-2xl text-red-400 text-sm font-medium active:scale-95 transition-transform"
        >
          Smazat všechna data
        </button>

        <UpdateCard />

        {user && (
          <>
            <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/5 p-4 mt-2">
              <h3 className="text-sm font-bold text-ink mb-1">Cloud záloha</h3>
              <p className="text-xs text-ink-soft mb-3">
                Tvá data jsou bezpečně uložená v Google cloudu — přežijí přeinstalaci aplikace i přechod na jiný telefon.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleReload}
                  disabled={syncing}
                  className="py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-ink text-xs font-semibold active:scale-95 transition-transform disabled:opacity-50"
                >
                  ⬇ Načíst z cloudu
                </button>
                <button
                  onClick={handleUpload}
                  disabled={syncing}
                  className="py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-ink text-xs font-semibold active:scale-95 transition-transform disabled:opacity-50"
                >
                  ⬆ Nahrát do cloudu
                </button>
              </div>
              {syncMsg && (
                <p className={`text-center text-xs mt-2 ${syncMsg.startsWith('✓') ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {syncMsg}
                </p>
              )}
            </div>

            <button
              onClick={signOutUser}
              className="w-full py-3 rounded-2xl text-ink-mute text-sm font-medium active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              Odhlásit se ({user.email})
            </button>
          </>
        )}

        <p className="text-center text-[10px] text-ink-mute pt-2 font-mono tabular-nums">
          Kaloriak • build {__BUILD_ID__}
        </p>
      </main>

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
        .field::placeholder { color: #71717a; }
        .field:focus {
          border-color: #f97366;
          background: rgba(255,255,255,0.06);
          box-shadow: 0 0 0 4px rgba(249,115,102,0.12);
        }
      `}</style>
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
  const isGain = adjust > 0;
  const total = Math.max(1200, tdee + adjust);

  const goalLabel = goal === 'maintain'
    ? 'Udržuješ váhu'
    : `${goal === 'lose' ? 'Hubneš' : 'Nabíráš'} v tempu „${INTENSITY_LABEL[intensity].toLowerCase()}"`;
  const adjustText = adjust === 0
    ? 'beze změny'
    : `${isLose ? '−' : '+'}${Math.abs(adjust)} kcal ${isLose ? 'denně' : 'denně'}`;

  return (
    <div className="mt-4 space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-mute px-1">Jak jsme to spočítali</p>

      <div className="grid grid-cols-3 gap-2">
        <Tile icon="🔥" label="Klidový metabolismus" value={bmr} unit="kcal" />
        <Tile icon="🏃" label="Po aktivitě" value={tdee} unit="kcal" />
        <Tile icon={isLose ? '📉' : isGain ? '📈' : '⚖️'} label="Tvůj cíl" value={total} unit="kcal" highlight />
      </div>

      <div className="rounded-2xl glass p-3.5 flex items-center gap-3">
        <div className="text-2xl leading-none">{isLose ? '📉' : isGain ? '📈' : '⚖️'}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-ink leading-tight">{goalLabel}</div>
          <div className="text-[11px] text-ink-mute mt-0.5">{adjustText}</div>
        </div>
      </div>
    </div>
  );
}

function Tile({ icon, label, value, unit, highlight = false }: { icon: string; label: string; value: number; unit: string; highlight?: boolean }) {
  return (
    <div className={`relative rounded-2xl p-3 overflow-hidden ${highlight ? '' : 'bg-white/[0.04] ring-1 ring-white/5'}`}>
      {highlight && (
        <>
          <div className="absolute inset-0 bg-grad-coral opacity-95" />
          <div className="absolute inset-0 bg-black/15" />
        </>
      )}
      <div className="relative">
        <div className="text-base leading-none mb-1.5">{icon}</div>
        <div className={`text-[10px] uppercase tracking-wider font-bold leading-tight ${highlight ? 'text-white/90' : 'text-ink-mute'}`}>{label}</div>
        <div className={`text-xl font-extrabold tabular-nums mt-1 leading-none ${highlight ? 'text-white' : 'text-ink'}`}>
          {value}
        </div>
        <div className={`text-[10px] mt-0.5 ${highlight ? 'text-white/80' : 'text-ink-mute'}`}>{unit}</div>
      </div>
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
    <section className="glass rounded-3xl p-5 animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-mute">Rozložení makroživin</h2>
        <button
          type="button"
          onClick={() => { haptic('tap'); onChange(enabled ? undefined : current); }}
          className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all ${
            enabled ? 'bg-grad-coral text-white shadow-coral-soft' : 'bg-white/[0.06] text-ink-soft ring-1 ring-white/10'
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
          <MacroSlider label="Bílkoviny" pct={current.proteinPct} grams={protein_g} accent="bg-grad-protein" textColor="text-macro-protein" onChange={(v) => setPct('proteinPct', v)} />
          <MacroSlider label="Sacharidy" pct={current.carbsPct}   grams={carbs_g}   accent="bg-grad-carbs"   textColor="text-macro-carbs"   onChange={(v) => setPct('carbsPct', v)} />
          <MacroSlider label="Tuky"      pct={current.fatPct}     grams={fat_g}     accent="bg-grad-fat"     textColor="text-macro-fat"     onChange={(v) => setPct('fatPct', v)} />

          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <span className="text-[11px] text-ink-mute">Součet</span>
            <span className={`text-xs font-bold tabular-nums ${current.proteinPct + current.carbsPct + current.fatPct === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {current.proteinPct + current.carbsPct + current.fatPct} %
            </span>
          </div>

          <div className="flex gap-1.5 flex-wrap pt-1">
            {presets.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => { haptic('tap'); onChange({ proteinPct: p.p, carbsPct: p.c, fatPct: p.f }); }}
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/5 text-ink-soft border border-white/5 active:scale-95 transition-transform"
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
          <span className="text-base font-bold tabular-nums text-ink">{pct}%</span>
          <span className="text-[11px] text-ink-mute tabular-nums">{grams} g</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(pct - 5)} className="w-9 h-9 rounded-full bg-white/[0.05] ring-1 ring-white/10 text-ink active:scale-90 transition-transform shrink-0 flex items-center justify-center" aria-label="Méně">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14"/></svg>
        </button>
        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
          <div className={`h-full ${accent} rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <button type="button" onClick={() => onChange(pct + 5)} className="w-9 h-9 rounded-full bg-white/[0.05] ring-1 ring-white/10 text-ink active:scale-90 transition-transform shrink-0 flex items-center justify-center" aria-label="Více">
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
    const trigger = (window as unknown as { __kaloriakCheckUpdate?: () => Promise<void> }).__kaloriakCheckUpdate;
    if (trigger) {
      try { await trigger(); } catch { /* ignore */ }
    }
    setTimeout(() => {
      setStatus('uptodate');
      setTimeout(() => setStatus('idle'), 2400);
    }, 1500);
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
      // Navigate to root before reload — without an active SW, Vercel won't
      // SPA-fallback a sub-route reload (returns 404 until rewrites kick in).
      window.location.replace('/');
    }
  }

  return (
    <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/5 p-4 mt-2 space-y-2">
      <h3 className="text-sm font-bold text-ink mb-1">Verze aplikace</h3>
      <p className="text-xs text-ink-soft mb-2">
        Pokud je k dispozici novější verze, objeví se nahoře oranžový pruh „Aktualizovat". Pokud máš pocit, že máš starou verzi, použij dole „Vynutit aktualizaci".
      </p>
      <button
        onClick={check}
        disabled={status === 'checking'}
        className="w-full py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-ink text-xs font-semibold active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {status === 'checking' ? (
          <>
            <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-coral-400 rounded-full animate-spin" />
            Hledám aktualizace…
          </>
        ) : status === 'uptodate' ? (
          '✓ Máš aktuální verzi'
        ) : (
          '🔄 Hledat aktualizace'
        )}
      </button>
      <button
        onClick={hardReset}
        className="w-full py-2.5 rounded-xl bg-amber-500/15 ring-1 ring-amber-400/30 text-amber-300 text-xs font-semibold active:scale-95 transition-transform flex items-center justify-center gap-2"
      >
        ⚡ Vynutit aktualizaci (smaže cache)
      </button>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-3xl p-5 animate-fade-up">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-mute mb-4">{title}</h2>
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
  return (
    <label className="block">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm font-medium text-ink-soft">{label}</span>
        <span className="text-sm font-bold tabular-nums text-ink">{value.toFixed(decimals)} <span className="text-xs text-ink-mute font-medium">{unit}</span></span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange(v);
          if (Math.floor(v) !== Math.floor(lastTick.current)) {
            haptic('tick');
            lastTick.current = v;
          }
        }}
        className="w-full"
      />
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
          ? 'bg-grad-coral text-white shadow-coral-soft'
          : 'bg-white/[0.04] text-ink-soft border border-white/5'
      }`}
    >
      {children}
    </button>
  );
}

function WeightDelta({ current, target }: { current: number; target: number }) {
  const delta = +(target - current).toFixed(1);
  if (Math.abs(delta) < 0.1) {
    return (
      <div className="rounded-2xl px-4 py-2.5 bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
        <span className="text-base leading-none">🎯</span>
        Jsi přesně na svém cíli.
      </div>
    );
  }
  const lose = delta < 0;
  return (
    <div className={`rounded-2xl px-4 py-2.5 ring-1 text-xs flex items-center gap-2 ${
      lose ? 'bg-coral-500/10 ring-coral-500/20 text-coral-300' : 'bg-violet-500/10 ring-violet-500/20 text-violet-300'
    }`}>
      <span className="text-base leading-none">{lose ? '🔻' : '🔺'}</span>
      <span className="tabular-nums">
        {lose ? 'Zhubnout' : 'Nabrat'} <strong>{Math.abs(delta).toFixed(1)} kg</strong> do cíle.
      </span>
    </div>
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
    <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/5 p-3.5 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-ink">{label}</div>
        {description && <div className="text-[11px] text-ink-mute mt-0.5 leading-relaxed">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative w-[52px] h-8 rounded-full transition-colors shrink-0 ring-1 ${
          value ? 'bg-grad-coral shadow-coral-soft ring-white/20' : 'bg-white/10 ring-white/10'
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
      <div className={`tabular-nums text-xl font-extrabold leading-none ${color}`}>{value}</div>
      <div className="text-[10px] text-ink-mute uppercase tracking-wider mt-1.5 font-semibold">{label}</div>
      <div className="text-[10px] text-ink-mute">{unit}</div>
    </div>
  );
}
