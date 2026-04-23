import { NavLink, useNavigate } from 'react-router-dom';

export default function BottomNav() {
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-0.5 px-6 py-2 rounded-full transition-all ${
      isActive ? 'text-ink' : 'text-ink-mute'
    }`;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 pb-safe pointer-events-none">
      <div className="max-w-md mx-auto px-5 pb-3 pt-2 flex justify-center">
        <nav className="pointer-events-auto glass rounded-full px-2 py-2 flex items-center gap-1 shadow-2xl shadow-black/60">
          <NavLink to="/" end className={linkClass}>
            {({ isActive }) => (
              <>
                <svg width="22" height="22" viewBox="0 0 24 24" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12 12 3l9 9" />
                  <path d="M5 10v10h14V10" />
                </svg>
                <span className="text-[10px] font-semibold tracking-wide">Dnes</span>
              </>
            )}
          </NavLink>

          <button
            onClick={() => navigate('/add')}
            className="w-14 h-14 rounded-full bg-grad-coral text-white shadow-coral-glow active:scale-95 transition-transform flex items-center justify-center mx-1"
            aria-label="Přidat jídlo"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>

          <NavLink to="/profile" className={linkClass}>
            {({ isActive }) => (
              <>
                <svg width="22" height="22" viewBox="0 0 24 24" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="text-[10px] font-semibold tracking-wide">Profil</span>
              </>
            )}
          </NavLink>
        </nav>
      </div>
    </div>
  );
}
