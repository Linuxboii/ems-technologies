import { createContext, useContext, useEffect, useState } from 'react';
import { api, setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // When any request is rejected with 401 (e.g. the session token expired),
    // drop the user so ProtectedRoute redirects to the login page.
    setUnauthorizedHandler(() => setUser(null));

    api.get('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    return () => setUnauthorizedHandler(null);
  }, []);

  async function login(email, password) {
    const loggedInUser = await api.post('/auth/login', { email, password });
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function logout() {
    await api.post('/auth/logout');
    setUser(null);
  }

  async function changePassword(oldPassword, newPassword) {
    await api.post('/auth/change-password', { old_password: oldPassword, new_password: newPassword });
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
