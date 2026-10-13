import type { Note } from '@/lib/db';

/** 'oldest' = catatan lama di atas, baru di bawah (default). */
export type NoteSortOrder = 'oldest' | 'newest';

export const DEFAULT_NOTE_SORT: NoteSortOrder = 'oldest';

export const NOTE_SORT_OPTIONS: { value: NoteSortOrder; label: string }[] = [
  { value: 'oldest', label: 'Lama → Baru' },
  { value: 'newest', label: 'Baru → Lama' }
];

export function sortNotes<T extends Pick<Note, 'createdAt'>>(notes: T[], order: NoteSortOrder): T[] {
  const dir = order === 'newest' ? -1 : 1;
  return notes
    .slice()
    .sort((a, b) => dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
}
