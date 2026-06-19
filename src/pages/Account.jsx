import { useState } from 'react';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';

export default function AccountPage() {
  const { user, changePassword } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      await changePassword(oldPassword, newPassword);
      setMessage('Password updated.');
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-section" style={{ paddingTop: 120 }}>
      <div className="page-container" style={{ maxWidth: 400, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div className="section-label">Account</div>
          <h2 className="section-title" style={{ fontSize: 24 }}>{user?.email}</h2>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Change password</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Current password
              </label>
              <PasswordInput
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                New password
              </label>
              <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            {error && (
              <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 8, background: 'var(--color-warning-bg)', color: 'var(--color-warning)', fontSize: 13, fontWeight: 500 }}>
                {error}
              </div>
            )}
            {message && (
              <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 8, background: 'var(--color-success-bg)', color: 'var(--color-success)', fontSize: 13, fontWeight: 500 }}>
                {message}
              </div>
            )}
            <button type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%', justifyContent: 'center' }}>
              {submitting ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
