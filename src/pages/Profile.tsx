import { useState } from 'react';
import { useApp } from '../state/AppState';
import type { ActivityLevel, Goal, Sex } from '../types';
import { ACTIVITY_LABELS, GOAL_LABELS, computeTargets } from '../lib/tdee';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';

export default function Profile() {
  const { data, setProfile, setApiKey, resetAll } = useApp();
  const navigate = useNavigate();
  const p = data.profile;

  const [name, setName] = useState(p?.name ?? '');
  const [sex, setSex] = useState<Sex>(p?.sex ?? 'male');
  const [age, setAge] = useState(p?.age ?? 30);
  const [heightCm, setHeightCm] = useState(p?.heightCm ?? 175);
  const [weightKg, setWeightKg] = useState(p?.weightKg ?? 75);
  const [targetWeightKg, setTargetWeightKg] = useState(p?.targetWeightKg ?? p?.weightKg ?? 75);
  const [activity, setActivity] = useState<ActivityLevel>(p?.activity ?? 'moderate');
  const [goal, setGoal] = useState<Goal>(p?.goal ?? 'maintain');
  const [useDynamicTdee, setUseDynamicTdeeLocal] = useState<boolean>(p?.useDynamicTdee ?? true);

  // Toggle persists immediately so the user sees the effect on Today right
  // away — the rest of the form stays form-style with explicit Save.
  function setUseDynamicTdee(v: boolean) {
    setUseDynamicTdeeLocal(v);
    if (p) setProfile({ ...p, useDynamicTdee: v });
  }
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(p?.avatarDataUrl);
  const [apiKey, setKeyLocal] = useState(data.geminiApiKey);
  const [saved, setSaved] = useState(false);

  if (!p) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-ink">
        <p>Profil nenalezen.</p>
      </div>
    );
  }

  function handleSave() {
    const targets = computeTargets(sex, weightKg, heightCm, age, activity, goal);
    setProfile({
      name: name.trim() || 'Já',
      sex, age, heightCm, weightKg,
      targetWeightKg,
      activity, goal, targets,
      avatarDataUrl,
      useDynamicTdee,
    });
    setApiKey(apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  function handleReset() {
    if (window.confirm('Opravdu smazat všechna data (profil i jídla)?')) {
      resetAll();
      navigate('/onboarding', { replace: true });
    }
  }

  const targets = computeTargets(sex, weightKg, heightCm, age, activity, goal);

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
        </Card>

        <Card title="Gemini API klíč">
          {/* Status badge */}
          <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-xl text-sm font-semibold ${apiKey ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20'}`}>
            <span className="text-base">{apiKey ? '✓' : '⚠'}</span>
            {apiKey ? 'Klíč je nastaven — AI funkce jsou aktivní' : 'Klíč chybí — AI analýza fotek nebude fungovat'}
          </div>

          {/* Why */}
          <p className="text-xs text-ink-soft mb-4 leading-relaxed">
            Kaloriak používá Google Gemini AI pro analýzu fotek jídla a odhad kalorií. Klíč je <span className="text-white/80 font-semibold">zdarma</span> a ukládá se jen lokálně v tvém prohlížeči — nikam se neodesílá.
          </p>

          {/* Steps */}
          <div className="space-y-3 mb-4">
            {[
              { n: '1', text: 'Otevři', link: { label: 'aistudio.google.com/apikey', href: 'https://aistudio.google.com/apikey' } },
              { n: '2', text: 'Přihlas se Google účtem (gmail)' },
              { n: '3', text: 'Klikni na „Create API key"' },
              { n: '4', text: 'Zkopíruj klíč (začíná AIza…) a vlož ho sem' },
            ].map((s) => (
              <div key={s.n} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-coral-500/20 text-coral-400 text-[11px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">{s.n}</span>
                <span className="text-xs text-ink-soft leading-relaxed">
                  {s.text}{' '}
                  {s.link && (
                    <a href={s.link.href} target="_blank" rel="noreferrer" className="text-coral-400 underline font-semibold">
                      {s.link.label}
                    </a>
                  )}
                </span>
              </div>
            ))}
          </div>

          <input
            className="field font-mono text-xs"
            type="password"
            placeholder="AIza..."
            value={apiKey}
            onChange={(e) => setKeyLocal(e.target.value)}
          />
          <p className="text-[10px] text-ink-mute mt-2 text-center">Klíč se uloží po kliknutí na „Uložit změny" níže</p>
        </Card>

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

        <p className="text-center text-xs text-ink-mute pt-2">
          Kaloriak • data uložena lokálně
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
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );
}

function Choice({ active, onClick, children, full }: { active: boolean; onClick: () => void; children: React.ReactNode; full?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
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
