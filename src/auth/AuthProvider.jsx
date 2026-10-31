import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, onSessionExpired, tokenStorage } from '../api/index.js';

const AuthContext = createContext(null);

const SESSION_EXPIRED_MESSAGE = 'Su sesión expiró. Ingrese de nuevo.';

/**
 * Owns the session: who is logged in and what they may do.
 * status: 'loading' (checking a saved token) | 'authenticated' | 'anonymous'.
 */
export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (tokenStorage.get() ? 'loading' : 'anonymous'));
  const [notice, setNotice] = useState(null);

  const endSession = useCallback(
    (message = null) => {
      tokenStorage.clear();
      // Drop cached data so the next user never sees the previous one's lists.
      queryClient.clear();
      setUser(null);
      setStatus('anonymous');
      setNotice(message);
    },
    [queryClient],
  );

  // A saved token from a previous visit: confirm it is still valid.
  useEffect(() => {
    if (status !== 'loading') return;
    api.auth
      .me()
      .then((currentUser) => {
        setUser(currentUser);
        setStatus('authenticated');
      })
      .catch(() => endSession());
    // Runs once on start-up.
  }, []);

  // Any request answered with 401 (expired token, user deactivated...).
  useEffect(() => onSessionExpired(() => endSession(SESSION_EXPIRED_MESSAGE)), [endSession]);

  const login = useCallback(async (credentials) => {
    const { token, user: loggedUser } = await api.auth.login(credentials);
    tokenStorage.set(token);
    setUser(loggedUser);
    setStatus('authenticated');
    setNotice(null);
    return loggedUser;
  }, []);

  const logout = useCallback(() => endSession(), [endSession]);

  /** Changing the password closes the other sessions: keep the new token. */
  const changePassword = useCallback(async (passwords) => {
    const { token } = await api.auth.changePassword(passwords);
    tokenStorage.set(token);
  }, []);

  const value = useMemo(() => {
    const permissions = new Set(user?.permissions ?? []);
    return {
      user,
      status,
      notice,
      login,
      logout,
      changePassword,
      /** can('loans.create') — hides buttons; the API checks again on every request. */
      can: (permission) => permissions.has(permission),
    };
  }, [user, status, notice, login, logout, changePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
};
