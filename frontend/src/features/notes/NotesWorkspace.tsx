"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FilePlus2,
  LogOut,
  Menu,
  NotebookPen,
  Search,
  Trash2,
  X,
  Check,
  AlertCircle,
  Sparkles,
  Smartphone,
  Loader2,
  Clock,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { notesService } from "@/services/notes.service";
import type { Note, NoteListItem } from "@/types/note";
import { RichTextEditor } from "@/features/notes/RichTextEditor";
import { GuestLimitModal } from "@/features/notes/GuestLimitModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ConnectionLostModal } from "@/components/ui/ConnectionLostModal";
import { NoteListSkeleton, NoteEditorSkeleton } from "@/components/ui/Skeleton";
import { motion, AnimatePresence } from "motion/react";

type SaveState = "idle" | "saving" | "saved" | "error";

interface NotesWorkspaceProps {
  isGuestMode?: boolean;
  guestSessionId?: string;
  guestToken?: string;
  onEndGuestSession?: () => void;
}

export function NotesWorkspace({
  isGuestMode,
  guestSessionId,
  guestToken,
  onEndGuestSession,
}: NotesWorkspaceProps = {}) {
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [active, setActive] = useState<Note>();
  const [query, setQuery] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [isConnectionLost, setIsConnectionLost] = useState(false);
  const [sessionRemaining, setSessionRemaining] = useState<number | null>(null);

  // Loading States
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isLoadingActiveNote, setIsLoadingActiveNote] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);

  // Custom Confirm Modal State (Replaces all browser confirm() dialogs)
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant: "danger" | "warning";
    isLoading: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    confirmText: "Confirm",
    variant: "danger",
    isLoading: false,
    onConfirm: () => {},
  });

  const timer = useRef<ReturnType<typeof setTimeout>>();
  const activeRef = useRef<Note>();
  activeRef.current = active;
  const wsRef = useRef<WebSocket | null>(null);

  // Check guest state from prop or local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasUserToken = Boolean(localStorage.getItem("copysync_token"));
      const hasGuestToken = Boolean(localStorage.getItem("copysync_guest_token"));
      setIsGuest(isGuestMode ?? (!hasUserToken && hasGuestToken));
    }
  }, [isGuestMode]);

  // Session timer: starts when QR code is scanned & connection is established
  useEffect(() => {
    if (!isGuest) return;

    const checkTime = () => {
      if (typeof window === "undefined") return;
      const stored = localStorage.getItem("copysync_guest_expires_at");
      if (!stored) {
        // If not already stored, start 60-minute duration from when notes workspace opens
        const newExpiry = Date.now() + 60 * 60 * 1000;
        localStorage.setItem("copysync_guest_expires_at", newExpiry.toString());
        setSessionRemaining(3600);
        return;
      }
      const expMs = Number(stored);
      const diff = Math.max(0, Math.ceil((expMs - Date.now()) / 1000));
      setSessionRemaining(diff);

      if (diff <= 0) {
        // Session expired: end guest session and redirect to /guest
        setIsConnectionLost(true);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [isGuest]);

  const sessionMinutes = sessionRemaining !== null ? Math.floor(sessionRemaining / 60) : 60;
  const sessionSeconds = sessionRemaining !== null ? String(sessionRemaining % 60).padStart(2, "0") : "00";

  const load = useCallback(async () => {
    setIsLoadingNotes(true);
    try {
      const list = await notesService.list();
      setNotes(list);
      if (list[0]) {
        setIsLoadingActiveNote(true);
        const first = await notesService.get(list[0].id);
        setActive(first);
        setIsLoadingActiveNote(false);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load notes.");
    } finally {
      setIsLoadingNotes(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // WebSocket connection for live phone streaming into active rich text note
  useEffect(() => {
    const api = process.env.NEXT_PROD_API_URL;
    const effectiveSessionId =
      guestSessionId ||
      (typeof window !== "undefined" ? localStorage.getItem("copysync_guest_session_id") : null);
    const effectiveToken =
      guestToken ||
      (typeof window !== "undefined" ? localStorage.getItem("copysync_guest_session_token") : null);

    if (!effectiveSessionId || !effectiveToken || !api) return;

    const wsUrl =
      api.replace(/^http/, "ws") +
      `/ws/guest/${effectiveSessionId}?token=${encodeURIComponent(effectiveToken)}&role=sender`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 25000);

    const formatRichText = (text: string) => {
      if (text.startsWith("<") && text.endsWith(">")) return text;
      return text
        .split("\n")
        .map((line) => `<p>${line || "<br>"}</p>`)
        .join("");
    };

    let isTerminated = false;

    const handleSessionEnded = () => {
      if (isTerminated) return;
      isTerminated = true;

      const isUserLoggedIn =
        typeof window !== "undefined" && Boolean(localStorage.getItem("copysync_token"));

      if (!isUserLoggedIn) {
        const gToken = typeof window !== "undefined" ? localStorage.getItem("copysync_guest_token") : null;
        if (gToken && api) {
          fetch(`${api}/guest-workspace`, {
            method: "DELETE",
            headers: { "X-Guest-Workspace-Token": gToken },
          }).catch(() => {});
        }
        if (typeof window !== "undefined") {
          localStorage.removeItem("copysync_guest_token");
          localStorage.removeItem("copysync_guest_session_id");
          localStorage.removeItem("copysync_guest_session_token");
          localStorage.removeItem("copysync_guest_expires_at");
        }
        setIsConnectionLost(true);
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        return;
      }

      setError("Mobile device disconnected. Pairing session has ended.");
      if (typeof window !== "undefined") {
        localStorage.removeItem("copysync_guest_session_id");
        localStorage.removeItem("copysync_guest_session_token");
        localStorage.removeItem("copysync_guest_expires_at");
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };

    // HTTP Heartbeat Polling: fallback if WebSocket fails or drops
    const pollInterval = setInterval(async () => {
      if (isTerminated) return;
      try {
        const res = await fetch(
          `${api}/guest/session/${effectiveSessionId}?token=${encodeURIComponent(effectiveToken)}`
        );
        if (res.ok) {
          const body = await res.json();
          if (body.status === "closed" || body.status === "expired") {
            handleSessionEnded();
          }
        } else if (res.status === 404 || res.status === 410) {
          handleSessionEnded();
        }
      } catch {
        // network blip, continue polling
      }
    }, 2000);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "session.closed" || data.type === "session.receiver_left") {
          handleSessionEnded();
          return;
        }
        if (data.type === "clipboard.updated" && typeof data.content === "string") {
          const richContent = formatRichText(data.content);
          const current = activeRef.current;
          if (current) {
            const next = { ...current, content: richContent };
            setActive(next);
            persist(next);
          } else {
            // If no active note, create one and set content
            void (async () => {
              try {
                const newNote = await notesService.create();
                const next = { ...newNote, content: richContent };
                setActive(next);
                setNotes((items) => [next, ...items.filter((i) => i.id !== next.id)]);
                persist(next);
              } catch {
                // limit reached or failed
              }
            })();
          }
        }
      } catch {
        // ignore
      }
    };

    return () => {
      clearInterval(pingInterval);
      clearInterval(pollInterval);
      ws.close();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestSessionId, guestToken]);

  const select = async (id: string) => {
    setIsLoadingActiveNote(true);
    try {
      const note = await notesService.get(id);
      setActive(note);
      setSidebarOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to open note.");
    } finally {
      setIsLoadingActiveNote(false);
    }
  };

  const persist = (next: Note) => {
    if (timer.current) clearTimeout(timer.current);
    setSaveState("saving");
    timer.current = setTimeout(() => {
      void (async () => {
        try {
          const saved = await notesService.update(next.id, {
            title: next.title,
            content: next.content,
            expected_version: next.version,
          });
          setActive(saved);
          setNotes((items) => items.map((item) => (item.id === saved.id ? saved : item)));
          setSaveState("saved");
        } catch (cause) {
          setSaveState("error");
          setError(cause instanceof Error ? cause.message : "Could not save changes.");
        }
      })();
    }, 400);
  };

  const edit = (key: "title" | "content", value: string) => {
    const note = activeRef.current;
    if (!note) return;
    const next = { ...note, [key]: value };
    setActive(next);
    persist(next);
  };

  const create = async () => {
    // Guest limit: maximum 3 notes
    if (isGuest && notes.length >= 3) {
      setShowLimitModal(true);
      return;
    }

    setIsCreatingNote(true);
    try {
      const note = await notesService.create();
      setNotes((items) => [note, ...items]);
      setActive(note);
      setSidebarOpen(false);
    } catch (cause: unknown) {
      // @ts-expect-error status check
      if (cause?.status === 429 || (cause instanceof Error && cause.message.toLowerCase().includes("limit"))) {
        setShowLimitModal(true);
      } else {
        setError(cause instanceof Error ? cause.message : "Could not create note.");
      }
    } finally {
      setIsCreatingNote(false);
    }
  };

  // Custom Confirmation Dialog for Note Deletion (Replaces browser confirm)
  const promptDeleteNote = () => {
    if (!active) return;
    setConfirmConfig({
      isOpen: true,
      title: "Delete this note?",
      description: `"${active.title || "Untitled"}" will be permanently removed from your notes list.`,
      confirmText: "Delete Note",
      variant: "danger",
      isLoading: false,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isLoading: true }));
        try {
          await notesService.remove(active.id);
          const remaining = notes.filter((note) => note.id !== active.id);
          setNotes(remaining);
          setActive(remaining[0] ? await notesService.get(remaining[0].id) : undefined);
          setConfirmConfig((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Could not delete note.");
          setConfirmConfig((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        }
      },
    });
  };

  const logout = async () => {
    try {
      await apiFetch<void>("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("copysync_token");
        localStorage.removeItem("copysync_guest_token");
        localStorage.removeItem("copysync_guest_session_id");
        localStorage.removeItem("copysync_guest_session_token");
      }
      location.assign("/login");
    }
  };

  // Custom Confirmation Dialog for Ending Guest Session (Replaces browser confirm)
  const promptEndGuestSession = () => {
    setConfirmConfig({
      isOpen: true,
      title: "End guest session?",
      description: "All unsaved guest notes and temporary clipboard history will be cleared from the database.",
      confirmText: "End Session & Clear",
      variant: "danger",
      isLoading: false,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isLoading: true }));
        setIsEndingSession(true);
        try {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "session.closed" }));
            wsRef.current.close();
            wsRef.current = null;
          }
          await apiFetch<void>("/guest-workspace", { method: "DELETE" }).catch(() => {});
          const effectiveSessionId =
            guestSessionId ||
            (typeof window !== "undefined" ? localStorage.getItem("copysync_guest_session_id") : null);
          const effectiveToken =
            guestToken ||
            (typeof window !== "undefined" ? localStorage.getItem("copysync_guest_session_token") : null);

          if (effectiveSessionId && effectiveToken) {
            await apiFetch<void>(`/guest/session/${effectiveSessionId}`, {
              method: "DELETE",
              body: JSON.stringify({ token: effectiveToken }),
            }).catch(() => {});
          }
        } finally {
          if (typeof window !== "undefined") {
            localStorage.removeItem("copysync_guest_token");
            localStorage.removeItem("copysync_guest_session_id");
            localStorage.removeItem("copysync_guest_session_token");
          }
          setConfirmConfig((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          if (onEndGuestSession) {
            onEndGuestSession();
          } else {
            location.assign("/");
          }
        }
      },
    });
  };

  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(query.toLowerCase())
  );

  const sidebar = (
    <aside className="flex h-full flex-col bg-[#fcfbf8] p-4">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
          <span className="grid size-8 place-items-center rounded-md bg-accent text-white shadow-xs">
            <NotebookPen size={17} />
          </span>
          <span>CopySync</span>
        </div>
        <button
          className="p-2 md:hidden text-muted hover:text-foreground"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={18} />
        </button>
      </div>

      {/* New Note Button with Spinner Loading State */}
      <motion.button
        whileHover={{ scale: isCreatingNote ? 1 : 1.01 }}
        whileTap={{ scale: isCreatingNote ? 1 : 0.98 }}
        onClick={() => void create()}
        disabled={isCreatingNote}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-sm bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-accent/90 transition disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
      >
        {isCreatingNote ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Creating note...</span>
          </>
        ) : (
          <>
            <FilePlus2 size={16} />
            <span>New note</span>
          </>
        )}
      </motion.button>

      {/* Search Input */}
      <div className="relative mt-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search notes..."
          className="w-full rounded-sm border border-border bg-white py-2 pl-9 pr-3 text-xs text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent"
        />
      </div>

      {/* Notes List with Skeletons */}
      <nav aria-label="Notes" className="mt-3 flex-1 overflow-y-auto space-y-1 pr-1">
        {isLoadingNotes ? (
          <NoteListSkeleton />
        ) : (
          <>
            {/* Shimmering item when actively creating a note */}
            {isCreatingNote && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-sm p-3 bg-accent/10 border border-accent/30 text-accent text-xs font-semibold"
              >
                <Loader2 size={13} className="animate-spin text-accent shrink-0" />
                <span className="truncate">Creating new note...</span>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {filteredNotes.map((note) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                >
                  <button
                    className={`group flex w-full items-center justify-between rounded-sm px-3 py-2.5 text-left text-xs transition cursor-pointer ${
                      active?.id === note.id
                        ? "bg-accent/15 text-accent font-medium shadow-2xs"
                        : "text-muted hover:bg-cream/60 hover:text-foreground"
                    }`}
                    onClick={() => void select(note.id)}
                  >
                    <span className="truncate pr-2">{note.title || "Untitled"}</span>
                    <span className="text-[10px] opacity-60 shrink-0">
                      {new Date(note.updated_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredNotes.length === 0 && !isCreatingNote && (
              <div className="py-8 text-center text-xs text-muted">
                {query ? "No notes matching your search" : "No notes yet"}
              </div>
            )}
          </>
        )}
      </nav>

      {/* Guest Status / Session Card */}
      {isGuest ? (
        <div className="mt-4 space-y-2 pt-2 border-t border-border/70">
          <div className="rounded-xl border border-amber-200/90 bg-amber-50/70 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-950">
              <span className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-700" />
                <span>Guest Mode</span>
              </span>
              <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                {notes.length}/3 Notes
              </span>
            </div>

            {sessionRemaining !== null && (
              <div className="flex items-center justify-between rounded-lg bg-amber-100/70 px-2.5 py-1 text-[11px] text-amber-950 font-medium border border-amber-200/60">
                <span className="flex items-center gap-1.5">
                  <Clock size={12} className="text-amber-800 shrink-0" />
                  <span>Session time left:</span>
                </span>
                <span className="font-mono font-bold text-amber-950">
                  {sessionMinutes}:{sessionSeconds}
                </span>
              </div>
            )}

            <p className="text-[11px] leading-relaxed text-amber-800">
              Temporary guest session. Sign in with Google to keep notes permanently.
            </p>
            <button
              onClick={() => setShowLimitModal(true)}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-accent text-white py-1.5 text-xs font-semibold shadow-2xs hover:bg-accent/90 transition cursor-pointer"
            >
              <Sparkles size={12} />
              <span>Save Notes to Account</span>
            </button>
          </div>

          {/* End Session Button triggers Custom Confirmation Modal */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            onClick={promptEndGuestSession}
            disabled={isEndingSession}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50/70 py-2 text-xs font-medium text-red-700 hover:bg-red-100/70 transition disabled:opacity-50 cursor-pointer"
          >
            <X size={14} />
            <span>End Session & Clear Data</span>
          </motion.button>
        </div>
      ) : (
        /* Authenticated Sign Out Button */
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => void logout()}
          className="mt-4 flex w-full items-center gap-2 rounded-sm border border-border bg-white px-3 py-2.5 text-sm font-medium text-muted hover:text-foreground hover:bg-cream transition cursor-pointer"
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </motion.button>
      )}
    </aside>
  );

  return (
    <main className="h-[100dvh] overflow-hidden bg-background md:p-4">
      <section className="grid h-full overflow-hidden bg-card md:grid-cols-[280px_minmax(0,1fr)] md:rounded-lg md:border md:border-border">
        {/* Desktop Sidebar */}
        <div className="hidden border-r border-border md:block">{sidebar}</div>

        {/* Mobile Slide-over Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-20 bg-black/30 md:hidden">
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="h-full w-[min(86vw,320px)] bg-[#fcfbf8]"
            >
              {sidebar}
            </motion.div>
          </div>
        )}

        {/* Main Note Canvas */}
        <section className="flex min-h-0 min-w-0 flex-col">
          {/* Header Masthead */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 sm:px-8">
            <div className="flex items-center gap-3">
              <button
                className="p-2 md:hidden text-muted hover:text-foreground"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={19} />
              </button>

              {/* Morphing Auto-Save Status Pill */}
              <div className="flex items-center">
                <AnimatePresence mode="wait">
                  {saveState === "saving" ? (
                    <motion.div
                      key="saving"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="flex items-center gap-1.5 rounded-full bg-cream px-3 py-1 text-xs text-muted"
                    >
                      <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span>Saving changes...</span>
                    </motion.div>
                  ) : saveState === "saved" ? (
                    <motion.div
                      key="saved"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-800"
                    >
                      <Check size={12} className="text-emerald-600" />
                      <span>All changes saved</span>
                    </motion.div>
                  ) : saveState === "error" ? (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs text-red-700"
                    >
                      <AlertCircle size={12} />
                      <span>Save error</span>
                    </motion.div>
                  ) : (
                    <div className="flex items-center gap-1.5 rounded-full bg-cream/50 px-3 py-1 text-xs text-muted">
                      <Check size={12} />
                      <span>All changes saved</span>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Guest Live Paired Indicator & Session Countdown */}
              {isGuest && (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-2.5 py-0.5 text-xs text-emerald-800 font-medium">
                    <Smartphone size={12} className="text-emerald-700" />
                    <span>Phone Connected • {notes.length}/3 Notes</span>
                  </div>
                  {sessionRemaining !== null && (
                    <div className="flex items-center gap-1.5 rounded-full border border-border/80 bg-white px-2.5 py-0.5 text-xs text-muted shadow-2xs font-mono font-medium">
                      <Clock size={12} className="text-accent shrink-0" />
                      <span>Session: <strong className="text-foreground">{sessionMinutes}:{sessionSeconds}</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Canvas Actions */}
            <div className="flex items-center gap-2">
              {isGuest && (
                <button
                  onClick={() => setShowLimitModal(true)}
                  className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 hover:bg-accent/20 px-3 py-1.5 text-xs font-semibold text-accent transition cursor-pointer"
                >
                  <Sparkles size={13} />
                  <span>Sign in with Google</span>
                </button>
              )}

              {active && (
                <button
                  onClick={promptDeleteNote}
                  className="rounded-md p-2 text-muted hover:bg-cream hover:text-red-600 transition cursor-pointer"
                  title="Delete note"
                  aria-label="Delete note"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </header>

          {error && (
            <div
              role="alert"
              className="m-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center justify-between"
            >
              <span>{error}</span>
              <button onClick={() => setError(undefined)}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* Active Note, Loading Skeleton, or Empty State */}
          {isLoadingActiveNote ? (
            <NoteEditorSkeleton />
          ) : active ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-8 sm:px-12">
              <input
                value={active.title}
                onChange={(event) => edit("title", event.target.value)}
                className="w-full text-3xl font-semibold tracking-tight outline-none text-foreground border-b border-transparent focus:border-border/60 pb-1 transition placeholder:text-muted/60"
                aria-label="Note title"
                placeholder="Untitled Note"
              />
              <RichTextEditor
                key={active.id}
                noteId={active.id}
                content={active.content}
                onChange={(value) => edit("content", value)}
                onError={setError}
              />
            </div>
          ) : (
            <div className="grid flex-1 place-items-center text-center p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                {/* Floating ambient illustration */}
                <motion.div
                  animate={{ y: [0, -7, 0] }}
                  transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
                  className="mx-auto grid size-14 place-items-center rounded-2xl bg-cream text-accent shadow-xs"
                >
                  <NotebookPen size={28} />
                </motion.div>

                <h1 className="mt-4 text-xl font-semibold text-foreground">A clear space to think</h1>
                <p className="mt-1.5 max-w-sm text-sm text-muted">
                  Capture thoughts, sync links, or paste snippets from any connected device.
                </p>

                <motion.button
                  whileHover={{ scale: isCreatingNote ? 1 : 1.02 }}
                  whileTap={{ scale: isCreatingNote ? 1 : 0.97 }}
                  onClick={() => void create()}
                  disabled={isCreatingNote}
                  className="mt-5 inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-accent/90 transition cursor-pointer disabled:opacity-70"
                >
                  {isCreatingNote ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Creating note...</span>
                    </>
                  ) : (
                    <>
                      <FilePlus2 size={16} />
                      <span>Create a note</span>
                    </>
                  )}
                </motion.button>
              </motion.div>
            </div>
          )}
        </section>
      </section>

      {/* Guest 3-Note Limit Modal */}
      <GuestLimitModal isOpen={showLimitModal} onClose={() => setShowLimitModal(false)} />

      {/* Connection Lost Modal (Auto-redirects to /guest) */}
      <ConnectionLostModal isOpen={isConnectionLost} />

      {/* Custom Confirmation Modal (Replaces browser confirm() dialogs) */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
        isLoading={confirmConfig.isLoading}
        onConfirm={confirmConfig.onConfirm}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </main>
  );
}
