export interface NoteDTO {
  id: string;
  verseId: string;
  bodyMd: string;
  visibility: 'private' | 'public';
  createdAt: string;
  updatedAt: string;
}
