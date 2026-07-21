'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Sparkles, 
  Volume2, 
  Trash2, 
  Copy, 
  Check, 
  Mic, 
  Bot, 
  User, 
  RefreshCw,
  Eye,
  ChevronDown
} from 'lucide-react';
import { Note } from '@/lib/db';

interface ChatBubbleProps {
  note: Note;
  onGenerateReport: (noteId: string, content: string) => Promise<void>;
  onParaphrase: (noteId: string, content: string, style: 'formal' | 'concise' | 'bullet') => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
  onViewReport: (note: Note) => void;
  isGeneratingReport?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  note,
  onGenerateReport,
  onParaphrase,
  onDelete,
  onViewReport,
  isGeneratingReport = false
}) => {
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showParaphraseMenu, setShowParaphraseMenu] = useState(false);
  const [isParaphrasing, setIsParaphrasing] = useState(false);

  const formattedTime = new Date(note.createdAt).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });

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

  const handleParaphraseAction = async (style: 'formal' | 'concise' | 'bullet') => {
    setShowParaphraseMenu(false);
    setIsParaphrasing(true);
    try {
      await onParaphrase(note.id, note.content, style);
    } finally {
      setIsParaphrasing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex gap-3 max-w-3xl my-3 ${note.isAiGenerated ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
    >
      {/* Avatar Icon */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs mt-1 ${
        note.isAiGenerated 
          ? 'bg-indigo-600 text-white' 
          : 'bg-slate-800 text-slate-100'
      }`}>
        {note.isAiGenerated ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>

      {/* Main Bubble Content Card */}
      <div className="flex-1 min-w-0 max-w-2xl">
        <div className={`p-4 rounded-2xl border transition-all shadow-xs relative group ${
          note.isAiGenerated 
            ? 'bg-indigo-50/50 border-indigo-100 text-slate-900 rounded-tl-xs' 
            : 'bg-white border-slate-200/90 text-slate-900 rounded-tr-xs'
        }`}>
          {/* Header Metadata */}
          <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-slate-700">
                {note.isAiGenerated ? 'Asisten AI' : 'Catatan Anda'}
              </span>
              {note.rawAudioTranscript && (
                <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 text-[10px] px-2 py-0.5 rounded-full font-medium border border-violet-100">
                  <Mic className="w-3 h-3" /> Rekaman Suara
                </span>
              )}
              {note.tags && note.tags.map((t, idx) => (
                <span key={idx} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-medium">
                  #{t}
                </span>
              ))}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">{formattedTime}</span>
          </div>

          {/* Main Content Body */}
          <div className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap break-words">
            {note.content}
          </div>

          {/* Formatted Report Badge Indicator */}
          {note.formattedReport && (
            <div className="mt-3 p-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/70 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-emerald-900">Laporan Terstruktur Tersedia</div>
                  <div className="text-[11px] text-emerald-700">Dilengkapi tabel & sub-bab poin</div>
                </div>
              </div>
              <button
                onClick={() => onViewReport(note)}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-white hover:bg-emerald-100/50 px-2.5 py-1 rounded-lg border border-emerald-300 transition-all active:scale-95 shadow-2xs"
              >
                <Eye className="w-3.5 h-3.5" /> Lihat Detail
              </button>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap text-xs">
            <div className="flex items-center gap-1 flex-wrap">
              {/* Generate AI Report Button */}
              <button
                onClick={() => onGenerateReport(note.id, note.content)}
                disabled={isGeneratingReport}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 hover:from-indigo-100 hover:to-violet-100 rounded-lg border border-indigo-200/80 transition-all active:scale-95 disabled:opacity-50"
                title="Konversi teks menjadi Laporan Terstruktur rapi dengan tabel & poin-poin"
              >
                {isGeneratingReport ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                    <span>Memproses AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span>Laporan AI</span>
                  </>
                )}
              </button>

              {/* Paraphrase Button */}
              <div className="relative">
                <button
                  onClick={() => setShowParaphraseMenu(!showParaphraseMenu)}
                  disabled={isParaphrasing}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all active:scale-95 disabled:opacity-50"
                  title="Parafrase & rapikan tulisan"
                >
                  {isParaphrasing ? (
                    <RefreshCw className="w-3 h-3 animate-spin text-slate-600" />
                  ) : (
                    <RefreshCw className="w-3 h-3 text-slate-500" />
                  )}
                  <span>Parafrase</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {/* Paraphrase Options Dropdown */}
                {showParaphraseMenu && (
                  <div className="absolute left-0 bottom-full mb-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-20">
                    <button
                      onClick={() => handleParaphraseAction('formal')}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      Bahas Formal
                    </button>
                    <button
                      onClick={() => handleParaphraseAction('concise')}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      Versi Ringkas
                    </button>
                    <button
                      onClick={() => handleParaphraseAction('bullet')}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      Format Poin-poin
                    </button>
                  </div>
                )}
              </div>

              {/* Read Aloud TTS */}
              <button
                onClick={handleTextToSpeech}
                className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border transition-all active:scale-95 ${
                  isPlayingAudio
                    ? 'bg-violet-100 text-violet-700 border-violet-300'
                    : 'text-slate-600 hover:bg-slate-100 border-slate-200'
                }`}
                title="Dengarkan Suara (Text to Speech)"
              >
                <Volume2 className={`w-3 h-3 ${isPlayingAudio ? 'animate-pulse text-violet-600' : 'text-slate-500'}`} />
                <span className="hidden sm:inline">{isPlayingAudio ? 'Stop Suara' : 'Bicara'}</span>
              </button>
            </div>

            {/* Utility Actions (Copy & Delete) */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                title="Salin Teks"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => onDelete(note.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Hapus Catatan"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
