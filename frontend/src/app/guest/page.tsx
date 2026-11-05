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
  FilePlus2,
  ArrowDown,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Turnstile } from "@/components/Turnstile";
import { motion, AnimatePresence } from "motion/react";
import { InteractiveCopyPill } from "@/components/ui/InteractiveCopyPill";

type GuestSession = { id: string; token: string; status: string; expires_at: string };
type ClipItem = { id: string; text: string; time: string };
type GuestNote = { id: string; title: string; content: string; updatedAt: string };

const api = process.env.NEXT_PROD_API_URL;
const TOTAL_DURATION_SECONDS = 300; // 5 minute standard expiry

export default function GuestPage() {
  const [session, setSession] = useState<GuestSession>();
  const [error, setError] = useState<string>();
  const [remaining, setRemaining] = useState(TOTAL_DURATION_SECONDS);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [hasCopied, setHasCopied] = useState(false);
  const [copiedClipId, setCopiedClipId] = useState<string | null>(null);
  const [autoCopy, setAutoCopy] = useState(false);
  const [isReceiverDisconnected, setIsReceiverDisconnected] = useState(false);

  // Guest Notes state
  const [notes, setNotes] = useState<GuestNote[]>([
    {
      id: "note-1",
      title: "Live Mobile Note",
      content: "",
      updatedAt: "Ready",
    },
  ]);
  const [activeNoteId, setActiveNoteId] = useState<string>("note-1");
  const activeNoteIdRef = useRef(activeNoteId);
  activeNoteIdRef.current = activeNoteId;

  const wsRef = useRef<WebSocket | null>(null);
  const autoCopyRef = useRef(autoCopy);
  autoCopyRef.current = autoCopy;

  const needsTurnstile = Boolean(process.env.NEXT_PROD_TURNSTILE_SITE_KEY);

  const create = async (token = turnstileToken) => {
    setError(undefined);
    setIsRefreshing(true);
    setIsConnected(false);
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
          setNotes((prevNotes) =>
            prevNotes.map((n) =>
              n.id === activeNoteIdRef.current
                ? { ...n, content: data.content, updatedAt: "Synced from phone" }
                : n
            )
          );
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
          setNotes((prevNotes) =>
            prevNotes.map((n) =>
              n.id === activeNoteIdRef.current
                ? { ...n, content: "", updatedAt: "Cleared" }
                : n
            )
          );
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

  const currentActiveNote = useMemo(
    () => notes.find((n) => n.id === activeNoteId) || notes[0],
    [notes, activeNoteId]
  );

  const handleNoteContentChange = (newContent: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNoteId ? { ...n, content: newContent, updatedAt: "Edited locally" } : n
      )
    );
  };

  const handleNoteTitleChange = (newTitle: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === activeNoteId ? { ...n, title: newTitle } : n))
    );
  };

  const handleNewNote = () => {
    const newId = `note-${Date.now()}`;
    const newNote: GuestNote = {
      id: newId,
      title: `Note ${notes.length + 1}`,
      content: "",
      updatedAt: "Just now",
    };
    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteId(newId);
  };

  const handleDeleteNote = (idToDelete: string) => {
    if (notes.length <= 1) {
      setNotes([
        {
          id: "note-1",
          title: "Live Mobile Note",
          content: "",
          updatedAt: "Cleared",
        },
      ]);
      setActiveNoteId("note-1");
      return;
    }
    const remainingNotes = notes.filter((n) => n.id !== idToDelete);
    setNotes(remainingNotes);
    if (activeNoteId === idToDelete) {
      setActiveNoteId(remainingNotes[0].id);
    }
  };

  const handleDownloadNote = () => {
    if (!currentActiveNote) return;
    const blob = new Blob([currentActiveNote.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentActiveNote.title.toLowerCase().replace(/[^a-z0-9]/g, "_") || "note"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
               STATE B: CONNECTED! (GUEST NOTES WORKSPACE WITH LIVE MOBILE STREAMING)
               ========================================================================= */
            <motion.div
              key="connected-notes-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35 }}
              className="w-full flex-1 flex flex-col space-y-4"
            >
              {/* Top Banner: Connection Established & Active Session */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 sm:p-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="relative grid size-10 place-items-center rounded-xl bg-emerald-500 text-white shadow-xs">
                    <Check size={20} strokeWidth={2.8} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-emerald-950">
                        Connection Established!
                      </h3>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                        <Smartphone size={11} className="text-emerald-700" />
                        <span>Live Phone Paired</span>
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800/80 mt-0.5">
                      Text typed or pasted on your phone streams directly into your guest note below.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-auto sm:ml-0">
                  <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs text-muted shadow-2xs">
                    <Clock size={13} className="text-emerald-600" />
                    <span>Session:</span>
                    <span className="font-mono font-bold text-foreground">
                      {minutes}:{seconds}
                    </span>
                  </div>
                  <button
                    onClick={() => void cancel()}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 text-xs font-semibold shadow-2xs transition"
                  >
                    <X size={13} />
                    <span>End Session</span>
                  </button>
                </div>
              </div>

              {/* Disconnection Warning if Phone Left */}
              {isReceiverDisconnected && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span>Mobile device was disconnected. You can scan again or wait for reconnect.</span>
                </div>
              )}

              {/* Main Notes Workspace Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 items-start">
                {/* Left Column (3.5 cols on desktop): Notes Navigation */}
                <div className="md:col-span-4 lg:col-span-3.5 space-y-3">
                  <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Guest Notes
                      </span>
                      <button
                        onClick={handleNewNote}
                        className="flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent/80 transition"
                      >
                        <FilePlus2 size={13} />
                        <span>New Note</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {notes.map((note) => {
                        const isCurrent = note.id === activeNoteId;
                        return (
                          <div
                            key={note.id}
                            onClick={() => setActiveNoteId(note.id)}
                            className={`w-full text-left rounded-xl p-2.5 transition flex items-center justify-between gap-2 border cursor-pointer ${
                              isCurrent
                                ? "bg-accent/10 border-accent/40 text-foreground font-semibold"
                                : "bg-white border-border/70 text-muted hover:bg-cream/40"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs truncate flex items-center gap-1.5">
                                <span
                                  className={`size-1.5 rounded-full ${
                                    isCurrent ? "bg-emerald-500 animate-pulse" : "bg-muted/40"
                                  }`}
                                />
                                <span className="truncate">{note.title || "Untitled Note"}</span>
                              </div>
                              <span className="text-[10px] text-muted/70 block mt-0.5 font-normal">
                                {note.content ? `${note.content.length} characters` : "Empty note"}
                              </span>
                            </div>
                            {notes.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNote(note.id);
                                }}
                                className="p-1 rounded-md text-muted hover:text-red-600 transition"
                                title="Delete note"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Auto-copy toggle card */}
                  <div className="rounded-2xl border border-border bg-card p-3.5 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Laptop size={15} className="text-accent" />
                      <span className="text-xs font-medium text-foreground">Auto-copy to PC</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoCopy}
                        onChange={(e) => setAutoCopy(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-muted/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600" />
                    </label>
                  </div>

                  {/* Scan again link */}
                  <div className="text-center pt-1">
                    <button
                      onClick={() => void create()}
                      className="text-xs text-muted hover:text-foreground transition underline underline-offset-4"
                    >
                      Connect another device / Scan again
                    </button>
                  </div>
                </div>

                {/* Right Column (8.5 cols): The Active Note Editor */}
                <div className="md:col-span-8 lg:col-span-8.5 rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm flex flex-col min-h-[460px]">
                  {/* Note Header / Title & Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
                    <div className="flex-1 min-w-[200px]">
                      <input
                        value={currentActiveNote?.title || ""}
                        onChange={(e) => handleNoteTitleChange(e.target.value)}
                        placeholder="Note title..."
                        className="text-lg sm:text-xl font-bold text-foreground bg-transparent outline-none w-full border-b border-transparent focus:border-accent/40"
                      />
                      <span className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live streaming from phone • {currentActiveNote?.updatedAt}
                      </span>
                    </div>

                    {/* Toolbar Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void copyToClipboard(currentActiveNote?.content || "")}
                        disabled={!currentActiveNote?.content}
                        className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition active:scale-[0.98] shadow-2xs disabled:opacity-40 ${
                          hasCopied
                            ? "bg-emerald-600 text-white"
                            : "bg-accent text-white hover:bg-accent/90"
                        }`}
                      >
                        {hasCopied ? (
                          <>
                            <CheckCheck size={14} />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy Note (Ctrl+C)</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleDownloadNote}
                        disabled={!currentActiveNote?.content}
                        className="p-2 rounded-xl border border-border bg-white text-muted hover:text-foreground hover:bg-cream/50 transition disabled:opacity-40"
                        title="Download Note (.txt)"
                      >
                        <ArrowDown size={14} />
                      </button>

                      <button
                        onClick={() => handleNoteContentChange("")}
                        disabled={!currentActiveNote?.content}
                        className="p-2 rounded-xl border border-border bg-white text-muted hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40"
                        title="Clear Note content"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Note Body Editor */}
                  <div className="flex-1 mt-4 flex flex-col">
                    {!currentActiveNote?.content && (
                      <div className="flex items-center gap-2 text-xs text-muted mb-3 bg-cream/40 p-3 rounded-xl border border-dashed border-border/80">
                        <Sparkles size={15} className="text-accent shrink-0" />
                        <span>
                          Empty guest note. Tap &quot;Paste from phone&quot; or type on your mobile screen to stream text directly here.
                        </span>
                      </div>
                    )}
                    <textarea
                      value={currentActiveNote?.content || ""}
                      onChange={(e) => handleNoteContentChange(e.target.value)}
                      placeholder="Start typing on your phone or paste text to see it appear here in real-time... You can also type directly in this note on your laptop."
                      className="flex-1 w-full min-h-[320px] resize-none rounded-2xl border border-border bg-[#FAF9F6] p-4 text-sm sm:text-base outline-none transition focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/10 placeholder:text-muted leading-relaxed"
                    />
                  </div>

                  {/* Recent snippets history tray */}
                  {clips.length > 1 && (
                    <div className="mt-4 pt-3 border-t border-border/80">
                      <div className="flex items-center justify-between text-xs font-semibold text-muted mb-2">
                        <span>Recent Phone Snippets ({clips.length})</span>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                        {clips.slice(1, 6).map((clip) => (
                          <div
                            key={clip.id}
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1 text-xs shrink-0 max-w-[220px]"
                          >
                            <span className="truncate text-muted text-[11px] font-mono">
                              {clip.text}
                            </span>
                            <button
                              onClick={() => void copyToClipboard(clip.text, clip.id)}
                              className="text-[10px] font-semibold text-accent hover:underline shrink-0"
                            >
                              {copiedClipId === clip.id ? "Copied" : "Copy"}
                            </button>
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
