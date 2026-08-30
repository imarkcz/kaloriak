import { useState } from 'react';
import { useApp } from '../state/AppState';

// Only one thing here is worth interrupting someone on launch: local storage
// being full, because that is the one case where data really can be lost.
//
// A failed cloud write is not that. Firestore keeps the write queued in
// IndexedDB and delivers it later, the copy in the phone is intact, and there
// is nothing the person can do about it anyway — so it belongs in Profile
// (with the actual error code), not in a red bar across the header. The bottom
// nav grows a small dot instead.
//
// Rendered in normal flow, not fixed, so it can never sit on top of the page.
export default function SyncBanner() {
  const { storageWarning } = useApp();
  const [dismissed, setDismissed] = useState(false);

  if (!storageWarning || dismissed) return null;

  return (
    <div className="pt-safe px-3">
      <div className="max-w-md mx-auto mt-2 px-3 py-2 rounded-xl text-[12px] ring-1 bg-red-500/15 ring-red-500/30 text-red-200 flex items-start gap-2">
        <span className="flex-1 leading-snug">
          <strong>Plné úložiště.</strong> {storageWarning}
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 opacity-60 hover:opacity-100 active:scale-90 transition-all mt-0.5"
          aria-label="Zavřít"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
