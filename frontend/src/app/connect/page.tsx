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
  Code,
  Quote,
  Trash2,
  Copy,
  Info,
  Loader2,
  Laptop,
  Monitor,
  MoreVertical,
  Undo2,
  Redo2,
  Highlighter,
} from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { getOrCreateDeviceId } from "@/features/presence/deviceId";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EditorContent, useEditor, BubbleMenu } from "@tiptap/react";
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

  // TipTap Rich Text Editor Instance for Mobile
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
        class: "rich-editor min-h-[300px] p-4 text-[15px] outline-none leading-relaxed text-foreground bg-transparent focus:outline-none",
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

  // Mobile backgrounding protection: keep session alive when user switches apps to copy text
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

  // Immediate sync button (sends right away without waiting for debounce)
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
            To connect again, please scan the QR code displayed on your system screen.
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

  const charCount = editor ? editor.getText().length : content.length;

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-foreground flex flex-col justify-between w-full max-w-full overflow-x-hidden">
      {/* 1. Top Navbar */}
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
          {charCount > 0 && (
            <span className="text-[10px] font-mono text-muted bg-cream/70 px-2 py-0.5 rounded-md">
              {charCount} chars
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
        <div className="relative flex-1 flex flex-col rounded-2xl border border-border/80 bg-white shadow-xs overflow-visible">
          {/* Quick Rich Format Bar with Undo, Redo, B, I, U, Headings, and 3-Dots */}
          <div className="flex items-center justify-between border-b border-border/70 bg-[#FAF9F7] px-2 py-1.5 overflow-x-auto rounded-t-2xl">
            <div className="flex items-center gap-0.5 sm:gap-1">
              {/* Undo & Redo */}
              <button
                type="button"
                disabled={!editor?.can().undo()}
                onClick={() => editor?.chain().focus().undo().run()}
                className="rounded-md p-1.5 text-muted hover:bg-white hover:text-foreground disabled:opacity-30 active:scale-95 transition cursor-pointer"
                title="Undo"
                aria-label="Undo"
              >
                <Undo2 size={14} />
              </button>
              <button
                type="button"
                disabled={!editor?.can().redo()}
                onClick={() => editor?.chain().focus().redo().run()}
                className="rounded-md p-1.5 text-muted hover:bg-white hover:text-foreground disabled:opacity-30 active:scale-95 transition cursor-pointer"
                title="Redo"
                aria-label="Redo"
              >
                <Redo2 size={14} />
              </button>

              <span className="mx-0.5 h-3.5 w-px bg-border/70 shrink-0" />

              {/* Bold, Italic, Underline */}
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className={`rounded-md p-1.5 active:scale-95 transition cursor-pointer ${
                  editor?.isActive("bold") ? "bg-cream text-accent font-bold" : "text-muted hover:bg-white hover:text-foreground"
                }`}
                title="Bold"
                aria-label="Bold"
              >
                <Bold size={14} />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                className={`rounded-md p-1.5 active:scale-95 transition cursor-pointer ${
                  editor?.isActive("italic") ? "bg-cream text-accent font-bold" : "text-muted hover:bg-white hover:text-foreground"
                }`}
                title="Italic"
                aria-label="Italic"
              >
                <Italic size={14} />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                className={`rounded-md p-1.5 active:scale-95 transition cursor-pointer ${
                  editor?.isActive("underline") ? "bg-cream text-accent font-bold" : "text-muted hover:bg-white hover:text-foreground"
                }`}
                title="Underline"
                aria-label="Underline"
              >
                <UnderlineIcon size={14} />
              </button>

              <span className="mx-0.5 h-3.5 w-px bg-border/70 shrink-0" />

              {/* Heading, List, Code, Quote */}
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`rounded-md p-1.5 active:scale-95 transition cursor-pointer ${
                  editor?.isActive("heading") ? "bg-cream text-accent font-bold" : "text-muted hover:bg-white hover:text-foreground"
                }`}
                title="Heading"
                aria-label="Heading"
              >
                <Heading size={14} />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className={`rounded-md p-1.5 active:scale-95 transition cursor-pointer ${
                  editor?.isActive("bulletList") ? "bg-cream text-accent font-bold" : "text-muted hover:bg-white hover:text-foreground"
                }`}
                title="Bullet List"
                aria-label="Bullet List"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleCode().run()}
                className={`rounded-md p-1.5 active:scale-95 transition cursor-pointer ${
                  editor?.isActive("code") ? "bg-cream text-accent font-bold" : "text-muted hover:bg-white hover:text-foreground"
                }`}
                title="Code"
                aria-label="Code"
              >
                <Code size={14} />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                className={`rounded-md p-1.5 active:scale-95 transition cursor-pointer ${
                  editor?.isActive("blockquote") ? "bg-cream text-accent font-bold" : "text-muted hover:bg-white hover:text-foreground"
                }`}
                title="Quote"
                aria-label="Quote"
              >
                <Quote size={14} />
              </button>

              <span className="mx-0.5 h-3.5 w-px bg-border/70 shrink-0" />

              {/* THREE DOTS BUTTON (MoreVertical) */}
              <button
                type="button"
                onClick={() => setShowMoreMenu((prev) => !prev)}
                className={`rounded-md p-1.5 active:scale-95 transition cursor-pointer ${
                  showMoreMenu ? "bg-cream text-accent font-bold shadow-2xs" : "text-muted hover:bg-white hover:text-foreground"
                }`}
                title="More formatting options (Colors, Fonts, Sizes)"
                aria-label="More formatting options"
              >
                <MoreVertical size={15} />
              </button>
            </div>

            {/* Sync Now Shortcut */}
            {syncStatus === "typing" && (
              <button
                type="button"
                onClick={handleSyncImmediately}
                className="flex items-center gap-1 text-[11px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full hover:bg-accent/20 active:scale-95 transition cursor-pointer shrink-0"
              >
                <Zap size={11} />
                <span>Sync now</span>
              </button>
            )}
          </div>

          {/* THREE DOTS EXPANDABLE FORMATTING DRAWER / POPUP */}
          <AnimatePresence>
            {showMoreMenu && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="border-b border-border/80 bg-white p-3 space-y-3 shadow-md z-20"
              >
                {/* 1. Headings Row */}
                <div>
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">
                    Heading Levels
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        editor?.chain().focus().setParagraph().run();
                        setShowMoreMenu(false);
                      }}
                      className="px-2.5 py-1 text-xs rounded-lg border border-border/80 bg-cream/30 hover:bg-cream text-foreground"
                    >
                      Normal Text
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor?.chain().focus().toggleHeading({ level: 1 }).run();
                        setShowMoreMenu(false);
                      }}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg border border-border/80 bg-cream/30 hover:bg-cream text-foreground"
                    >
                      H1 (Large)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor?.chain().focus().toggleHeading({ level: 2 }).run();
                        setShowMoreMenu(false);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border/80 bg-cream/30 hover:bg-cream text-foreground"
                    >
                      H2 (Medium)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor?.chain().focus().toggleHeading({ level: 3 }).run();
                        setShowMoreMenu(false);
                      }}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border/80 bg-cream/30 hover:bg-cream text-foreground"
                    >
                      H3 (Small)
                    </button>
                  </div>
                </div>

                {/* 2. Text Colors Row */}
                <div>
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">
                    Text Color
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => {
                          editor?.chain().focus().setColor(c.color).run();
                          setShowMoreMenu(false);
                        }}
                        style={{ backgroundColor: c.color }}
                        className="size-6 rounded-full border border-black/10 shadow-xs hover:scale-110 active:scale-95 transition"
                        title={c.name}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        editor?.chain().focus().unsetColor().run();
                        setShowMoreMenu(false);
                      }}
                      className="px-2 py-0.5 text-[11px] rounded-md border border-border text-muted hover:text-foreground"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* 3. Highlighter Colors Row */}
                <div>
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">
                    Highlight Marker
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {PASTEL_HIGHLIGHTS.map((h) => (
                      <button
                        key={h.name}
                        type="button"
                        onClick={() => {
                          editor?.chain().focus().toggleHighlight({ color: h.color }).run();
                          setShowMoreMenu(false);
                        }}
                        style={{ backgroundColor: h.color }}
                        className="h-6 px-2 rounded-md border border-black/10 text-[10px] font-medium text-stone-900 shadow-2xs hover:scale-105 active:scale-95 transition"
                      >
                        {h.name.split(" ")[0]}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        editor?.chain().focus().unsetHighlight().run();
                        setShowMoreMenu(false);
                      }}
                      className="px-2 py-0.5 text-[11px] rounded-md border border-border text-muted hover:text-foreground"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* 4. Font Sizes & Families */}
                <div>
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">
                    Font Size & Style
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {FONT_SIZES.map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => {
                          editor?.chain().focus().setFontSize(s.label).run();
                          setShowMoreMenu(false);
                        }}
                        className="px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-cream/30 hover:bg-cream text-foreground"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {FONT_FAMILIES.map((f) => (
                      <button
                        key={f.shortName}
                        type="button"
                        onClick={() => {
                          editor?.chain().focus().setFontFamily(f.value).run();
                          setShowMoreMenu(false);
                        }}
                        className="px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-cream/30 hover:bg-cream text-foreground"
                      >
                        {f.shortName}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        editor?.chain().focus().toggleStrike().run();
                        setShowMoreMenu(false);
                      }}
                      className="px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-cream/30 hover:bg-cream text-foreground"
                    >
                      Strikethrough
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FLOATING UPPER SELECTION BAR (BubbleMenu with Undo, Redo, B, I, U, Highlight) */}
          {editor && (
            <BubbleMenu
              editor={editor}
              tippyOptions={{ duration: 150, zIndex: 60, maxWidth: "none" }}
              shouldShow={({ editor: e, from, to }) => from !== to && !e.state.selection.empty}
              className="flex max-w-[calc(100vw-24px)] flex-wrap items-center gap-1 rounded-2xl border border-border/80 bg-white/95 p-1.5 shadow-xl backdrop-blur-md text-foreground"
            >
              {/* Undo & Redo on selection */}
              <button
                type="button"
                disabled={!editor.can().undo()}
                onClick={() => editor.chain().focus().undo().run()}
                className="rounded-lg p-1.5 text-muted hover:bg-cream/60 hover:text-foreground disabled:opacity-30 active:scale-95 transition cursor-pointer"
                title="Undo"
              >
                <Undo2 size={13} />
              </button>
              <button
                type="button"
                disabled={!editor.can().redo()}
                onClick={() => editor.chain().focus().redo().run()}
                className="rounded-lg p-1.5 text-muted hover:bg-cream/60 hover:text-foreground disabled:opacity-30 active:scale-95 transition cursor-pointer"
                title="Redo"
              >
                <Redo2 size={13} />
              </button>

              <div className="h-3.5 w-px bg-border/70 mx-0.5" />

              {/* Bold, Italic, Underline */}
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`rounded-lg p-1.5 active:scale-95 transition cursor-pointer ${
                  editor.isActive("bold") ? "bg-cream text-accent font-bold" : "text-muted hover:text-foreground"
                }`}
                title="Bold"
              >
                <Bold size={13} />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`rounded-lg p-1.5 active:scale-95 transition cursor-pointer ${
                  editor.isActive("italic") ? "bg-cream text-accent font-bold" : "text-muted hover:text-foreground"
                }`}
                title="Italic"
              >
                <Italic size={13} />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`rounded-lg p-1.5 active:scale-95 transition cursor-pointer ${
                  editor.isActive("underline") ? "bg-cream text-accent font-bold" : "text-muted hover:text-foreground"
                }`}
                title="Underline"
              >
                <UnderlineIcon size={13} />
              </button>

              <div className="h-3.5 w-px bg-border/70 mx-0.5" />

              {/* Quick Highlight toggle */}
              <button
                type="button"
                onClick={() => {
                  if (editor.isActive("highlight")) {
                    editor.chain().focus().unsetHighlight().run();
                  } else {
                    editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run();
                  }
                }}
                className={`rounded-lg p-1.5 active:scale-95 transition cursor-pointer ${
                  editor.isActive("highlight") ? "bg-yellow-200 text-yellow-900" : "text-muted hover:text-foreground"
                }`}
                title="Highlight"
              >
                <Highlighter size={13} />
              </button>

              {/* Quick Heading Level 2 */}
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`rounded-lg p-1.5 active:scale-95 transition cursor-pointer ${
                  editor.isActive("heading", { level: 2 }) ? "bg-cream text-accent font-bold" : "text-muted hover:text-foreground"
                }`}
                title="Heading"
              >
                <Heading size={13} />
              </button>
            </BubbleMenu>
          )}

          {/* TipTap Rich Text Editor Container */}
          <div className="flex-1 w-full min-h-[300px] overflow-auto">
            <EditorContent editor={editor} className="min-h-full" />
          </div>

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
            disabled={!charCount}
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
            disabled={!charCount}
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
