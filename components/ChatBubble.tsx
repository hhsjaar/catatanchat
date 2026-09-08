'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Sparkles, 
  Mic, 
  Bot, 
  User, 
  Folder,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { Note } from '@/lib/db';
import { stripWaMarkup } from '@/lib/waFormat';

interface ChatBubbleProps {
  note: Note;
  onOpenDetail: (note: Note) => void;
  onDelete: (noteId: string) => Promise<void>;
  folders?: string[];
  onUpdateFolder?: (noteId: string, newFolder: string) => Promise<void>;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  note,
  onOpenDetail,
  onDelete,
  folders,
  onUpdateFolder
}) => {
  const dateObj = new Date(note.createdAt);
  const now = new Date();
  const isToday = dateObj.toDateString() === now.toDateString();

  const formattedDateTime = isToday
    ? `Hari ini, ${dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
    : dateObj.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  // Extract compact title / keyword preview
  const firstLine = note.content.split('\n')[0].trim();
  const titlePreview = firstLine.length > 55 ? `${firstLine.substring(0, 55)}...` : firstLine;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex gap-2.5 max-w-2xl my-2.5 ${note.isAiGenerated ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
    >
      {/* Avatar Icon */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-2xs mt-1 ${
        note.isAiGenerated 
          ? 'bg-indigo-600 text-white' 
          : 'bg-slate-800 text-slate-100'
      }`}>
        {note.isAiGenerated ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>

      {/* Main Compact Card */}
      <div className="flex-1 min-w-0 max-w-xl">
        <div 
          onClick={() => onOpenDetail(note)}
          className={`p-3.5 rounded-2xl border transition-all shadow-2xs hover:shadow-md cursor-pointer group relative ${
            note.isAiGenerated 
              ? 'bg-indigo-50/70 border-indigo-100 hover:border-indigo-300 rounded-tl-xs' 
              : 'bg-white border-slate-200/90 hover:border-indigo-300 rounded-tr-xs'
          }`}
        >
          {/* Top Bar: Folder & Time */}
          <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span 
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 bg-indigo-100/90 hover:bg-indigo-200/80 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-indigo-200/80 transition-colors"
              >
                <Folder className="w-3 h-3 text-indigo-600 shrink-0" />
                {folders && folders.length > 0 && onUpdateFolder ? (
                  <select
                    value={note.folder || note.category || 'Umum'}
                    onChange={async (e) => {
                      e.stopPropagation();
                      await onUpdateFolder(note.id, e.target.value);
                    }}
                    className="bg-transparent border-none outline-none cursor-pointer text-indigo-700 font-semibold py-0 pr-0.5 text-[10px]"
                    title="Pindah Folder"
                  >
                    {folders.map(f => (
                      <option key={f} value={f} className="text-slate-900 bg-white font-medium">{f}</option>
                    ))}
                  </select>
                ) : (
                  <span>{note.folder || note.category || 'Umum'}</span>
                )}
              </span>
              {note.rawAudioTranscript && (
                <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium border border-violet-100">
                  <Mic className="w-3 h-3" /> Suara
                </span>
              )}
              {note.formattedReport && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold border border-emerald-200">
                  <Sparkles className="w-3 h-3" /> Laporan
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-mono shrink-0">{formattedDateTime}</span>
          </div>

          {/* Note Content Preview */}
          <div className="flex items-start justify-between gap-2">
            <div className="text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap line-clamp-5 group-hover:text-indigo-950 transition-colors font-medium">
              {stripWaMarkup(note.content)}
            </div>
            <div className="flex items-center gap-1 text-xs text-indigo-600 font-medium shrink-0 group-hover:translate-x-0.5 transition-transform pt-0.5">
              <span>Detail</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
