import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

export type DerivedOutputKind =
  | 'report'
  | 'paraphrase-formal'
  | 'paraphrase-concise'
  | 'paraphrase-bullet';

export interface DerivedOutput {
  id: string;
  kind: DerivedOutputKind;
  label: string;
  content: string;
  createdAt: string;
}

export interface Note {
  id: string;
  content: string;
  rawAudioTranscript?: string | null;
  formattedReport?: string | null;
  derivedOutputs?: DerivedOutput[];
  tags: string[];
  category?: string | null;
  folder?: string | null;
  isFavorite: boolean;
  isAiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

function parseJsonArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string' && value.trim() !== '') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

const LOCAL_STORAGE_FILE = path.join(process.cwd(), '.data_notes.json');
const LOCAL_FOLDERS_TAGS_FILE = path.join(process.cwd(), '.data_folders_tags.json');

// Memory cache fallback for local development without DB string
let memoryNotesCache: Note[] | null = null;
let memoryFoldersCache: Folder[] | null = null;
let memoryTagsCache: Tag[] | null = null;

function loadLocalFoldersAndTags(): { folders: Folder[]; tags: Tag[] } {
  if (memoryFoldersCache && memoryTagsCache) {
    return { folders: memoryFoldersCache, tags: memoryTagsCache };
  }
  try {
    if (fs.existsSync(LOCAL_FOLDERS_TAGS_FILE)) {
      const data = fs.readFileSync(LOCAL_FOLDERS_TAGS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      memoryFoldersCache = parsed.folders || [];
      memoryTagsCache = parsed.tags || [];
      return { folders: memoryFoldersCache!, tags: memoryTagsCache! };
    }
  } catch (err) {
    console.error('Failed to read local folders/tags file:', err);
  }

  const defaultFolders: Folder[] = ['Umum', 'Pekerjaan', 'Pribadi', 'Ide', 'Meeting'].map((name, i) => ({
    id: `folder_seed_${i + 1}`,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  const defaultTags: Tag[] = ['Petunjuk', 'Selamat Datang', 'Catatan', 'Meeting', 'Gemini AI', 'NeonDB'].map((name, i) => ({
    id: `tag_seed_${i + 1}`,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  saveLocalFoldersAndTags(defaultFolders, defaultTags);
  return { folders: defaultFolders, tags: defaultTags };
}

function saveLocalFoldersAndTags(folders: Folder[], tags: Tag[]): void {
  memoryFoldersCache = folders;
  memoryTagsCache = tags;
  try {
    fs.writeFileSync(LOCAL_FOLDERS_TAGS_FILE, JSON.stringify({ folders, tags }, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write local folders/tags file:', err);
  }
}

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
      content: 'Selamat datang di Catatan Suara! 🎙️ Anda dapat merekam suara atau mengetik pesan di sini. Catatan baru akan otomatis tersimpan.',
      tags: ['Petunjuk'],
      category: 'Umum',
      folder: 'Umum',
      isFavorite: true,
      isAiGenerated: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'note_welcome_2',
      content: 'Catatan Rapat Proyek: Pembahasan fitur aplikasi pencatat suara. Target selesai minggu ini. Poin penting: 1. Tampilan bersih dan modern, 2. Pengelompokkan folder catatan, 3. Ekspor laporan PDF.',
      formattedReport: `### 📋 Laporan Singkat Proyek
**Topik**: Pembahasan Aplikasi Catatan Suara

#### 🎯 Target Utama
- Penyelesaian fitur minggu ini
- Pengelompokkan folder catatan
- Fitur ekspor laporan PDF

#### 📌 Poin Penting
- Tampilan bersih & modern
- Mode ringkas pada room chat
`,
      tags: ['Meeting', 'Proyek'],
      category: 'Pekerjaan',
      folder: 'Pekerjaan',
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
        folder VARCHAR(100) DEFAULT 'Umum',
        is_favorite BOOLEAN DEFAULT FALSE,
        is_ai_generated BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    // Ensure the folder column exists if the table was created earlier without it
    await sqlClient`
      ALTER TABLE notes ADD COLUMN IF NOT EXISTS folder VARCHAR(100) DEFAULT 'Umum';
    `;
    // Ensure the derived_outputs column exists (paraphrase / report results)
    await sqlClient`
      ALTER TABLE notes ADD COLUMN IF NOT EXISTS derived_outputs JSONB DEFAULT '[]'::jsonb;
    `;
    
    // Create folders table
    await sqlClient`
      CREATE TABLE IF NOT EXISTS folders (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    // Create tags table
    await sqlClient`
      CREATE TABLE IF NOT EXISTS tags (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Seed folders if empty
    const foldersCount = (await sqlClient`SELECT COUNT(*) as count FROM folders;`) as any[];
    if (foldersCount && foldersCount[0] && parseInt(foldersCount[0].count, 10) === 0) {
      const defaultFolders = ['Umum', 'Pekerjaan', 'Pribadi', 'Ide', 'Meeting'];
      for (const f of defaultFolders) {
        const id = `folder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await sqlClient`
          INSERT INTO folders (id, name) VALUES (${id}, ${f}) ON CONFLICT DO NOTHING;
        `;
      }
    }

    // Seed tags if empty
    const tagsCount = (await sqlClient`SELECT COUNT(*) as count FROM tags;`) as any[];
    if (tagsCount && tagsCount[0] && parseInt(tagsCount[0].count, 10) === 0) {
      const defaultTags = ['Petunjuk', 'Selamat Datang', 'Catatan', 'Meeting', 'Gemini AI', 'NeonDB'];
      for (const t of defaultTags) {
        const id = `tag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await sqlClient`
          INSERT INTO tags (id, name) VALUES (${id}, ${t}) ON CONFLICT DO NOTHING;
        `;
      }
    }

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
        SELECT id, content, raw_audio_transcript, formatted_report, derived_outputs, tags, category, folder, is_favorite, is_ai_generated, created_at, updated_at
        FROM notes
        ORDER BY created_at ASC;
      `;

      const notes: Note[] = (rows as any[]).map((r: any) => ({
        id: r.id,
        content: r.content,
        rawAudioTranscript: r.raw_audio_transcript,
        formattedReport: r.formatted_report,
        derivedOutputs: parseJsonArray<DerivedOutput>(r.derived_outputs),
        tags: Array.isArray(r.tags) ? r.tags : (typeof r.tags === 'string' ? JSON.parse(r.tags) : []),
        category: r.category || r.folder || 'Umum',
        folder: r.folder || r.category || 'Umum',
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

  const local = loadLocalNotes().slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return { notes: local, isNeon: false };
}

export async function createNote(data: {
  content: string;
  rawAudioTranscript?: string | null;
  formattedReport?: string | null;
  tags?: string[];
  category?: string | null;
  folder?: string | null;
  isAiGenerated?: boolean;
}): Promise<Note> {
  const chosenFolder = data.folder || data.category || 'Umum';
  const newNote: Note = {
    id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    content: data.content,
    rawAudioTranscript: data.rawAudioTranscript || null,
    formattedReport: data.formattedReport || null,
    derivedOutputs: [],
    tags: data.tags || ['Catatan'],
    category: chosenFolder,
    folder: chosenFolder,
    isFavorite: false,
    isAiGenerated: Boolean(data.isAiGenerated),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (sqlClient) {
    try {
      await ensureNeonTable();
      await sqlClient`
        INSERT INTO notes (id, content, raw_audio_transcript, formatted_report, derived_outputs, tags, category, folder, is_favorite, is_ai_generated, created_at, updated_at)
        VALUES (${newNote.id}, ${newNote.content}, ${newNote.rawAudioTranscript}, ${newNote.formattedReport}, ${JSON.stringify(newNote.derivedOutputs || [])}::jsonb, ${JSON.stringify(newNote.tags)}, ${newNote.category}, ${newNote.folder}, ${newNote.isFavorite}, ${newNote.isAiGenerated}, ${newNote.createdAt}, ${newNote.updatedAt});
      `;
      return newNote;
    } catch (err) {
      console.warn('Error inserting into Neon DB, writing to local fallback:', err);
    }
  }

  const notes = loadLocalNotes();
  notes.unshift(newNote);
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
      if (updates.folder !== undefined) {
        await sqlClient`
          UPDATE notes SET folder = ${updates.folder}, category = ${updates.folder}, updated_at = NOW() WHERE id = ${id};
        `;
      }
      if (updates.tags !== undefined) {
        await sqlClient`
          UPDATE notes SET tags = ${JSON.stringify(updates.tags)}::jsonb, updated_at = NOW() WHERE id = ${id};
        `;
      }
      if (updates.derivedOutputs !== undefined) {
        await sqlClient`
          UPDATE notes SET derived_outputs = ${JSON.stringify(updates.derivedOutputs)}::jsonb, updated_at = NOW() WHERE id = ${id};
        `;
      }

      const rows = (await sqlClient`
        SELECT id, content, raw_audio_transcript, formatted_report, derived_outputs, tags, category, folder, is_favorite, is_ai_generated, created_at, updated_at
        FROM notes
        WHERE id = ${id};
      `) as any[];

      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id,
          content: r.content,
          rawAudioTranscript: r.raw_audio_transcript,
          formattedReport: r.formatted_report,
          derivedOutputs: parseJsonArray<DerivedOutput>(r.derived_outputs),
          tags: Array.isArray(r.tags) ? r.tags : (typeof r.tags === 'string' ? JSON.parse(r.tags) : []),
          category: r.category || r.folder || 'Umum',
          folder: r.folder || r.category || 'Umum',
          isFavorite: Boolean(r.is_favorite),
          isAiGenerated: Boolean(r.is_ai_generated),
          createdAt: new Date(r.created_at).toISOString(),
          updatedAt: new Date(r.updated_at).toISOString()
        };
      }
    } catch (err) {
      console.warn('Neon DB update error, applying locally:', err);
    }
  }

  const notes = loadLocalNotes();
  const idx = notes.findIndex(n => n.id === id);
  if (idx !== -1) {
    // Only apply fields that were explicitly provided (ignore undefined) so a
    // partial PATCH does not wipe unrelated columns in local-storage mode.
    const definedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    ) as Partial<Note>;
    const updatedFolder = definedUpdates.folder || definedUpdates.category || notes[idx].folder || 'Umum';
    notes[idx] = {
      ...notes[idx],
      ...definedUpdates,
      folder: updatedFolder,
      category: updatedFolder,
      updatedAt: new Date().toISOString()
    };
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

// --- Folder CRUD ---
export async function getFolders(): Promise<Folder[]> {
  if (sqlClient) {
    try {
      await ensureNeonTable();
      const rows = await sqlClient`
        SELECT id, name, created_at, updated_at
        FROM folders
        ORDER BY name ASC;
      `;
      return (rows as any[]).map(r => ({
        id: r.id,
        name: r.name,
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString()
      }));
    } catch (err) {
      console.warn('Error reading folders from Neon DB, using local store:', err);
    }
  }
  return loadLocalFoldersAndTags().folders;
}

export async function createFolder(name: string): Promise<Folder> {
  const newFolder: Folder = {
    id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (sqlClient) {
    try {
      await ensureNeonTable();
      await sqlClient`
        INSERT INTO folders (id, name, created_at, updated_at)
        VALUES (${newFolder.id}, ${newFolder.name}, ${newFolder.createdAt}, ${newFolder.updatedAt});
      `;
      return newFolder;
    } catch (err) {
      console.warn('Error creating folder in Neon DB, writing to local fallback:', err);
    }
  }

  const { folders, tags } = loadLocalFoldersAndTags();
  if (!folders.some(f => f.name.toLowerCase() === name.toLowerCase())) {
    folders.push(newFolder);
    saveLocalFoldersAndTags(folders, tags);
  }
  return newFolder;
}

export async function updateFolder(id: string, newName: string): Promise<Folder | null> {
  let oldName: string | null = null;

  if (sqlClient) {
    try {
      await ensureNeonTable();
      // Get old name
      const rows = (await sqlClient`SELECT name FROM folders WHERE id = ${id};`) as any[];
      if (rows && rows.length > 0) {
        oldName = rows[0].name;
        // Update folder name
        await sqlClient`
          UPDATE folders 
          SET name = ${newName}, updated_at = NOW() 
          WHERE id = ${id};
        `;
        // Update all notes with this folder name
        if (oldName) {
          await sqlClient`
            UPDATE notes 
            SET folder = ${newName}, category = ${newName}, updated_at = NOW() 
            WHERE folder = ${oldName};
          `;
        }
      }
    } catch (err) {
      console.warn('Neon DB folder update error, applying locally:', err);
    }
  }

  const { folders, tags } = loadLocalFoldersAndTags();
  const idx = folders.findIndex(f => f.id === id);
  if (idx !== -1) {
    const oldLocalName = folders[idx].name;
    folders[idx] = { ...folders[idx], name: newName, updatedAt: new Date().toISOString() };
    saveLocalFoldersAndTags(folders, tags);

    // Update notes locally
    const notes = loadLocalNotes();
    let updatedNotesCount = 0;
    notes.forEach(note => {
      if (note.folder === oldLocalName) {
        note.folder = newName;
        note.category = newName;
        note.updatedAt = new Date().toISOString();
        updatedNotesCount++;
      }
    });
    if (updatedNotesCount > 0) {
      saveLocalNotes(notes);
    }

    return folders[idx];
  }
  return null;
}

export async function deleteFolder(id: string): Promise<boolean> {
  let folderName: string | null = null;

  if (sqlClient) {
    try {
      await ensureNeonTable();
      // Get name before delete
      const rows = (await sqlClient`SELECT name FROM folders WHERE id = ${id};`) as any[];
      if (rows && rows.length > 0) {
        folderName = rows[0].name;
        // Delete folder
        await sqlClient`DELETE FROM folders WHERE id = ${id};`;
        // Move notes in this folder to 'Umum'
        if (folderName) {
          await sqlClient`
            UPDATE notes 
            SET folder = 'Umum', category = 'Umum', updated_at = NOW() 
            WHERE folder = ${folderName};
          `;
        }
      }
      return true;
    } catch (err) {
      console.warn('Neon DB folder delete error, applying locally:', err);
    }
  }

  const { folders, tags } = loadLocalFoldersAndTags();
  const folderToDelete = folders.find(f => f.id === id);
  if (folderToDelete) {
    const nameToDelete = folderToDelete.name;
    const filteredFolders = folders.filter(f => f.id !== id);
    saveLocalFoldersAndTags(filteredFolders, tags);

    // Update notes locally
    const notes = loadLocalNotes();
    let updatedNotesCount = 0;
    notes.forEach(note => {
      if (note.folder === nameToDelete) {
        note.folder = 'Umum';
        note.category = 'Umum';
        note.updatedAt = new Date().toISOString();
        updatedNotesCount++;
      }
    });
    if (updatedNotesCount > 0) {
      saveLocalNotes(notes);
    }
    return true;
  }
  return false;
}
