export type VerseKey = `${number}:${number}`
export type NoteValue = { text: string; updatedAt: string }
export type NotesMap = Record<VerseKey, NoteValue>
export type BookmarksSet = Record<VerseKey, true>
