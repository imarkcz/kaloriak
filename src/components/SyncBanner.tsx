import { useApp } from '../state/AppState';

// Visible banner when sync fails or local storage is full. The "data
// disappeared" class of bugs only shows up because these failures used
// to be silent — surfacing them makes the user notice and act.
export default function SyncBanner() {
  const { syncStatus, storageWarning, user } = useApp();

  if (storageWarning) {
    return (
      <Banner tone="error">
        <strong>Plné úložiště.</strong> {storageWarning}
      </Banner>
    );
  }

  if (!user) return null;

  if (syncStatus === 'error') {
    return (
      <Banner tone="error">
        <strong>Cloud sync selhal.</strong> Data jsou v telefonu, ale neuložila se do cloudu. Zkontroluj internet.
      </Banner>
    );
  }

  if (syncStatus === 'offline') {
    return (
      <Banner tone="warn">
        <strong>Bez internetu.</strong> Změny se uloží do cloudu, jakmile budeš online.
      </Banner>
    );
  }

  return null;
}

function Banner({ tone, children }: { tone: 'error' | 'warn'; children: React.ReactNode }) {
  const styles = tone === 'error'
    ? 'bg-red-500/15 ring-red-500/30 text-red-200'
    : 'bg-amber-500/15 ring-amber-500/30 text-amber-200';
  return (
    <div className={`fixed top-0 inset-x-0 z-40 pt-safe`}>
      <div className={`mx-3 mt-2 px-3 py-2 rounded-xl text-[12px] ring-1 ${styles}`}>
        {children}
      </div>
    </div>
  );
}
