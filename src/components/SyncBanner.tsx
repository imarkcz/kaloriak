import { useEffect, useState } from 'react';
import { useApp } from '../state/AppState';
import Icon from './Icon';

// Only speaks up when something is genuinely wrong. A write that is queued
// offline is a normal state now, not a failure, so it never surfaces here —
// Firestore's persistent cache replays it on its own.
export default function SyncBanner() {
  const { syncStatus, syncError, storageWarning, user } = useApp();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => { setDismissed(false); }, [syncStatus, storageWarning]);

  if (dismissed) return null;

  if (storageWarning) {
    return (
      <Banner tone="danger" onDismiss={() => setDismissed(true)}>
        <b className="font-semibold">Plné úložiště.</b> {storageWarning}
      </Banner>
    );
  }

  if (!user) return null;

  if (syncStatus === 'error') {
    return (
      <Banner tone="danger" onDismiss={() => setDismissed(true)}>
        <b className="font-semibold">Cloud odmítá zápis.</b> Data jsou uložená v telefonu.
        {syncError && <span className="text-ink-mute"> Kód: {syncError}</span>}
      </Banner>
    );
  }

  return null;
}

function Banner({ tone, children, onDismiss }: {
  tone: 'danger' | 'warn';
  children: React.ReactNode;
  onDismiss: () => void;
}) {
  const color = tone === 'danger' ? '#f0765a' : '#e0a03f';
  return (
    <div className="fixed top-0 inset-x-0 z-40 pt-safe pointer-events-none">
      <div className="max-w-md mx-auto px-4">
        <div
          className="mt-2 px-4 py-3 rounded-field text-sm flex items-start gap-3 pointer-events-auto reveal"
          style={{
            background: '#1a181d',
            border: `1px solid ${color}44`,
            boxShadow: '0 20px 50px -24px rgba(0,0,0,0.9)',
          }}
        >
          <span className="shrink-0 mt-px" style={{ color }}><Icon name="alert" size={17} /></span>
          <span className="flex-1 leading-snug text-ink-soft">{children}</span>
          <button
            onClick={onDismiss}
            className="shrink-0 text-ink-mute hover:text-ink transition-colors"
            aria-label="Zavřít"
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
