'use client';

import React, { useState } from 'react';
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
  Printer,
  Share2
} from 'lucide-react';
import { Note } from '@/lib/db';

interface ReportViewModalProps {
  note: Note | null;
  onClose: () => void;
}

export const ReportViewModal: React.FC<ReportViewModalProps> = ({ note, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!note || !note.formattedReport) return null;

  const handleCopyReport = () => {
    navigator.clipboard.writeText(note.formattedReport || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const element = document.createElement('a');
    const file = new Blob([note.formattedReport || ''], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `Laporan_Catatan_${note.id.substring(0, 8)}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        >
          {/* Modal Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base leading-tight">
                  Laporan Terstruktur AI
                </h3>
                <p className="text-xs text-slate-500">Hasil Konversi Otomatis Google Gemini API</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyReport}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
              <button
                onClick={handleDownloadMarkdown}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh .MD</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Original Raw Note Hint */}
          <div className="px-5 py-2.5 bg-indigo-50/50 border-b border-indigo-100/60 text-xs text-indigo-900 flex items-center justify-between">
            <span className="truncate">Teks Asli: "{note.content.substring(0, 70)}..."</span>
            <span className="text-[11px] text-indigo-700 font-mono shrink-0">
              {new Date(note.createdAt).toLocaleTimeString('id-ID')}
            </span>
          </div>

          {/* Rendered Markdown Area */}
          <div className="p-6 overflow-y-auto flex-1 bg-white prose-report">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {note.formattedReport}
            </ReactMarkdown>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
