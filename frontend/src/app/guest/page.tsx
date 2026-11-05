"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Clipboard,
  RefreshCw,
  X,
  ShieldCheck,
  ArrowLeft,
  Check,
  Smartphone,
  Loader2,
} from "lucide-react";
import { Turnstile } from "@/components/Turnstile";
import { motion, AnimatePresence } from "motion/react";
import { InteractiveCopyPill } from "@/components/ui/InteractiveCopyPill";
import { ProfessionalQRCode } from "@/components/ui/ProfessionalQRCode";

type GuestSession = { id: string; token: string; status: string; expires_at: string };

const api = process.env.NEXT_PROD_API_URL;

export default function GuestPage() {
  const [session, setSession] = useState<GuestSession>();
  const [error, setError] = useState<string>();
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [viewState, setViewState] = useState<"waiting" | "connected-anim" | "workspace">("waiting");

  const wsRef = useRef<WebSocket | null>(null);
  const needsTurnstile = Boolean(process.env.NEXT_PROD_TURNSTILE_SITE_KEY);

  const create = async (token = turnstileToken) => {
    setError(undefined);
    setIsRefreshing(true);
    setIsCreatingSession(true);
    setViewState("waiting");

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      // 1. Create Guest Pairing Session (for QR Code + WebSocket channel)
      const sessionRes = await fetch(`${api}/guest/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_connection_id: crypto.randomUUID(),
          turnstile_token: token || undefined,
        }),
      });
      if (!sessionRes.ok) throw new Error("Could not create a connection session.");
      const sessionData = await sessionRes.json();
      setSession(sessionData);

      // 2. Create Guest Workspace in Database for storing guest notes
      const workspaceRes = await fetch(`${api}/guest-workspace`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turnstile_token: token || undefined,
        }),
      });
      if (workspaceRes.ok) {
        const workspaceData = await workspaceRes.json();
        if (workspaceData?.token && typeof window !== "undefined") {
          localStorage.setItem("copysync_guest_token", workspaceData.token);
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create a connection.");
    } finally {
      setIsRefreshing(false);
      setIsCreatingSession(false);
    }
  };

  useEffect(() => {
    if (!needsTurnstile) void create();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsTurnstile]);

  // WebSocket connection for Sender (Laptop/Desktop)
  useEffect(() => {
    if (!session || !api) return;

    const wsUrl =
      api.replace(/^http/, "ws") +
      `/ws/guest/${session.id}?token=${encodeURIComponent(session.token)}&role=sender`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 25000);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // When mobile phone connects via QR code
        if (data.type === "session.connected" && data.role === "receiver") {
          // Show green checkmark animation card first
          setViewState("connected-anim");
          if (typeof window !== "undefined") {
            localStorage.setItem("copysync_guest_session_id", session.id);
            localStorage.setItem("copysync_guest_session_token", session.token);
            const expiresAtMs = data.expires_at
              ? new Date(data.expires_at).getTime()
              : Date.now() + 60 * 60 * 1000;
            localStorage.setItem("copysync_guest_expires_at", expiresAtMs.toString());
          }
          // Redirect directly to the full Rich Text Notes page (/dashboard)
          setTimeout(() => {
            window.location.assign("/dashboard");
          }, 1200);
        }
      } catch {
        // Ignore unparseable frames
      }
    };

    return () => {
      clearInterval(pingInterval);
      ws.close();
      wsRef.current = null;
    };
  }, [session]);

  const url = useMemo(
    () => session && `${window.location.origin}/connect?token=${encodeURIComponent(session.token)}`,
    [session]
  );

  const endSession = async () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    const guestToken = typeof window !== "undefined" ? localStorage.getItem("copysync_guest_token") : null;
    try {
      if (guestToken) {
        await fetch(`${api}/guest-workspace`, {
          method: "DELETE",
          headers: { "X-Guest-Workspace-Token": guestToken },
        }).catch(() => {});
      }
      if (session) {
        await fetch(`${api}/guest/session/${session.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: session.token }),
        }).catch(() => {});
      }
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("copysync_guest_token");
      }
      setSession(undefined);
      setViewState("waiting");
      void create();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 font-medium tracking-tight text-foreground">
            <span className="grid size-8 place-items-center rounded-lg bg-accent text-white shadow-xs">
              <Clipboard size={17} strokeWidth={2.2} />
            </span>
            <span className="text-base font-semibold tracking-tight">CopySync</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted transition hover:text-foreground"
          >
            <ArrowLeft size={15} />
            <span>Return home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex-1 flex flex-col justify-start md:justify-center max-w-5xl w-full px-4 py-6 sm:py-12 sm:px-8">
        <AnimatePresence mode="wait">
          {viewState === "waiting" ? (
            /* =========================================================================
               STATE A: WAITING FOR PHONE (QR CODE VIEW)
               ========================================================================= */
            <motion.div
              key="waiting-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35 }}
              className="grid gap-8 md:grid-cols-2 md:gap-10 items-center"
            >
              {/* Left Column: Guidance */}
              <div className="order-2 md:order-1 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-accent shadow-2xs">
                  <span className="size-2 rounded-full bg-accent animate-pulse" />
                  <span>Private Guest Pairing</span>
                </div>

                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl text-foreground text-balance">
                  Scan with your phone to connect instantly
                </h1>

                <p className="text-sm sm:text-base leading-relaxed text-muted text-balance">
                  Point your camera at the QR code. You will open a temporary web page that connects directly to this laptop. No account or password needed.
                </p>

                {/* Stepper */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-3.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-cream text-xs font-semibold text-accent">
                      1
                    </span>
                    <div>
                      <h4 className="text-sm font-medium text-foreground">Open your phone camera</h4>
                      <p className="text-xs leading-relaxed text-muted mt-0.5">
                        Scan the QR code on the right with your phone camera.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-cream text-xs font-semibold text-accent">
                      2
                    </span>
                    <div>
                      <h4 className="text-sm font-medium text-foreground">Connection established</h4>
                      <p className="text-xs leading-relaxed text-muted mt-0.5">
                        Your device confirms connection with a green tick and opens your notes workspace.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-cream text-xs font-semibold text-accent">
                      3
                    </span>
                    <div>
                      <h4 className="text-sm font-medium text-foreground">Live notes & clipboard sync</h4>
                      <p className="text-xs leading-relaxed text-muted mt-0.5">
                        Text typed or pasted on your phone streams directly into your note in real-time.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Security note */}
                <div className="flex items-center gap-2.5 rounded-lg border border-border/80 bg-card p-3.5 text-xs text-muted shadow-2xs">
                  <ShieldCheck size={16} className="text-accent shrink-0" />
                  <span>Direct 1-to-1 temporary guest connection. Data is cleared when you end the session.</span>
                </div>
              </div>

              {/* Right Column: QR Code Card */}
              <div className="order-1 md:order-2 flex flex-col items-center w-full">
                <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 sm:p-8 shadow-sm text-center">
                  {session && url ? (
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-2 rounded-full border border-border/80 bg-background px-3 py-1 text-xs font-medium text-foreground">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Ready to scan</span>
                      </div>

                      <div className="mt-4 flex flex-col items-center">
                        <ProfessionalQRCode
                          value={url}
                          size={190}
                          onRefresh={() => create()}
                          isRefreshing={isRefreshing}
                        />
                      </div>

                      <div className="mt-3.5 w-full min-w-0">
                        <InteractiveCopyPill textToCopy={url} displayText="Copy direct connection link" className="w-full justify-between bg-white py-2" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-56 flex-col items-center justify-center text-center text-sm text-muted">
                      {isCreatingSession || isRefreshing || (turnstileToken && !session) ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex flex-col items-center justify-center py-4 w-full"
                        >
                          <div className="relative size-44 sm:size-48 rounded-xl border border-border bg-cream/30 flex flex-col items-center justify-center overflow-hidden shadow-inner">
                            <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 via-accent/10 to-transparent animate-pulse" />
                            <Loader2 size={32} className="animate-spin text-accent mb-2.5 relative z-10" />
                            <span className="text-xs font-semibold text-foreground tracking-tight relative z-10">Creating secure session</span>
                            <span className="text-[11px] text-muted mt-0.5 relative z-10">Setting up encrypted channel...</span>
                          </div>
                          <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                            <span className="size-2 rounded-full bg-accent animate-ping" />
                            <span>Generating QR code...</span>
                          </div>
                        </motion.div>
                      ) : needsTurnstile ? (
                        <div className="flex flex-col items-center gap-4 max-w-full overflow-hidden">
                          <Turnstile
                            action="guest_session"
                            onToken={(token) => {
                              setTurnstileToken(token);
                              void create(token);
                            }}
                            onExpired={() => setTurnstileToken("")}
                          />
                          <span className="text-xs">Complete verification to generate QR code</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 size={28} className="animate-spin text-accent" />
                          <span className="text-xs font-medium text-foreground">Creating secure session...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {error && (
                    <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                      {error}
                    </p>
                  )}

                  <div className="mt-5 flex items-center gap-2 pt-4 border-t border-border/80">
                    <button
                      onClick={() => void create()}
                      disabled={(needsTurnstile && !turnstileToken) || isRefreshing}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white py-2 text-xs font-medium text-foreground hover:bg-cream/50 transition disabled:opacity-50"
                    >
                      <RefreshCw size={13} className={isRefreshing ? "animate-spin text-accent" : "text-muted"} />
                      <span>New code</span>
                    </button>
                    <button
                      onClick={() => void endSession()}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-cream/50 transition"
                    >
                      <X size={13} />
                      <span>End session</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* =========================================================================
               STATE B: GREEN TICK CONNECTION ESTABLISHED ANIMATION (Screenshot 2)
               ========================================================================= */
            <motion.div
              key="connected-anim-view"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center justify-center min-h-[50vh]"
            >
              <div className="w-full max-w-sm rounded-3xl border border-emerald-200 bg-white p-8 shadow-lg text-center flex flex-col items-center">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 mb-6">
                  <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Connected</span>
                </div>

                {/* Animated Green Circle Checkmark */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.15, 1] }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="grid size-20 place-items-center rounded-full bg-emerald-500 text-white shadow-md mb-6"
                >
                  <Check size={40} strokeWidth={3} />
                </motion.div>

                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Connection Established!
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-muted">
                  Your phone is connected successfully. Opening your notes workspace...
                </p>

                <div className="mt-6 w-full rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5 flex items-center justify-between text-xs text-emerald-900">
                  <span className="flex items-center gap-2 font-medium">
                    <Smartphone size={15} className="text-emerald-700" />
                    <span>Live Phone Paired</span>
                  </span>
                  <span className="font-semibold text-emerald-700">
                    Active Session
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
