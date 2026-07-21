import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

export interface Note {
  id: string;
  content: string;
  rawAudioTranscript?: string | null;
  formattedReport?: string | null;
  tags: string[];
  category?: string | null;
  isFavorite: boolean;
  isAiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

const LOCAL_STORAGE_FILE = path.join(process.cwd(), '.data_notes.json');

// Memory cache fallback for local development without DB string
let memoryNotesCache: Note[] | null = null;

function loadLocalNotes(): Note[] {
  if (memoryNotesCache) return memoryNotesCache;
  try {
    if (fs.existsSync(LOCAL_STORAGE_FILE)) {
      const data = fs.readFileSync(LOCAL_STORAGE_FILE, 'utf-8');
      memoryNotesCache = JSON.parse(data);
      return memoryNotesCache || [];
    }
  } catch (err) {
    console.error('Failed to read local fallback notes:', err);
  }
  
  // Seed with initial sample notes if empty
  const initialNotes: Note[] = [
    {
      id: 'note_welcome_1',
      content: 'Selamat datang di Chat Voice Notes! 🎙️ Anda dapat merekam suara atau mengetik pesan di sini. Catatan baru akan otomatis tersimpan dalam bentuk bubble chat.',
      tags: ['Petunjuk', 'Selamat Datang'],
      category: 'Umum',
      isFavorite: true,
      isAiGenerated: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'note_welcome_2',
      content: 'Contoh Catatan Rapat: Pembahasan proyek aplikasi berbasis Neon PostgreSQL dan Google Gemini AI. Target selesai dalam minggu ini. Poin penting: 1. Desain clean & modern white theme, 2. Fitur AI report generator, 3. Voice Assistant terintegrasi.',
      formattedReport: `### 📋 Laporan Singkat Proyek
**Topik**: Pembahasan Aplikasi Chat Voice Notes

#### 🎯 Target Utama
- Penyelesaian aplikasi minggu ini
- Integrasi database **Neon PostgreSQL**
- Penggunaan **Google Gemini AI** untuk analisis

#### 📌 Poin Penting
| No | Fitur | Status |
|---|---|---|
| 1 | Desain Clean White Theme | Selesai |
| 2 | AI Report Generator | Aktif |
| 3 | AI Voice Assistant | Aktif |
`,
      tags: ['Meeting', 'Gemini AI', 'NeonDB'],
      category: 'Pekerjaan',
      isFavorite: false,
      isAiGenerated: true,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString()
    }
  ];
  
  saveLocalNotes(initialNotes);
  return initialNotes;
}

function saveLocalNotes(notes: Note[]): void {
  memoryNotesCache = notes;
  try {
    fs.writeFileSync(LOCAL_STORAGE_FILE, JSON.stringify(notes, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write local fallback notes:', err);
  }
}

// Check database connection string
const dbUrl = process.env.DATABASE_URL;
let sqlClient: ReturnType<typeof neon> | null = null;

if (dbUrl && dbUrl.trim() !== '' && !dbUrl.includes('your_password')) {
  sqlClient = neon(dbUrl);
}

// Table initialization for Neon
let tableInitialized = false;
async function ensureNeonTable() {
  if (!sqlClient || tableInitialized) return;
  try {
    await sqlClient`
      CREATE TABLE IF NOT EXISTS notes (
        id VARCHAR(255) PRIMARY KEY,
        content TEXT NOT NULL,
        raw_audio_transcript TEXT,
        formatted_report TEXT,
        tags JSONB DEFAULT '[]'::jsonb,
        category VARCHAR(100),
        is_favorite BOOLEAN DEFAULT FALSE,
        is_ai_generated BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    tableInitialized = true;
  } catch (error) {
    console.warn('Neon database init warning (falling back to local storage if needed):', error);
  }
}

export async function getNotes(): Promise<{ notes: Note[]; isNeon: boolean }> {
  if (sqlClient) {
    try {
      await ensureNeonTable();
      const rows = await sqlClient`
        SELECT id, content, raw_audio_transcript, formatted_report, tags, category, is_favorite, is_ai_generated, created_at, updated_at
        FROM notes
        ORDER BY created_at ASC;
      `;
      
      const notes: Note[] = (rows as any[]).map((r: any) => ({
        id: r.id,
        content: r.content,
        rawAudioTranscript: r.raw_audio_transcript,
        formattedReport: r.formatted_report,
        tags: Array.isArray(r.tags) ? r.tags : (typeof r.tags === 'string' ? JSON.parse(r.tags) : []),
        category: r.category,
        isFavorite: Boolean(r.is_favorite),
        isAiGenerated: Boolean(r.is_ai_generated),
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString()
      }));

      return { notes, isNeon: true };
    } catch (err) {
      console.warn('Error reading from Neon DB, switching to local store fallback:', err);
    }
  }

  return { notes: loadLocalNotes(), isNeon: false };
}

export async function createNote(data: {
  content: string;
  rawAudioTranscript?: string | null;
  formattedReport?: string | null;
  tags?: string[];
  category?: string | null;
  isAiGenerated?: boolean;
}): Promise<Note> {
  const newNote: Note = {
    id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    content: data.content,
    rawAudioTranscript: data.rawAudioTranscript || null,
    formattedReport: data.formattedReport || null,
    tags: data.tags || ['Umum'],
    category: data.category || 'Umum',
    isFavorite: false,
    isAiGenerated: Boolean(data.isAiGenerated),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (sqlClient) {
    try {
      await ensureNeonTable();
      await sqlClient`
        INSERT INTO notes (id, content, raw_audio_transcript, formatted_report, tags, category, is_favorite, is_ai_generated, created_at, updated_at)
        VALUES (${newNote.id}, ${newNote.content}, ${newNote.rawAudioTranscript}, ${newNote.formattedReport}, ${JSON.stringify(newNote.tags)}, ${newNote.category}, ${newNote.isFavorite}, ${newNote.isAiGenerated}, ${newNote.createdAt}, ${newNote.updatedAt});
      `;
      return newNote;
    } catch (err) {
      console.warn('Error inserting into Neon DB, writing to local fallback:', err);
    }
  }

  const notes = loadLocalNotes();
  notes.push(newNote);
  saveLocalNotes(notes);
  return newNote;
}

export async function updateNote(id: string, updates: Partial<Note>): Promise<Note | null> {
  if (sqlClient) {
    try {
      await ensureNeonTable();
      if (updates.formattedReport !== undefined) {
        await sqlClient`
          UPDATE notes SET formatted_report = ${updates.formattedReport}, updated_at = NOW() WHERE id = ${id};
        `;
      }
      if (updates.content !== undefined) {
        await sqlClient`
          UPDATE notes SET content = ${updates.content}, updated_at = NOW() WHERE id = ${id};
        `;
      }
      if (updates.isFavorite !== undefined) {
        await sqlClient`
          UPDATE notes SET is_favorite = ${updates.isFavorite}, updated_at = NOW() WHERE id = ${id};
        `;
      }
    } catch (err) {
      console.warn('Neon DB update error, applying locally:', err);
    }
  }

  const notes = loadLocalNotes();
  const idx = notes.findIndex(n => n.id === id);
  if (idx !== -1) {
    notes[idx] = { ...notes[idx], ...updates, updatedAt: new Date().toISOString() };
    saveLocalNotes(notes);
    return notes[idx];
  }
  return null;
}

export async function deleteNote(id: string): Promise<boolean> {
  if (sqlClient) {
    try {
      await ensureNeonTable();
      await sqlClient`DELETE FROM notes WHERE id = ${id};`;
    } catch (err) {
      console.warn('Neon DB delete error, deleting locally:', err);
    }
  }

  const notes = loadLocalNotes();
  const filtered = notes.filter(n => n.id !== id);
  saveLocalNotes(filtered);
  return true;
}
