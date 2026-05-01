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
      {/* coral — top-left, primary glow */}
      <div
        className="bg-blob-1 absolute -top-[200px] -left-[150px] w-[750px] h-[750px] rounded-full"
        style={{ background: 'radial-gradient(circle at 40% 40%, #f97366 0%, #fb7185 35%, transparent 70%)', filter: 'blur(55px)', opacity: 0.55 }}
      />
      {/* violet — bottom-right */}
      <div
        className="bg-blob-2 absolute -bottom-[180px] -right-[140px] w-[680px] h-[680px] rounded-full"
        style={{ background: 'radial-gradient(circle at 55% 55%, #a78bfa 0%, #7c3aed 40%, transparent 72%)', filter: 'blur(60px)', opacity: 0.50 }}
      />
      {/* amber — top-right accent */}
      <div
        className="bg-blob-3 absolute -top-[100px] -right-[80px] w-[480px] h-[480px] rounded-full"
        style={{ background: 'radial-gradient(circle at 50% 50%, #fbbf24 0%, #f59e0b 40%, transparent 70%)', filter: 'blur(65px)', opacity: 0.28 }}
      />
      {/* teal — bottom-left counter-accent */}
      <div
        className="bg-blob-1 absolute bottom-[10%] -left-[100px] w-[380px] h-[380px] rounded-full"
        style={{ background: 'radial-gradient(circle, #34d399 0%, #059669 45%, transparent 70%)', filter: 'blur(70px)', opacity: 0.20, animationDelay: '-12s' }}
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
