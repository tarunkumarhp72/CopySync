export type NoteListItem = { id: string; title: string; version: number; is_deleted: boolean; created_at: string; updated_at: string };
export type Note = NoteListItem & { content: string };
