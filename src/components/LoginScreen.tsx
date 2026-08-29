import { useState } from 'react';
import { useApp } from '../state/AppState';
import Icon, { type IconName } from './Icon';

const FEATURES: { icon: IconName; text: string }[] = [
  { icon: 'camera', text: 'Vyfoť jídlo, AI odhadne kalorie i makra' },
  { icon: 'barcode', text: 'Naskenuj čárový kód nebo hledej v databázi' },
  { icon: 'chart', text: 'Denní cíl se počítá z tvého metabolismu' },
  { icon: 'cloud', text: 'Data se drží v cloudu i offline' },
];

export default function LoginScreen() {
  const { signInWithGoogle } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGoogle() {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch {
      setError('Přihlášení selhalo. Zkus to znovu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 pt-safe">
      <div className="w-full max-w-sm">
        <header className="text-center mb-10 reveal">
          <h1
            className="text-hero sm:text-display font-medium text-white lowercase"
            style={{ letterSpacing: '-0.055em' }}
          >
            kaloriak
          </h1>
          <p className="text-base text-ink-mute mt-2">Kalorie a makra z fotky jídla</p>
        </header>

        <div className="card p-5 mb-6 reveal" style={{ '--i': 1 } as React.CSSProperties}>
          <ul className="space-y-4">
            {FEATURES.map((f) => (
              <li key={f.icon} className="flex items-center gap-3.5">
                <span className="shrink-0 w-9 h-9 rounded-xl bg-surface-2 flex items-center justify-center text-violet-300"
                      style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Icon name={f.icon} size={17} />
                </span>
                <span className="text-sm text-ink-soft leading-snug">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="reveal" style={{ '--i': 2 } as React.CSSProperties}>
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="btn w-full py-4 bg-white text-[#0c0b0c] hover:bg-white/90"
          >
            {loading ? (
              <svg className="animate-spin-slow w-5 h-5 text-black/40" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            )}
            {loading ? 'Přihlašuji…' : 'Pokračovat s Googlem'}
          </button>

          {error && <p className="text-danger text-sm text-center mt-3">{error}</p>}

          <p className="text-center text-micro text-ink-dim mt-5 leading-relaxed">
            Data se ukládají do Google Firestore pod tvůj účet a nesdílí se dál.
          </p>
        </div>
      </div>
    </div>
  );
}
