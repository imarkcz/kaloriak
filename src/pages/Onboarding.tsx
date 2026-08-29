import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppState';
import { haptic } from '../lib/haptics';
import type { ActivityLevel, Goal, Sex } from '../types';
import { ACTIVITY_LABELS, GOAL_LABELS, computeTargets } from '../lib/tdee';

const STEPS = 4;

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
    setProfile({ name: name.trim() || 'Já', sex, age, heightCm, weightKg, activity, goal, targets });
    haptic('success');
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-dvh flex flex-col pt-safe pb-safe">
      <div className="flex-1 max-w-md mx-auto w-full px-5 pt-6 pb-32">
        <div className="flex gap-1.5 mb-10" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS}>
          {Array.from({ length: STEPS }, (_, i) => (
            <div
              key={i}
              className="flex-1 h-[3px] rounded-full transition-colors duration-300"
              style={{ background: i <= step ? '#8f69e0' : 'rgba(255,255,255,0.1)' }}
            />
          ))}
        </div>

        <div key={step} className="reveal">
          {step === 0 && (
            <div>
              <h1 className="text-hero font-medium text-white lowercase" style={{ letterSpacing: '-0.055em' }}>
                kaloriak
              </h1>
              <p className="text-base text-ink-mute mt-3 leading-relaxed">
                Nastavíme ti denní cíl podle tvého metabolismu. Zabere to minutu.
              </p>

              <div className="mt-9 space-y-6">
                <Field label="Jak ti máme říkat?">
                  <input className="field" placeholder="Tvé jméno" value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Pohlaví">
                  <div className="grid grid-cols-2 gap-2">
                    <Choice active={sex === 'male'} onClick={() => setSex('male')}>Muž</Choice>
                    <Choice active={sex === 'female'} onClick={() => setSex('female')}>Žena</Choice>
                  </div>
                </Field>
                <BigSlider label="Věk" value={age} unit="let" min={14} max={90} step={1} onChange={setAge} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h1 className="text-h1 font-semibold text-ink">Tělesné údaje</h1>
              <p className="text-base text-ink-mute mt-2">Z nich se počítá klidový metabolismus.</p>
              <div className="mt-9 space-y-8">
                <BigSlider label="Výška" value={heightCm} unit="cm" min={140} max={220} step={1} onChange={setHeightCm} />
                <BigSlider label="Hmotnost" value={weightKg} unit="kg" min={40} max={180} step={0.5} onChange={setWeightKg} decimals={1} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="text-h1 font-semibold text-ink">Aktivita a cíl</h1>
              <p className="text-base text-ink-mute mt-2">Jak aktivní týden obvykle máš?</p>

              <div className="mt-6 space-y-2">
                {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
                  <Choice key={a} active={activity === a} onClick={() => setActivity(a)} full>
                    {ACTIVITY_LABELS[a]}
                  </Choice>
                ))}
              </div>

              <p className="text-base text-ink-mute mt-8 mb-3">Co je tvůj cíl?</p>
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
              <h1 className="text-h1 font-semibold text-ink">Tvůj denní plán</h1>
              <p className="text-base text-ink-mute mt-2">Odhad podle Mifflin-St Jeor. Kdykoli se dá upravit v profilu.</p>

              <div className="card card-lit p-6 mt-8 relative overflow-hidden">
                <div
                  className="absolute rounded-full pointer-events-none"
                  style={{ top: '-70%', left: '-20%', width: '90%', height: '180%', background: '#8f69e0', filter: 'blur(80px)', opacity: 0.34 }}
                />
                <div className="relative">
                  <div className="text-micro font-semibold uppercase tracking-label text-ink-mute">Denní cíl</div>
                  <div className="text-display font-semibold tabular-nums text-white mt-2 leading-none">{targets.kcal}</div>
                  <div className="text-base text-ink-mute mt-2">kcal denně</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <Macro label="Bílkoviny" value={targets.protein_g} color="#f47da6" />
                <Macro label="Sacharidy" value={targets.carbs_g} color="#e8b45f" />
                <Macro label="Tuky" value={targets.fat_g} color="#6ec2f0" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 pb-safe pt-4 px-5"
           style={{ background: 'linear-gradient(to top, #0c0b0c 55%, transparent)' }}>
        <div className="max-w-md mx-auto flex gap-2">
          {step > 0 && (
            <button className="btn btn-ghost flex-1 py-4" onClick={() => setStep((s) => s - 1)}>Zpět</button>
          )}
          <button
            className="btn btn-primary flex-[2] py-4"
            onClick={() => (step === STEPS - 1 ? handleFinish() : setStep((s) => s + 1))}
          >
            {step === STEPS - 1 ? 'Hotovo' : 'Pokračovat'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-micro font-semibold uppercase tracking-label text-ink-mute mb-2.5">{label}</span>
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
        <span className="text-micro font-semibold uppercase tracking-label text-ink-mute">{label}</span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-h1 font-semibold tabular-nums text-ink leading-none">{value.toFixed(decimals)}</span>
          <span className="text-sm text-ink-mute">{unit}</span>
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
        onWheel={(e) => e.currentTarget.blur()}
      />
    </div>
  );
}

function Choice({ active, onClick, children, full }: {
  active: boolean; onClick: () => void; children: React.ReactNode; full?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => { haptic('tap'); onClick(); }}
      className={`${full ? 'w-full text-left' : 'text-center'} px-4 py-3.5 rounded-field text-sm font-medium transition-colors duration-200`}
      style={active
        ? { background: '#8f69e0', color: '#fff' }
        : { background: '#1a181d', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {children}
    </button>
  );
}

function Macro({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card p-3.5 text-center">
      <div className="text-h2 font-semibold tabular-nums leading-none" style={{ color }}>{value}</div>
      <div className="text-micro text-ink-mute mt-2">{label}</div>
      <div className="text-micro text-ink-dim">g</div>
    </div>
  );
}
