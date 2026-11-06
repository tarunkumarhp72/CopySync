import { getOrCreateDeviceId } from "@/features/presence/deviceId";

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = process.env.NEXT_PROD_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("copysync_token") : null;
  const guestToken = typeof window !== "undefined" ? localStorage.getItem("copysync_guest_token") : null;
  const deviceId = getOrCreateDeviceId();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Device-Id": deviceId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(guestToken ? { "X-Guest-Workspace-Token": guestToken } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (response.status === 401 && typeof window !== "undefined") {
      if (token) {
        localStorage.removeItem("copysync_token");
        window.location.replace("/login");
      }
    }
    const err = new Error(body?.detail?.message ?? body?.detail ?? "Request failed.");
    // @ts-expect-error attach status code
    err.status = response.status;
    throw err;
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
