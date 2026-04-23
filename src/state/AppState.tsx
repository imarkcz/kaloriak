import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
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

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT, ...parsed };
  } catch {
    return DEFAULT;
  }
}

function save(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

interface AppContextValue {
  data: AppData;
  setProfile: (p: UserProfile) => void;
  setApiKey: (k: string) => void;
  addMeal: (m: Meal) => void;
  updateMeal: (id: string, patch: Partial<Meal>) => void;
  deleteMeal: (id: string) => void;
  addActivity: (a: Activity) => void;
  deleteActivity: (id: string) => void;
  setWater: (date: string, ml: number) => void;
  resetAll: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => load());

  useEffect(() => {
    save(data);
  }, [data]);

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
    setData((d) => ({
      ...d,
      water: { ...(d.water ?? {}), [date]: Math.max(0, Math.round(ml)) },
    }));
  }, []);

  const resetAll = useCallback(() => {
    setData(DEFAULT);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({ data, setProfile, setApiKey, addMeal, updateMeal, deleteMeal, addActivity, deleteActivity, setWater, resetAll }),
    [data, setProfile, setApiKey, addMeal, updateMeal, deleteMeal, addActivity, deleteActivity, setWater, resetAll],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
