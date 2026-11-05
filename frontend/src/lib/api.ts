export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = process.env.NEXT_PROD_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("copysync_token") : null;
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("copysync_token");
      window.location.replace("/login");
    }
    throw new Error(body?.detail?.message ?? body?.detail ?? "Request failed.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
