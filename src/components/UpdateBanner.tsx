import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import Icon from './Icon';

// Appears when a new service worker is detected. Also exposes a manual trigger
// so the profile page can force a check.
export default function UpdateBanner() {
  const [hidden, setHidden] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, reg) {
      if (!reg) return;
      const interval = setInterval(() => {
        reg.update().catch(() => { /* offline */ });
      }, 60_000);
      (window as unknown as { __kaloriakCheckUpdate?: () => Promise<void> }).__kaloriakCheckUpdate = async () => {
        try { await reg.update(); } catch { /* ignore */ }
      };
      return () => clearInterval(interval);
    },
  });

  useEffect(() => { if (needRefresh) setHidden(false); }, [needRefresh]);

  if (!needRefresh || hidden) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[200] pt-safe px-4 pointer-events-none">
      <div className="max-w-md mx-auto mt-2 pointer-events-auto reveal">
        <div
          className="flex items-center gap-3 p-3 pl-4 rounded-field"
          style={{
            background: '#1a181d',
            border: '1px solid rgba(143,105,224,0.35)',
            boxShadow: '0 20px 50px -24px rgba(0,0,0,0.9)',
          }}
        >
          <span className="text-violet-300 shrink-0"><Icon name="spark" size={19} /></span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-ink leading-tight">Nová verze</div>
            <div className="text-micro text-ink-mute leading-snug">Klepni pro aktualizaci.</div>
          </div>
          <button
            onClick={() => {
              updateServiceWorker(false);
              window.location.href = '/?_=' + Date.now();
            }}
            className="btn btn-primary px-3.5 py-2 text-sm"
          >
            Aktualizovat
          </button>
          <button
            onClick={() => { setHidden(true); setNeedRefresh(false); }}
            aria-label="Zavřít"
            className="w-8 h-8 -mr-1 rounded-full text-ink-mute hover:text-ink flex items-center justify-center transition-colors"
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
