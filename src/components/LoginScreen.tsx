import { useState } from 'react';
import { useApp } from '../state/AppState';

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
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 pb-12"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(249,115,102,0.18), transparent 70%), #0a0a0b' }}>

      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-4 animate-pop">
        <img src="/icon.svg" alt="Kaloriak" className="w-24 h-24 rounded-[28px] shadow-coral-glow" />
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-ink">Kaloriak</h1>
          <p className="text-sm text-ink-mute mt-1 tracking-widest uppercase font-semibold">Přehled · Kontrola · Výsledky</p>
        </div>
      </div>

      {/* Feature bullets */}
      <div className="glass rounded-3xl p-5 w-full max-w-sm mb-6 animate-fade-up space-y-3">
        {[
          { icon: '📷', text: 'Foť jídlo a AI odhadne kalorie' },
          { icon: '📊', text: 'Sleduj makra a denní cíl' },
          { icon: '☁️', text: 'Data uložená v cloudu — přístup odkudkoliv' },
          { icon: '🔒', text: 'Přihlášení Googlem — žádné heslo' },
        ].map((f) => (
          <div key={f.icon} className="flex items-center gap-3">
            <span className="text-xl w-8 text-center">{f.icon}</span>
            <span className="text-sm text-ink-soft">{f.text}</span>
          </div>
        ))}
      </div>

      {/* Sign in button */}
      <div className="w-full max-w-sm animate-fade-up">
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white text-gray-800 font-semibold text-base shadow-lg active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {loading ? (
            <svg className="animate-spin w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg viewBox="0 0 48 48" className="w-5 h-5">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          )}
          {loading ? 'Přihlašuji…' : 'Pokračovat s Googlem'}
        </button>

        {error && <p className="text-red-400 text-sm text-center mt-3">{error}</p>}

        <p className="text-center text-[11px] text-ink-mute mt-4 leading-relaxed">
          Přihlášením souhlasíš s ukládáním dat v Google Firestore.{'\n'}
          Data nejsou sdílena s třetími stranami.
        </p>
      </div>
    </div>
  );
}
