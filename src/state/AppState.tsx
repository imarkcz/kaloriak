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
  reloadFromCloud: () => Promise<boolean>;
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
  const skipNextSync = useRef(false);
  userRef.current = user;

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
          // Cloud has real data — merge with local blobs
          skipNextSync.current = true;
          setData({
            ...cloud,
            // Never lose onboarded=true — cloud field may be missing or false due to old save
            onboarded: cloud.onboarded || local.onboarded,
            geminiApiKey: local.geminiApiKey || cloud.geminiApiKey,
            profile: cloud.profile
              ? { ...cloud.profile, avatarDataUrl: local.profile?.avatarDataUrl }
              : local.profile,
            meals: cloud.meals.map((cm) => {
              const lm = local.meals.find((m) => m.id === cm.id);
              return lm ? { ...cm, imageDataUrl: lm.imageDataUrl } : cm;
            }),
          });
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
      syncTimer.current = setTimeout(() => {
        saveToFirestore(userRef.current!.uid, data);
      }, 1500);
    }
  }, [data]);

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

  const reloadFromCloud = useCallback(async () => {
    if (!userRef.current) return false;
    setDataLoading(true);
    try {
      const { docExists, data: cloud } = await loadFromFirestore(userRef.current.uid);
      if (!docExists || !cloud) return false;
      if (!cloud.onboarded && !cloud.profile && cloud.meals.length === 0) return false;
      const local = loadLocal();
      skipNextSync.current = true;
      setData({
        ...cloud,
        onboarded: cloud.onboarded || local.onboarded,
        geminiApiKey: local.geminiApiKey || cloud.geminiApiKey,
        profile: cloud.profile
          ? { ...cloud.profile, avatarDataUrl: local.profile?.avatarDataUrl }
          : local.profile,
        meals: cloud.meals.map((cm) => {
          const lm = local.meals.find((m) => m.id === cm.id);
          return lm ? { ...cm, imageDataUrl: lm.imageDataUrl } : cm;
        }),
      });
      return true;
    } finally {
      setDataLoading(false);
    }
  }, []);

  const forceUploadToCloud = useCallback(async () => {
    if (!userRef.current) return false;
    await saveToFirestore(userRef.current.uid, data);
    return true;
  }, [data]);

  const value = useMemo<AppContextValue>(
    () => ({ data, user, authLoading, dataLoading, signInWithGoogle, signOutUser, setProfile, setApiKey, addMeal, updateMeal, deleteMeal, addActivity, deleteActivity, setWater, resetAll, reloadFromCloud, forceUploadToCloud }),
    [data, user, authLoading, dataLoading, signInWithGoogle, signOutUser, setProfile, setApiKey, addMeal, updateMeal, deleteMeal, addActivity, deleteActivity, setWater, resetAll, reloadFromCloud, forceUploadToCloud],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
