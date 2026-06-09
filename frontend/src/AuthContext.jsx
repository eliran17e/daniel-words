import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api, { TOKEN_KEY, USER_KEY } from "./api";

const AuthContext = createContext(null);

function readCachedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readCachedUser);
  const [token, setToken] = useState(
    () => localStorage.getItem(TOKEN_KEY) || null
  );
  const [bootChecked, setBootChecked] = useState(false);

  // Persist token + user
  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  // On boot, if we have a token, verify it with /auth/me to catch
  // server-side invalidation (deleted user, expired token, etc.)
  useEffect(() => {
    let cancelled = false;
    async function verify() {
      if (!token) {
        setBootChecked(true);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        if (!cancelled) setUser(data);
      } catch {
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setBootChecked(true);
      }
    }
    verify();
    return () => {
      cancelled = true;
    };
    // intentionally only on mount; we don't want to re-verify on every token change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", {
      email: email.trim().toLowerCase(),
      password,
    });
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (email, password, displayName) => {
    const { data } = await api.post("/auth/register", {
      email: email.trim().toLowerCase(),
      password,
      display_name: displayName || null,
    });
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const loginWithGoogle = useCallback(async (idToken) => {
    const { data } = await api.post("/auth/google", { id_token: idToken });
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, bootChecked, login, register, loginWithGoogle, logout }),
    [user, token, bootChecked, login, register, loginWithGoogle, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
