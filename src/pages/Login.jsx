import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import './Login.css';

// How long the success checkmark lingers before the card fades, and how long
// the fade itself runs (must match the transition in Login.css).
const SUCCESS_HOLD_MS = 500;
const CARD_FADE_MS = 400;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // idle | submitting | success — drives the button morph
  const [status, setStatus] = useState('idle');
  const [leaving, setLeaving] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const busy = status === 'submitting' || status === 'success';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setStatus('submitting');
    try {
      await login(email, password);
      const redirectTo = location.state?.from || '/';

      const prefersReduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      if (prefersReduced) {
        navigate(redirectTo, { replace: true });
        return;
      }

      // Show the checkmark, hold briefly, then fade the card out and navigate.
      setStatus('success');
      window.setTimeout(() => {
        setLeaving(true);
        window.setTimeout(() => {
          navigate(redirectTo, { replace: true });
        }, CARD_FADE_MS);
      }, SUCCESS_HOLD_MS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
      setStatus('idle');
    }
  }

  return (
    <div className="page-section" style={{ paddingTop: 120 }}>
      <div className="page-container" style={{ maxWidth: 400, margin: '0 auto' }}>
        <div className={`card login-card${leaving ? ' is-leaving' : ''}`}>
          <h2 className="section-title" style={{ marginBottom: 24, fontSize: 24 }}>
            Sign in
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid var(--color-border)', fontSize: 14,
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Password
              </label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div style={{
                marginBottom: 16, padding: '10px 12px', borderRadius: 8,
                background: 'var(--color-warning-bg)', color: 'var(--color-warning)',
                fontSize: 13, fontWeight: 500,
              }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn-primary" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
              <span className="login-btn-content">
                {status === 'submitting' && <span className="login-spinner" aria-hidden="true" />}
                {status === 'success' && (
                  <svg className="login-check" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {status === 'submitting' ? 'Signing in…' : status === 'success' ? 'Welcome' : 'Sign in'}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
