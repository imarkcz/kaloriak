import { useEffect, useState } from 'react';
import { useApp } from '../state/AppState';

export default function SyncBanner() {
  const { syncStatus, syncError, storageWarning, user } = useApp();
  const [dismissed, setDismissed] = useState(false);
  const [sustained, setSustained] = useState(false);

  // Reset dismiss when syncStatus changes so new errors are visible again.
  useEffect(() => {
    setDismissed(false);
  }, [syncStatus, storageWarning]);

  // A failure has to stick around before it earns a banner. Startup hiccups and
  // requests killed by backgrounding the app resolve themselves in seconds, and
  // shouting about those was the whole problem.
  useEffect(() => {
    if (syncStatus !== 'error') {
      setSustained(false);
      return;
    }
    const t = setTimeout(() => setSustained(true), 6000);
    return () => clearTimeout(t);
  }, [syncStatus]);

  if (dismissed) return null;

  if (storageWarning) {
    return (
      <Banner tone="error" onDismiss={() => setDismissed(true)}>
        <strong>Plné úložiště.</strong> {storageWarning}
      </Banner>
    );
  }

  if (!user) return null;

  if (syncStatus === 'error' && sustained) {
    return (
      <Banner tone="error" onDismiss={() => setDismissed(true)}>
        <strong>Cloud odmítá zápis.</strong> Data jsou uložená v telefonu a nic se neztratilo.
        {syncError && <span className="opacity-70"> Kód: {syncError}</span>}
      </Banner>
    );
  }

  if (syncStatus === 'offline') {
    return (
      <Banner tone="warn" onDismiss={() => setDismissed(true)}>
        <strong>Bez internetu.</strong> Změny se uloží do cloudu, jakmile budeš online.
      </Banner>
    );
  }

  return null;
}

function Banner({ tone, children, onDismiss }: { tone: 'error' | 'warn'; children: React.ReactNode; onDismiss: () => void }) {
  const styles = tone === 'error'
    ? 'bg-red-500/15 ring-red-500/30 text-red-200'
    : 'bg-amber-500/15 ring-amber-500/30 text-amber-200';
  return (
    <div className={`fixed top-0 inset-x-0 z-40 pt-safe`}>
      <div className={`mx-3 mt-2 px-3 py-2 rounded-xl text-[12px] ring-1 ${styles} flex items-start gap-2`}>
        <span className="flex-1 leading-snug">{children}</span>
        <button
          onClick={onDismiss}
          className="shrink-0 opacity-60 hover:opacity-100 active:scale-90 transition-all mt-0.5"
          aria-label="Zavřít"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
