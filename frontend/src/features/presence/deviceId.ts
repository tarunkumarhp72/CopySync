/**
 * Persistent Device ID Helper (Option A - Per Device Scope)
 * Multiple tabs in the same browser profile share the exact same device ID.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") {
    return "server-render-device";
  }

  const STORAGE_KEY = "copysync_device_id";
  let deviceId = localStorage.getItem(STORAGE_KEY);

  if (!deviceId) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      deviceId = crypto.randomUUID();
    } else {
      deviceId = "dev-" + Math.random().toString(36).substring(2, 15) + "-" + Date.now().toString(36);
    }
    localStorage.setItem(STORAGE_KEY, deviceId);
  }

  // Also maintain cookie for server-side requests (e.g. Google OAuth callback)
  if (typeof document !== "undefined") {
    document.cookie = `copysync_device_id=${deviceId}; path=/; max-age=31536000; SameSite=Lax`;
  }

  return deviceId;
}

