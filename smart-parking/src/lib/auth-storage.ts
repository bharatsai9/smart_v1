const STORAGE_KEY = "smartpark_auth";

export type UserRole = "admin" | "user";

export type AuthUser = { username: string; role: UserRole };

export type StoredAuth = { token: string; user: AuthUser };

export function loadAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as StoredAuth;
    if (!p?.token || !p?.user?.username || !p?.user?.role) return null;
    if (p.user.role !== "admin" && p.user.role !== "user") return null;
    return p;
  } catch {
    return null;
  }
}

export function saveAuth(auth: StoredAuth): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function clearAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getAuthToken(): string | null {
  return loadAuth()?.token ?? null;
}
