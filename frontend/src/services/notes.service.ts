import { apiFetch } from "@/lib/api";
import type { Note, NoteListItem } from "@/types/note";

export const notesService = {
  list: () => apiFetch<NoteListItem[]>("/notes"),
  get: (id: string) => apiFetch<Note>(`/notes/${id}`),
  create: () => apiFetch<Note>("/notes", { method: "POST", body: JSON.stringify({}) }),
  update: (id: string, update: { title?: string; content?: string; expected_version: number }) => apiFetch<Note>(`/notes/${id}`, { method: "PATCH", body: JSON.stringify(update) }),
  remove: (id: string) => apiFetch<Note>(`/notes/${id}`, { method: "DELETE" }),
};
