"use client";

import { useEffect, useRef, useState, useCallback } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const api = process.env.NEXT_PROD_API_URL;

export function GoogleSignInButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const clientIdRef = useRef<string | null>(null);
  const lastWidthRef = useRef<number>(0);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const renderGoogleButton = useCallback(() => {
    if (!window.google || !mountRef.current || !clientIdRef.current) return;

    // Measure actual available container width safely
    const parent = containerRef.current || mountRef.current.parentElement;
    const clientW = parent ? Math.floor(parent.clientWidth || parent.getBoundingClientRect().width) : 280;

    // Google GSI strictly accepts an integer width between 200 and 400.
    // We cap width to 320px on mobile to guarantee generous margins and zero clipping.
    const targetWidth = Math.min(320, Math.max(200, clientW > 30 ? clientW - 16 : 280));

    // Avoid unnecessary re-renders if width hasn't meaningfully changed
    if (Math.abs(lastWidthRef.current - targetWidth) < 6 && mountRef.current.hasChildNodes()) {
      return;
    }
    lastWidthRef.current = targetWidth;

    // Clean previous iframe to allow fresh responsive render
    mountRef.current.innerHTML = "";

    window.google.accounts.id.renderButton(mountRef.current, {
      theme: "outline",
      size: "large",
      type: "standard",
      shape: "rectangular",
      // Using 'signin_with' ensures the lengthy email string is never rendered inside the button,
      // completely preventing the Google 'G' icon from being pushed or clipped on the right.
      text: "signin_with",
      width: targetWidth,
      logo_alignment: "left",
    });

    setReady(true);
  }, []);

  useEffect(() => {
    let alive = true;

    const start = async () => {
      try {
        const config = await fetch(`${api}/auth/google/client`).then(async (response) => {
          if (!response.ok) throw new Error("Google sign-in is unavailable.");
          return response.json() as Promise<{ client_id: string }>;
        });

        if (!alive) return;
        clientIdRef.current = config.client_id;

        const setup = () => {
          if (!alive || !window.google || !mountRef.current || initialized.current) return;
          initialized.current = true;

          window.google.accounts.id.initialize({
            client_id: config.client_id,
            auto_select: false,
            cancel_on_tap_outside: true,
            callback: async ({ credential }: { credential: string }) => {
              setError("");
              const response = await fetch(`${api}/auth/google/credential`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credential }),
              });
              if (!response.ok) {
                setError(
                  (await response.json().catch(() => null))?.detail ??
                    "Google sign-in could not be completed."
                );
                return;
              }
              const data = await response.json().catch(() => null);
              if (data?.token && typeof window !== "undefined") {
                localStorage.setItem("copysync_token", data.token);
              }
              window.location.assign("/dashboard");
            },
          });

          renderGoogleButton();
          window.google.accounts.id.prompt();
        };

        const existing = document.querySelector<HTMLScriptElement>(
          "script[data-google-identity]"
        );
        if (window.google) {
          setup();
        } else if (existing) {
          existing.addEventListener("load", setup, { once: true });
        } else {
          const script = document.createElement("script");
          script.src = "https://accounts.google.com/gsi/client";
          script.async = true;
          script.dataset.googleIdentity = "true";
          script.addEventListener("load", setup, { once: true });
          document.head.appendChild(script);
        }
      } catch (cause) {
        if (alive) {
          setError(
            cause instanceof Error ? cause.message : "Google sign-in is unavailable."
          );
        }
      }
    };

    void start();

    return () => {
      alive = false;
    };
  }, [renderGoogleButton]);

  // Dynamically re-render button ONLY when horizontal width changes (orientation change, window resize)
  // Ignoring vertical address-bar shifts during mobile scroll to prevent scroll stutter
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    let prevWidth = Math.floor(el.getBoundingClientRect().width);
    let timeoutId: NodeJS.Timeout;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = Math.floor(entry.contentRect.width);
        if (Math.abs(newWidth - prevWidth) >= 12) {
          prevWidth = newWidth;
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            renderGoogleButton();
          }, 150);
        }
      }
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [renderGoogleButton]);

  const fallback = () => window.location.assign(`${api}/auth/google/login`);

  return (
    <div ref={containerRef} className="w-full flex flex-col items-center">
      {/* Google button mount point - centered, never clipped */}
      <div
        ref={mountRef}
        className="min-h-[44px] w-full flex justify-center items-center"
      />

      {!ready && !error && (
        <button
          className="motion-button w-full rounded-lg border border-border bg-white px-4 py-3 text-sm font-medium shadow-xs"
          onClick={fallback}
        >
          Continue with Google
        </button>
      )}

      {error && (
        <div className="mt-2 space-y-2 w-full text-center">
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
          <button
            className="motion-button w-full rounded-lg border border-border bg-white px-4 py-2.5 text-xs font-medium"
            onClick={fallback}
          >
            Use Google redirect sign-in
          </button>
        </div>
      )}
    </div>
  );
}
