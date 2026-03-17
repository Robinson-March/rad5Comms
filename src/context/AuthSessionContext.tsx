import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const AUTH_TOKEN_KEY = 'token';
const AUTH_USER_KEY = 'auth-user';

export const PUBLIC_SIGNUP_ENABLED = String(import.meta.env.VITE_ENABLE_PUBLIC_SIGNUP ?? '')
  .trim()
  .toLowerCase() === 'true';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  mustChangePassword?: boolean;
}

interface AuthSessionValue {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  canAccessAdmin: boolean;
  mustChangePassword: boolean;
  saveSession: (params: { token: string; user?: unknown; mustChangePassword?: boolean }) => void;
  updateUser: (updates: Partial<AuthUser>) => void;
  refreshUser: () => Promise<AuthUser | null>;
  logout: (reason?: string) => void;
}

interface AuthSessionProviderProps {
  children: ReactNode;
}

const AuthSessionContext = createContext<AuthSessionValue | undefined>(undefined);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
};

const readBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  return undefined;
};

const extractObjectCandidates = (value: unknown): Record<string, unknown>[] => {
  if (!isObject(value)) {
    return [];
  }

  const data = isObject(value.data) ? value.data : null;
  const user = isObject(value.user) ? value.user : null;
  const nestedUser = data && isObject(data.user) ? data.user : null;

  return [nestedUser, user, data, value].filter((candidate): candidate is Record<string, unknown> => Boolean(candidate));
};

const normalizeAuthUser = (value: unknown): AuthUser | null => {
  const candidates = extractObjectCandidates(value);

  for (const candidate of candidates) {
    const id = readString(candidate.id);
    const name = readString(candidate.name) || readString(candidate.fullName) || 'User';
    const email = readString(candidate.email) || '';
    const role = readString(candidate.role) || 'member';
    const avatar = readString(candidate.avatar);
    const mustChangePassword = readBoolean(candidate.mustChangePassword);

    if (!id) {
      continue;
    }

    return {
      id,
      name,
      email,
      role,
      ...(avatar ? { avatar } : {}),
      ...(typeof mustChangePassword === 'boolean' ? { mustChangePassword } : {}),
    };
  }

  return null;
};

const resolveToken = (value: unknown): string | null => {
  const candidates = extractObjectCandidates(value);

  for (const candidate of candidates) {
    const token = readString(candidate.token);
    if (token) {
      return token;
    }
  }

  return null;
};

const resolveMustChangePassword = (value: unknown): boolean => {
  const candidates = extractObjectCandidates(value);

  for (const candidate of candidates) {
    const mustChangePassword = readBoolean(candidate.mustChangePassword);
    if (typeof mustChangePassword === 'boolean') {
      return mustChangePassword;
    }
  }

  return false;
};

const getStoredToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

const getStoredUser = (): AuthUser | null => {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return normalizeAuthUser(JSON.parse(raw));
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
};

const persistSession = (token: string, user: AuthUser | null) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);

  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }
};

const clearStoredSession = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
};

const emitAuthChange = () => {
  window.dispatchEvent(new Event('auth-change'));
};

const isSessionResetResponse = (error: unknown) => {
  if (!axios.isAxiosError(error) || error.response?.status !== 401) {
    return false;
  }

  const payload = isObject(error.response?.data) ? error.response.data : {};
  const errorMessage = `${readString(payload.error) || ''} ${readString(payload.message) || ''}`.toLowerCase();
  const code = (readString(payload.code) || '').toLowerCase();
  const hints = ['session reset', 'sessions reset', 'reset-sessions', 'session_reset', 'session invalidated'];

  return hints.some((hint) => errorMessage.includes(hint) || code.includes(hint));
};

export const AuthSessionProvider = ({ children }: AuthSessionProviderProps) => {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(() => Boolean(getStoredToken()));
  const logoutRef = useRef<(reason?: string) => void>(() => undefined);

  const syncFromStorage = useCallback(() => {
    setToken(getStoredToken());
    setUser(getStoredUser());
  }, []);

  const logout = useCallback(
    (reason?: string) => {
      clearStoredSession();
      syncFromStorage();
      emitAuthChange();

      if (reason) {
        toast.error(reason);
      }

      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.location.replace('/');
      }
    },
    [syncFromStorage]
  );

  logoutRef.current = logout;

  const refreshUser = useCallback(async () => {
    const storedToken = getStoredToken();

    if (!storedToken) {
      setIsLoading(false);
      setUser(null);
      setToken(null);
      return null;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });

      const nextUser = normalizeAuthUser(response.data);
      const nextMustChangePassword = resolveMustChangePassword(response.data);
      const mergedUser =
        nextUser && typeof nextMustChangePassword === 'boolean'
          ? { ...nextUser, mustChangePassword: nextMustChangePassword }
          : nextUser;

      persistSession(storedToken, mergedUser);
      syncFromStorage();
      setIsLoading(false);

      return mergedUser;
    } catch (error) {
      if (axios.isAxiosError(error) && [401, 403].includes(error.response?.status || 0)) {
        clearStoredSession();
        syncFromStorage();
      }

      setIsLoading(false);
      return null;
    }
  }, [syncFromStorage]);

  const saveSession = useCallback(
    ({ token: nextToken, user: nextUserValue, mustChangePassword }: { token: string; user?: unknown; mustChangePassword?: boolean }) => {
      const nextUser = normalizeAuthUser(nextUserValue) || getStoredUser();
      const mergedUser =
        nextUser && typeof mustChangePassword === 'boolean'
          ? { ...nextUser, mustChangePassword }
          : nextUser;

      persistSession(nextToken, mergedUser);
      syncFromStorage();
      emitAuthChange();
    },
    [syncFromStorage]
  );

  const updateUser = useCallback(
    (updates: Partial<AuthUser>) => {
      const storedToken = getStoredToken();
      const storedUser = getStoredUser();

      if (!storedToken || !storedUser) {
        return;
      }

      persistSession(storedToken, { ...storedUser, ...updates });
      syncFromStorage();
      emitAuthChange();
    },
    [syncFromStorage]
  );

  useEffect(() => {
    const handleAuthChange = () => {
      const storedToken = getStoredToken();
      syncFromStorage();

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      void refreshUser();
    };

    handleAuthChange();
    window.addEventListener('auth-change', handleAuthChange);

    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, [refreshUser, syncFromStorage]);

  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (isSessionResetResponse(error)) {
          logoutRef.current('Your session was reset. Please sign in again.');
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptorId);
    };
  }, []);

  const value = useMemo<AuthSessionValue>(
    () => ({
      token,
      user,
      isLoading,
      isAuthenticated: Boolean(token),
      canAccessAdmin: Boolean(user && user.role !== 'member'),
      mustChangePassword: Boolean(user?.mustChangePassword),
      saveSession,
      updateUser,
      refreshUser,
      logout,
    }),
    [token, user, isLoading, saveSession, updateUser, refreshUser, logout]
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
};

export const useAuthSession = () => {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error('useAuthSession must be used within an AuthSessionProvider');
  }

  return context;
};

export { emitAuthChange, normalizeAuthUser, resolveMustChangePassword, resolveToken };
