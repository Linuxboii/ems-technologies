import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { label: 'Welcome', path: '/' },
  { label: 'SoP', path: '/sop' },
  { label: 'Deliverables', path: '/deliverables' },
  { label: 'Timeline', path: '/timeline' },
  { label: 'Payment', path: '/payment' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setIsOpen(false); }, [pathname]);

  async function handleLogout() {
    await logout();
    setIsOpen(false);
    navigate('/');
  }

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.7)',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid var(--color-border)' : '1px solid transparent',
      transition: 'all 0.25s ease',
      fontFamily: 'var(--font-sans)',
    }}>
      <div className="page-container" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: scrolled ? 60 : 76,
        transition: 'height 0.25s ease',
      }}>
        {/* Logo — minimal */}
        <Link to="/" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          textDecoration: 'none', color: 'var(--color-text)',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 6,
            background: 'var(--color-text)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 14, letterSpacing: -1,
          }}>
            V
          </div>
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.03em' }}>
            vikram
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {links.map(l => {
            const active = pathname === l.path;
            return (
              <Link
                key={l.path}
                to={l.path}
                style={{
                  padding: '8px 16px', borderRadius: 6,
                  fontSize: 14, fontWeight: active ? 600 : 500,
                  color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
                  textDecoration: 'none',
                  transition: 'color 0.15s ease, background 0.15s ease',
                  background: active ? 'var(--color-surface)' : 'transparent',
                }}
              >
                {l.label}
              </Link>
            );
          })}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 12, paddingLeft: 12, borderLeft: '1px solid var(--color-border)' }}>
            {user ? (
              <>
                <Link to="/account" style={{ fontSize: 13, color: 'var(--color-text-muted)', textDecoration: 'none', fontWeight: 500 }}>
                  {user.email}
                </Link>
                <button onClick={handleLogout} className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }}>
                  Log out
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13, textDecoration: 'none' }}>
                Log in
              </Link>
            )}
          </div>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="nav-mobile-btn"
          style={{
            display: 'none', background: 'none', border: 'none',
            color: 'var(--color-text)', cursor: 'pointer', padding: 8,
          }}
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="nav-mobile-menu" style={{
          background: '#fff', borderTop: '1px solid var(--color-border)',
          padding: '12px 24px',
        }}>
          {links.map(l => (
            <Link
              key={l.path}
              to={l.path}
              onClick={() => setIsOpen(false)}
              style={{
                display: 'block', padding: '14px 0',
                color: pathname === l.path ? 'var(--color-text)' : 'var(--color-text-secondary)',
                fontWeight: pathname === l.path ? 600 : 500,
                fontSize: 16, textDecoration: 'none',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              {l.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link
                to="/account"
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'block', padding: '14px 0', color: 'var(--color-text-secondary)',
                  fontWeight: 500, fontSize: 16, textDecoration: 'none',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                {user.email}
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '14px 0',
                  color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: 16,
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'block', padding: '14px 0', color: 'var(--color-text-secondary)',
                fontWeight: 500, fontSize: 16, textDecoration: 'none',
              }}
            >
              Log in
            </Link>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .nav-mobile-menu { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
