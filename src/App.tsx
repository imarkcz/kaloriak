import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './state/AppState';
import Onboarding from './pages/Onboarding';
import Today from './pages/Today';
import AddMeal from './pages/AddMeal';
import AddActivity from './pages/AddActivity';
import Profile from './pages/Profile';
import BottomNav from './components/BottomNav';

function Shell() {
  const { data } = useApp();
  const location = useLocation();

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

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AppProvider>
  );
}
