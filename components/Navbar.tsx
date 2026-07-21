'use client';

import React from 'react';
import { Mic, Sparkles, History, Bot, Database, Server } from 'lucide-react';

interface NavbarProps {
  noteCount: number;
  isNeon: boolean;
  onOpenHistory: () => void;
  onOpenAssistant: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  noteCount,
  isNeon,
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
            <h1 className="font-bold text-slate-900 text-lg leading-tight flex items-center gap-1.5">
              VoiceChat <span className="text-xs bg-indigo-50 text-indigo-700 font-medium px-2 py-0.5 rounded-full border border-indigo-200/60">Notes AI</span>
            </h1>
            <p className="text-xs text-slate-500">Room Chat Notes & Voice Assistant</p>
          </div>
        </div>

        {/* Database Status & Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Neon DB Status Badge */}
          <div 
            className={`hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
              isNeon 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
            title={isNeon ? 'Connected to Neon PostgreSQL Database' : 'Running on Local Fallback Store'}
          >
            {isNeon ? (
              <>
                <Database className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span className="font-medium">Neon DB</span>
              </>
            ) : (
              <>
                <Server className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-medium">Local Store</span>
              </>
            )}
          </div>

          {/* AI Assistant Button */}
          <button
            onClick={onOpenAssistant}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200/80 rounded-xl transition-all shadow-xs active:scale-95"
          >
            <Bot className="w-4 h-4 text-indigo-600" />
            <span>AI Assistant</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
          </button>

          {/* History Drawer Trigger */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-all shadow-xs active:scale-95"
          >
            <History className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Riwayat</span>
            <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-semibold border border-slate-200">
              {noteCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
