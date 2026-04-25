import { useRef, useState } from 'react';
import { haptic } from '../lib/haptics';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppState';
import type { ActivityLevel, Goal, Sex } from '../types';
import { ACTIVITY_LABELS, GOAL_LABELS, computeTargets } from '../lib/tdee';

export default function Onboarding() {
  const { setProfile } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const [name, setName] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState(30);
  const [heightCm, setHeightCm] = useState(175);
  const [weightKg, setWeightKg] = useState(75);
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<Goal>('maintain');

  const targets = computeTargets(sex, weightKg, heightCm, age, activity, goal);

  function handleFinish() {
    setProfile({
      name: name.trim() || 'Já',
      sex,
      age,
      heightCm,
      weightKg,
      activity,
      goal,
      targets,
    });
    haptic('success');
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-dvh flex flex-col pt-safe pb-safe">
      <div className="flex-1 max-w-md mx-auto w-full px-5 pt-6 pb-32">
        <div className="flex gap-1.5 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-all duration-500 ${
                i <= step ? 'bg-grad-coral' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        <div key={step} className="animate-fade-up">
          {step === 0 && (
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-ink leading-[1.05]">
                Vítej v <span className="bg-grad-coral bg-clip-text text-transparent">Kaloriaku</span>
              </h1>
              <p className="text-ink-soft mt-3 text-base">
                Vyfoť jídlo, spočítej kalorie. Nastavíme ti denní cíl podle tvých údajů.
              </p>

              <div className="mt-8 space-y-5">
                <Field label="Jak ti máme říkat?">
                  <input
                    className="field"
                    placeholder="Tvé jméno"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field label="Pohlaví">
                  <div className="grid grid-cols-2 gap-2">
                    <Choice active={sex === 'male'} onClick={() => setSex('male')}>Muž</Choice>
                    <Choice active={sex === 'female'} onClick={() => setSex('female')}>Žena</Choice>
                  </div>
                </Field>
                <Field label={`Věk: ${age} let`}>
                  <input
                    type="range"
                    min={14}
                    max={90}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full"
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-ink leading-[1.05]">Tělesné údaje</h1>
              <p className="text-ink-soft mt-3">Potřebujeme je pro výpočet denního příjmu.</p>

              <div className="mt-8 space-y-7">
                <BigSlider label="Výška" value={heightCm} unit="cm" min={140} max={220} step={1} onChange={setHeightCm} />
                <BigSlider label="Hmotnost" value={weightKg} unit="kg" min={40} max={180} step={0.5} onChange={setWeightKg} decimals={1} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-ink leading-[1.05]">Aktivita a cíl</h1>
              <p className="text-ink-soft mt-3">Jak aktivní týden máš?</p>

              <div className="mt-6 space-y-1.5">
                {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
                  <Choice key={a} active={activity === a} onClick={() => setActivity(a)} full>
                    {ACTIVITY_LABELS[a]}
                  </Choice>
                ))}
              </div>

              <p className="text-ink-soft mt-7 mb-2">Co je tvůj cíl?</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
                  <Choice key={g} active={goal === g} onClick={() => setGoal(g)}>
                    {GOAL_LABELS[g]}
                  </Choice>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-ink leading-[1.05]">Tvůj denní plán</h1>
              <p className="text-ink-soft mt-3">Odhad podle Mifflin-St Jeor. Dá se kdykoli upravit.</p>

              <div className="mt-8 relative">
                <div className="absolute -inset-2 bg-grad-coral blur-2xl opacity-40 rounded-[40px]" />
                <div className="relative rounded-[32px] bg-grad-coral text-white p-6 shadow-coral-glow">
                  <div className="text-[11px] uppercase tracking-[0.2em] font-bold opacity-90">Denní cíl</div>
                  <div className="text-6xl font-extrabold tabular-nums mt-2 leading-none">{targets.kcal}</div>
                  <div className="text-sm opacity-90 mt-1">kcal / den</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <Macro label="Bílkoviny" value={targets.protein_g} color="text-macro-protein" bg="bg-macro-protein/15" />
                <Macro label="Sacharidy" value={targets.carbs_g} color="text-macro-carbs" bg="bg-macro-carbs/15" />
                <Macro label="Tuky" value={targets.fat_g} color="text-macro-fat" bg="bg-macro-fat/15" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 pb-safe pt-3 px-5 bg-gradient-to-t from-bg via-bg to-transparent">
        <div className="max-w-md mx-auto flex gap-2">
          {step > 0 && (
            <button
              className="flex-1 py-4 rounded-2xl font-semibold glass text-ink active:scale-[0.98] transition-transform"
              onClick={() => setStep((s) => s - 1)}
            >
              Zpět
            </button>
          )}
          <button
            className="flex-[2] py-4 rounded-2xl font-semibold bg-grad-coral text-white shadow-coral-soft active:scale-[0.98] transition-transform"
            onClick={() => (step === 3 ? handleFinish() : setStep((s) => s + 1))}
          >
            {step === 3 ? 'Hotovo' : 'Pokračovat'}
          </button>
        </div>
      </div>

      <style>{`
        .field {
          width: 100%;
          padding: 0.875rem 1rem;
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-ink-soft mb-2">{label}</span>
      {children}
    </label>
  );
}

function BigSlider({ label, value, unit, min, max, step, onChange, decimals = 0 }: {
  label: string; value: number; unit: string; min: number; max: number; step: number;
  onChange: (v: number) => void; decimals?: number;
}) {
  const lastTick = useRef(value);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-sm font-semibold text-ink-soft">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-extrabold tabular-nums text-ink leading-none">{value.toFixed(decimals)}</span>
          <span className="text-sm text-ink-mute font-medium">{unit}</span>
        </div>
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
    </div>
  );
}

function Choice({ active, onClick, children, full }: { active: boolean; onClick: () => void; children: React.ReactNode; full?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => { haptic('tap'); onClick(); }}
      className={`${full ? 'w-full text-left' : 'text-center'} px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all ${
        active
          ? 'bg-grad-coral text-white shadow-coral-soft'
          : 'bg-white/[0.04] text-ink-soft border border-white/5 hover:border-white/15'
      }`}
    >
      {children}
    </button>
  );
}

function Macro({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`rounded-2xl p-3 text-center ${bg}`}>
      <div className={`text-2xl font-extrabold tabular-nums leading-none ${color}`}>{value}</div>
      <div className="text-[10px] text-ink-mute mt-1.5 uppercase tracking-wider font-semibold">{label}</div>
      <div className="text-[10px] text-ink-mute">g</div>
    </div>
  );
}
