"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: { render: (element: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void; reset: (id: string) => void };
  }
}

export function Turnstile({ action, onToken, onExpired }: { action: string; onToken: (token: string) => void; onExpired: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string>();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [error, setError] = useState("");
  useEffect(() => {
    if (!siteKey || !host.current) return;
    const render = () => {
      if (host.current && window.turnstile && !widgetId.current) widgetId.current = window.turnstile.render(host.current, { sitekey: siteKey, action, theme: "light", callback: (token: string) => { setError(""); onToken(token); }, "expired-callback": () => { setError("Verification expired. Please try again."); onExpired(); if (widgetId.current) window.turnstile?.reset(widgetId.current); }, "error-callback": () => { setError("Verification could not load. Please retry."); onExpired(); if (widgetId.current) window.turnstile?.reset(widgetId.current); } });
    };
    const script = document.querySelector<HTMLScriptElement>('script[data-copysync-turnstile]');
    if (window.turnstile) render();
    else if (script) script.addEventListener("load", render, { once: true });
    else { const next = document.createElement("script"); next.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; next.async = true; next.defer = true; next.dataset.copysyncTurnstile = "true"; next.addEventListener("load", render, { once: true }); document.head.appendChild(next); }
    return () => { if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current); };
  }, [action, onExpired, onToken, siteKey]);
  return siteKey ? <div className="space-y-2"><div ref={host} aria-label="Human verification" />{error && <p role="alert" className="text-sm text-red-700">{error}</p>}</div> : null;
}