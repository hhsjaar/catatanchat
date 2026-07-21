'use client';

import React from 'react';
import { Mic, History, Bot } from 'lucide-react';

interface NavbarProps {
  noteCount: number;
  onOpenHistory: () => void;
  onOpenAssistant: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  noteCount,
  onOpenHistory,
  onOpenAssistant
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 transition-all">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-100">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-lg leading-tight">
              VoiceChat Notes
            </h1>
            <p className="text-xs text-slate-500">Catatan Suara & Pengelompokan Folder</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Voice Assistant Button */}
          <button
            onClick={onOpenAssistant}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200/80 rounded-xl transition-all shadow-xs active:scale-95"
          >
            <Bot className="w-4 h-4 text-indigo-600" />
            <span>Asisten Suara</span>
          </button>

          {/* History Drawer Trigger */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-all shadow-xs active:scale-95"
          >
            <History className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Riwayat</span>
            <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-semibold border border-indigo-100">
              {noteCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
