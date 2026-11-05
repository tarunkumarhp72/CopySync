"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Clipboard, RefreshCw, X, ShieldCheck, ArrowLeft, Clock } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Turnstile } from "@/components/Turnstile";
import { motion } from "motion/react";
import { InteractiveCopyPill } from "@/components/ui/InteractiveCopyPill";

type GuestSession = { id: string; token: string; status: string; expires_at: string };
const api = process.env.NEXT_PROD_API_URL;
const TOTAL_DURATION_SECONDS = 300; // 5 minute standard expiry

export default function GuestPage() {
  const [session, setSession] = useState<GuestSession>();
  const [error, setError] = useState<string>();
  const [remaining, setRemaining] = useState(TOTAL_DURATION_SECONDS);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const needsTurnstile = Boolean(process.env.NEXT_PROD_TURNSTILE_SITE_KEY);

  const create = async (token = turnstileToken) => {
    setError(undefined);
    setIsRefreshing(true);
    try {
      const response = await fetch(`${api}/guest/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_connection_id: crypto.randomUUID(),
          turnstile_token: token || undefined,
        }),
      });
      if (!response.ok) throw new Error("Could not create a connection session.");
      const data = await response.json();
      setSession(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create a connection.");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!needsTurnstile) void create();
  }, [needsTurnstile]);

  useEffect(() => {
    const tick = () => {
      if (!session) return;
      const diff = Math.max(0, Math.ceil((new Date(session.expires_at).getTime() - Date.now()) / 1000));
      setRemaining(diff);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session]);

  const url = useMemo(
    () => session && `${window.location.origin}/connect?token=${encodeURIComponent(session.token)}`,
    [session]
  );

  const cancel = async () => {
    if (session) {
      await fetch(`${api}/guest/session/${session.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: session.token }),
      });
    }
    setSession(undefined);
  };

  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, "0");

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
        <div className="grid gap-8 md:grid-cols-2 md:gap-10 items-center">
          {/* Column A (Desktop Left / Mobile Below QR): Clear Guidance */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="order-2 md:order-1 space-y-6"
          >
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
                    Scan the QR code above on mobile (or on the right on desktop) with your camera.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-cream text-xs font-semibold text-accent">
                  2
                </span>
                <div>
                  <h4 className="text-sm font-medium text-foreground">Tap &quot;Paste&quot; or type text</h4>
                  <p className="text-xs leading-relaxed text-muted mt-0.5">
                    Paste any copied link, address, or snippet on the mobile screen.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-cream text-xs font-semibold text-accent">
                  3
                </span>
                <div>
                  <h4 className="text-sm font-medium text-foreground">Instant arrival on your computer</h4>
                  <p className="text-xs leading-relaxed text-muted mt-0.5">
                    Text transfers immediately to your laptop clipboard, ready to paste.
                  </p>
                </div>
              </div>
            </div>

            {/* Security note */}
            <div className="flex items-center gap-2.5 rounded-lg border border-border/80 bg-card p-3.5 text-xs text-muted shadow-2xs">
              <ShieldCheck size={16} className="text-accent shrink-0" />
              <span>Direct 1-to-1 connection (up to 3 simultaneous guest devices). This session closes automatically when you close the tab.</span>
            </div>
          </motion.div>

          {/* Column B (Mobile Top / Desktop Right): High-Clarity QR Presentation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="order-1 md:order-2 flex flex-col items-center w-full"
          >
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 sm:p-8 shadow-sm text-center">
              {session && url ? (
                <div className="flex flex-col items-center">
                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 rounded-full border border-border/80 bg-background px-3 py-1 text-xs font-medium text-foreground">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Ready to scan</span>
                  </div>

                  {/* QR Code Frame */}
                  <div className="mt-5 rounded-xl border border-border bg-white p-3 sm:p-4 shadow-2xs max-w-full overflow-hidden">
                    <QRCodeSVG 
                      value={url} 
                      size={180} 
                      className="size-40 sm:size-48"
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  {/* Expiry Pill */}
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                    <Clock size={14} className="text-accent" />
                    <span>Session expires in:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {minutes}:{seconds}
                    </span>
                  </div>

                  {/* Direct Link Copy Pill */}
                  <div className="mt-4 w-full min-w-0">
                    <InteractiveCopyPill
                      textToCopy={url}
                      displayText="Copy direct connection link"
                      className="w-full justify-between bg-white py-2"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex min-h-56 flex-col items-center justify-center text-center text-sm text-muted">
                  {needsTurnstile ? (
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
                      <div className="size-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                      <span className="text-xs">Creating secure session...</span>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                  {error}
                </p>
              )}

              {/* Action Buttons */}
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
                  onClick={() => void cancel()}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-cream/50 transition"
                >
                  <X size={13} />
                  <span>End session</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
