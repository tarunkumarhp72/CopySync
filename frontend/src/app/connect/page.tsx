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
  Underline as UnderlineIcon,
  Heading,
  List,
  Trash2,
  Copy,
  Info,
  Laptop,
  Monitor,
  MoreVertical,
  Undo2,
  Redo2,
  Highlighter,
  QrCode,
  ShieldCheck,
  Smartphone,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { getOrCreateDeviceId } from "@/features/presence/deviceId";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { FontSize, FontFamily } from "@/features/notes/textCustomExtensions";

const api = process.env.NEXT_PROD_API_URL;

const TEXT_COLORS = [
  { name: "Default Dark", color: "#1c1917" },
  { name: "Classic Forest", color: "#506230" },
  { name: "Ocean Blue", color: "#0284c7" },
  { name: "Royal Indigo", color: "#6366f1" },
  { name: "Deep Purple", color: "#9333ea" },
  { name: "Coral Rose", color: "#e11d48" },
  { name: "Amber Orange", color: "#ea580c" },
  { name: "Emerald Green", color: "#16a34a" },
  { name: "Steel Slate", color: "#475569" },
];

const PASTEL_HIGHLIGHTS = [
  { name: "Lemon Yellow", color: "#fef08a" },
  { name: "Sunshine Orange", color: "#fed7aa" },
  { name: "Mint Green", color: "#bbf7d0" },
  { name: "Bubble Pink", color: "#fbcfe8" },
  { name: "Lavender Purple", color: "#e9d5ff" },
  { name: "Sky Blue", color: "#bae6fd" },
  { name: "Coral Rose", color: "#fecaca" },
  { name: "Warm Amber", color: "#fde68a" },
];

const FONT_SIZES = [
  { label: "12px", name: "12 - Small" },
  { label: "14px", name: "14 - Regular" },
  { label: "16px", name: "16 - Body" },
  { label: "18px", name: "18 - Medium" },
  { label: "20px", name: "20 - Large (H3)" },
  { label: "24px", name: "24 - X-Large (H2)" },
];

const FONT_FAMILIES = [
  { label: "Sans (Inter)", value: "var(--font-geist-sans), sans-serif", shortName: "Sans" },
  { label: "Serif (Georgia)", value: "Georgia, serif", shortName: "Serif" },
  { label: "Mono (Code)", value: "monospace", shortName: "Mono" },
  { label: "Casual (Notes)", value: "Caveat, cursive, sans-serif", shortName: "Casual" },
  { label: "Rounded (Modern)", value: "system-ui, sans-serif", shortName: "Rounded" },
];

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
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const senderLeftTimerRef = useRef<NodeJS.Timeout | null>(null);
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

  // TipTap Rich Text Editor Instance for Mobile with Apple Notes styling
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      FontSize,
      FontFamily,
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "rich-editor min-h-full py-2 px-1 text-[16px] outline-none leading-relaxed text-foreground bg-transparent focus:outline-none",
      },
    },
    onUpdate: ({ editor: inst }) => {
      const html = inst.getHTML();
      setContent(html);
      setPasteNotice(null);
      setSyncStatus("typing");
      isTypingRef.current = true;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        sendUpdate(html);
        isTypingRef.current = false;
        setSyncStatus("synced");
        setTimeout(() => setSyncStatus("idle"), 2500);
      }, 1500);
    },
  });

  // Safe command runner to prevent any client-side exception
  const safeRun = (action: (chain: ReturnType<NonNullable<typeof editor>["chain"]>) => void) => {
    if (!editor || editor.isDestroyed) return;
    try {
      const chain = editor.chain().focus();
      action(chain);
    } catch (err) {
      console.warn("Editor formatting warning:", err);
    }
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
        .catch(() => {});
    }
  }, []);

  // Connection & Token Claiming (with demo/bypass support for easy testing)
  useEffect(() => {
    // Testing / Demo bypass mode
    if (token === "closed" || query.get("state") === "closed") {
      setStatus("unavailable");
      setError("The connection was ended by your system.");
      return;
    }
    if (token === "connecting" || query.get("state") === "connecting") {
      setStatus("connecting");
      return;
    }
    if (token === "demo" || token === "test" || token === "bypass") {
      setStatus("connected");
      if (editor && !editor.isDestroyed && editor.isEmpty) {
        editor.commands.setContent(
          `<h2>Apple Notes Style Sync</h2><p>Welcome to <strong>CopySync</strong>! This mobile interface is inspired by native <em>Apple Notes</em> and <em>Google Keep</em>.</p><p>You can tap formatting buttons below to change <mark style="background-color: #fef08a">highlights</mark>, text <span style="color: #0284c7">colors</span>, fonts, and headings.</p>`
        );
      }
      return;
    }

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
        const wsUrl =
          api.replace(/^http/, "ws") +
          `/ws/guest/${data.id}?token=${encodeURIComponent(token)}&role=receiver&device_id=${encodeURIComponent(deviceId)}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        // Fallback: transition after 4.5 seconds if laptop was already on /notes
        const fallbackTimer = setTimeout(() => {
          if (isMounted) {
            setStatus((curr) => (curr === "connecting" ? "connected" : curr));
          }
        }, 4500);

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "session.closed") {
              if (senderLeftTimerRef.current) {
                clearTimeout(senderLeftTimerRef.current);
                senderLeftTimerRef.current = null;
              }
              setStatus("unavailable");
              setError("The connection was ended by your system.");
              if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
              }
              return;
            }
            if (msg.type === "session.sender_left") {
              if (senderLeftTimerRef.current) clearTimeout(senderLeftTimerRef.current);
              senderLeftTimerRef.current = setTimeout(() => {
                if (isMounted) {
                  setStatus("unavailable");
                  setError("The connection was ended by your system.");
                  if (wsRef.current) {
                    wsRef.current.close();
                    wsRef.current = null;
                  }
                }
              }, 15000);
              return;
            }
            if (
              msg.type === "workspace.ready" ||
              (msg.type === "session.connected" && msg.role === "sender") ||
              (msg.type === "sender.status" && msg.online)
            ) {
              if (senderLeftTimerRef.current) {
                clearTimeout(senderLeftTimerRef.current);
                senderLeftTimerRef.current = null;
              }
              if (isMounted) {
                clearTimeout(fallbackTimer);
                setStatus("connected");
              }
              return;
            }
            if (msg.type === "clipboard.updated" && typeof msg.content === "string") {
              if (!isTypingRef.current) {
                if (editor && !editor.isDestroyed) {
                  if (editor.getHTML() !== msg.content) {
                    editor.commands.setContent(msg.content, false);
                  }
                }
                setContent(msg.content);
                setSyncStatus("synced");
              }
            } else if (msg.type === "clipboard.cleared") {
              if (!isTypingRef.current) {
                if (editor && !editor.isDestroyed) {
                  editor.commands.clearContent();
                }
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
            return;
          }
          if (ev.code === 1008) {
            setStatus("unavailable");
            if (ev.reason?.includes("limit reached")) {
              setError(ev.reason || "Maximum 3 active devices reached for this guest session.");
            }
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
      if (senderLeftTimerRef.current) {
        clearTimeout(senderLeftTimerRef.current);
        senderLeftTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [token, editor]);

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

  // Mobile backgrounding protection
  useEffect(() => {
    if (!sessionId || !token || !api) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch(`${api}/guest/session/${sessionId}?token=${encodeURIComponent(token)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === "closed" || data.status === "expired") {
              setStatus("unavailable");
              setError("The connection was ended by your system.");
              if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
              }
              return;
            }
          }
        } catch {}

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
              if (msg.type === "session.closed") {
                if (senderLeftTimerRef.current) {
                  clearTimeout(senderLeftTimerRef.current);
                  senderLeftTimerRef.current = null;
                }
                setStatus("unavailable");
                setError("The connection was ended by your system.");
                if (wsRef.current) {
                  wsRef.current.close();
                  wsRef.current = null;
                }
                return;
              }
              if (msg.type === "session.sender_left") {
                if (senderLeftTimerRef.current) clearTimeout(senderLeftTimerRef.current);
                senderLeftTimerRef.current = setTimeout(() => {
                  setStatus("unavailable");
                  setError("The connection was ended by your system.");
                  if (wsRef.current) {
                    wsRef.current.close();
                    wsRef.current = null;
                  }
                }, 15000);
                return;
              }
              if (
                msg.type === "workspace.ready" ||
                (msg.type === "session.connected" && msg.role === "sender") ||
                (msg.type === "sender.status" && msg.online)
              ) {
                if (senderLeftTimerRef.current) {
                  clearTimeout(senderLeftTimerRef.current);
                  senderLeftTimerRef.current = null;
                }
                setStatus("connected");
                return;
              }
              if (msg.type === "clipboard.updated" && typeof msg.content === "string") {
                if (!isTypingRef.current) {
                  if (editor && !editor.isDestroyed) {
                    if (editor.getHTML() !== msg.content) {
                      editor.commands.setContent(msg.content, false);
                    }
                  }
                  setContent(msg.content);
                  setSyncStatus("synced");
                }
              } else if (msg.type === "clipboard.cleared") {
                if (!isTypingRef.current) {
                  if (editor && !editor.isDestroyed) {
                    editor.commands.clearContent();
                  }
                  setContent("");
                  setSyncStatus("idle");
                }
              }
            } catch {}
          };
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sessionId, token, editor]);

  // Immediate sync button
  const handleSyncImmediately = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    const currentHtml = editor ? editor.getHTML() : content;
    sendUpdate(currentHtml);
    isTypingRef.current = false;
    setSyncStatus("synced");
    setTimeout(() => setSyncStatus("idle"), 2500);
  };

  // Request native permission and read clipboard on user gesture
  const requestPermissionAndSync = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPermissionGranted(true);
      setShowPermissionPrompt(false);
      if (text && editor) {
        editor.chain().focus().insertContent(text).run();
        setHasPastedSuccess(true);
        setTimeout(() => setHasPastedSuccess(false), 2000);
      }
    } catch {
      setShowPermissionPrompt(false);
      setPasteNotice("Use the 'Paste from phone' button below to paste text.");
      setTimeout(() => setPasteNotice(null), 5000);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        setPasteNotice("Your clipboard is empty.");
        setTimeout(() => setPasteNotice(null), 3000);
        return;
      }
      if (editor && !editor.isDestroyed) {
        editor.chain().focus().insertContent(text).run();
        setHasPastedSuccess(true);
        setTimeout(() => setHasPastedSuccess(false), 2000);
      }
    } catch {
      setPasteNotice("Clipboard access blocked by browser. Tap and hold inside the text editor and select 'Paste'.");
      setTimeout(() => setPasteNotice(null), 6000);
    }
  };

  const copy = async () => {
    try {
      const textToCopy = editor ? editor.getText() : content;
      await navigator.clipboard.writeText(textToCopy);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch {
      setError("Clipboard copy access was denied.");
    }
  };

  const clear = () => {
    if (editor && !editor.isDestroyed) {
      editor.commands.clearContent();
    }
    setContent("");
    sendClear();
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
      <div className="h-[100dvh] max-h-[100dvh] bg-[#FAF9F6] text-foreground flex flex-col justify-between w-full overflow-hidden select-none">
        {/* 1. Sleek Mobile Top Header */}
        <header className="shrink-0 h-14 flex items-center justify-between border-b border-border/70 bg-white/90 px-4 backdrop-blur-md z-20">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-xl bg-accent text-white shadow-2xs">
              <Clipboard size={16} strokeWidth={2.3} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-tight text-foreground leading-none">CopySync</span>
              <span className="text-[10px] text-muted leading-tight mt-0.5">Mobile Sync</span>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 border border-stone-200/80 text-[11px] font-medium text-stone-600">
            <span className="size-1.5 rounded-full bg-stone-400" />
            <span>Disconnected</span>
          </div>
        </header>

        {/* 2. Main Content Cards & Context */}
        <main className="flex-1 min-h-0 w-full overflow-y-auto px-4 py-6 flex flex-col justify-center items-center max-w-sm mx-auto">
          {/* Animated Status Visual */}
          <div className="relative mb-5">
            <div className="grid size-20 place-items-center rounded-3xl bg-amber-50 border border-amber-200/80 text-amber-600 shadow-sm">
              <Smartphone size={32} strokeWidth={1.8} />
            </div>
            <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-white border border-stone-200 text-stone-500 shadow-xs">
              <LogOut size={13} strokeWidth={2.2} />
            </span>
          </div>

          <h1 className="text-xl font-bold tracking-tight text-foreground text-center">
            Connection Closed
          </h1>
          <p className="mt-2 text-xs text-muted text-center leading-relaxed max-w-xs">
            {error || "This pairing session has ended. Your phone is no longer syncing live with your laptop."}
          </p>

          {/* Interactive Information & Reconnect Cards */}
          <div className="mt-6 w-full space-y-3">
            {/* Card 1: How to reconnect */}
            <div className="rounded-2xl border border-border/80 bg-white p-4 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent shrink-0 mt-0.5">
                  <QrCode size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xs font-bold text-foreground">Want to reconnect?</h2>
                  <p className="text-[11px] text-muted leading-relaxed mt-0.5">
                    Open your notes on your laptop and scan the pairing QR code with your camera to start a new live session.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Workspace Data Safety */}
            <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-3.5 flex items-start gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0 mt-0.5">
                <ShieldCheck size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[11px] font-semibold text-emerald-950">Notes preserved</h3>
                <p className="text-[11px] text-emerald-800/90 leading-snug mt-0.5">
                  Any text or images sent during the session remain safe on your laptop workspace.
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* 3. Ergonomic Bottom Thumb Zone Actions */}
        <footer className="shrink-0 border-t border-border/70 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md z-20">
          <div className="mx-auto flex max-w-sm flex-col gap-2">
            <Link
              href="/"
              className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-accent text-white text-xs font-semibold shadow-xs hover:bg-accent/90 active:scale-[0.98] transition cursor-pointer"
            >
              <ArrowLeft size={15} />
              <span>Return Home</span>
            </Link>
          </div>
        </footer>
      </div>
    );
  }

  const charCount = editor ? editor.getText().length : content.length;
  const canUndo = Boolean(editor && editor.can().undo());
  const canRedo = Boolean(editor && editor.can().redo());

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[#FDFCFB] text-foreground flex flex-col justify-between w-full overflow-hidden">
      {/* 1. Apple Notes Clean Top Header */}
      <header className="shrink-0 h-12 flex items-center justify-between border-b border-border/70 bg-white/95 px-3 backdrop-blur-md z-30">
        <div className="flex items-center gap-2">
          <Link href="/" className="grid size-7 place-items-center rounded-lg bg-accent text-white shadow-2xs">
            <Clipboard size={14} strokeWidth={2.3} />
          </Link>
          <div className="flex flex-col leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight text-foreground">CopySync</span>
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <span className="text-[10px] font-medium text-emerald-700">
              {syncStatus === "typing" ? "Syncing..." : syncStatus === "synced" ? "Synced to laptop" : "Live paired"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {charCount > 0 && (
            <span className="text-[10px] font-mono text-muted bg-stone-100 px-2 py-0.5 rounded-md">
              {charCount} chars
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowDisconnectConfirm(true)}
            className="flex items-center gap-1 rounded-lg border border-red-200/80 bg-red-50/70 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100/70 active:scale-95 transition cursor-pointer"
            title="Disconnect"
          >
            <LogOut size={12} />
            <span className="hidden xs:inline">Disconnect</span>
          </button>
        </div>
      </header>

      {/* Permission Request Toast / Banner */}
      <AnimatePresence>
        {showPermissionPrompt && !permissionGranted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="shrink-0 overflow-hidden border-b border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-950 flex items-center justify-between gap-3 shadow-2xs z-20"
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

      {/* 2. Format Toolbar with Slim Floating Vertical Dropdown */}
      <div className="shrink-0 h-10 border-b border-border/60 bg-[#FAF9F7] px-2 flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar scroll-smooth py-1 flex-1 min-w-0">
          {/* Undo & Redo (Always directly visible on mobile) */}
          <button
            type="button"
            disabled={!canUndo}
            onClick={() => safeRun((c) => c.undo().run())}
            className="rounded-md p-1.5 text-muted hover:bg-white hover:text-foreground disabled:opacity-30 active:scale-95 transition cursor-pointer shrink-0"
            title="Undo"
            aria-label="Undo"
          >
            <Undo2 size={15} />
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={() => safeRun((c) => c.redo().run())}
            className="rounded-md p-1.5 text-muted hover:bg-white hover:text-foreground disabled:opacity-30 active:scale-95 transition cursor-pointer shrink-0"
            title="Redo"
            aria-label="Redo"
          >
            <Redo2 size={15} />
          </button>

          <span className="mx-1 h-3.5 w-px bg-border/70 shrink-0" />

          {/* Bold, Italic, Underline */}
          <button
            type="button"
            onClick={() => safeRun((c) => c.toggleBold().run())}
            className={`rounded-md p-1.5 active:scale-95 transition cursor-pointer shrink-0 ${
              editor?.isActive("bold") ? "bg-cream text-accent font-bold" : "text-muted hover:bg-white hover:text-foreground"
            }`}
            title="Bold"
            aria-label="Bold"
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            onClick={() => safeRun((c) => c.toggleItalic().run())}
            className={`rounded-md p-1.5 active:scale-95 transition cursor-pointer shrink-0 ${
              editor?.isActive("italic") ? "bg-cream text-accent font-bold" : "text-muted hover:bg-white hover:text-foreground"
            }`}
            title="Italic"
            aria-label="Italic"
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            onClick={() => safeRun((c) => c.toggleUnderline().run())}
            className={`rounded-md p-1.5 active:scale-95 transition cursor-pointer shrink-0 ${
              editor?.isActive("underline") ? "bg-cream text-accent font-bold" : "text-muted hover:bg-white hover:text-foreground"
            }`}
            title="Underline"
            aria-label="Underline"
          >
            <UnderlineIcon size={15} />
          </button>

          <span className="mx-1 h-3.5 w-px bg-border/70 shrink-0" />

          {/* Heading Toggle */}
          <button
            type="button"
            onClick={() => safeRun((c) => c.toggleHeading({ level: 2 }).run())}
            className={`rounded-md p-1.5 active:scale-95 transition cursor-pointer shrink-0 ${
              editor?.isActive("heading", { level: 2 }) ? "bg-cream text-accent font-bold" : "text-muted hover:bg-white hover:text-foreground"
            }`}
            title="Heading"
            aria-label="Heading"
          >
            <Heading size={15} />
          </button>

          {/* Bullet List */}
          <button
            type="button"
            onClick={() => safeRun((c) => c.toggleBulletList().run())}
            className={`rounded-md p-1.5 active:scale-95 transition cursor-pointer shrink-0 ${
              editor?.isActive("bulletList") ? "bg-cream text-accent font-bold" : "text-muted hover:bg-white hover:text-foreground"
            }`}
            title="List"
            aria-label="Bullet List"
          >
            <List size={15} />
          </button>

          {/* Quick Highlight toggle */}
          <button
            type="button"
            onClick={() => {
              if (editor?.isActive("highlight")) {
                safeRun((c) => c.unsetHighlight().run());
              } else {
                safeRun((c) => c.toggleHighlight({ color: "#fef08a" }).run());
              }
            }}
            className={`rounded-md p-1.5 active:scale-95 transition cursor-pointer shrink-0 ${
              editor?.isActive("highlight") ? "bg-yellow-200 text-yellow-900" : "text-muted hover:bg-white hover:text-foreground"
            }`}
            title="Highlight marker"
            aria-label="Highlight marker"
          >
            <Highlighter size={15} />
          </button>
        </div>

        {/* Right Pinned Actions with Slim Floating Vertical Dropdown */}
        <div className="relative shrink-0 flex items-center gap-1 ml-1.5">
          {/* Sync Now Shortcut */}
          {syncStatus === "typing" && (
            <button
              type="button"
              onClick={handleSyncImmediately}
              className="flex items-center gap-1 text-[11px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full hover:bg-accent/20 active:scale-95 transition cursor-pointer shrink-0"
            >
              <Zap size={11} />
              <span className="hidden sm:inline">Sync</span>
            </button>
          )}

          {/* Aa / 3-dots Dropdown Toggle */}
          <button
            type="button"
            onClick={() => setShowMoreMenu((prev) => !prev)}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold active:scale-95 transition cursor-pointer shrink-0 ${
              showMoreMenu ? "bg-accent text-white shadow-xs" : "bg-white border border-border/70 text-foreground hover:bg-stone-50"
            }`}
            title="Format Styles, Colors & Fonts"
            aria-label="Format Styles, Colors & Fonts"
          >
            <span className="font-serif font-bold text-xs">Aa</span>
            <MoreVertical size={13} className={showMoreMenu ? "text-white" : "text-muted"} />
          </button>

          {/* Slim Floating Vertical Dropdown (Zero layout shift, floats over content) */}
          <AnimatePresence>
            {showMoreMenu && (
              <>
                {/* Backdrop for outside click */}
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setShowMoreMenu(false)}
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-full mt-1.5 w-64 rounded-2xl border border-border/70 bg-white/85 p-3 shadow-2xl backdrop-blur-xl z-50 text-foreground space-y-2.5 max-h-[75vh] overflow-y-auto no-scrollbar ring-1 ring-black/5"
                >
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between pb-1 border-b border-border/40">
                    <span className="text-[11px] font-bold text-foreground uppercase tracking-wide">Format Menu</span>
                    <button
                      type="button"
                      onClick={() => setShowMoreMenu(false)}
                      className="text-[11px] font-semibold text-accent hover:underline px-1 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

                  {/* Typography Style Pills */}
                  <div>
                    <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Typography</div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          safeRun((c) => c.setParagraph().run());
                          setShowMoreMenu(false);
                        }}
                        className={`px-2 py-1 text-xs rounded-lg border text-center transition cursor-pointer ${
                          !editor?.isActive("heading") ? "border-accent bg-accent/15 font-bold text-accent shadow-2xs" : "border-border/70 bg-white/60 hover:bg-white/90 text-foreground"
                        }`}
                      >
                        Body
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          safeRun((c) => c.toggleHeading({ level: 1 }).run());
                          setShowMoreMenu(false);
                        }}
                        className={`px-2 py-1 text-xs rounded-lg border text-center transition cursor-pointer ${
                          editor?.isActive("heading", { level: 1 }) ? "border-accent bg-accent/15 font-bold text-accent shadow-2xs" : "border-border/70 bg-white/60 hover:bg-white/90 text-foreground"
                        }`}
                      >
                        Title (H1)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          safeRun((c) => c.toggleHeading({ level: 2 }).run());
                          setShowMoreMenu(false);
                        }}
                        className={`px-2 py-1 text-xs rounded-lg border text-center transition cursor-pointer ${
                          editor?.isActive("heading", { level: 2 }) ? "border-accent bg-accent/15 font-bold text-accent shadow-2xs" : "border-border/70 bg-white/60 hover:bg-white/90 text-foreground"
                        }`}
                      >
                        Heading (H2)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          safeRun((c) => c.toggleHeading({ level: 3 }).run());
                          setShowMoreMenu(false);
                        }}
                        className={`px-2 py-1 text-xs rounded-lg border text-center transition cursor-pointer ${
                          editor?.isActive("heading", { level: 3 }) ? "border-accent bg-accent/15 font-bold text-accent shadow-2xs" : "border-border/70 bg-white/60 hover:bg-white/90 text-foreground"
                        }`}
                      >
                        Subhead (H3)
                      </button>
                    </div>
                  </div>

                  {/* Text Color Dots */}
                  <div>
                    <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Text Color</div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {TEXT_COLORS.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => {
                            safeRun((chain) => chain.setColor(c.color).run());
                            setShowMoreMenu(false);
                          }}
                          style={{ backgroundColor: c.color }}
                          className="size-5 rounded-full border border-black/15 shadow-2xs hover:scale-115 active:scale-95 transition cursor-pointer"
                          title={c.name}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          safeRun((chain) => chain.unsetColor().run());
                          setShowMoreMenu(false);
                        }}
                        className="px-1.5 py-0.5 text-[10px] rounded border border-border/80 bg-white/70 hover:bg-white text-muted hover:text-foreground cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Highlighter Marker Dots */}
                  <div>
                    <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Highlight Marker</div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {PASTEL_HIGHLIGHTS.map((h) => (
                        <button
                          key={h.name}
                          type="button"
                          onClick={() => {
                            safeRun((chain) => chain.toggleHighlight({ color: h.color }).run());
                            setShowMoreMenu(false);
                          }}
                          style={{ backgroundColor: h.color }}
                          className="size-5 rounded-full border border-black/15 shadow-2xs hover:scale-115 active:scale-95 transition cursor-pointer"
                          title={h.name}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          safeRun((chain) => chain.unsetHighlight().run());
                          setShowMoreMenu(false);
                        }}
                        className="px-1.5 py-0.5 text-[10px] rounded border border-border/80 bg-white/70 hover:bg-white text-muted hover:text-foreground cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Font Family */}
                  <div>
                    <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Font Style</div>
                    <div className="flex flex-wrap gap-1">
                      {FONT_FAMILIES.map((f) => (
                        <button
                          key={f.shortName}
                          type="button"
                          onClick={() => {
                            safeRun((chain) => chain.setFontFamily(f.value).run());
                            setShowMoreMenu(false);
                          }}
                          className="px-2 py-0.5 text-[11px] rounded-md border border-border/70 bg-white/60 hover:bg-white/90 text-foreground cursor-pointer"
                        >
                          {f.shortName}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Size & Strike */}
                  <div>
                    <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Font Size</div>
                    <div className="flex flex-wrap gap-1">
                      {FONT_SIZES.map((s) => (
                        <button
                          key={s.label}
                          type="button"
                          onClick={() => {
                            safeRun((chain) => chain.setFontSize(s.label).run());
                            setShowMoreMenu(false);
                          }}
                          className="px-1.5 py-0.5 text-[10px] rounded border border-border/70 bg-white/60 hover:bg-white/90 text-foreground cursor-pointer"
                        >
                          {s.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          safeRun((chain) => chain.toggleStrike().run());
                          setShowMoreMenu(false);
                        }}
                        className="px-1.5 py-0.5 text-[10px] rounded border border-border/70 bg-white/60 hover:bg-white/90 text-foreground cursor-pointer"
                      >
                        Strike
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 4. Native Apple Notes Writing Canvas (Fills remaining height, only text scrolls) */}
      <main className="flex-1 min-h-0 w-full overflow-y-auto px-4 py-3 select-text">
        <EditorContent editor={editor} className="min-h-full" />

        {/* Paste notice feedback */}
        <AnimatePresence>
          {pasteNotice && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800"
            >
              <Info size={14} className="shrink-0 mt-0.5 text-amber-600" />
              <span className="leading-snug">{pasteNotice}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
            {error}
          </p>
        )}
      </main>

      {/* 5. Squeezed Ergonomic Bottom Action Bar ("bottom button ko squeeze kr do") */}
      <footer className="shrink-0 border-t border-border/70 bg-white/95 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md z-30">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          {/* Primary Action: Squeezed Paste from Phone Button */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => void handlePaste()}
            className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-xl bg-accent px-3 text-xs font-semibold text-white shadow-xs hover:bg-accent/90 active:scale-95 transition cursor-pointer"
          >
            {hasPastedSuccess ? (
              <>
                <Check size={15} className="text-emerald-300" />
                <span>Pasted & Sent!</span>
              </>
            ) : (
              <>
                <Clipboard size={15} />
                <span>Paste from phone</span>
              </>
            )}
          </motion.button>

          {/* Secondary Action: Squeezed Copy Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => void copy()}
            disabled={!charCount}
            className="h-10 px-3 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-stone-50 text-xs font-medium text-foreground hover:bg-stone-100 transition disabled:opacity-40 cursor-pointer"
            title="Copy note"
            aria-label="Copy note"
          >
            {hasCopied ? (
              <>
                <Check size={14} className="text-emerald-600" />
                <span className="text-xs">Copied</span>
              </>
            ) : (
              <>
                <Copy size={14} className="text-muted" />
                <span className="text-xs">Copy</span>
              </>
            )}
          </motion.button>

          {/* Secondary Action: Squeezed Clear Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={clear}
            disabled={!charCount}
            className="size-10 flex items-center justify-center rounded-xl border border-border bg-stone-50 text-muted hover:text-red-600 hover:bg-red-50/60 transition disabled:opacity-40 cursor-pointer shrink-0"
            title="Clear text"
            aria-label="Clear text"
          >
            <Trash2 size={15} />
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
    <div className="h-[100dvh] max-h-[100dvh] bg-[#FAF9F6] text-foreground flex flex-col justify-between w-full overflow-hidden select-none">
      {/* 1. Sleek Mobile Top Header */}
      <header className="shrink-0 h-14 flex items-center justify-between border-b border-border/70 bg-white/90 px-4 backdrop-blur-md z-20">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-xl bg-accent text-white shadow-2xs">
            <Clipboard size={16} strokeWidth={2.3} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-tight text-foreground leading-none">CopySync</span>
            <span className="text-[10px] text-muted leading-tight mt-0.5">Mobile Sync</span>
          </div>
        </Link>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 text-[11px] font-medium text-accent">
          <span className="size-1.5 rounded-full bg-accent animate-pulse" />
          <span>Connecting...</span>
        </div>
      </header>

      {/* 2. Main Pairing Content */}
      <main className="flex-1 min-h-0 w-full overflow-y-auto px-4 py-6 flex flex-col justify-center items-center max-w-sm mx-auto">
        {/* Animated Dual Device Visual */}
        <div className="relative mb-6 flex items-center justify-center gap-4">
          <div className="grid size-16 place-items-center rounded-2xl bg-white border border-border/80 shadow-sm text-foreground">
            <Smartphone size={28} className="text-accent" />
          </div>

          <div className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-accent/40 animate-ping" />
            <RefreshCw size={18} className="text-accent animate-spin" />
            <span className="size-1.5 rounded-full bg-accent/40 animate-ping" />
          </div>

          <div className="grid size-16 place-items-center rounded-2xl bg-white border border-border/80 shadow-sm text-foreground">
            <DeviceIcon size={28} className="text-foreground" />
          </div>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-foreground text-center">
          Connecting to {currentDevice}...
        </h1>
        <p className="mt-2 text-xs text-muted text-center leading-relaxed max-w-xs">
          {subtext || `Establishing an encrypted real-time channel with your ${currentDevice.toLowerCase()} notes.`}
        </p>

        {/* Feature Context Cards */}
        <div className="mt-6 w-full space-y-3">
          <div className="rounded-2xl border border-border/80 bg-white p-3.5 shadow-xs flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-accent/10 text-accent shrink-0">
              <Zap size={18} />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-foreground">Real-time sync</h2>
              <p className="text-[11px] text-muted leading-snug mt-0.5">
                Text and notes typed on mobile stream live to your laptop with zero delay.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-white p-3.5 shadow-xs flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground">Private & passwordless</h3>
              <p className="text-[11px] text-muted leading-snug mt-0.5">
                No login required. Session expires automatically when you close the tab.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Bottom Cancel / Home Button */}
      <footer className="shrink-0 border-t border-border/70 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md z-20">
        <div className="mx-auto flex max-w-sm flex-col gap-2">
          <Link
            href="/"
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-border bg-stone-50 text-stone-700 text-xs font-semibold hover:bg-stone-100 active:scale-[0.98] transition cursor-pointer"
          >
            <span>Cancel & Return Home</span>
          </Link>
        </div>
      </footer>
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
