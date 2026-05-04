import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { browserLocalPersistence, onAuthStateChanged, setPersistence, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import type { Activity, AppData, Meal, UserProfile } from '../types';
import { deleteMealImage, loadAllMealImages, pruneMealImages, saveMealImage } from '../lib/imageStore';

const STORAGE_KEY = 'kaloriak:v1';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

const DEFAULT: AppData = {
  profile: null,
  meals: [],
  activities: [],
  water: {},
  geminiApiKey: '',
  onboarded: false,
};

function loadLocal(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT;
  }
}

// Strip image blobs from localStorage write. Images live in IndexedDB
// (imageStore) which has GB-scale quota; localStorage stays under 1 MB
// even with hundreds of meals.
function dataForLocalStorage(data: AppData): AppData {
  return {
    ...data,
    profile: data.profile ? { ...data.profile, avatarDataUrl: undefined } : null,
    meals: data.meals.map((m) => ({ ...m, imageDataUrl: undefined })),
  };
}

interface SaveLocalResult { ok: boolean; quotaExceeded: boolean }

function saveLocal(data: AppData): SaveLocalResult {
  const stripped = dataForLocalStorage(data);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (/quota|exceeded|QUOTA|NS_ERROR_DOM_QUOTA/i.test(msg)) {
      // Free space by dropping all snapshots and retry
      Object.keys(localStorage)
        .filter((k) => k.startsWith('kaloriak:snapshot:'))
        .forEach((k) => localStorage.removeItem(k));
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped)); }
      catch { return { ok: false, quotaExceeded: true }; }
    } else {
      return { ok: false, quotaExceeded: false };
    }
  }

  // Daily snapshot — also stripped so it stays small (~50 kB even with 200+ meals)
  try {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`kaloriak:snapshot:${today}`, JSON.stringify({ savedAt: Date.now(), data: stripped }));
    const all = Object.keys(localStorage).filter((k) => k.startsWith('kaloriak:snapshot:')).sort();
    if (all.length > 7) all.slice(0, all.length - 7).forEach((k) => localStorage.removeItem(k));
  } catch { /* snapshot failure is recoverable, primary state is fine */ }

  return { ok: true, quotaExceeded: false };
}

// Strip heavy base64 blobs before sending to Firestore (1 MB limit per doc).
// They stay in localStorage for local display.
function stripBlobs(data: AppData): object {
  // Remove blob fields, then JSON-roundtrip to purge every `undefined` value.
  // Firestore rejects ANY undefined field — including optional ones like
  // Meal.note, Meal.mealType, UserProfile.goalIntensity, etc.
  const stripped = {
    ...data,
    profile: data.profile
      ? (({ avatarDataUrl: _a, ...rest }) => rest)(data.profile)
      : null,
    meals: data.meals.map(({ imageDataUrl: _i, ...m }) => m),
  };
  return JSON.parse(JSON.stringify(stripped));
}

interface Snapshot { date: string; data: AppData; savedAt: number }

function loadAllSnapshots(): Snapshot[] {
  const out: Snapshot[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith('kaloriak:snapshot:')) continue;
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { savedAt: number; data: AppData };
      out.push({ date: k.replace('kaloriak:snapshot:', ''), data: parsed.data, savedAt: parsed.savedAt });
    } catch { /* corrupt snapshot — skip */ }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

async function loadFromFirestore(uid: string): Promise<{ docExists: boolean; data: AppData | null }> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return { docExists: false, data: null };
    return { docExists: true, data: { ...DEFAULT, ...(snap.data() as Partial<AppData>) } };
  } catch {
    return { docExists: false, data: null };
  }
}

async function saveToFirestore(uid: string, data: AppData): Promise<void> {
  // Throws on failure — caller decides how to surface.
  await setDoc(doc(db, 'users', uid), stripBlobs(data), { merge: true });
}

interface AppContextValue {
  data: AppData;
  user: User | null;
  authLoading: boolean;
  dataLoading: boolean;
  syncStatus: SyncStatus;
  storageWarning: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  setProfile: (p: UserProfile) => void;
  setApiKey: (k: string) => void;
  addMeal: (m: Meal) => void;
  updateMeal: (id: string, patch: Partial<Meal>) => void;
  deleteMeal: (id: string) => void;
  addActivity: (a: Activity) => void;
  deleteActivity: (id: string) => void;
  setWater: (date: string, ml: number) => void;
  resetAll: () => void;
  reloadFromCloud: () => Promise<{ total: number; recovered: number } | null>;
  listSnapshots: () => { date: string; mealCount: number; savedAt: number }[];
  restoreSnapshot: (date: string) => Promise<boolean>;
  forceUploadToCloud: () => Promise<boolean>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadLocal());
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userRef = useRef<User | null>(null);
  const dataRef = useRef<AppData>(data);
  const skipNextSync = useRef(false);
  userRef.current = user;
  dataRef.current = data;

  // On first mount, hydrate meal images from IndexedDB. Initial useState
  // loaded from localStorage which is now image-free.
  useEffect(() => {
    loadAllMealImages().then((images) => {
      if (images.size === 0) return;
      setData((d) => ({
        ...d,
        meals: d.meals.map((m) => images.has(m.id) ? { ...m, imageDataUrl: images.get(m.id) } : m),
      }));
    }).catch(() => { /* IDB unavailable, app works without thumbnails */ });
  }, []);

  // Reliable Firestore push: tracks status, surfaces failures, retries once
  // on network blips. Returns true on success.
  const pushToCloud = useCallback(async (snapshot: AppData): Promise<boolean> => {
    if (!userRef.current) return false;
    setSyncStatus('syncing');
    try {
      await saveToFirestore(userRef.current.uid, snapshot);
      setSyncStatus('synced');
      return true;
    } catch (e1) {
      // One retry — Firestore occasionally fails on first attempt after wake-up
      try {
        await new Promise((r) => setTimeout(r, 400));
        await saveToFirestore(userRef.current.uid, snapshot);
        setSyncStatus('synced');
        return true;
      } catch (e2) {
        const msg = e2 instanceof Error ? e2.message : String(e2);
        if (/offline|network|failed to fetch/i.test(msg)) setSyncStatus('offline');
        else setSyncStatus('error');
        // eslint-disable-next-line no-console
        console.warn('[Firestore] sync failed', e1, e2);
        return false;
      }
    }
  }, []);

  // Set persistence explicitly — important for iOS PWA standalone mode where
  // default IndexedDB persistence may not survive sessions.
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(() => {
      // Falls back to in-memory if browser blocks IndexedDB
    });
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setAuthLoading(false);
        return;
      }

      setDataLoading(true);
      try {
        const { docExists, data: cloud } = await loadFromFirestore(firebaseUser.uid);
        const local = loadLocal();

        if (docExists && cloud && (cloud.onboarded || cloud.meals.length > 0 || cloud.profile)) {
          // Cloud has real data — merge with local blobs AND local-only meals not yet synced
          const cloudMealIds = new Set(cloud.meals.map((m) => m.id));
          const localOnlyMeals = local.meals.filter((m) => !cloudMealIds.has(m.id));
          const merged: AppData = {
            ...cloud,
            // Never lose onboarded=true — cloud field may be missing or false due to old save
            onboarded: cloud.onboarded || local.onboarded,
            geminiApiKey: local.geminiApiKey || cloud.geminiApiKey,
            profile: cloud.profile
              ? { ...cloud.profile, avatarDataUrl: local.profile?.avatarDataUrl }
              : local.profile,
            meals: [
              ...localOnlyMeals,
              ...cloud.meals.map((cm) => {
                const lm = local.meals.find((m) => m.id === cm.id);
                // lm fields as base so locally-set fields (mealType, etc.) survive
                // if cloud copy is missing them; cloud then overrides; image stays local
                return lm ? { ...lm, ...cm, imageDataUrl: lm.imageDataUrl } : cm;
              }),
            ],
          };
          skipNextSync.current = true;
          setData(merged);
          // Immediately upload if local had unsynced meals to prevent future loss
          if (localOnlyMeals.length > 0) {
            await saveToFirestore(firebaseUser.uid, merged);
          }
        } else if (docExists) {
          // Firestore doc exists but has no meaningful data (returning user, data lost).
          // Keep local state — if local also empty, at least skip onboarding since account exists.
          if (local.onboarded || local.profile || local.meals.length > 0) {
            await saveToFirestore(firebaseUser.uid, local); // re-upload local
          } else {
            // Authenticated returning user with no data anywhere — skip onboarding,
            // let them fill in profile from Profile page instead.
            skipNextSync.current = true;
            setData((d) => ({ ...d, onboarded: true }));
          }
        } else if (local.onboarded || local.meals.length > 0 || local.profile) {
          // No cloud doc but local has data → upload local to cloud immediately
          await saveToFirestore(firebaseUser.uid, local);
          // local data is already in state, no setData needed
        }
        // else: genuinely new user with no data anywhere → show onboarding
      } finally {
        setDataLoading(false);
        setAuthLoading(false);
      }
    });
    return unsub;
  }, []);

  // Sync to localStorage always; Firestore writes are now driven by
  // explicit force-sync on mutating actions (addMeal etc.), not from this
  // useEffect. The debounced fallback covers passive state drift only.
  useEffect(() => {
    const result = saveLocal(data);
    if (!result.ok) {
      setStorageWarning('Lokální úložiště je plné. Některá data se nemusí uložit. Smaž starší jídla nebo aplikaci přeinstaluj.');
    } else if (storageWarning) {
      setStorageWarning(null);
    }
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    if (syncTimer.current) clearTimeout(syncTimer.current);
    if (userRef.current) {
      // 500ms debounced fallback for non-critical state changes (water, etc.)
      syncTimer.current = setTimeout(() => {
        if (userRef.current) pushToCloud(dataRef.current);
      }, 500);
    }
  // storageWarning excluded — including it would cause infinite re-runs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, pushToCloud]);

  // Flush any pending Firestore write when the page is hidden or unloading.
  useEffect(() => {
    function flush() {
      if (syncTimer.current) {
        clearTimeout(syncTimer.current);
        syncTimer.current = null;
      }
      if (userRef.current) {
        // Fire-and-forget — best effort before iOS kills the page
        saveToFirestore(userRef.current.uid, dataRef.current).catch(() => { /* logged downstream */ });
      }
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') flush();
    }
    function onOnline() {
      // When network returns, retry any pending sync so the error banner clears.
      if (userRef.current) pushToCloud(dataRef.current);
    }
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    // Keep local data on logout
  }, []);

  // Helper: apply a state mutation, suppress the debounced sync,
  // and immediately push the resulting state to Firestore.
  // Used by every action that creates/modifies persistent records so the
  // cloud has the change before the user can close the app.
  function mutateAndSync(producer: (d: AppData) => AppData) {
    skipNextSync.current = true;
    const next = producer(dataRef.current);
    dataRef.current = next;
    setData(next);
    if (userRef.current) {
      // Fire-and-forget — pushToCloud sets syncStatus, retries once,
      // and surfaces failures via setSyncStatus('error').
      pushToCloud(next);
    }
  }

  const setProfile = useCallback((profile: UserProfile) => {
    mutateAndSync((d) => ({ ...d, profile, onboarded: true }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushToCloud]);

  const setApiKey = useCallback((geminiApiKey: string) => {
    mutateAndSync((d) => ({ ...d, geminiApiKey }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushToCloud]);

  const addMeal = useCallback((meal: Meal) => {
    // Persist image to IndexedDB before stripping from state — image
    // is fetched back into state on next mount via loadAllMealImages.
    if (meal.imageDataUrl) {
      saveMealImage(meal.id, meal.imageDataUrl).catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('[ImageStore] save failed', e);
      });
    }
    mutateAndSync((d) => ({ ...d, meals: [meal, ...d.meals] }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushToCloud]);

  const updateMeal = useCallback((id: string, patch: Partial<Meal>) => {
    if (patch.imageDataUrl) {
      saveMealImage(id, patch.imageDataUrl).catch(() => { /* ignore */ });
    }
    mutateAndSync((d) => ({ ...d, meals: d.meals.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushToCloud]);

  const deleteMeal = useCallback((id: string) => {
    deleteMealImage(id).catch(() => { /* ignore */ });
    mutateAndSync((d) => ({ ...d, meals: d.meals.filter((m) => m.id !== id) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushToCloud]);

  const addActivity = useCallback((activity: Activity) => {
    mutateAndSync((d) => ({ ...d, activities: [activity, ...d.activities] }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushToCloud]);

  const deleteActivity = useCallback((id: string) => {
    mutateAndSync((d) => ({ ...d, activities: d.activities.filter((a) => a.id !== id) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushToCloud]);

  const setWater = useCallback((date: string, ml: number) => {
    mutateAndSync((d) => ({ ...d, water: { ...(d.water ?? {}), [date]: Math.max(0, Math.round(ml)) } }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushToCloud]);

  const resetAll = useCallback(() => {
    setData(DEFAULT);
  }, []);

  // Comprehensive recovery: pulls cloud + localStorage + all daily snapshots,
  // dedupes by ID, restores anything that's been lost from primary state.
  // Returns total meal count and how many were recovered from snapshots.
  const reloadFromCloud = useCallback(async () => {
    if (!userRef.current) return null;
    setDataLoading(true);
    try {
      const { data: cloud } = await loadFromFirestore(userRef.current.uid);
      const local = loadLocal();
      const snapshots = loadAllSnapshots();

      const mealMap = new Map<string, Meal>();
      if (cloud) cloud.meals.forEach((m) => mealMap.set(m.id, m));
      local.meals.forEach((m) => {
        const existing = mealMap.get(m.id);
        mealMap.set(m.id, existing ? { ...existing, ...m } : m);
      });
      const beforeRecovery = mealMap.size;
      snapshots.forEach((snap) => {
        snap.data.meals.forEach((m) => {
          if (!mealMap.has(m.id)) mealMap.set(m.id, m);
        });
      });
      const recovered = mealMap.size - beforeRecovery;
      const allMeals = Array.from(mealMap.values()).sort((a, b) => b.createdAt - a.createdAt);

      const actMap = new Map<string, Activity>();
      if (cloud?.activities) cloud.activities.forEach((a) => actMap.set(a.id, a));
      (local.activities ?? []).forEach((a) => actMap.set(a.id, a));
      snapshots.forEach((snap) => {
        (snap.data.activities ?? []).forEach((a) => {
          if (!actMap.has(a.id)) actMap.set(a.id, a);
        });
      });
      const allActivities = Array.from(actMap.values()).sort((a, b) => b.createdAt - a.createdAt);

      const snapProfile = [...snapshots].reverse().find((s) => s.data.profile)?.data.profile ?? null;
      const profile = cloud?.profile
        ? { ...cloud.profile, avatarDataUrl: local.profile?.avatarDataUrl ?? cloud.profile.avatarDataUrl }
        : local.profile ?? snapProfile;

      const onboarded =
        (cloud?.onboarded ?? false) ||
        local.onboarded ||
        snapshots.some((s) => s.data.onboarded);

      const water = {
        ...snapshots.reduce((acc, s) => ({ ...acc, ...(s.data.water ?? {}) }), {} as Record<string, number>),
        ...(cloud?.water ?? {}),
        ...(local.water ?? {}),
      };

      const merged: AppData = {
        profile,
        meals: allMeals,
        activities: allActivities,
        water,
        geminiApiKey: local.geminiApiKey || cloud?.geminiApiKey || '',
        onboarded,
      };

      skipNextSync.current = true;
      setData(merged);
      // Re-upload merged so cloud now has everything (including recovered items)
      await saveToFirestore(userRef.current.uid, merged);

      return { total: allMeals.length, recovered };
    } finally {
      setDataLoading(false);
    }
  }, []);

  const listSnapshots = useCallback(() => {
    return loadAllSnapshots().map((s) => ({
      date: s.date,
      mealCount: s.data.meals.length,
      savedAt: s.savedAt,
    }));
  }, []);

  const restoreSnapshot = useCallback(async (date: string) => {
    const snap = loadAllSnapshots().find((s) => s.date === date);
    if (!snap) return false;
    // Additive restore — merge snapshot meals INTO current state, never overwrite
    const local = loadLocal();
    const mealMap = new Map<string, Meal>();
    local.meals.forEach((m) => mealMap.set(m.id, m));
    snap.data.meals.forEach((m) => {
      if (!mealMap.has(m.id)) mealMap.set(m.id, m);
    });
    const merged: AppData = {
      ...local,
      meals: Array.from(mealMap.values()).sort((a, b) => b.createdAt - a.createdAt),
    };
    skipNextSync.current = true;
    dataRef.current = merged;
    setData(merged);
    if (userRef.current) await pushToCloud(merged);
    return true;
  }, [pushToCloud]);

  const forceUploadToCloud = useCallback(async () => {
    if (!userRef.current) return false;
    await saveToFirestore(userRef.current.uid, data);
    return true;
  }, [data]);

  // Periodic IDB cleanup — drop images for meals that were deleted
  useEffect(() => {
    const id = setInterval(() => {
      pruneMealImages(new Set(dataRef.current.meals.map((m) => m.id)));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({ data, user, authLoading, dataLoading, syncStatus, storageWarning, signInWithGoogle, signOutUser, setProfile, setApiKey, addMeal, updateMeal, deleteMeal, addActivity, deleteActivity, setWater, resetAll, reloadFromCloud, forceUploadToCloud, listSnapshots, restoreSnapshot }),
    [data, user, authLoading, dataLoading, syncStatus, storageWarning, signInWithGoogle, signOutUser, setProfile, setApiKey, addMeal, updateMeal, deleteMeal, addActivity, deleteActivity, setWater, resetAll, reloadFromCloud, forceUploadToCloud, listSnapshots, restoreSnapshot],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
