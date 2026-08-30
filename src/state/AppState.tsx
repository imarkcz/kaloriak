import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { browserLocalPersistence, onAuthStateChanged, setPersistence, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import type { Activity, AppData, Meal, UserProfile } from '../types';
import { deleteMealImage, loadAllMealImages, pruneMealImages, saveMealImage } from '../lib/imageStore';

const STORAGE_KEY = 'kaloriak:v1';

export type SyncStatus = 'idle' | 'pending' | 'synced' | 'offline' | 'error';

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

// Meal photos live in IndexedDB (imageStore), not localStorage — a single
// base64 photo is ~300 kB against localStorage's ~5 MB origin cap. The profile
// avatar stays here, it is one small blob.
function saveLocal(data: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...data,
      meals: data.meals.map((m) => ({ ...m, imageDataUrl: undefined })),
    }));
    return true;
  } catch {
    return false;
  }
}

// Firestore rejects every undefined field and caps a document at 1 MiB, so
// blobs come out and the JSON round-trip purges undefined values.
function stripBlobs(data: AppData): Record<string, unknown> {
  const stripped = {
    ...data,
    profile: data.profile ? { ...data.profile, avatarDataUrl: undefined } : null,
    meals: data.meals.map((m) => ({ ...m, imageDataUrl: undefined })),
  };
  return JSON.parse(JSON.stringify(stripped));
}

function withImages(data: AppData, images: Map<string, string>, avatar?: string): AppData {
  return {
    ...data,
    profile: data.profile ? { ...data.profile, avatarDataUrl: avatar ?? data.profile.avatarDataUrl } : data.profile,
    meals: data.meals.map((m) => ({ ...m, imageDataUrl: images.get(m.id) })),
  };
}

// Cloud wins on conflict, but anything logged locally and not yet in the cloud
// is kept and re-uploaded. Locally-set fields survive underneath cloud values.
function mergeCloudAndLocal(cloud: AppData, local: AppData): AppData {
  const cloudIds = new Set(cloud.meals.map((m) => m.id));
  const cloudActIds = new Set((cloud.activities ?? []).map((a) => a.id));
  return {
    ...cloud,
    onboarded: cloud.onboarded || local.onboarded,
    geminiApiKey: local.geminiApiKey || cloud.geminiApiKey,
    profile: cloud.profile ?? local.profile,
    water: { ...(local.water ?? {}), ...(cloud.water ?? {}) },
    meals: [
      ...local.meals.filter((m) => !cloudIds.has(m.id)),
      ...cloud.meals.map((cm) => {
        const lm = local.meals.find((m) => m.id === cm.id);
        return lm ? { ...lm, ...cm } : cm;
      }),
    ].sort((a, b) => b.createdAt - a.createdAt),
    activities: [
      ...(local.activities ?? []).filter((a) => !cloudActIds.has(a.id)),
      ...(cloud.activities ?? []),
    ].sort((a, b) => b.createdAt - a.createdAt),
  };
}

function hasContent(d: AppData): boolean {
  return d.onboarded || d.meals.length > 0 || !!d.profile;
}

interface AppContextValue {
  data: AppData;
  user: User | null;
  authLoading: boolean;
  dataLoading: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
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
  setWeight: (kg: number) => void;
  resetAll: () => void;
  reloadFromCloud: () => Promise<number | null>;
  forceUploadToCloud: () => Promise<boolean>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadLocal());
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  const userRef = useRef<User | null>(null);
  const dataRef = useRef<AppData>(data);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Signature of the document as the cloud last had it. Guards the realtime
  // listener from re-applying our own echo and starting a write loop.
  const lastSeen = useRef<string>('');
  const ready = useRef(false);
  // Listener resubscribe backoff. The count lives in a ref so a success does
  // not re-run the effect and tear the listener down again.
  const retries = useRef(0);
  const [retryTick, setRetryTick] = useState(0);

  // Kept in sync after commit rather than during render: everything that reads
  // these refs (the debounced write, the hide flush, the manual sync buttons)
  // runs in an effect or an event handler, never while rendering.
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { dataRef.current = data; }, [data]);

  // Hydrate meal photos from IndexedDB — initial state came from localStorage,
  // which is image-free.
  useEffect(() => {
    loadAllMealImages().then((images) => {
      if (images.size === 0) return;
      setData((d) => ({
        ...d,
        meals: d.meals.map((m) => (images.has(m.id) ? { ...m, imageDataUrl: images.get(m.id) } : m)),
      }));
    }).catch(() => { /* IDB unavailable — the app works without thumbnails */ });
  }, []);

  // iOS PWA standalone can lose the default persistence across sessions.
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(() => { /* falls back to memory */ });
  }, []);

  const write = useCallback(async (snapshot: AppData) => {
    const u = userRef.current;
    if (!u) return false;
    const payload = stripBlobs(snapshot);
    lastSeen.current = JSON.stringify(payload);
    try {
      // With persistentLocalCache this resolves on server ack, but the write is
      // already durable in IndexedDB and replays on its own. A rejection here is
      // therefore informational, never data loss.
      await setDoc(doc(db, 'users', u.uid), payload, { merge: true });
      return true;
    } catch (e) {
      const code = e instanceof Error && 'code' in e ? String((e as { code: unknown }).code) : String(e);
      if (!/unavailable|offline|deadline/i.test(code)) {
        setSyncStatus('error');
        setSyncError(code);
      }
      return false;
    }
  }, []);

  // Auth + one-shot initial load. The realtime listener attaches afterwards so
  // the merge below is never racing an incoming snapshot.
  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      ready.current = false;
      // Set the ref here as well as in the effect below: this callback calls
      // write() before React has committed the setUser render, and write()
      // bails without a user.
      userRef.current = firebaseUser;
      setUser(firebaseUser);

      if (!firebaseUser) {
        setAuthLoading(false);
        setSyncStatus('idle');
        return;
      }

      setDataLoading(true);
      try {
        const [snap, images] = await Promise.all([
          getDoc(doc(db, 'users', firebaseUser.uid)).catch(() => null),
          loadAllMealImages(),
        ]);
        const local = loadLocal();
        const avatar = local.profile?.avatarDataUrl;
        const cloud = snap?.exists() ? { ...DEFAULT, ...(snap.data() as Partial<AppData>) } : null;

        if (cloud && hasContent(cloud)) {
          const merged = mergeCloudAndLocal(cloud, local);
          setData(withImages(merged, images, avatar));
          lastSeen.current = JSON.stringify(stripBlobs(merged));
          if (merged.meals.length !== cloud.meals.length) await write(merged);
        } else if (hasContent(local)) {
          setData(withImages(local, images, avatar));
          await write(local);
        } else if (snap?.exists()) {
          // Authenticated account with no data anywhere: skip onboarding and let
          // the profile page fill in the details.
          setData((d) => ({ ...d, onboarded: true }));
        }
        // else: genuinely new user — onboarding
      } finally {
        ready.current = true;
        setDataLoading(false);
        setAuthLoading(false);
      }
    });
  }, [write]);

  // Realtime listener: drives sync status from Firestore's own metadata and
  // brings in changes made on another device.
  //
  // Firestore tears the listener down permanently on error, so without the
  // backoff resubscribe below a single hiccup would leave sync dead until the
  // app is reloaded — which is exactly how a transient failure turned into a
  // banner that never went away.
  useEffect(() => {
    if (!user) return;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      { includeMetadataChanges: true },
      (snap) => {
        retries.current = 0;
        setSyncStatus(snap.metadata.hasPendingWrites ? 'pending' : 'synced');
        setSyncError(null);
        if (!ready.current || snap.metadata.hasPendingWrites || !snap.exists()) return;

        const cloud = { ...DEFAULT, ...(snap.data() as Partial<AppData>) };
        const json = JSON.stringify(stripBlobs(cloud));
        if (json === lastSeen.current) return;
        lastSeen.current = json;

        loadAllMealImages().then((images) => {
          setData((d) => withImages(cloud, images, d.profile?.avatarDataUrl));
        });
      },
      (err) => {
        if (/unavailable/i.test(err.code)) {
          setSyncStatus('offline');
        } else {
          setSyncStatus('error');
          setSyncError(err.code);
        }
        // A denial is a config problem, not a hiccup — it will not fix itself in
        // 30 seconds, but it does fix itself the moment the rules are published,
        // so keep checking, just far less often.
        const ceiling = /permission-denied|unauthenticated/i.test(err.code) ? 300_000 : 30_000;
        const delay = Math.min(ceiling, 2_000 * 2 ** Math.min(retries.current, 8));
        retries.current += 1;
        retryTimer = setTimeout(() => setRetryTick((n) => n + 1), delay);
      },
    );

    return () => {
      unsub();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [user, retryTick]);

  // localStorage every change (synchronous, instant first paint next launch),
  // Firestore debounced. Firestore's own queue handles delivery from there.
  useEffect(() => {
    setStorageWarning(saveLocal(data) ? null : 'Lokální úložiště je plné. Smaž starší jídla s fotkou.');

    if (!ready.current || !userRef.current) return;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => write(dataRef.current), 400);
  }, [data, write]);

  // Flush the pending write when the page is hidden. Safe now: the write is
  // durable in IndexedDB the moment setDoc is called, even if iOS freezes us.
  useEffect(() => {
    function flush() {
      if (!writeTimer.current) return;
      clearTimeout(writeTimer.current);
      writeTimer.current = null;
      write(dataRef.current);
    }
    function onVisibility() { if (document.visibilityState === 'hidden') flush(); }
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [write]);

  const mutate = useCallback((producer: (d: AppData) => AppData) => {
    setData((d) => producer(d));
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, []);

  const setProfile = useCallback((profile: UserProfile) => {
    mutate((d) => ({ ...d, profile, onboarded: true }));
  }, [mutate]);

  const setApiKey = useCallback((geminiApiKey: string) => {
    mutate((d) => ({ ...d, geminiApiKey }));
  }, [mutate]);

  const addMeal = useCallback((meal: Meal) => {
    if (meal.imageDataUrl) saveMealImage(meal.id, meal.imageDataUrl).catch(() => { /* thumbnail only */ });
    mutate((d) => ({ ...d, meals: [meal, ...d.meals] }));
  }, [mutate]);

  const updateMeal = useCallback((id: string, patch: Partial<Meal>) => {
    if (patch.imageDataUrl) saveMealImage(id, patch.imageDataUrl).catch(() => { /* thumbnail only */ });
    mutate((d) => ({ ...d, meals: d.meals.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  }, [mutate]);

  const deleteMeal = useCallback((id: string) => {
    deleteMealImage(id).catch(() => { /* pruned later anyway */ });
    mutate((d) => ({ ...d, meals: d.meals.filter((m) => m.id !== id) }));
  }, [mutate]);

  const addActivity = useCallback((activity: Activity) => {
    mutate((d) => ({ ...d, activities: [activity, ...d.activities] }));
  }, [mutate]);

  const deleteActivity = useCallback((id: string) => {
    mutate((d) => ({ ...d, activities: d.activities.filter((a) => a.id !== id) }));
  }, [mutate]);

  const setWater = useCallback((date: string, ml: number) => {
    mutate((d) => ({ ...d, water: { ...(d.water ?? {}), [date]: Math.max(0, Math.round(ml)) } }));
  }, [mutate]);

  // Weight is logged as a dated point so progress can be charted; the profile
  // keeps the latest value because every target calculation reads it.
  const setWeight = useCallback((kg: number) => {
    const today = new Date().toISOString().slice(0, 10);
    mutate((d) => ({
      ...d,
      weightLog: { ...(d.weightLog ?? {}), [today]: Math.round(kg * 10) / 10 },
      profile: d.profile ? { ...d.profile, weightKg: Math.round(kg * 10) / 10 } : d.profile,
    }));
  }, [mutate]);

  const resetAll = useCallback(() => {
    lastSeen.current = '';
    setData(DEFAULT);
  }, []);

  const reloadFromCloud = useCallback(async () => {
    const u = userRef.current;
    if (!u) return null;
    setDataLoading(true);
    try {
      const [snap, images] = await Promise.all([
        getDoc(doc(db, 'users', u.uid)),
        loadAllMealImages(),
      ]);
      if (!snap.exists()) return 0;
      const cloud = { ...DEFAULT, ...(snap.data() as Partial<AppData>) };
      const merged = mergeCloudAndLocal(cloud, dataRef.current);
      lastSeen.current = JSON.stringify(stripBlobs(merged));
      setData(withImages(merged, images, dataRef.current.profile?.avatarDataUrl));
      return merged.meals.length;
    } finally {
      setDataLoading(false);
    }
  }, []);

  const forceUploadToCloud = useCallback(() => write(dataRef.current), [write]);

  // Drop IDB images whose meal no longer exists.
  useEffect(() => {
    const id = setInterval(() => {
      pruneMealImages(new Set(dataRef.current.meals.map((m) => m.id)));
    }, 120_000);
    return () => clearInterval(id);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      data, user, authLoading, dataLoading, syncStatus, syncError, storageWarning,
      signInWithGoogle, signOutUser, setProfile, setApiKey,
      addMeal, updateMeal, deleteMeal, addActivity, deleteActivity,
      setWater, setWeight, resetAll, reloadFromCloud, forceUploadToCloud,
    }),
    [
      data, user, authLoading, dataLoading, syncStatus, syncError, storageWarning,
      signInWithGoogle, signOutUser, setProfile, setApiKey,
      addMeal, updateMeal, deleteMeal, addActivity, deleteActivity,
      setWater, setWeight, resetAll, reloadFromCloud, forceUploadToCloud,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
