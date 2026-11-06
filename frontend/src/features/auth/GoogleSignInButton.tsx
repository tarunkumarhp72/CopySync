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

  const fallback = () => window.location.assign(`${api}/auth/google/login`);

  return (
    <div ref={containerRef} className="relative w-full flex flex-col items-center">
      {/* Loading Overlay when Google Auth is processing */}
      {isAuthenticating && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex items-center justify-center gap-2 rounded-lg border border-border text-xs font-semibold text-foreground z-30 shadow-xs min-h-[44px]">
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
          className="motion-button w-full rounded-lg border border-border bg-white px-4 py-3 text-sm font-medium shadow-xs"
          onClick={fallback}
        >
          Continue with Google
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
