"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FilePlus2, LogOut, Menu, NotebookPen, Search, Trash2, X, Check, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { notesService } from "@/services/notes.service";
import type { Note, NoteListItem } from "@/types/note";
import { RichTextEditor } from "@/features/notes/RichTextEditor";
import { motion, AnimatePresence } from "motion/react";

type SaveState = "idle" | "saving" | "saved" | "error";

export function NotesWorkspace() {
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [active, setActive] = useState<Note>();
  const [query, setQuery] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string>();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout>>();
  const activeRef = useRef<Note>();
  activeRef.current = active;

  const load = useCallback(async () => {
    try {
      const list = await notesService.list();
      setNotes(list);
      if (list[0]) setActive(await notesService.get(list[0].id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load notes.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const select = async (id: string) => {
    try {
      setActive(await notesService.get(id));
      setSidebarOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to open note.");
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
    try {
      const note = await notesService.create();
      setNotes((items) => [note, ...items]);
      setActive(note);
      setSidebarOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create note.");
    }
  };

  const remove = async () => {
    if (!active || !confirm("Delete this note?")) return;
    try {
      await notesService.remove(active.id);
      const remaining = notes.filter((note) => note.id !== active.id);
      setNotes(remaining);
      setActive(remaining[0] ? await notesService.get(remaining[0].id) : undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete note.");
    }
  };

  const logout = async () => {
    try {
      await apiFetch<void>("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("copysync_token");
      }
      location.assign("/login");
    }
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

      {/* New Note Button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => void create()}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-sm bg-accent py-2.5 text-sm font-medium text-white shadow-xs transition hover:bg-accent/90"
      >
        <FilePlus2 size={16} />
        <span>New note</span>
      </motion.button>

      {/* Search Bar */}
      <label className="mt-4 flex items-center gap-2 rounded-sm border border-border bg-white px-3 py-2 transition focus-within:border-accent">
        <Search size={15} className="text-muted shrink-0" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted"
          placeholder="Search notes…"
        />
      </label>

      {/* Notes List with Smooth Layout Transitions */}
      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {filteredNotes.map((note) => {
            const isSelected = active?.id === note.id;
            return (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, height: 0, y: -6 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="relative"
              >
                <button
                  onClick={() => void select(note.id)}
                  className={`relative z-10 w-full rounded-sm px-3 py-2.5 text-left transition ${
                    isSelected ? "text-foreground font-medium" : "text-muted hover:text-foreground hover:bg-cream/40"
                  }`}
                >
                  <span className="block truncate text-sm">{note.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    Edited {new Date(note.updated_at).toLocaleDateString()}
                  </span>
                </button>

                {/* Gliding selection pill */}
                {isSelected && (
                  <motion.div
                    layoutId="active-note-indicator"
                    className="absolute inset-0 rounded-sm bg-cream border border-border/60"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredNotes.length === 0 && (
          <div className="py-8 text-center text-xs text-muted">
            {query ? "No notes matching your search" : "No notes yet"}
          </div>
        )}
      </nav>

      {/* Sign Out Button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => void logout()}
        className="mt-4 flex w-full items-center gap-2 rounded-sm border border-border bg-white px-3 py-2.5 text-sm font-medium text-muted hover:text-foreground hover:bg-cream transition"
      >
        <LogOut size={16} />
        <span>Sign out</span>
      </motion.button>
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
                      className="inline-flex items-center gap-1.5 rounded-full bg-cream/60 px-2.5 py-1 text-xs font-medium text-accent border border-border/60"
                    >
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="size-3 rounded-full border-2 border-accent border-t-transparent"
                      />
                      <span>Saving…</span>
                    </motion.div>
                  ) : saveState === "error" ? (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 border border-red-200"
                    >
                      <AlertCircle size={13} className="text-red-600" />
                      <span>Not saved</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="saved"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50/70 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200/50"
                    >
                      <Check size={13} className="text-emerald-600" />
                      <span>All changes saved</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={!active}
              onClick={() => void remove()}
              className="p-2 text-muted hover:text-red-600 disabled:invisible transition"
              title="Delete note"
            >
              <Trash2 size={18} />
            </motion.button>
          </header>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-4 mt-4 rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </motion.p>
          )}

          {/* Active Note or Empty State */}
          {active ? (
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
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => void create()}
                  className="mt-5 inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-accent/90 transition"
                >
                  <FilePlus2 size={16} />
                  <span>Create a note</span>
                </motion.button>
              </motion.div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
