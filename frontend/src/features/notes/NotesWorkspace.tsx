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
  Bell,
  CheckCheck,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { notesService } from "@/services/notes.service";
import type { Note, NoteListItem } from "@/types/note";
import { RichTextEditor } from "@/features/notes/RichTextEditor";
import { GuestLimitModal } from "@/features/notes/GuestLimitModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ConnectionLostModal } from "@/components/ui/ConnectionLostModal";
import { DeviceLimitModal } from "@/features/notes/DeviceLimitModal";
import { usePresence } from "@/features/presence/usePresence";
import { getOrCreateDeviceId } from "@/features/presence/deviceId";
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
  const [isGuest, setIsGuest] = useState(() => {
    if (isGuestMode !== undefined) return isGuestMode;
    if (typeof window !== "undefined") {
      const hasUserToken = Boolean(localStorage.getItem("copysync_token"));
      const hasGuestToken = Boolean(localStorage.getItem("copysync_guest_token"));
      return !hasUserToken && hasGuestToken;
    }
    return false;
  });
  const presence = usePresence(isGuest);
  const [guestLimitReached, setGuestLimitReached] = useState(false);
  const [guestLimitMessage, setGuestLimitMessage] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [isConnectionLost, setIsConnectionLost] = useState(false);
  const [sessionRemaining, setSessionRemaining] = useState<number | null>(null);

  // Loading States
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isLoadingActiveNote, setIsLoadingActiveNote] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);

  // Authenticated User Profile & Notification state for sidebar
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name?: string | null } | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: "1",
      title: "Encrypted Sync Active",
      description: "Notes stream seamlessly across your devices",
      time: "Just now",
      unread: true,
    },
    {
      id: "2",
      title: "Permanent Cloud Workspace",
      description: "Signed in and saved securely",
      time: "Active",
      unread: false,
    },
  ]);

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
  const isSavingRef = useRef(false);
  const pendingUpdateRef = useRef<{ id: string; title: string; content: string } | null>(null);
  const guestAutoCreatedRef = useRef(false);
  // Callback ref for programmatically updating TipTap editor content from external sources
  const editorSetContentRef = useRef<((html: string) => void) | null>(null);
  // Counter to force TipTap to accept external content updates without triggering onChange loop
  const externalContentVersion = useRef(0);

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
      } else if (isGuest && !guestAutoCreatedRef.current) {
        // Guest with no notes: auto-create one so editor opens immediately
        guestAutoCreatedRef.current = true;
        try {
          const note = await notesService.create();
          setNotes([note]);
          setActive(note);
        } catch {
          // silently fail — user can still click create
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load notes.");
    } finally {
      setIsLoadingNotes(false);
      setIsInitialLoadDone(true);
    }
  }, [isGuest]);

  useEffect(() => {
    void load();
  }, [load]);

  // Guest auto-create guarantee: ensure guest always lands on an active editor, never empty state
  useEffect(() => {
    if (isGuest && isInitialLoadDone && !active && notes.length === 0 && !guestAutoCreatedRef.current) {
      guestAutoCreatedRef.current = true;
      void create();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest, isInitialLoadDone, active, notes.length]);

  // Fetch current user details for the sidebar if authenticated
  useEffect(() => {
    if (isGuest) return;
    const api = process.env.NEXT_PROD_API_URL;
    const token = typeof window !== "undefined" ? localStorage.getItem("copysync_token") : null;
    fetch(`${api}/auth/me`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setCurrentUser(data);
      })
      .catch(() => {});
  }, [isGuest]);

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

    const deviceId = getOrCreateDeviceId();
    const wsUrl =
      api.replace(/^http/, "ws") +
      `/ws/guest/${effectiveSessionId}?token=${encodeURIComponent(effectiveToken)}&role=sender&device_id=${encodeURIComponent(deviceId)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Announce to pairing channel that laptop workspace is active and ready to sync
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "workspace.ready" }));
      }
    };

    ws.onclose = (ev) => {
      if (ev.code === 1008 && ev.reason?.includes("limit reached")) {
        setGuestLimitReached(true);
        setGuestLimitMessage(ev.reason);
      }
    };

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
        if (
          data.type === "session.receiver_left" ||
          (data.type === "session.closed" && data.by !== "sender")
        ) {
          handleSessionEnded();
          return;
        }
        if (data.type === "clipboard.updated" && typeof data.content === "string") {
          const richContent = formatRichText(data.content);
          const current = activeRef.current;
          if (current) {
            const next = { ...current, content: richContent };
            setActive(next);
            // Programmatically update TipTap editor content so it shows instantly without reload
            externalContentVersion.current += 1;
            if (editorSetContentRef.current) {
              editorSetContentRef.current(richContent);
            }
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

  // Cross-device sync: poll current note version every 2.5s for seamless multi-device updates
  useEffect(() => {
    if (!active?.id) return;

    let isDisposed = false;
    const interval = setInterval(async () => {
      // Don't poll if page is hidden in background
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      // Don't poll while local user is currently typing or saving
      if (isSavingRef.current || pendingUpdateRef.current !== null) return;

      const currentActive = activeRef.current;
      if (!currentActive?.id) return;

      try {
        const ver = await notesService.getVersion(currentActive.id);
        if (isDisposed) return;

        // If version on server is newer than local version, another device saved updates!
        if (ver.version > currentActive.version) {
          // Double-check local edit hasn't started in the meantime
          if (isSavingRef.current || pendingUpdateRef.current !== null) return;
          const fresh = await notesService.get(currentActive.id);
          if (isDisposed) return;

          setActive(fresh);
          // Programmatically update TipTap editor with fresh content from another device
          externalContentVersion.current += 1;
          if (editorSetContentRef.current) {
            editorSetContentRef.current(fresh.content);
          }
          setNotes((items) => items.map((item) => (item.id === fresh.id ? { ...item, ...fresh } : item)));
          setSaveState("saved");
        }
      } catch {
        // network blip or auth, ignore silently
      }
    }, 2500);

    return () => {
      isDisposed = true;
      clearInterval(interval);
    };
  }, [active?.id]);

  // Periodic background list sync so new/deleted notes on other devices appear in sidebar
  useEffect(() => {
    let isDisposed = false;
    const listInterval = setInterval(async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (isSavingRef.current || pendingUpdateRef.current !== null) return;

      try {
        const freshList = await notesService.list();
        if (isDisposed) return;
        setNotes(freshList);
      } catch {
        // ignore
      }
    }, 12000);

    return () => {
      isDisposed = true;
      clearInterval(listInterval);
    };
  }, []);

  const executeSave = async (noteId: string, title: string, content: string, version: number, retryCount = 0) => {
    isSavingRef.current = true;
    setSaveState("saving");
    try {
      const saved = await notesService.update(noteId, {
        title,
        content,
        expected_version: version,
      });

      // Update active note version without blowing away local edits
      setActive((curr) => {
        if (!curr || curr.id !== saved.id) return curr;
        return { ...curr, version: saved.version, updated_at: saved.updated_at };
      });
      setNotes((items) => items.map((item) => (item.id === saved.id ? { ...item, ...saved } : item)));

      // If more typing occurred while saving was in-flight, save the pending updates immediately
      if (pendingUpdateRef.current && pendingUpdateRef.current.id === saved.id) {
        const next = pendingUpdateRef.current;
        pendingUpdateRef.current = null;
        await executeSave(next.id, next.title, next.content, saved.version, 0);
        return;
      }

      setSaveState("saved");
      setError(undefined);
    } catch (cause: unknown) {
      // If version conflict occurred, fetch latest note version and retry silently (up to 3 times)
      // @ts-expect-error status check
      const isConflict = cause?.status === 409 || (cause instanceof Error && cause.message.toLowerCase().includes("conflict"));
      if (isConflict && retryCount < 3) {
        try {
          const fresh = await notesService.get(noteId);
          setActive((curr) => (curr && curr.id === noteId ? { ...curr, version: fresh.version } : curr));
          const latestContent = pendingUpdateRef.current?.content ?? content;
          const latestTitle = pendingUpdateRef.current?.title ?? title;
          pendingUpdateRef.current = null;
          await executeSave(noteId, latestTitle, latestContent, fresh.version, retryCount + 1);
          return;
        } catch {
          // If recovery fails, fall through to error state
        }
      }
      setSaveState("error");
      setError(cause instanceof Error ? cause.message : "Could not save changes.");
    } finally {
      isSavingRef.current = false;
    }
  };

  const persist = (next: Note) => {
    if (timer.current) clearTimeout(timer.current);
    pendingUpdateRef.current = { id: next.id, title: next.title, content: next.content };
    setSaveState("saving");

    timer.current = setTimeout(() => {
      if (isSavingRef.current) {
        // A save is already in-flight; when it completes, it will automatically process pendingUpdateRef
        return;
      }
      const pending = pendingUpdateRef.current;
      if (pending) {
        pendingUpdateRef.current = null;
        void executeSave(pending.id, pending.title, pending.content, next.version);
      }
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
        /* Authenticated User Detail & Sign Out Footer */
        <div className="mt-4 pt-3 border-t border-border/70 space-y-2">
          {/* User Profile Card with Notification Icon (Screenshot 4) */}
          <div className="relative">
            <div className="flex items-center justify-between gap-2 rounded-xl bg-white p-2.5 border border-border/80 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/15 text-accent font-semibold text-xs border border-accent/25">
                  {currentUser?.name
                    ? currentUser.name.slice(0, 2).toUpperCase()
                    : currentUser?.email
                    ? currentUser.email.slice(0, 2).toUpperCase()
                    : "U"}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {currentUser?.name || currentUser?.email?.split("@")[0] || "My Workspace"}
                  </p>
                  <p className="text-[10px] text-muted truncate">
                    {currentUser?.email || "Google Account"}
                  </p>
                </div>
              </div>

              {/* Notification Bell with Badge & Dropdown */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`relative grid size-8 place-items-center rounded-full border border-border/80 text-stone-700 transition cursor-pointer ${
                    showNotifications ? "bg-cream ring-2 ring-accent/20" : "bg-cream/40 hover:bg-cream"
                  }`}
                  title="Notifications"
                  aria-label="View notifications"
                >
                  <Bell size={15} />
                  {notifications.some((n) => n.unread) && (
                    <span className="absolute top-1 right-1 size-2 rounded-full bg-amber-500 ring-2 ring-white" />
                  )}
                </button>

                {/* Notifications Popover Dropdown */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      className="absolute bottom-full right-0 mb-2 w-64 rounded-xl border border-border/90 bg-white p-3 text-stone-800 shadow-xl backdrop-blur-md z-50"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-border/60">
                        <span className="text-xs font-semibold text-foreground">Notifications</span>
                        <button
                          type="button"
                          onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))}
                          className="flex items-center gap-1 text-[10px] text-muted hover:text-foreground transition cursor-pointer"
                        >
                          <CheckCheck size={11} />
                          <span>Mark read</span>
                        </button>
                      </div>
                      <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-2 rounded-lg text-left ${n.unread ? "bg-amber-50/70 border border-amber-100" : "hover:bg-cream/40"}`}
                          >
                            <p className="text-xs font-medium text-foreground">{n.title}</p>
                            <p className="text-[10px] text-muted leading-tight mt-0.5">{n.description}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => void logout()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-cream transition cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign out</span>
          </motion.button>
        </div>
      )}
    </aside>
  );

  return (
    <main className="h-[100dvh] overflow-hidden bg-background md:p-4">
      <section className="grid h-full overflow-hidden bg-card md:grid-cols-[280px_minmax(0,1fr)] md:rounded-lg md:border md:border-border">
        {/* Desktop Sidebar */}
        <div className="hidden border-r border-border md:block">{sidebar}</div>

        {/* Mobile Slide-over Sidebar with z-[100] to prevent any rich text toolbar overlap */}
        <AnimatePresence>
          {sidebarOpen && (
            <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-xs md:hidden">
              <div
                className="absolute inset-0"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar overlay"
              />
              <motion.div
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                className="relative z-[101] h-full w-[min(86vw,320px)] bg-[#fcfbf8] shadow-2xl overflow-y-auto"
              >
                {sidebar}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Note Canvas */}
        <section className="flex min-h-0 min-w-0 flex-col">
          {/* Header Masthead */}
          <header className="flex h-14 sm:h-16 shrink-0 items-center justify-between border-b border-border px-3 sm:px-8 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button
                className="p-1.5 md:hidden text-muted hover:text-foreground shrink-0 cursor-pointer"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu size={20} />
              </button>

              {/* On mobile: compact title input directly in header */}
              {active && (
                <div className="block md:hidden flex-1 min-w-0 pr-1">
                  <input
                    value={active.title}
                    onChange={(event) => edit("title", event.target.value)}
                    placeholder="Untitled Note"
                    className="w-full text-sm font-semibold truncate bg-transparent outline-none text-foreground border-b border-transparent focus:border-border/60 py-0.5"
                    aria-label="Note title"
                  />
                </div>
              )}

              {/* Morphing Auto-Save Status: Minimal Icon on Mobile, Full on Desktop */}
              <div className="flex items-center shrink-0">
                <AnimatePresence mode="wait">
                  {saveState === "saving" ? (
                    <motion.div
                      key="saving"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      title="Saving..."
                      className="flex items-center gap-1.5 rounded-full bg-cream px-2 py-1 sm:px-3 text-xs text-muted"
                    >
                      <Loader2 size={13} className="animate-spin text-accent shrink-0" />
                      <span className="hidden sm:inline">Saving...</span>
                    </motion.div>
                  ) : saveState === "saved" ? (
                    <motion.div
                      key="saved"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      title="Saved"
                      className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 sm:px-3 text-xs text-emerald-800"
                    >
                      <Check size={13} className="text-emerald-600 shrink-0" />
                      <span className="hidden sm:inline">Saved</span>
                    </motion.div>
                  ) : saveState === "error" ? (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      title="Save error"
                      className="flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-1 sm:px-3 text-xs text-red-700"
                    >
                      <AlertCircle size={13} className="text-red-600 shrink-0" />
                      <span className="hidden sm:inline">Error</span>
                    </motion.div>
                  ) : (
                    <div title="Saved" className="flex items-center gap-1.5 rounded-full bg-cream/50 px-2 py-1 sm:px-3 text-xs text-muted">
                      <Check size={13} className="shrink-0" />
                      <span className="hidden sm:inline">Saved</span>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Guest Live Paired Indicator & Session Countdown */}
              {isGuest && (
                <div className="hidden sm:flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-2.5 py-0.5 text-xs text-emerald-800 font-medium">
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

          {/* Active Note, Loading Skeleton, or Empty State (prevents flash of empty state on initial load) */}
          {!isInitialLoadDone || isLoadingActiveNote || (isGuest && (!active || isCreatingNote)) ? (
            <NoteEditorSkeleton />
          ) : active ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3 sm:px-12 sm:py-8">
              {/* Desktop-only large title (on mobile it is in the top header) */}
              <input
                value={active.title}
                onChange={(event) => edit("title", event.target.value)}
                className="hidden md:block w-full text-3xl font-semibold tracking-tight outline-none text-foreground border-b border-transparent focus:border-border/60 pb-1 mb-2 transition placeholder:text-muted/60"
                aria-label="Note title"
                placeholder="Untitled Note"
              />
              <RichTextEditor
                key={active.id}
                noteId={active.id}
                content={active.content}
                onChange={(value) => edit("content", value)}
                onError={setError}
                isSidebarOpen={sidebarOpen}
                onRegisterSetContent={(setter) => {
                  editorSetContentRef.current = setter;
                }}
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

      {/* Device Connection Limit Modal (Option A: 3 for guest, 5 for account) */}
      <DeviceLimitModal
        isOpen={presence.isLimitReached || guestLimitReached}
        isGuest={isGuest}
        maxDevices={isGuest ? 3 : 5}
        message={presence.limitMessage || guestLimitMessage}
        onRetry={() => {
          setGuestLimitReached(false);
          setGuestLimitMessage(null);
          presence.retry();
          window.location.reload();
        }}
      />

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
