import { NavLink, useNavigate } from 'react-router-dom';
import { haptic } from '../lib/haptics';
import Icon from './Icon';

// The one surface in the app that blurs: it overlays scrolling content, so the
// blur is doing a job. See DESIGN.md.
export default function BottomNav() {
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-1 px-5 py-1.5 rounded-full transition-colors duration-200 ${
      isActive ? 'text-ink' : 'text-ink-mute'
    }`;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 pb-safe pointer-events-none">
      <div className="max-w-md mx-auto px-5 pb-3 pt-2 flex justify-center">
        <nav className="pointer-events-auto blur-pill rounded-full px-2 py-2 flex items-center gap-1">
          <NavLink to="/" end className={linkClass} onClick={() => haptic('tap')}>
            {({ isActive }) => (
              <>
                <Icon name="home" size={21} fill={isActive} />
                <span className="text-micro font-medium">Dnes</span>
              </>
            )}
          </NavLink>

          <button
            onClick={() => { haptic('tap'); navigate('/add'); }}
            className="w-14 h-14 rounded-full btn btn-primary mx-1"
            aria-label="Přidat jídlo"
          >
            <Icon name="plus" size={24} strokeWidth={2} />
          </button>

          <NavLink to="/profile" className={linkClass} onClick={() => haptic('tap')}>
            {({ isActive }) => (
              <>
                <Icon name="user" size={21} fill={isActive} />
                <span className="text-micro font-medium">Profil</span>
              </>
            )}
          </NavLink>
        </nav>
      </div>
    </div>
  );
}
