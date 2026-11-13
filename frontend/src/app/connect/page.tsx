"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Clipboard,
  LogOut,
  Check,
  Zap,
  Bold,
  Italic,
  Heading,
  List,
  Code,
  Quote,
  Trash2,
  Copy,
  Info,
  Loader2,
  Laptop,
  Monitor,
} from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { getOrCreateDeviceId } from "@/features/presence/deviceId";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

const api = process.env.NEXT_PROD_API_URL;

function ConnectContent() {
  const query = useSearchParams();
  const token = query.get("token");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"connecting" | "connected" | "unavailable">("connecting");
  const [error, setError] = useState<string>();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [hasPastedSuccess, setHasPastedSuccess] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "typing" | "synced">("idle");
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

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
        setSessionId(data.id);

        // Connect to WebSocket as Receiver (Mobile Phone)
        const deviceId = getOrCreateDeviceId();
        const wsUrl = api.replace(/^http/, "ws") + `/ws/guest/${data.id}?token=${encodeURIComponent(token)}&role=receiver&device_id=${encodeURIComponent(deviceId)}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          // Socket open; awaiting confirmation from laptop workspace
        };

        // Fallback: transition after 4.5 seconds if laptop was already on /notes
        const fallbackTimer = setTimeout(() => {
          if (isMounted) {
            setStatus((curr) => (curr === "connecting" ? "connected" : curr));
          }
        }, 4500);

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "session.closed" || msg.type === "session.sender_left") {
              setStatus("unavailable");
              setError("The connection was ended by your laptop.");
              if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
              }
              return;
            }
            // Laptop workspace is open and ready to sync!
            if (
              msg.type === "workspace.ready" ||
              (msg.type === "session.connected" && msg.role === "sender") ||
              (msg.type === "sender.status" && msg.online)
            ) {
              if (isMounted) {
                clearTimeout(fallbackTimer);
                setStatus("connected");
              }
              return;
            }
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

        ws.onclose = (ev) => {
          if (!isMounted) return;
          if (typeof document !== "undefined" && document.visibilityState === "hidden") {
            // Mobile app switched to background, do not terminate immediately
            return;
          }
          setStatus("unavailable");
          if (ev.code === 1008 && ev.reason?.includes("limit reached")) {
            setError(ev.reason || "Maximum 3 active devices reached for this guest session.");
          }
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

  // Prompt user before leaving or closing mobile tab
  useEffect(() => {
    if (status !== "connected") return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [status]);

  // Teardown beacon when mobile tab is closed
  useEffect(() => {
    const handlePageHide = () => {
      if (sessionId && token && api) {
        try {
          fetch(`${api}/guest/session/${sessionId}?token=${encodeURIComponent(token)}`, {
            method: "DELETE",
            keepalive: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          }).catch(() => {});
        } catch {}
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [sessionId, token]);

  // Mobile backgrounding protection: keep session alive when user switches apps to copy text
  useEffect(() => {
    if (!sessionId || !token || !api) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        // Tab brought back into foreground from background app switch
        try {
          const res = await fetch(`${api}/guest/session/${sessionId}?token=${encodeURIComponent(token)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === "closed" || data.status === "expired") {
              setStatus("unavailable");
              setError("The connection was ended by your laptop.");
              if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
              }
              return;
            }
          }
        } catch {
          // ignore network glitch
        }

        // If socket was dropped while sleeping in background, reconnect silently
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          const deviceId = getOrCreateDeviceId();
          const wsUrl =
            api.replace(/^http/, "ws") +
            `/ws/guest/${sessionId}?token=${encodeURIComponent(token)}&role=receiver&device_id=${encodeURIComponent(deviceId)}`;
          const ws = new WebSocket(wsUrl);
          wsRef.current = ws;

          ws.onmessage = (event) => {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === "session.closed" || msg.type === "session.sender_left") {
                setStatus("unavailable");
                setError("The connection was ended by your laptop.");
                if (wsRef.current) {
                  wsRef.current.close();
                  wsRef.current = null;
                }
                return;
              }
              if (
                msg.type === "workspace.ready" ||
                (msg.type === "session.connected" && msg.role === "sender") ||
                (msg.type === "sender.status" && msg.online)
              ) {
                setStatus("connected");
                return;
              }
              if (msg.type === "clipboard.updated" && typeof msg.content === "string") {
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
            } catch {}
          };

          ws.onclose = (ev) => {
            if (typeof document !== "undefined" && document.visibilityState === "hidden") {
              return;
            }
            if (ev.code === 1008 && ev.reason?.includes("limit reached")) {
              setStatus("unavailable");
              setError(ev.reason || "Maximum 3 active devices reached for this guest session.");
            }
          };
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sessionId, token]);

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

  const applyFormat = (prefix: string, suffix: string = prefix, defaultPlaceholder: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end) || defaultPlaceholder;
    const replacement = `${prefix}${selected}${suffix}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);

    setContent(newContent);
    handleContentChange(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 10);
  };

  const confirmAndDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "session.closed" }));
      }
    } catch {}

    if (sessionId && token && api) {
      await fetch(`${api}/guest/session/${sessionId}?token=${encodeURIComponent(token)}`, {
        method: "DELETE",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }).catch(() => {});
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    setShowDisconnectConfirm(false);
    setIsDisconnecting(false);
    setStatus("unavailable");
    setError("You ended this session.");
  };

  if (status === "connecting") {
    return <ConnectingScreen />;
  }

  if (status === "unavailable") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-6 text-center">
        <div className="w-full max-w-sm rounded-3xl border border-border bg-white p-6 shadow-sm flex flex-col items-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-cream text-muted shadow-2xs mb-4">
            <LogOut size={26} className="text-muted" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Connection Closed</h2>
          <p className="mt-1.5 text-xs text-muted leading-relaxed">
            {error || "This pairing session has ended or expired."}
          </p>

          {/* Reconnect Note */}
          <div className="mt-4 w-full rounded-2xl border border-border/80 bg-cream/50 p-4 text-xs text-muted text-center leading-relaxed">
            <span className="font-semibold text-foreground block mb-0.5">Want to reconnect?</span>
            To connect again, please scan the QR code displayed on your laptop screen.
          </div>

          <div className="mt-5 w-full">
            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent text-white py-2.5 text-xs font-semibold shadow-xs hover:bg-accent/90 transition"
            >
              <span>Return Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-foreground flex flex-col justify-between w-full max-w-full overflow-x-hidden">
      {/* 1. Sleek Minimalist Top Navbar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/70 bg-white/95 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="grid size-8 place-items-center rounded-xl bg-accent text-white shadow-2xs">
            <Clipboard size={16} strokeWidth={2.2} />
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight text-foreground">CopySync</span>
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <span className="text-[10px] font-medium text-emerald-700">
              {syncStatus === "typing" ? "Syncing..." : syncStatus === "synced" ? "Synced to laptop" : "Live paired"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {content && (
            <span className="text-[10px] font-mono text-muted bg-cream/70 px-2 py-0.5 rounded-md">
              {content.length} chars
            </span>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowDisconnectConfirm(true)}
            className="flex items-center gap-1 rounded-lg border border-red-200/80 bg-red-50/70 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100/70 active:scale-95 transition cursor-pointer"
            title="Disconnect"
          >
            <LogOut size={12} />
            <span>Disconnect</span>
          </motion.button>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-lg flex-1 flex flex-col px-3 py-3">
        {/* Permission Request Toast / Banner */}
        <AnimatePresence>
          {showPermissionPrompt && !permissionGranted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 overflow-hidden rounded-2xl border border-emerald-200/90 bg-emerald-50/80 p-3 text-xs text-emerald-950 flex items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate text-[11px] font-medium text-emerald-900">
                  Enable 1-tap phone clipboard pasting
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => void requestPermissionAndSync()}
                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs hover:bg-emerald-700 active:scale-95 transition"
                >
                  Enable
                </button>
                <button
                  onClick={() => setShowPermissionPrompt(false)}
                  className="rounded-lg px-2 py-1 text-[11px] text-emerald-800 hover:bg-emerald-100/60 transition"
                >
                  Skip
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. Modern Rich Text Card */}
        <div className="flex-1 flex flex-col rounded-2xl border border-border/80 bg-white shadow-xs overflow-hidden">
          {/* Quick Rich Format Bar */}
          <div className="flex items-center justify-between border-b border-border/70 bg-[#FAF9F7] px-3 py-1.5 overflow-x-auto">
            <div className="flex items-center gap-0.5 sm:gap-1">
              <button
                type="button"
                onClick={() => applyFormat("**", "**", "bold")}
                className="rounded-md p-1.5 text-muted hover:bg-white hover:text-foreground active:scale-95 transition cursor-pointer"
                title="Bold"
                aria-label="Bold"
              >
                <Bold size={14} />
              </button>
              <button
                type="button"
                onClick={() => applyFormat("*", "*", "italic")}
                className="rounded-md p-1.5 text-muted hover:bg-white hover:text-foreground active:scale-95 transition cursor-pointer"
                title="Italic"
                aria-label="Italic"
              >
                <Italic size={14} />
              </button>
              <button
                type="button"
                onClick={() => applyFormat("\n### ", "\n", "Heading")}
                className="rounded-md p-1.5 text-muted hover:bg-white hover:text-foreground active:scale-95 transition cursor-pointer"
                title="Heading"
                aria-label="Heading"
              >
                <Heading size={14} />
              </button>
              <button
                type="button"
                onClick={() => applyFormat("\n- ", "", "List item")}
                className="rounded-md p-1.5 text-muted hover:bg-white hover:text-foreground active:scale-95 transition cursor-pointer"
                title="Bullet List"
                aria-label="Bullet List"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => applyFormat("`", "`", "code")}
                className="rounded-md p-1.5 text-muted hover:bg-white hover:text-foreground active:scale-95 transition cursor-pointer"
                title="Code"
                aria-label="Code"
              >
                <Code size={14} />
              </button>
              <button
                type="button"
                onClick={() => applyFormat("\n> ", "\n", "quote")}
                className="rounded-md p-1.5 text-muted hover:bg-white hover:text-foreground active:scale-95 transition cursor-pointer"
                title="Quote"
                aria-label="Quote"
              >
                <Quote size={14} />
              </button>
            </div>

            {/* Sync Now Shortcut */}
            {syncStatus === "typing" && (
              <button
                type="button"
                onClick={handleSyncImmediately}
                className="flex items-center gap-1 text-[11px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full hover:bg-accent/20 active:scale-95 transition cursor-pointer"
              >
                <Zap size={11} />
                <span>Sync now</span>
              </button>
            )}
          </div>

          {/* Text Editor Area */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Type notes, links, passwords, or code here to stream live to your laptop note..."
            className="flex-1 w-full min-h-[300px] p-4 text-[15px] outline-none leading-relaxed text-foreground placeholder:text-muted/60 resize-none bg-transparent"
          />

          {/* Paste notice feedback */}
          <AnimatePresence>
            {pasteNotice && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="m-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800"
              >
                <Info size={14} className="shrink-0 mt-0.5 text-amber-600" />
                <span className="leading-snug">{pasteNotice}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <p role="alert" className="m-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
              {error}
            </p>
          )}
        </div>
      </main>

      {/* 3. Ergonomic Bottom Floating Action Dock */}
      <footer className="sticky bottom-0 z-30 border-t border-border/70 bg-white/95 p-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          {/* Primary Action: Paste from Phone */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => void handlePaste()}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-accent py-3 px-4 text-xs font-semibold text-white shadow-xs hover:bg-accent/90 transition cursor-pointer"
          >
            {hasPastedSuccess ? (
              <>
                <Check size={16} className="text-emerald-300" />
                <span>Pasted & Sent!</span>
              </>
            ) : (
              <>
                <Clipboard size={16} />
                <span>Paste from phone</span>
              </>
            )}
          </motion.button>

          {/* Secondary Action: Copy */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => void copy()}
            disabled={!content}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-cream/40 py-3 px-3.5 text-xs font-medium text-foreground hover:bg-cream transition disabled:opacity-40 cursor-pointer"
            title="Copy note"
            aria-label="Copy note"
          >
            {hasCopied ? (
              <>
                <Check size={15} className="text-emerald-600" />
                <span className="hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Copy size={15} className="text-muted" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </motion.button>

          {/* Secondary Action: Clear */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={clear}
            disabled={!content}
            className="grid size-11 place-items-center rounded-xl border border-border bg-cream/40 text-muted hover:text-red-600 hover:bg-red-50/60 transition disabled:opacity-40 cursor-pointer"
            title="Clear text"
            aria-label="Clear text"
          >
            <Trash2 size={16} />
          </motion.button>
        </div>
      </footer>

      {/* Confirmation Modal before ending session */}
      <ConfirmModal
        isOpen={showDisconnectConfirm}
        onClose={() => setShowDisconnectConfirm(false)}
        onConfirm={confirmAndDisconnect}
        title="End pairing session?"
        description="Your phone will disconnect from the laptop. Are you sure you want to end this session?"
        confirmText="Disconnect"
        variant="danger"
        isLoading={isDisconnecting}
      />
    </div>
  );
}

function ConnectingScreen({ subtext }: { subtext?: string }) {
  const [deviceIndex, setDeviceIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDeviceIndex((prev) => (prev + 1) % 2);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  const currentDevice = deviceIndex === 0 ? "Laptop" : "Desktop";
  const DeviceIcon = deviceIndex === 0 ? Laptop : Monitor;

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-foreground flex flex-col justify-center items-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-sm rounded-3xl border border-border bg-white p-8 shadow-sm flex flex-col items-center"
      >
        <div className="relative mb-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentDevice}
              initial={{ opacity: 0, scale: 0.85, rotate: -6 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.85, rotate: 6 }}
              transition={{ duration: 0.28 }}
              className="grid size-16 place-items-center rounded-2xl bg-cream text-accent shadow-2xs"
            >
              <DeviceIcon size={32} />
            </motion.div>
          </AnimatePresence>
          <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-accent text-white shadow-xs">
            <Loader2 size={12} className="animate-spin" />
          </span>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-lg font-bold text-foreground">
          <span>Connecting to</span>
          <span className="relative inline-flex overflow-hidden py-0.5">
            <AnimatePresence mode="wait">
              <motion.span
                key={currentDevice}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="text-accent underline decoration-accent/35 decoration-wavy underline-offset-4"
              >
                {currentDevice}...
              </motion.span>
            </AnimatePresence>
          </span>
        </div>

        <p className="mt-1.5 text-xs text-muted leading-relaxed max-w-xs">
          {subtext || `Connecting directly to your ${currentDevice.toLowerCase()} notes workspace. Text you copy on mobile will stream live.`}
        </p>

        <div className="mt-6 w-full rounded-2xl border border-accent/20 bg-accent/5 p-3.5 text-xs text-accent font-medium flex items-center justify-center gap-2">
          <Loader2 size={13} className="animate-spin text-accent shrink-0" />
          <span>Waiting for {currentDevice.toLowerCase()} notes page to open...</span>
        </div>
      </motion.div>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={<ConnectingScreen subtext="Opening secure pairing channel with your workspace..." />}>
      <ConnectContent />
    </Suspense>
  );
}
