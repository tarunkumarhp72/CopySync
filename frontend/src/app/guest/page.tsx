"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Clipboard,
  RefreshCw,
  X,
  ShieldCheck,
  ArrowLeft,
  Clock,
  Check,
  Laptop,
  Copy,
  Smartphone,
  Sparkles,
  Trash2,
  CheckCheck,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Turnstile } from "@/components/Turnstile";
import { motion, AnimatePresence } from "motion/react";
import { InteractiveCopyPill } from "@/components/ui/InteractiveCopyPill";

type GuestSession = { id: string; token: string; status: string; expires_at: string };
type ClipItem = { id: string; text: string; time: string };

const api = process.env.NEXT_PROD_API_URL;
const TOTAL_DURATION_SECONDS = 300; // 5 minute standard expiry

export default function GuestPage() {
  const [session, setSession] = useState<GuestSession>();
  const [error, setError] = useState<string>();
  const [remaining, setRemaining] = useState(TOTAL_DURATION_SECONDS);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [incomingText, setIncomingText] = useState("");
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [hasCopied, setHasCopied] = useState(false);
  const [copiedClipId, setCopiedClipId] = useState<string | null>(null);
  const [autoCopy, setAutoCopy] = useState(false);
  const [isReceiverDisconnected, setIsReceiverDisconnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const autoCopyRef = useRef(autoCopy);
  autoCopyRef.current = autoCopy;

  const needsTurnstile = Boolean(process.env.NEXT_PROD_TURNSTILE_SITE_KEY);

  const create = async (token = turnstileToken) => {
    setError(undefined);
    setIsRefreshing(true);
    setIsConnected(false);
    setIncomingText("");
    setClips([]);
    setIsReceiverDisconnected(false);

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsTurnstile]);

  // Expiry Countdown
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

  // WebSocket connection for Sender (Laptop/Desktop)
  useEffect(() => {
    if (!session || !api) return;

    const wsUrl = api.replace(/^http/, "ws") + `/ws/guest/${session.id}?token=${encodeURIComponent(session.token)}&role=sender`;
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

        // When receiver (phone) connects
        if (data.type === "session.connected" && data.role === "receiver") {
          setIsConnected(true);
          setIsReceiverDisconnected(false);
        }

        // When clipboard is updated from phone
        if (data.type === "clipboard.updated" && typeof data.content === "string") {
          setIncomingText(data.content);
          const newClip: ClipItem = {
            id: crypto.randomUUID(),
            text: data.content,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          };
          setClips((prev) => [newClip, ...prev.filter((c) => c.text !== data.content).slice(0, 9)]);

          // If autoCopy is enabled, copy directly to laptop clipboard
          if (autoCopyRef.current && navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(data.content).catch(() => {});
          }
        }

        // When clipboard is cleared from phone
        if (data.type === "clipboard.cleared") {
          setIncomingText("");
        }

        // When phone leaves
        if (data.type === "session.receiver_left") {
          setIsReceiverDisconnected(true);
        }
      } catch {
        // Ignore unparseable frames
      }
    };

    ws.onclose = () => {
      // ws closed
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

  const cancel = async () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (session) {
      await fetch(`${api}/guest/session/${session.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: session.token }),
      }).catch(() => {});
    }
    setSession(undefined);
    setIsConnected(false);
    setIncomingText("");
  };

  const copyToClipboard = async (text: string, clipId?: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (clipId) {
        setCopiedClipId(clipId);
        setTimeout(() => setCopiedClipId(null), 2000);
      } else {
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
      }
    } catch {
      // Fallback
    }
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
        <AnimatePresence mode="wait">
          {!isConnected ? (
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
                  <span>Direct 1-to-1 connection. This temporary session closes automatically when you close the tab.</span>
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

                      <div className="mt-5 rounded-xl border border-border bg-white p-3 sm:p-4 shadow-2xs max-w-full overflow-hidden">
                        <QRCodeSVG value={url} size={180} className="size-40 sm:size-48" level="M" includeMargin={false} />
                      </div>

                      <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                        <Clock size={14} className="text-accent" />
                        <span>Session expires in:</span>
                        <span className="font-mono font-semibold text-foreground">
                          {minutes}:{seconds}
                        </span>
                      </div>

                      <div className="mt-4 w-full min-w-0">
                        <InteractiveCopyPill textToCopy={url} displayText="Copy direct connection link" className="w-full justify-between bg-white py-2" />
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
              </div>
            </motion.div>
          ) : (
            /* =========================================================================
               STATE B: CONNECTED! (EXACT USER DESIGN + REAL-TIME CLIPBOARD WORKSPACE)
               ========================================================================= */
            <motion.div
              key="connected-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="grid gap-8 lg:grid-cols-12 items-start"
            >
              {/* Left Column (5 Cols): The Exact "Connection Established" Success Card */}
              <div className="lg:col-span-5 flex flex-col items-center w-full">
                <div className="w-full rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm text-center">
                  {/* Green Pill Header */}
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-medium text-emerald-700 shadow-2xs">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Connected</span>
                  </div>

                  {/* Big Green Checkmark with Celebration Rays */}
                  <div className="relative my-6 flex items-center justify-center">
                    {/* Celebration Ray Accents */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      {/* Top left ray */}
                      <span className="absolute -top-3 left-10 h-3 w-1 rounded-full bg-emerald-400 rotate-[-25deg]" />
                      <span className="absolute top-2 left-4 h-1 w-3 rounded-full bg-emerald-400 rotate-[-15deg]" />
                      {/* Top right ray */}
                      <span className="absolute -top-3 right-10 h-3 w-1 rounded-full bg-emerald-400 rotate-[25deg]" />
                      <span className="absolute top-2 right-4 h-1 w-3 rounded-full bg-emerald-400 rotate-[15deg]" />
                    </motion.div>

                    {/* Big Check Circle */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      className="size-24 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25"
                    >
                      <Check size={48} strokeWidth={3.2} />
                    </motion.div>
                  </div>

                  {/* Title & Subtitle */}
                  <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-2xl">
                    Connection Established!
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-sm text-muted">
                    Your device is now connected successfully.
                  </p>

                  {/* Session Active Box */}
                  <div className="mt-6 flex items-center gap-3.5 rounded-2xl border border-emerald-200/90 bg-emerald-50/60 p-4 text-left">
                    <div className="relative grid size-12 shrink-0 place-items-center rounded-xl bg-white border border-emerald-200 text-emerald-600 shadow-2xs">
                      <Laptop size={22} strokeWidth={2.2} />
                      <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full bg-emerald-500 text-white">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-foreground">
                        Session Active
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                        <span>Expires in:</span>
                        <Clock size={12} className="text-emerald-600" />
                        <span className="font-mono font-semibold text-foreground">
                          {minutes}:{seconds}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isReceiverDisconnected && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      Mobile device disconnected. You can scan again or wait for reconnect.
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 flex items-center gap-3 pt-2">
                    <button
                      onClick={() => void create()}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-white py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-foreground hover:bg-cream/60 transition shadow-2xs"
                    >
                      <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                      <span>Scan Again</span>
                    </button>
                    <button
                      onClick={() => void cancel()}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-white hover:bg-emerald-700 transition shadow-2xs"
                    >
                      <X size={14} />
                      <span>End Session</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column (7 Cols): Real-Time Live Clipboard Display */}
              <div className="lg:col-span-7 flex flex-col w-full space-y-4">
                <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-7 shadow-sm">
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-border/80 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="grid size-9 place-items-center rounded-xl bg-accent/10 text-accent">
                        <Smartphone size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">
                          Mobile Live Clipboard
                        </h3>
                        <p className="text-[11px] text-muted">
                          Text copied or typed on phone appears here in real-time
                        </p>
                      </div>
                    </div>

                    {/* Auto-copy Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={autoCopy}
                        onChange={(e) => setAutoCopy(e.target.checked)}
                        className="size-4 rounded border-border text-accent focus:ring-accent"
                      />
                      <span className="hidden sm:inline">Auto-copy to PC</span>
                    </label>
                  </div>

                  {/* Live Clipboard Content Box */}
                  <div className="mt-5">
                    {incomingText ? (
                      <div className="space-y-4">
                        <div className="relative rounded-2xl border border-border bg-[#FAF9F6] p-4 sm:p-5">
                          <div className="flex items-center justify-between text-xs text-muted mb-2">
                            <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                              Latest arrival
                            </span>
                            <span className="font-mono text-[11px]">{incomingText.length} characters</span>
                          </div>
                          <pre className="text-sm sm:text-base font-sans text-foreground whitespace-pre-wrap break-words max-h-72 overflow-y-auto leading-relaxed select-all">
                            {incomingText}
                          </pre>
                        </div>

                        {/* Copy to Computer Button */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => void copyToClipboard(incomingText)}
                            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs sm:text-sm font-medium transition active:scale-[0.99] shadow-xs ${
                              hasCopied
                                ? "bg-emerald-600 text-white"
                                : "bg-accent text-white hover:bg-accent/90"
                            }`}
                          >
                            {hasCopied ? (
                              <>
                                <CheckCheck size={16} />
                                <span>Copied to Laptop Clipboard!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={16} />
                                <span>Copy to Laptop Clipboard (Ctrl+V)</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => setIncomingText("")}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-3 text-xs text-muted hover:text-foreground transition"
                            title="Clear"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Empty State */
                      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 px-4 text-center">
                        <div className="grid size-12 place-items-center rounded-2xl bg-cream text-accent mb-3">
                          <Sparkles size={22} />
                        </div>
                        <h4 className="text-sm font-medium text-foreground">
                          Waiting for phone clipboard...
                        </h4>
                        <p className="mt-1 text-xs text-muted max-w-sm">
                          Tap <span className="font-semibold text-foreground">&quot;Paste from phone&quot;</span> or type any link, snippet, or text on your mobile screen to view it here live!
                        </p>
                      </div>
                    )}
                  </div>

                  {/* History of Received Clips */}
                  {clips.length > 1 && (
                    <div className="mt-6 pt-5 border-t border-border/80">
                      <div className="flex items-center justify-between text-xs font-semibold text-foreground mb-3">
                        <span>Recent Clips ({clips.length})</span>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {clips.slice(1).map((clip) => (
                          <div
                            key={clip.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-white p-2.5 sm:p-3 text-xs hover:border-accent/40 transition"
                          >
                            <span className="truncate flex-1 font-mono text-muted text-[11px] sm:text-xs">
                              {clip.text}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-muted/70">{clip.time}</span>
                              <button
                                onClick={() => void copyToClipboard(clip.text, clip.id)}
                                className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-muted hover:text-foreground hover:bg-cream/50 transition"
                              >
                                {copiedClipId === clip.id ? (
                                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                    <Check size={11} /> Copied
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Copy size={11} /> Copy
                                  </span>
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
