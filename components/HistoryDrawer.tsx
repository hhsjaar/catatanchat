'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Search, 
  Trash2, 
  FileText, 
  Sparkles, 
  CheckSquare, 
  Square,
  RefreshCw,
  Calendar,
  Folder,
  ChevronRight,
  Mic,
  FolderOpen
} from 'lucide-react';
import { Note } from '@/lib/db';
import { stripWaMarkup } from '@/lib/waFormat';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onDeleteNote: (id: string) => Promise<void>;
  onMergeNotes: (noteIds: string[]) => Promise<void>;
  onOpenDetailNote: (note: Note) => void;
  folders: string[];
  onUpdateFolder?: (noteId: string, newFolder: string) => Promise<void>;
  onOpenFolderManager?: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  notes,
  onDeleteNote,
  onMergeNotes,
  onOpenDetailNote,
  folders,
  onUpdateFolder,
  onOpenFolderManager
}) => {
  const [search, setSearch] = useState('');
  const [activeFolderTab, setActiveFolderTab] = useState('Semua');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMerging, setIsMerging] = useState(false);

  const folderTabs = ['Semua', ...folders];

  const filteredNotes = notes
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter(n => {
      const matchesSearch = 
        n.content.toLowerCase().includes(search.toLowerCase()) ||
        (n.formattedReport && n.formattedReport.toLowerCase().includes(search.toLowerCase())) ||
        (n.folder && n.folder.toLowerCase().includes(search.toLowerCase()));

      const noteFolder = n.folder || n.category || 'Umum';
      const matchesFolder = activeFolderTab === 'Semua' || noteFolder === activeFolderTab;

      return matchesSearch && matchesFolder;
    });

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleMergeAction = async () => {
    if (selectedIds.length < 2 || isMerging) return;
    setIsMerging(true);
    try {
      await onMergeNotes(selectedIds);
      setSelectedIds([]);
      onClose();
    } finally {
      setIsMerging(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" /> Riwayat Catatan
              </h2>
              <p className="text-xs text-slate-500">{notes.length} total catatan tersimpan</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Folder Tabs & Search Bar */}
          <div className="p-4 border-b border-slate-100 bg-white space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari kata kunci catatan..."
                className="w-full pl-9 pr-4 py-2 bg-slate-100 focus:bg-white text-slate-900 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Folder Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {folderTabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveFolderTab(tab)}
                  className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-all border ${
                    activeFolderTab === tab
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200/70'
                  }`}
                >
                  {tab}
                </button>
              ))}

              {onOpenFolderManager && (
                <button
                  onClick={onOpenFolderManager}
                  className="px-2.5 py-1 rounded-full font-semibold whitespace-nowrap transition-all text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1 shrink-0"
                  title="Kelola & Tambah Folder"
                >
                  <FolderOpen className="w-3 h-3" />
                  <span>+ Kelola</span>
                </button>
              )}
            </div>

            {/* Multi-Merge Action Banner */}
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 flex items-center justify-between text-xs text-indigo-900"
              >
                <span className="font-semibold">{selectedIds.length} catatan dipilih</span>
                <button
                  onClick={handleMergeAction}
                  disabled={selectedIds.length < 2 || isMerging}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50"
                >
                  {isMerging ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Gabung Laporan</span>
                </button>
              </motion.div>
            )}
          </div>

          {/* Note Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Tidak ada catatan ditemukan pada folder "{activeFolderTab}".
              </div>
            ) : (
              filteredNotes.map(n => {
                const isSelected = selectedIds.includes(n.id);
                return (
                  <div
                    key={n.id}
                    onClick={() => onOpenDetailNote(n)}
                    className={`p-3.5 rounded-2xl bg-white border transition-all text-xs space-y-2 relative group cursor-pointer hover:shadow-md ${
                      isSelected ? 'border-indigo-500 ring-2 ring-indigo-100 shadow-sm' : 'border-slate-200/90 shadow-2xs hover:border-indigo-300'
                    }`}
                  >
                    {/* Header Row: Checkbox, Folder, Time */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => toggleSelect(n.id, e)}
                          className="p-0.5 text-slate-400 hover:text-indigo-600"
                          title="Pilih untuk digabungkan"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 shrink-0 hover:text-slate-500" />
                          )}
                        </button>
                        <span 
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-indigo-100 transition-colors"
                        >
                          <Folder className="w-3 h-3 text-indigo-600 shrink-0" />
                          {onUpdateFolder && folders.length > 0 ? (
                            <select
                              value={n.folder || n.category || 'Umum'}
                              onChange={async (e) => {
                                e.stopPropagation();
                                await onUpdateFolder(n.id, e.target.value);
                              }}
                              className="bg-transparent border-none outline-none cursor-pointer text-indigo-700 font-semibold py-0 pr-0.5 text-[10px]"
                              title="Pindah Folder"
                            >
                              {folders.map(f => (
                                <option key={f} value={f} className="text-slate-900 bg-white font-medium">{f}</option>
                              ))}
                            </select>
                          ) : (
                            <span>{n.folder || n.category || 'Umum'}</span>
                          )}
                        </span>
                        {n.rawAudioTranscript && (
                          <span className="text-[10px] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded-full font-medium border border-violet-100 flex items-center gap-0.5">
                            <Mic className="w-2.5 h-2.5" /> Suara
                          </span>
                        )}
                      </div>

                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await onDeleteNote(n.id);
                        }}
                        className="text-slate-300 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-all shrink-0"
                        title="Hapus Catatan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Note Content Preview */}
                    <p className="text-slate-800 font-medium line-clamp-4 leading-relaxed whitespace-pre-wrap">
                      {stripWaMarkup(n.content)}
                    </p>

                    {/* Bottom Metadata & Detail Arrow */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-100">
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(n.createdAt).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="flex items-center gap-1 text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                        <span>Buka</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
