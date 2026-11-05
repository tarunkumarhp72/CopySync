"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Clipboard,
  Eraser,
  LogOut,
  Check,
  Smartphone,
  ArrowDown,
  ArrowUp,
  Info,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const api = process.env.NEXT_PROD_API_URL;

function ConnectContent() {
  const query = useSearchParams();
  const token = query.get("token");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"connecting" | "connected" | "unavailable">("connecting");
  const [error, setError] = useState<string>();
  const [hasCopied, setHasCopied] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [hasPastedSuccess, setHasPastedSuccess] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "typing" | "synced">("idle");

  const wsRef = useRef<WebSocket | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Broadcast clipboard updates to WebSocket
  const sendUpdate = (text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "clipboard.updated", content: text }));
    }
  };

  const sendClear = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "clipboard.cleared" }));
    }
    setSyncStatus("idle");
  };

  // Check if permission was already granted in this browser session
  useEffect(() => {
    if (typeof navigator !== "undefined" && "permissions" in navigator) {
      navigator.permissions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .query({ name: "clipboard-read" as any })
        .then((result) => {
          if (result.state === "granted") {
            setPermissionGranted(true);
            setShowPermissionPrompt(false);
          }
        })
        .catch(() => {
          // Safari / older browsers don't support clipboard-read permission query
        });
    }
  }, []);

  useEffect(() => {
    if (!token || !api) {
      setError("This connection link is missing a valid token.");
      setStatus("unavailable");
      return;
    }

    let isMounted = true;
    let pingInterval: NodeJS.Timeout;

    void (async () => {
      try {
        const response = await fetch(`${api}/guest/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            receiver_connection_id: crypto.randomUUID(),
          }),
        });

        if (!response.ok) {
          throw new Error("This connection has expired or was already claimed.");
        }

        const data = await response.json();
        if (!isMounted) return;

        // Connect to WebSocket as Receiver (Mobile Phone)
        const wsUrl = api.replace(/^http/, "ws") + `/ws/guest/${data.id}?token=${encodeURIComponent(token)}&role=receiver`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isMounted) setStatus("connected");
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "clipboard.updated" && typeof msg.content === "string") {
              // Only update if user is not actively typing locally to avoid cursor jump / scrambling
              if (!isTypingRef.current) {
                setContent(msg.content);
                setSyncStatus("synced");
              }
            } else if (msg.type === "clipboard.cleared") {
              if (!isTypingRef.current) {
                setContent("");
                setSyncStatus("idle");
              }
            }
          } catch {
            // Ignore unparseable frames
          }
        };

        ws.onclose = () => {
          if (isMounted) setStatus("unavailable");
        };

        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25000);
      } catch (cause) {
        if (!isMounted) return;
        setError(cause instanceof Error ? cause.message : "Could not connect.");
        setStatus("unavailable");
      }
    })();

    return () => {
      isMounted = false;
      if (pingInterval) clearInterval(pingInterval);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [token]);

  // Handle typing with a 1.8-2.0 second debounce so mobile typing is 100% smooth and never scrambled
  const handleContentChange = (newText: string) => {
    setContent(newText);
    setPasteNotice(null);
    setSyncStatus("typing");
    isTypingRef.current = true;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      sendUpdate(newText);
      isTypingRef.current = false;
      setSyncStatus("synced");
      setTimeout(() => setSyncStatus("idle"), 2500);
    }, 1800);
  };

  // Immediate sync button (sends right away without waiting for debounce)
  const handleSyncImmediately = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    sendUpdate(content);
    isTypingRef.current = false;
    setSyncStatus("synced");
    setTimeout(() => setSyncStatus("idle"), 2500);
  };

  // Request native permission and read clipboard on user gesture
  const requestPermissionAndSync = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        throw new Error("Clipboard API not supported");
      }
      // Direct user gesture triggers browser's native "Allow clipboard access" dialog
      const text = await navigator.clipboard.readText();
      setPermissionGranted(true);
      setShowPermissionPrompt(false);

      if (text) {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        isTypingRef.current = false;
        const trimmed = text.length > 20000 ? text.slice(0, 20000) : text;
        setContent(trimmed);
        sendUpdate(trimmed);
        setSyncStatus("synced");
        setHasPastedSuccess(true);
        setTimeout(() => setHasPastedSuccess(false), 2500);
        setTimeout(() => setSyncStatus("idle"), 2500);
      } else {
        setPasteNotice("Clipboard is currently empty on your phone. Copy something or type below!");
        setTimeout(() => setPasteNotice(null), 4000);
      }
    } catch {
      // User tapped Block or browser rejected
      setShowPermissionPrompt(false);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      setPasteNotice("Permission not granted. You can type or long-press inside the box and tap 'Paste'.");
      setTimeout(() => setPasteNotice(null), 6000);
    }
  };

  // Paste action button on editor
  const handlePaste = async () => {
    setPasteNotice(null);
    try {
      if (!navigator.clipboard?.readText) {
        throw new Error("Clipboard API not available");
      }
      const text = await navigator.clipboard.readText();
      setPermissionGranted(true);
      if (text) {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        isTypingRef.current = false;
        const trimmed = text.length > 20000 ? text.slice(0, 20000) : text;
        setContent(trimmed);
        sendUpdate(trimmed);
        setSyncStatus("synced");
        setHasPastedSuccess(true);
        setTimeout(() => setHasPastedSuccess(false), 2000);
        setTimeout(() => setSyncStatus("idle"), 2500);
      } else {
        setPasteNotice("Your phone clipboard is currently empty.");
        setTimeout(() => setPasteNotice(null), 3000);
      }
    } catch {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      setPasteNotice("Clipboard access blocked by browser. Long-press inside the text box above and tap 'Paste'.");
      setTimeout(() => setPasteNotice(null), 6000);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch {
      setError("Clipboard copy access was denied.");
    }
  };

  const clear = () => {
    setContent("");
    sendClear();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col">
        {/* Navigation / Header */}
        <header className="flex items-center justify-between border-b border-border/80 pb-4">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <span className="grid size-7 place-items-center rounded-lg bg-accent text-white shadow-xs">
              <Clipboard size={15} strokeWidth={2.2} />
            </span>
            <span className="text-sm font-semibold tracking-tight">CopySync</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs">
            <Smartphone size={13} className="text-muted" />
            <span className="font-medium text-foreground">Mobile Connected</span>
          </div>
        </header>

        {/* Status Banner */}
        <div className="mt-4">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3.5 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span
                className={`size-2.5 rounded-full ${
                  status === "connected"
                    ? "bg-emerald-500 animate-pulse"
                    : status === "connecting"
                    ? "bg-amber-500 animate-spin"
                    : "bg-red-500"
                }`}
              />
              <span className="text-xs font-semibold text-foreground">
                {status === "connected"
                  ? "Connected to Computer"
                  : status === "connecting"
                  ? "Connecting..."
                  : "Session Disconnected"}
              </span>
            </div>
            <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {status === "connected" ? "Live Real-Time" : "Waiting"}
            </span>
          </div>
        </div>

        {/* 1-TAP PERMISSION REQUEST CARD FOR MOBILE */}
        <AnimatePresence>
          {showPermissionPrompt && !permissionGranted && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 shadow-xs"
            >
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white shadow-2xs">
                  <ShieldCheck size={20} strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-emerald-900">
                    Allow Clipboard Permission
                  </h4>
                  <p className="mt-1 text-[11px] sm:text-xs text-emerald-800/80 leading-relaxed">
                    Tap below to allow browser clipboard access. Copied text will transfer directly to your laptop!
                  </p>
                </div>
              </div>

              <div className="mt-3.5 flex items-center gap-2">
                <button
                  onClick={() => void requestPermissionAndSync()}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 px-3 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-[0.98] transition"
                >
                  <Zap size={14} />
                  <span>Allow & Sync Clipboard</span>
                </button>
                <button
                  onClick={() => setShowPermissionPrompt(false)}
                  className="rounded-xl border border-emerald-300 bg-white/80 py-2.5 px-3 text-xs font-medium text-emerald-800 hover:bg-white transition"
                >
                  Skip
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text Input / Editor Box */}
        <div className="mt-4 flex-1 flex flex-col rounded-3xl border border-border bg-card p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span>Shared Clipboard Text</span>
            </label>
            <div className="flex items-center gap-2">
              {syncStatus === "typing" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                  <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Syncs in 2s
                </span>
              )}
              {syncStatus === "synced" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                  <Check size={11} strokeWidth={2.5} />
                  Synced to Laptop
                </span>
              )}
              {content && (
                <span className="text-[11px] font-mono text-muted">
                  {content.length} chars
                </span>
              )}
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Type or paste links, OTPs, or text here to sync live to your laptop..."
            className="flex-1 w-full min-h-[220px] resize-none rounded-2xl border border-border bg-[#FAF9F6] p-3.5 text-sm outline-none transition focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/10 placeholder:text-muted leading-relaxed"
          />

          {/* Instant Sync shortcut when user is typing */}
          {syncStatus === "typing" && (
            <div className="mt-2.5">
              <button
                onClick={handleSyncImmediately}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white py-2 text-xs font-semibold shadow-xs transition active:scale-[0.98]"
              >
                <Zap size={14} />
                <span>Sync Now (Don&apos;t wait 2s)</span>
              </button>
            </div>
          )}

          {/* Paste Help Tip for Mobile */}
          <AnimatePresence>
            {pasteNotice && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-2.5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800"
              >
                <Info size={14} className="shrink-0 mt-0.5 text-amber-600" />
                <span className="leading-snug">{pasteNotice}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Primary Quick Action Buttons */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <button
              onClick={() => void handlePaste()}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-accent py-3 px-3 text-xs font-medium text-white shadow-xs transition hover:bg-accent/90 active:scale-[0.98]"
            >
              {hasPastedSuccess ? (
                <>
                  <Check size={14} />
                  <span>Pasted & Sent!</span>
                </>
              ) : (
                <>
                  <ArrowDown size={14} />
                  <span>Paste from phone</span>
                </>
              )}
            </button>

            <button
              onClick={() => void copy()}
              disabled={!content}
              className={`flex items-center justify-center gap-1.5 rounded-xl border py-3 px-3 text-xs font-medium transition active:scale-[0.98] disabled:opacity-40 ${
                hasCopied
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-border bg-white text-foreground hover:bg-cream/60"
              }`}
            >
              <AnimatePresence mode="wait">
                {hasCopied ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-1"
                  >
                    <Check size={14} className="text-emerald-600" />
                    <span>Copied!</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1"
                  >
                    <ArrowUp size={14} />
                    <span>Copy text</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* Secondary Utilities */}
          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={clear}
              disabled={!content}
              className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-border bg-white py-2 text-[11px] font-medium text-muted hover:text-foreground hover:bg-cream/50 transition disabled:opacity-40"
            >
              <Eraser size={12} />
              <span>Clear</span>
            </button>
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-border bg-white py-2 text-[11px] font-medium text-muted hover:text-foreground hover:bg-cream/50 transition"
            >
              <LogOut size={12} />
              <span>Disconnect</span>
            </Link>
          </div>

          {error && (
            <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
              {error}
            </p>
          )}
        </div>

        {/* Footer Note */}
        <p className="mt-4 text-center text-[11px] text-muted">
          Real-time sync active. Anything you type or paste appears instantly on your laptop.
        </p>
      </div>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background grid place-items-center text-sm text-muted">
          <div className="flex items-center gap-2">
            <div className="size-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <span>Connecting to CopySync...</span>
          </div>
        </div>
      }
    >
      <ConnectContent />
    </Suspense>
  );
}
