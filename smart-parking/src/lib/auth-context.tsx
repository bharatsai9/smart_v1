import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import type { AuthUser, StoredAuth } from "./auth-storage";
import { clearAuth, loadAuth, saveAuth } from "./auth-storage";

type AuthState = {
  user: AuthUser | null;
  isReady: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

async function fetchMe(token: string): Promise<AuthUser | null> {
  const base = getApiBase();
  if (!base) return null;
  const res = await fetch(`${base}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { username: string; role: string };
  if (data.role !== "admin" && data.role !== "user") return null;
  return { username: data.username, role: data.role };
}

function getApiBase(): string {
  let resolved = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/$/, "");
  if (!resolved && import.meta.env.DEV) resolved = "http://localhost:8080";
  return resolved;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = loadAuth();
    if (!stored?.token) {
      setIsReady(true);
      return;
    }
    fetchMe(stored.token).then((u) => {
      if (u) {
        setUser(u);
        saveAuth({ token: stored.token, user: u });
      } else {
        clearAuth();
      }
      setIsReady(true);
    });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const base = getApiBase();
    if (!base) throw new Error("API base URL is not configured.");
    const res = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      token?: string;
      user?: AuthUser;
      error?: string;
    };
    if (!res.ok) {
      throw new Error(body.error ?? "Login failed");
    }
    if (!body.token || !body.user) throw new Error("Invalid login response");
    const auth: StoredAuth = { token: body.token, user: body.user };
    saveAuth(auth);
    setUser(body.user);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isReady, login, logout }),
    [user, isReady, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isReady, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isReady && !user) setLocation("/login");
  }, [isReady, user, setLocation]);

  if (!isReady) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-500 text-sm">
        Loading…
      </div>
    );
  }
  if (!user) return null;
  return <>{children}</>;
}
