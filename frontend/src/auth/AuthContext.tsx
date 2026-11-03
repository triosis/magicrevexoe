import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import * as authService from '../api/auth.service';
import type { AuthUser, LoginInput, RegisterInput } from '../api/auth.service';
import { setAccessToken } from '../api/client';

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  useEffect(() => {
    let active = true;
    void authService
      .restoreSession()
      .then((restoredUser) => {
        if (!active) return;
        setUser(restoredUser);
        setStatus('authenticated');
      })
      .catch(() => {
        if (active) clearSession();
      });

    const handleExpiredSession = () => clearSession();
    window.addEventListener('auth:session-expired', handleExpiredSession);
    return () => {
      active = false;
      window.removeEventListener('auth:session-expired', handleExpiredSession);
    };
  }, [clearSession]);

  const authenticate = useCallback(
    async (action: () => Promise<AuthUser>) => {
      setError(null);
      try {
        const authenticatedUser = await action();
        setUser(authenticatedUser);
        setStatus('authenticated');
      } catch (requestError) {
        clearSession();
        const message = authService.getApiErrorMessage(requestError);
        setError(message);
        throw requestError;
      }
    },
    [clearSession],
  );

  const login = useCallback(
    (input: LoginInput) => authenticate(() => authService.login(input)),
    [authenticate],
  );
  const register = useCallback(
    (input: RegisterInput) => authenticate(() => authService.register(input)),
    [authenticate],
  );
  const logout = useCallback(async () => {
    setError(null);
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      error,
      login,
      register,
      logout,
      clearError: () => setError(null),
    }),
    [error, login, logout, register, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
