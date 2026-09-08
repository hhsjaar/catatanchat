'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileText,
  Copy,
  Check,
  Download,
  Sparkles,
  Volume2,
  Trash2,
  Folder,
  Calendar,
  Mic,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { Note } from '@/lib/db';
import { WhatsAppText } from '@/lib/waFormat';
import { exportToWord, exportToExcel, exportToPDF } from '@/lib/exportUtils';

interface NoteDetailModalProps {
  note: Note | null;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
  onOpenResults?: (id: string) => void;
  folders: string[];
  onUpdateNote?: (id: string, updates: Partial<Note>) => Promise<void>;
}

export const NoteDetailModal: React.FC<NoteDetailModalProps> = ({
  note,
  onClose,
  onDelete,
  onOpenResults,
  folders,
  onUpdateNote,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  if (!note) return null;

  const resultCount =
    (note.formattedReport && note.formattedReport.trim() !== '' ? 1 : 0) +
    (note.derivedOutputs?.length ?? 0);

  const handleCopy = () => {
    navigator.clipboard.writeText(note.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTextToSpeech = () => {
    if ('speechSynthesis' in window) {
      if (isPlayingAudio) {
        window.speechSynthesis.cancel();
        setIsPlayingAudio(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(note.content);
      utterance.lang = 'id-ID';
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      setIsPlayingAudio(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-xl text-xs font-semibold hover:bg-indigo-100/70 transition-colors">
                    <Folder className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="text-[11px] text-indigo-500 font-medium">Folder:</span>
                    <select
                      value={note.folder || 'Umum'}
                      onChange={async (e) => {
                        if (onUpdateNote && note) {
                          await onUpdateNote(note.id, { folder: e.target.value });
                        }
                      }}
                      className="bg-transparent border-none outline-none cursor-pointer text-indigo-800 text-xs font-bold py-0 pr-1"
                      title="Klik untuk pindah folder"
                    >
                      {folders.map(f => (
                        <option key={f} value={f} className="text-slate-900 bg-white font-medium">{f}</option>
                      ))}
                    </select>
                  </div>
                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(note.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base mt-1 line-clamp-1">
                  {note.content.substring(0, 45)}...
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content Body */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-white">
            {/* Raw Audio Indicator */}
            {note.rawAudioTranscript && (
              <div className="p-3 bg-violet-50 rounded-xl border border-violet-100 text-xs text-violet-800 flex items-center gap-2">
                <Mic className="w-4 h-4 text-violet-600 shrink-0" />
                <span>Berasal dari rekaman suara langsung</span>
              </div>
            )}

            {/* Tags / Atribut Section */}
            {note.tags && note.tags.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Atribut / Tag</h4>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {note.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-indigo-50/60 text-indigo-700 border border-indigo-100 text-[10px] font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Note Text Box (WhatsApp-style formatting) */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Isi Catatan Utama</h4>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm leading-relaxed text-slate-800">
                <WhatsAppText text={note.content} />
              </div>
            </div>

            {/* Results / derived outputs pointer */}
            <div className="pt-2 border-t border-slate-100">
              {resultCount > 0 ? (
                <button
                  onClick={() => onOpenResults?.(note.id)}
                  className="w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 hover:bg-emerald-50 transition-all text-left group"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Hasil &amp; Olahan
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">{resultCount}</span>
                  </span>
                  <span className="text-xs text-emerald-700 font-medium group-hover:translate-x-0.5 transition-transform">
                    Buka di jendela terpisah →
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => onOpenResults?.(note.id)}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all text-sm font-medium text-slate-600 hover:text-indigo-700"
                >
                  <Sparkles className="w-4 h-4" />
                  Buat Laporan / Parafrase (jendela terpisah)
                </button>
              )}
            </div>
          </div>

          {/* Modal Toolbar Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => exportToPDF(note)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs active:scale-95"
                title="Unduh Catatan dalam format PDF"
              >
                <Download className="w-4 h-4" />
                <span>Unduh PDF</span>
              </button>

              <button
                onClick={() => exportToWord(note)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs active:scale-95"
                title="Unduh Catatan dalam format Word"
              >
                <FileText className="w-4 h-4" />
                <span>Unduh Word</span>
              </button>

              <button
                onClick={() => exportToExcel(note)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs active:scale-95"
                title="Unduh Catatan dalam format Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Unduh Excel</span>
              </button>

              <button
                onClick={handleTextToSpeech}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all active:scale-95 ${
                  isPlayingAudio
                    ? 'bg-violet-100 text-violet-700 border-violet-300'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <Volume2 className={`w-4 h-4 ${isPlayingAudio ? 'animate-pulse text-violet-600' : 'text-slate-500'}`} />
                <span>{isPlayingAudio ? 'Stop Suara' : 'Dengarkan'}</span>
              </button>
            </div>

            {/* Utility Actions (Copy & Delete) */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all"
                title="Salin Teks Catatan"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
              {onDelete && (
                <button
                  onClick={async () => {
                    await onDelete(note.id);
                    onClose();
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  title="Hapus Catatan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
