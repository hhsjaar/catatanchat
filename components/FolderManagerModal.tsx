'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Folder, Plus, Trash2, Edit2, Check, AlertCircle, FileText, ChevronDown, ChevronRight, Mic, Sparkles } from 'lucide-react';
import { Folder as FolderType, Note } from '@/lib/db';
import { deriveNoteTitle } from '@/lib/noteTitle';
import { NoteSortOrder, DEFAULT_NOTE_SORT, sortNotes } from '@/lib/noteSort';
import { NoteSortToggle } from '@/components/NoteSortToggle';

interface FolderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderType[];
  notes?: Note[];
  onAddFolder: (name: string) => Promise<void>;
  onEditFolder: (id: string, name: string) => Promise<void>;
  onDeleteFolder: (id: string) => Promise<void>;
  onOpenNote?: (note: Note) => void;
  sortOrder?: NoteSortOrder;
  onChangeSortOrder?: (order: NoteSortOrder) => void;
}

export const FolderManagerModal: React.FC<FolderManagerModalProps> = ({
  isOpen,
  onClose,
  folders,
  notes = [],
  onAddFolder,
  onEditFolder,
  onDeleteFolder,
  onOpenNote,
  sortOrder = DEFAULT_NOTE_SORT,
  onChangeSortOrder
}) => {
  // Inputs are uncontrolled (read via ref on submit). A controlled value that
  // re-renders on every keystroke breaks predictive-text keyboards on Android
  // (words get inserted out of order), so we only track a lightweight flag for
  // the submit button's enabled state.
  const createInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [canCreate, setCanCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const notesInFolder = (folderName: string) =>
    sortNotes(
      notes.filter(n => (n.folder || n.category || 'Umum') === folderName),
      sortOrder
    );

  const getNoteCount = (folderName: string) => notesInFolder(folderName).length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = (createInputRef.current?.value ?? '').trim();
    if (!cleanName) return;
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (folders.some(f => f.name.toLowerCase() === cleanName.toLowerCase())) {
        setErrorMsg('Nama folder sudah digunakan.');
        setIsSubmitting(false);
        return;
      }
      await onAddFolder(cleanName);
      if (createInputRef.current) createInputRef.current.value = '';
      setCanCreate(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (id: string) => {
    setEditingId(id);
    setErrorMsg(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setErrorMsg(null);
  };

  const handleSaveEdit = async (id: string) => {
    const cleanName = (editInputRef.current?.value ?? '').trim();
    if (!cleanName) return;
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const folder = folders.find(f => f.id === id);
      if (folder?.name === cleanName) {
        handleCancelEdit();
        return;
      }
      if (folders.some(f => f.id !== id && f.name.toLowerCase() === cleanName.toLowerCase())) {
        setErrorMsg('Nama folder sudah digunakan.');
        setIsSubmitting(false);
        return;
      }
      await onEditFolder(id, cleanName);
      handleCancelEdit();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setErrorMsg(null);

    if (name === 'Umum') {
      alert('Folder "Umum" adalah default dan tidak dapat dihapus.');
      return;
    }

    const count = getNoteCount(name);
    const confirmMsg = count > 0 
      ? `Apakah Anda yakin ingin menghapus folder "${name}"?\n${count} catatan di dalam folder ini akan dipindahkan ke folder default "Umum".`
      : `Apakah Anda yakin ingin menghapus folder "${name}"?`;

    if (!confirm(confirmMsg)) return;

    setIsSubmitting(true);
    try {
      await onDeleteFolder(id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus folder.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-950 text-base flex items-center gap-2">
                <Folder className="w-5 h-5 text-indigo-600" />
                Kelola Folder Catatan
              </h3>
              <p className="text-xs text-slate-500">{folders.length} folder tersimpan</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Content Body */}
          <div className="p-4 overflow-y-auto flex-1 space-y-4 bg-white min-h-[250px]">
            {/* Create Folder Form */}
            <form onSubmit={handleCreate} className="flex gap-2">
              <input
                ref={createInputRef}
                type="text"
                defaultValue=""
                onChange={e => setCanCreate(e.target.value.trim().length > 0)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="words"
                spellCheck={false}
                placeholder="Buat folder baru..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-indigo-500 outline-none transition-all"
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={!canCreate || isSubmitting}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah</span>
              </button>
            </form>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-2.5 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-700 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {onChangeSortOrder && (
              <NoteSortToggle value={sortOrder} onChange={onChangeSortOrder} />
            )}

            {/* Folders List */}
            <div className="space-y-2">
              {folders.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-400">Belum ada folder.</p>
              ) : (
                folders.map(folder => {
                  const count = getNoteCount(folder.name);
                  const isExpanded = expandedId === folder.id;
                  const folderNotes = isExpanded ? notesInFolder(folder.name) : [];
                  return (
                    <div
                      key={folder.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50/70 text-xs transition-all overflow-hidden"
                    >
                    <div className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-all">
                      {editingId === folder.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            key={folder.id}
                            ref={editInputRef}
                            type="text"
                            defaultValue={folder.name}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="words"
                            spellCheck={false}
                            className="flex-1 px-2.5 py-1.5 bg-white border border-indigo-500 rounded-xl outline-none text-xs text-slate-900"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveEdit(folder.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(folder.id)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Simpan"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="p-1.5 text-slate-400 hover:bg-slate-200/60 rounded-lg transition-all"
                            title="Batal"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : folder.id)}
                            className="flex items-center gap-2 text-slate-800 font-semibold min-w-0 flex-1 text-left"
                            title={isExpanded ? 'Sembunyikan isi folder' : 'Lihat isi folder'}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <Folder className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span className="truncate">{folder.name}</span>
                            {folder.name === 'Umum' && (
                              <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-normal shrink-0">Default</span>
                            )}
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-medium flex items-center gap-1 shrink-0">
                              <FileText className="w-2.5 h-2.5" />
                              {count}
                            </span>
                          </button>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(folder.id)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title="Ubah nama folder"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {folder.name !== 'Umum' && (
                              <button
                                type="button"
                                onClick={() => handleDelete(folder.id, folder.name)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Hapus folder"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-white px-3 py-2 space-y-1.5 max-h-56 overflow-y-auto">
                        {folderNotes.length === 0 ? (
                          <p className="text-center py-4 text-[11px] text-slate-400">Folder ini masih kosong.</p>
                        ) : (
                          folderNotes.map(n => {
                            const title = deriveNoteTitle(n.content);
                            const hasResults =
                              (n.formattedReport && n.formattedReport.trim() !== '' ? 1 : 0) +
                              (n.derivedOutputs?.length ?? 0);
                            return (
                              <button
                                key={n.id}
                                type="button"
                                onClick={() => onOpenNote?.(n)}
                                disabled={!onOpenNote}
                                className="w-full text-left p-2 rounded-xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all group disabled:cursor-default"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[12px] font-semibold text-slate-800 truncate group-hover:text-indigo-800">
                                    {title}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                    {new Date(n.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                  {n.rawAudioTranscript && (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full">
                                      <Mic className="w-2.5 h-2.5" /> Suara
                                    </span>
                                  )}
                                  {hasResults > 0 && (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                                      <Sparkles className="w-2.5 h-2.5" /> {hasResults} hasil
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

