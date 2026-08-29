import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './state/AppState';
import Today from './pages/Today';
import BottomNav from './components/BottomNav';
import LoginScreen from './components/LoginScreen';
import UpdateBanner from './components/UpdateBanner';
import SyncBanner from './components/SyncBanner';
import AmbientGlow from './components/AmbientGlow';

// Today is the landing route and stays in the main chunk. The rest split out —
// AddMeal alone drags in the barcode scanner, which most sessions never open.
const AddMeal = lazy(() => import('./pages/AddMeal'));
const AddActivity = lazy(() => import('./pages/AddActivity'));
const Profile = lazy(() => import('./pages/Profile'));
const Onboarding = lazy(() => import('./pages/Onboarding'));

function Spinner() {
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <svg className="animate-spin-slow w-7 h-7 text-violet-400" viewBox="0 0 24 24" fill="none" aria-label="Načítám">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function Shell() {
  const { data, user, authLoading, dataLoading } = useApp();
  const location = useLocation();

  // Wait for Firebase auth AND the initial load, so a logged-in user never
  // flashes onboarding before their cloud data lands.
  if (authLoading || dataLoading) return <Spinner />;
  if (!user) return <LoginScreen />;

  if (!data.onboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  if (data.onboarded && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  const hideNav = ['/onboarding', '/add', '/activity'].includes(location.pathname);

  return (
    <>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/add" element={<AddMeal />} />
          <Route path="/activity" element={<AddActivity />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {!hideNav && <BottomNav />}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AmbientGlow />
        <div className="relative" style={{ zIndex: 1 }}>
          <UpdateBanner />
          <SyncBanner />
          <Shell />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
