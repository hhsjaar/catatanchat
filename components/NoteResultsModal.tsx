'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  X,
  FileText,
  Copy,
  Check,
  Download,
  Sparkles,
  RefreshCw,
  ChevronDown,
  FileSpreadsheet,
  Layers,
  Folder,
} from 'lucide-react';
import { Note, DerivedOutput, DerivedOutputKind } from '@/lib/db';
import { WhatsAppText } from '@/lib/waFormat';
import { markdownToWhatsApp } from '@/lib/mdToWhatsApp';
import { deriveNoteTitle } from '@/lib/noteTitle';
import { exportToWord, exportToExcel, exportToPDF } from '@/lib/exportUtils';

interface NoteResultsModalProps {
  note: Note | null;
  onClose: () => void;
  onGenerateReport?: (id: string, content: string) => Promise<void>;
  onParaphrase?: (id: string, content: string, style: 'formal' | 'concise' | 'bullet') => Promise<void>;
}

const PARAPHRASE_LABELS: Record<string, string> = {
  formal: 'Parafrase Formal',
  concise: 'Parafrase Ringkas',
  bullet: 'Parafrase Poin',
};

function buildOutputs(note: Note): DerivedOutput[] {
  const list: DerivedOutput[] = [];
  if (note.formattedReport && note.formattedReport.trim() !== '') {
    list.push({
      id: 'report',
      kind: 'report',
      label: 'Laporan Terstruktur',
      content: note.formattedReport,
      createdAt: note.updatedAt,
    });
  }
  for (const o of note.derivedOutputs ?? []) {
    if (o.kind === 'report' && list.some(x => x.kind === 'report')) continue;
    list.push(o);
  }
  return list;
}

function makeExportNote(note: Note, output: DerivedOutput): Note {
  if (output.kind === 'report') {
    return { ...note, formattedReport: output.content };
  }
  return {
    ...note,
    formattedReport: null,
    content: `Hasil Parafrase (${output.label}):\n\n${output.content}`,
  };
}

export const NoteResultsModal: React.FC<NoteResultsModalProps> = ({
  note,
  onClose,
  onGenerateReport,
  onParaphrase,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showParaphraseMenu, setShowParaphraseMenu] = useState(false);
  const [busy, setBusy] = useState<null | 'report' | 'paraphrase'>(null);

  const outputs = note ? buildOutputs(note) : [];

  useEffect(() => {
    if (outputs.length === 0) {
      setActiveId(null);
      return;
    }
    if (!activeId || !outputs.some(o => o.id === activeId)) {
      setActiveId(outputs[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);

  if (!note) return null;

  const active = outputs.find(o => o.id === activeId) || null;

  const handleCopy = () => {
    if (!active) return;
    // Salin dalam format WhatsApp (tebal *, miring _, poin, tabel dirapikan)
    navigator.clipboard.writeText(markdownToWhatsApp(active.content));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateReport = async () => {
    if (!onGenerateReport || busy) return;
    setBusy('report');
    try {
      await onGenerateReport(note.id, note.content);
      setActiveId('report');
    } finally {
      setBusy(null);
    }
  };

  const handleParaphrase = async (style: 'formal' | 'concise' | 'bullet') => {
    if (!onParaphrase || busy) return;
    setShowParaphraseMenu(false);
    setBusy('paraphrase');
    try {
      await onParaphrase(note.id, note.content, style);
      setActiveId(`paraphrase-${style}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-base leading-tight line-clamp-1">
                  {deriveNoteTitle(note.content)}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Folder className="w-3 h-3 text-indigo-500" />
                  <span className="truncate">{note.folder || note.category || 'Umum'}</span>
                  <span className="text-slate-300">•</span>
                  <span className="truncate">Hasil &amp; Olahan</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Generate toolbar */}
          <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-white flex items-center gap-2 flex-wrap">
            {onGenerateReport && (
              <button
                onClick={handleGenerateReport}
                disabled={busy !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 transition-all disabled:opacity-50"
              >
                {busy === 'report' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{outputs.some(o => o.kind === 'report') ? 'Perbarui Laporan' : 'Buat Laporan'}</span>
              </button>
            )}

            {onParaphrase && (
              <div className="relative">
                <button
                  onClick={() => setShowParaphraseMenu(v => !v)}
                  disabled={busy !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-all disabled:opacity-50"
                >
                  {busy === 'paraphrase' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-slate-500" />}
                  <span>Parafrase</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {showParaphraseMenu && (
                  <div className="absolute left-0 top-full mt-2 w-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-20">
                    {(['formal', 'concise', 'bullet'] as const).map(style => (
                      <button
                        key={style}
                        onClick={() => handleParaphrase(style)}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                      >
                        {PARAPHRASE_LABELS[style]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <span className="text-[11px] text-slate-400 ml-auto">
              Setiap hasil tersimpan terpisah dan dapat disalin sendiri-sendiri.
            </span>
          </div>

          {outputs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 gap-3 bg-white">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <Layers className="w-7 h-7" />
              </div>
              <h4 className="font-semibold text-slate-700 text-sm">Belum ada hasil olahan</h4>
              <p className="text-xs text-slate-500 max-w-xs">
                Buat laporan terstruktur atau parafrase dari catatan ini. Hasilnya akan muncul di sini pada tab terpisah, bukan menimpa catatan asli.
              </p>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex items-center gap-1.5 px-4 sm:px-5 pt-3 overflow-x-auto no-scrollbar bg-white">
                {outputs.map(o => (
                  <button
                    key={o.id}
                    onClick={() => setActiveId(o.id)}
                    className={`px-3 py-1.5 rounded-t-xl text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                      activeId === o.id
                        ? 'border-indigo-600 text-indigo-700 bg-indigo-50/60'
                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>

              {/* Active output actions */}
              {active && (
                <>
                  <div className="px-4 sm:px-5 py-2.5 border-y border-slate-100 bg-slate-50/70 flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={handleCopy}
                      title="Salin dalam format WhatsApp (tebal, miring, poin, tabel dirapikan)"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Tersalin (format WA)' : 'Salin Hasil Ini'}</span>
                    </button>
                    <button
                      onClick={() => exportToPDF(makeExportNote(note, active))}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                    <button
                      onClick={() => exportToWord(makeExportNote(note, active))}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Word</span>
                    </button>
                    <button
                      onClick={() => exportToExcel(makeExportNote(note, active))}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Excel</span>
                    </button>
                    <span className="text-[11px] text-slate-400 font-mono ml-auto">
                      {new Date(active.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Active output body */}
                  <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-white">
                    {active.kind === 'report' ? (
                      <div className="prose-report text-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{active.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <WhatsAppText text={markdownToWhatsApp(active.content)} className="text-sm text-slate-800" />
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export type { DerivedOutputKind };
