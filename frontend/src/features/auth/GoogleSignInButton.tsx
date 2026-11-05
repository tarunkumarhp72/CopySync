"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: { accounts: { id: { initialize: (options: Record<string, unknown>) => void; renderButton: (element: HTMLElement, options: Record<string, unknown>) => void; prompt: () => void } } };
  }
}

const api = process.env.NEXT_PROD_API_URL;

export function GoogleSignInButton() {
  const mount = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    const start = async () => {
      try {
        const config = await fetch(`${api}/auth/google/client`).then(async response => { if (!response.ok) throw new Error("Google sign-in is unavailable."); return response.json() as Promise<{ client_id: string }>; });
        const setup = () => {
          if (!alive || !window.google || !mount.current || initialized.current) return;
          initialized.current = true;
          window.google.accounts.id.initialize({ client_id: config.client_id, auto_select: false, cancel_on_tap_outside: true, callback: async ({ credential }: { credential: string }) => {
            setError("");
            const response = await fetch(`${api}/auth/google/credential`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credential }) });
            if (!response.ok) { setError((await response.json().catch(() => null))?.detail ?? "Google sign-in could not be completed."); return; }
            window.location.assign("/dashboard");
          }});
          window.google.accounts.id.renderButton(mount.current, { theme: "outline", size: "large", type: "standard", shape: "rectangular", text: "continue_with", width: 360, logo_alignment: "left" });
          window.google.accounts.id.prompt();
          setReady(true);
        };
        const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
        if (window.google) setup();
        else if (existing) existing.addEventListener("load", setup, { once: true });
        else { const script = document.createElement("script"); script.src = "https://accounts.google.com/gsi/client"; script.async = true; script.dataset.googleIdentity = "true"; script.addEventListener("load", setup, { once: true }); document.head.appendChild(script); }
      } catch (cause) { if (alive) setError(cause instanceof Error ? cause.message : "Google sign-in is unavailable."); }
    };
    void start();
    return () => { alive = false; };
  }, []);

  const fallback = () => window.location.assign(`${api}/auth/google/login`);
  return <div className="space-y-3"><div ref={mount} className="min-h-11 [&>div]:!w-full" />{!ready && !error && <button className="motion-button w-full rounded-lg border border-border bg-white px-4 py-3 text-sm font-medium" onClick={fallback}>Continue with Google</button>}{error && <><p role="alert" className="text-sm text-red-700">{error}</p><button className="motion-button w-full rounded-lg border border-border bg-white px-4 py-3 text-sm font-medium" onClick={fallback}>Use Google redirect sign-in</button></>}</div>;
}
