'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Search, 
  Layers, 
  Trash2, 
  FileText, 
  Sparkles, 
  CheckSquare, 
  Square,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { Note } from '@/lib/db';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onDeleteNote: (id: string) => Promise<void>;
  onMergeNotes: (noteIds: string[]) => Promise<void>;
  onViewReport: (note: Note) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  notes,
  onDeleteNote,
  onMergeNotes,
  onViewReport
}) => {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMerging, setIsMerging] = useState(false);

  const filteredNotes = notes.filter(n =>
    n.content.toLowerCase().includes(search.toLowerCase()) ||
    (n.formattedReport && n.formattedReport.toLowerCase().includes(search.toLowerCase())) ||
    (n.tags && n.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
  );

  const toggleSelect = (id: string) => {
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

          {/* Search Bar & Multi-Merge Banner */}
          <div className="p-4 border-b border-slate-100 bg-white space-y-3">
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

            {/* Merge Action Button */}
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
                  <span>Gabung AI Report</span>
                </button>
              </motion.div>
            )}
          </div>

          {/* Note Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Tidak ada catatan ditemukan.
              </div>
            ) : (
              filteredNotes.map(n => {
                const isSelected = selectedIds.includes(n.id);
                return (
                  <div
                    key={n.id}
                    className={`p-3.5 rounded-2xl bg-white border transition-all text-xs space-y-2 relative group ${
                      isSelected ? 'border-indigo-500 ring-2 ring-indigo-100 shadow-sm' : 'border-slate-200/90 shadow-2xs hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => toggleSelect(n.id)}
                        className="flex items-center gap-2 text-slate-700 text-left font-medium line-clamp-2"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 shrink-0 hover:text-slate-500" />
                        )}
                        <span>{n.content}</span>
                      </button>
                      <button
                        onClick={() => onDeleteNote(n.id)}
                        className="text-slate-300 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-all shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(n.createdAt).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {n.formattedReport && (
                        <button
                          onClick={() => onViewReport(n)}
                          className="text-indigo-600 hover:underline font-medium flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" /> Lihat Laporan
                        </button>
                      )}
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
