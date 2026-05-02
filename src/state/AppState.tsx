import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { browserLocalPersistence, onAuthStateChanged, setPersistence, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import type { Activity, AppData, Meal, UserProfile } from '../types';

const STORAGE_KEY = 'kaloriak:v1';

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

function saveLocal(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Daily snapshot for emergency recovery — keeps last 7 days of state.
    // If anything goes wrong (merge bug, accidental delete), we can restore
    // by reading kaloriak:snapshot:YYYY-MM-DD from localStorage.
    const today = new Date().toISOString().slice(0, 10);
    const snapshotKey = `kaloriak:snapshot:${today}`;
    localStorage.setItem(snapshotKey, JSON.stringify({ savedAt: Date.now(), data }));
    // Prune old snapshots
    const all = Object.keys(localStorage).filter((k) => k.startsWith('kaloriak:snapshot:')).sort();
    if (all.length > 7) all.slice(0, all.length - 7).forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

// Strip heavy base64 blobs before sending to Firestore (1 MB limit per doc).
// They stay in localStorage for local display.
function stripBlobs(data: AppData): AppData {
  return {
    ...data,
    profile: data.profile ? { ...data.profile, avatarDataUrl: undefined } : null,
    meals: data.meals.map((m) => ({ ...m, imageDataUrl: undefined })),
  };
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

async function saveToFirestore(uid: string, data: AppData) {
  try {
    await setDoc(doc(db, 'users', uid), stripBlobs(data), { merge: true });
  } catch { /* offline — ignore */ }
}

interface AppContextValue {
  data: AppData;
  user: User | null;
  authLoading: boolean;
  dataLoading: boolean;
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
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userRef = useRef<User | null>(null);
  const dataRef = useRef<AppData>(data);
  const skipNextSync = useRef(false);
  userRef.current = user;
  dataRef.current = data;

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

  // Sync to localStorage always, to Firestore (debounced) when logged in
  useEffect(() => {
    saveLocal(data);
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    if (syncTimer.current) clearTimeout(syncTimer.current);
    if (userRef.current) {
      // 500ms debounce — short enough that closing the app within the window
      // is rare. Combined with visibilitychange/pagehide flush below, the
      // unsynced window is effectively zero.
      syncTimer.current = setTimeout(() => {
        saveToFirestore(userRef.current!.uid, data);
      }, 500);
    }
  }, [data]);

  // Flush any pending Firestore write when the page is hidden or unloading.
  // Closes the gap where adding a meal then immediately backgrounding the app
  // would leave the meal in localStorage only.
  useEffect(() => {
    function flush() {
      if (syncTimer.current) {
        clearTimeout(syncTimer.current);
        syncTimer.current = null;
      }
      if (userRef.current) {
        // Best-effort fire-and-forget — browser may kill the request mid-flight
        // on iOS, but the SDK uses keepalive where supported.
        saveToFirestore(userRef.current.uid, dataRef.current);
      }
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') flush();
    }
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    // Keep local data on logout
  }, []);

  const setProfile = useCallback((profile: UserProfile) => {
    setData((d) => ({ ...d, profile, onboarded: true }));
  }, []);

  const setApiKey = useCallback((geminiApiKey: string) => {
    setData((d) => ({ ...d, geminiApiKey }));
  }, []);

  const addMeal = useCallback((meal: Meal) => {
    setData((d) => ({ ...d, meals: [meal, ...d.meals] }));
  }, []);

  const updateMeal = useCallback((id: string, patch: Partial<Meal>) => {
    setData((d) => ({ ...d, meals: d.meals.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  }, []);

  const deleteMeal = useCallback((id: string) => {
    setData((d) => ({ ...d, meals: d.meals.filter((m) => m.id !== id) }));
  }, []);

  const addActivity = useCallback((activity: Activity) => {
    setData((d) => ({ ...d, activities: [activity, ...d.activities] }));
  }, []);

  const deleteActivity = useCallback((id: string) => {
    setData((d) => ({ ...d, activities: d.activities.filter((a) => a.id !== id) }));
  }, []);

  const setWater = useCallback((date: string, ml: number) => {
    setData((d) => ({ ...d, water: { ...(d.water ?? {}), [date]: Math.max(0, Math.round(ml)) } }));
  }, []);

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
    setData(merged);
    if (userRef.current) await saveToFirestore(userRef.current.uid, merged);
    return true;
  }, []);

  const forceUploadToCloud = useCallback(async () => {
    if (!userRef.current) return false;
    await saveToFirestore(userRef.current.uid, data);
    return true;
  }, [data]);

  const value = useMemo<AppContextValue>(
    () => ({ data, user, authLoading, dataLoading, signInWithGoogle, signOutUser, setProfile, setApiKey, addMeal, updateMeal, deleteMeal, addActivity, deleteActivity, setWater, resetAll, reloadFromCloud, forceUploadToCloud, listSnapshots, restoreSnapshot }),
    [data, user, authLoading, dataLoading, signInWithGoogle, signOutUser, setProfile, setApiKey, addMeal, updateMeal, deleteMeal, addActivity, deleteActivity, setWater, resetAll, reloadFromCloud, forceUploadToCloud, listSnapshots, restoreSnapshot],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
