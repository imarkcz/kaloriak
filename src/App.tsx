import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './state/AppState';
import Today from './pages/Today';

// Today is the landing route and stays in the main chunk. The rest split out —
// AddMeal alone pulls in the barcode scanner, which most sessions never open.
const AddMeal = lazy(() => import('./pages/AddMeal'));
const AddActivity = lazy(() => import('./pages/AddActivity'));
const Profile = lazy(() => import('./pages/Profile'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
import BottomNav from './components/BottomNav';
import LoginScreen from './components/LoginScreen';
import UpdateBanner from './components/UpdateBanner';
import SyncBanner from './components/SyncBanner';
import SparklesCanvas from './components/SparklesCanvas';

function Shell() {
  const { data, user, authLoading, dataLoading } = useApp();
  const location = useLocation();

  // Wait for Firebase auth AND initial data load — prevents redirect to
  // Onboarding before cloud data arrives
  if (authLoading || dataLoading) return <Spinner />;

  // Not logged in — show login screen
  if (!user) return <LoginScreen />;

  if (!data.onboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  if (data.onboarded && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  const hideNav =
    location.pathname === '/onboarding' ||
    location.pathname === '/add' ||
    location.pathname === '/activity';

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

function Spinner() {
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <svg className="animate-spin w-8 h-8 text-coral-400" viewBox="0 0 24 24" fill="none" aria-label="Načítám">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <SparklesCanvas />
        <div className="relative" style={{ zIndex: 1 }}>
          <UpdateBanner />
          <SyncBanner />
          <Shell />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
