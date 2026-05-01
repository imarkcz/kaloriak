import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './state/AppState';
import Onboarding from './pages/Onboarding';
import Today from './pages/Today';
import AddMeal from './pages/AddMeal';
import AddActivity from './pages/AddActivity';
import Profile from './pages/Profile';
import BottomNav from './components/BottomNav';
import LoginScreen from './components/LoginScreen';
import UpdateBanner from './components/UpdateBanner';

function Shell() {
  const { data, user, authLoading, dataLoading } = useApp();
  const location = useLocation();

  // Wait for Firebase auth AND initial data load — prevents redirect to
  // Onboarding before cloud data arrives
  if (authLoading || dataLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-coral-400" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }

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
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/add" element={<AddMeal />} />
        <Route path="/activity" element={<AddActivity />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </>
  );
}

function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* coral blob — top-left */}
      <div
        className="bg-blob-1 absolute -top-[280px] -left-[180px] w-[650px] h-[650px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(249,115,102,0.55), rgba(251,113,133,0.3) 50%, transparent 75%)', filter: 'blur(80px)', opacity: 0.55 }}
      />
      {/* violet blob — bottom-right */}
      <div
        className="bg-blob-2 absolute -bottom-[200px] -right-[160px] w-[580px] h-[580px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.5), rgba(124,58,237,0.25) 50%, transparent 75%)', filter: 'blur(90px)', opacity: 0.45 }}
      />
      {/* indigo blob — mid-right, subtle */}
      <div
        className="bg-blob-3 absolute top-[38%] -right-[120px] w-[420px] h-[420px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.35), transparent 70%)', filter: 'blur(70px)', opacity: 0.35 }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AnimatedBackground />
        <UpdateBanner />
        <Shell />
      </BrowserRouter>
    </AppProvider>
  );
}
