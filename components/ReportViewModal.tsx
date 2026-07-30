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
  Folder,
  FileSpreadsheet
} from 'lucide-react';
import { Note } from '@/lib/db';
import { exportToWord, exportToExcel } from '@/lib/exportUtils';

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

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formattedDate = new Date(note.createdAt).toLocaleString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${note.folder || 'Catatan'} - Laporan PDF</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #0f172a; line-height: 1.6; }
            .header { border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 24px; }
            .title { font-size: 22px; font-weight: 700; color: #064e3b; margin: 0 0 8px 0; }
            .meta { font-size: 13px; color: #64748b; }
            .badge { background: #d1fae5; color: #047857; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 999px; margin-right: 8px; }
            .section-title { font-size: 15px; font-weight: 700; color: #334155; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
            .content-box { font-size: 14px; white-space: pre-wrap; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .report-box { font-size: 14px; line-height: 1.7; margin-top: 15px; }
            table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 13px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
            th { background-color: #f1f5f9; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Laporan Catatan: ${note.folder || 'Umum'}</h1>
            <div class="meta">
              <span class="badge">Folder: ${note.folder || 'Umum'}</span>
              <span>Dibuat: ${formattedDate}</span>
            </div>
          </div>

          <div class="section-title">Isi Catatan Utama</div>
          <div class="content-box">${note.content}</div>

          <div class="section-title">Laporan Terstruktur</div>
          <div class="report-box">${(note.formattedReport || '').replace(/\n/g, '<br/>')}</div>

          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
                <h3 className="font-bold text-slate-900 text-base leading-tight flex items-center gap-2">
                  <span>Laporan Terstruktur</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                    <Folder className="w-3 h-3" /> {note.folder || 'Umum'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">Ringkasan dan Analisis Catatan</p>
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
                onClick={handleExportPDF}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs"
                title="Unduh Laporan dalam format PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh PDF</span>
              </button>
              <button
                onClick={() => exportToWord(note)}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs"
                title="Unduh Laporan dalam format Word"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Unduh Word</span>
              </button>
              <button
                onClick={() => exportToExcel(note)}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs"
                title="Unduh Laporan dalam format Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Unduh Excel</span>
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
              {new Date(note.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
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
