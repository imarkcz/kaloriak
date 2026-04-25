import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Top-of-screen banner that appears when a new service worker is detected.
// Tap "Aktualizovat" to apply the update (calls SW skipWaiting + reloads).
// Also exposes a global trigger so Profile can manually force a check.
export default function UpdateBanner() {
  const [hidden, setHidden] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, reg) {
      // Poll the SW URL every 60s to catch new versions while app is open.
      if (!reg) return;
      const interval = setInterval(() => {
        reg.update().catch(() => { /* offline / network error */ });
      }, 60_000);
      // Expose a manual trigger for the Profile button.
      (window as unknown as { __kaloriakCheckUpdate?: () => Promise<void> }).__kaloriakCheckUpdate = async () => {
        try { await reg.update(); } catch { /* ignore */ }
      };
      return () => clearInterval(interval);
    },
  });

  useEffect(() => { if (needRefresh) setHidden(false); }, [needRefresh]);

  if (!needRefresh || hidden) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[200] pt-safe px-3 pointer-events-none">
      <div className="max-w-md mx-auto mt-2 pointer-events-auto">
        <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-2xl shadow-black/40">
          <div className="absolute inset-0 bg-gradient-to-br from-coral-500/40 via-orange-500/30 to-rose-500/40" />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-2xl" />
          <div className="relative flex items-center gap-3 p-3">
            <div className="text-2xl">✨</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white leading-tight">Nová verze Kaloriaku</div>
              <div className="text-[11px] text-white/80 leading-snug">Klepni pro aktualizaci.</div>
            </div>
            <button
              onClick={() => updateServiceWorker(true)}
              className="px-3 py-2 rounded-xl bg-white text-coral-600 font-bold text-xs active:scale-95 transition-transform"
            >
              Aktualizovat
            </button>
            <button
              onClick={() => { setHidden(true); setNeedRefresh(false); }}
              aria-label="Zavřít"
              className="w-8 h-8 -mr-1 rounded-full text-white/70 hover:text-white flex items-center justify-center"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
