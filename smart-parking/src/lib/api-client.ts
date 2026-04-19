import { useMutation, useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { getAuthToken } from "./auth-storage";

let baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim();

/** Local dev: default to same host as typical api-server (no SQL — API uses in-memory slots). */
const DEV_DEFAULT_API = "http://localhost:8080";

export function setBaseUrl(url: string): void {
  baseUrl = url.trim();
}

function getApiBaseUrl(): string {
  let resolved = baseUrl.replace(/\/$/, "");
  if (!resolved && import.meta.env.DEV) {
    resolved = DEV_DEFAULT_API.replace(/\/$/, "");
  }
  return resolved;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error(
      "VITE_API_BASE_URL is not set. For production builds (e.g. GitHub Pages), set it to your API origin. For local dev, run the api-server on port 8080 or set VITE_API_BASE_URL in .env.local.",
    );
  }

  const token = getAuthToken();
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let msg = errorText;
    try {
      const j = JSON.parse(errorText) as { error?: unknown; message?: unknown };
      if (typeof j.error === "string") msg = j.error;
      else if (typeof j.message === "string") msg = j.message;
    } catch {
      /* use raw body */
    }
    throw new Error(msg || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function getGetDashboardQueryKey() {
  return ["dashboard"];
}

export function useGetDashboard(options?: { query?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn"> }) {
  return useQuery({
    queryKey: getGetDashboardQueryKey(),
    queryFn: () => request("/api/dashboard"),
    ...(options?.query ?? {}),
  });
}

export function getGetSlotsQueryKey(params?: { level?: string; slotType?: string }) {
  return ["slots", params ?? {}];
}

export function useGetSlots(
  params?: { level?: string; slotType?: string },
  options?: { query?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn"> },
) {
  const search = new URLSearchParams();
  if (params?.level) search.set("level", params.level);
  if (params?.slotType) search.set("slotType", params.slotType);
  const suffix = search.toString() ? `?${search.toString()}` : "";

  return useQuery({
    queryKey: getGetSlotsQueryKey(params),
    queryFn: () => request(`/api/slots${suffix}`),
    ...(options?.query ?? {}),
  });
}

export function getGetSessionsQueryKey(params?: { userId?: string; status?: string }) {
  return ["sessions", params ?? {}];
}

export function useGetSessions(
  params?: { userId?: string; status?: string },
  options?: { query?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn"> },
) {
  const search = new URLSearchParams();
  if (params?.userId) search.set("userId", params.userId);
  if (params?.status) search.set("status", params.status);
  const suffix = search.toString() ? `?${search.toString()}` : "";

  return useQuery({
    queryKey: getGetSessionsQueryKey(params),
    queryFn: () => request(`/api/sessions${suffix}`),
    ...(options?.query ?? {}),
  });
}

export function getGetCurrentFeeQueryKey(sessionId: number) {
  return ["current-fee", sessionId];
}

export function useGetCurrentFee(
  sessionId: number,
  options?: { query?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn"> },
) {
  return useQuery({
    queryKey: getGetCurrentFeeQueryKey(sessionId),
    queryFn: () => request(`/api/sessions/${sessionId}/fee`),
    ...(options?.query ?? {}),
  });
}

export function getGetMyCarQueryKey(params?: { userId?: string; carNumber?: string }) {
  return ["my-car", params ?? {}];
}

export function useGetMyCar(
  params?: { userId?: string; carNumber?: string },
  options?: { query?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn"> },
) {
  const search = new URLSearchParams();
  if (params?.userId) search.set("userId", params.userId);
  if (params?.carNumber) search.set("carNumber", params.carNumber);
  const suffix = search.toString() ? `?${search.toString()}` : "";

  return useQuery({
    queryKey: getGetMyCarQueryKey(params),
    queryFn: () => request(`/api/my-car${suffix}`),
    ...(options?.query ?? {}),
  });
}

export function useRecommendSlots() {
  return useMutation({
    mutationFn: (payload: { data: Record<string, unknown> }) =>
      request("/api/recommend", {
        method: "POST",
        body: JSON.stringify(payload.data),
      }),
  });
}

export function useBookSlot() {
  return useMutation({
    mutationFn: (payload: { data: Record<string, unknown> }) =>
      request("/api/book", {
        method: "POST",
        body: JSON.stringify(payload.data),
      }),
  });
}

export function useStartParking() {
  return useMutation({
    mutationFn: (payload: { sessionId: number }) =>
      request(`/api/sessions/${payload.sessionId}/start`, { method: "POST" }),
  });
}

export function useExitParking() {
  return useMutation({
    mutationFn: (payload: { sessionId: number }) =>
      request(`/api/sessions/${payload.sessionId}/exit`, { method: "POST" }),
  });
}
