"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";

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
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const renderGoogleButton = useCallback(() => {
    if (!window.google || !mountRef.current || !clientIdRef.current) return;

    // Measure actual available container width safely
    const parent = containerRef.current || mountRef.current.parentElement;
    const clientW = parent ? Math.floor(parent.clientWidth || parent.getBoundingClientRect().width) : 280;

    // Google GSI strictly accepts an integer width between 200 and 400.
    // 280-320px fits all mobile devices (from 320px viewport upwards) perfectly with zero horizontal scroll.
    const targetWidth = Math.min(320, Math.max(220, clientW > 30 ? clientW - 20 : 280));

    // Avoid unnecessary re-renders if already rendered with acceptable width
    if (mountRef.current.hasChildNodes() && Math.abs(lastWidthRef.current - targetWidth) < 20) {
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
              setIsAuthenticating(true);
              const guestToken = typeof window !== "undefined" ? localStorage.getItem("copysync_guest_token") : null;
              try {
                const response = await fetch(`${api}/auth/google/credential`, {
                  method: "POST",
                  credentials: "include",
                  headers: {
                    "Content-Type": "application/json",
                    ...(guestToken ? { "X-Guest-Workspace-Token": guestToken } : {}),
                  },
                  body: JSON.stringify({ credential }),
                });
                if (!response.ok) {
                  setError(
                    (await response.json().catch(() => null))?.detail ??
                      "Google sign-in could not be completed."
                  );
                  setIsAuthenticating(false);
                  return;
                }
                const data = await response.json().catch(() => null);
                if (typeof window !== "undefined") {
                  if (data?.token) {
                    localStorage.setItem("copysync_token", data.token);
                  }
                  localStorage.removeItem("copysync_guest_token");
                }
                window.location.assign("/notes");
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Google sign-in failed.");
                setIsAuthenticating(false);
              }
            },
          });

          renderGoogleButton();

          // Only prompt One Tap on desktop devices; on mobile devices One Tap/FedCM can freeze or conflict with button taps
          const isTouchDevice = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
          if (!isTouchDevice) {
            window.google.accounts.id.prompt();
          }
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

  // Dynamically re-render button ONLY when substantial horizontal width changes (orientation change, large window resize)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    let prevWidth = Math.floor(el.getBoundingClientRect().width);
    let timeoutId: NodeJS.Timeout;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = Math.floor(entry.contentRect.width);
        // Only re-render if width meaningfully changes by >= 40px (e.g. tablet to phone, or screen rotate)
        if (Math.abs(newWidth - prevWidth) >= 40) {
          prevWidth = newWidth;
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            renderGoogleButton();
          }, 200);
        }
      }
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [renderGoogleButton]);

  useEffect(() => {
    const handleBlur = () => {
      // Focus shifted to Google account chooser popup or iframe
      if (document.activeElement && containerRef.current?.contains(document.activeElement)) {
        setIsAuthenticating(true);
        const t = setTimeout(() => setIsAuthenticating(false), 25000);
        return () => clearTimeout(t);
      }
    };

    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, []);

  const fallback = () => {
    setIsAuthenticating(true);
    window.location.assign(`${api}/auth/google/login`);
  };

  return (
    <div ref={containerRef} className="relative w-full flex flex-col items-center">
      {/* Loading Overlay when Google Auth is processing */}
      {isAuthenticating && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex items-center justify-center gap-2.5 rounded-xl border border-accent/40 bg-accent/5 text-xs font-semibold text-accent z-30 shadow-xs min-h-[44px]">
          <Loader2 size={16} className="animate-spin text-accent" />
          <span>Signing in with Google...</span>
        </div>
      )}

      {/* Google button mount point - centered, never clipped, full touch support */}
      <div
        ref={mountRef}
        className="min-h-[44px] w-full flex justify-center items-center pointer-events-auto touch-manipulation relative z-10"
      />

      {!ready && !error && (
        <button
          className="motion-button w-full rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-semibold shadow-xs flex items-center justify-center gap-2.5 text-foreground hover:bg-cream/50 active:scale-98 transition cursor-pointer min-h-[44px]"
          onClick={fallback}
          disabled={isAuthenticating}
        >
          {isAuthenticating ? (
            <>
              <Loader2 size={16} className="animate-spin text-accent" />
              <span>Redirecting to Google...</span>
            </>
          ) : (
            <>
              <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google</span>
            </>
          )}
        </button>
      )}

      {error && (
        <div className="mt-2.5 w-full text-center">
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
