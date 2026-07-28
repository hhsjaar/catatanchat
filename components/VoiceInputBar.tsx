'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Sparkles, X, Square, Folder } from 'lucide-react';

interface VoiceInputBarProps {
  onSendNote: (content: string, rawTranscript?: string, autoGenerateReport?: boolean, folder?: string) => Promise<void>;
  isSubmitting?: boolean;
}

export const VoiceInputBar: React.FC<VoiceInputBarProps> = ({
  onSendNote,
  isSubmitting = false
}) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [autoGenerateReport, setAutoGenerateReport] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('Umum');
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const FOLDERS = ['Umum', 'Pekerjaan', 'Pribadi', 'Ide', 'Meeting'];

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  }, [text]);

  useEffect(() => {
    // Check Web Speech API availability
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSpeechSupported(false);
      }
    }
  }, []);

  const startRecording = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Browser Anda belum mendukung Web Speech API. Silakan ketik catatan Anda secara manual.');
      return;
    }

    try {
      baseTextRef.current = text;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'id-ID';

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const finalTranscripts: string[] = [];
        const interimTranscripts: string[] = [];

        for (let i = 0; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscripts.push(chunk);
          } else {
            interimTranscripts.push(chunk);
          }
        }

        const mergeChunks = (chunks: string[]) => {
          if (chunks.length === 0) return '';
          let merged = chunks[0];
          for (let i = 1; i < chunks.length; i++) {
            const current = chunks[i];
            const p = merged.toLowerCase().replace(/\s+/g, ' ').trim();
            const c = current.toLowerCase().replace(/\s+/g, ' ').trim();
            if (c.startsWith(p)) {
              merged = current;
            } else {
              merged = merged.trim() + ' ' + current.trim();
            }
          }
          return merged;
        };

        const mergedFinal = mergeChunks(finalTranscripts);
        const mergedInterim = mergeChunks(interimTranscripts);

        let combinedSpeech = '';
        if (mergedFinal && mergedInterim) {
          const f = mergedFinal.toLowerCase().replace(/\s+/g, ' ').trim();
          const it = mergedInterim.toLowerCase().replace(/\s+/g, ' ').trim();
          if (it.startsWith(f)) {
            combinedSpeech = mergedInterim;
          } else {
            combinedSpeech = mergedFinal.trim() + ' ' + mergedInterim.trim();
          }
        } else {
          combinedSpeech = mergedFinal || mergedInterim;
        }

        combinedSpeech = combinedSpeech.replace(/\s+/g, ' ').trim();
        setTranscript(combinedSpeech);

        const base = baseTextRef.current.trim();
        setText(base ? `${base} ${combinedSpeech}` : combinedSpeech);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || isSubmitting) return;

    if (isRecording) {
      stopRecording();
    }

    const currentText = text.trim();
    const currentTranscript = transcript;
    
    setText('');
    setTranscript('');
    baseTextRef.current = '';

    await onSendNote(currentText, currentTranscript, autoGenerateReport, selectedFolder);
  };

  const handleQuickChip = (suggestion: string) => {
    setText(prev => (prev ? `${prev} ${suggestion}` : suggestion));
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-3 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Folder Selection & Quick Chips */}
        <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap flex items-center gap-1">
            <Folder className="w-3 h-3 text-indigo-500" /> Folder:
          </span>
          {FOLDERS.map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setSelectedFolder(f)}
              className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-all border ${
                selectedFolder === f
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200/80'
              }`}
            >
              {f}
            </button>
          ))}

          {/* AI Auto-Report Toggle Badge */}
          <button
            type="button"
            onClick={() => setAutoGenerateReport(!autoGenerateReport)}
            className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full font-medium transition-all text-xs border ${
              autoGenerateReport
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto Laporan</span>
          </button>
        </div>

        {/* Recording Active Status Bar */}
        {isRecording && (
          <div className="mb-2 p-2.5 rounded-xl bg-red-50 border border-red-200/80 flex items-center justify-between text-xs text-red-700 animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
              </span>
              <span className="font-semibold">Merekam Suara... Bicara sekarang</span>
              {/* Wave Visualizer */}
              <div className="flex items-center gap-1 ml-2 h-4">
                <div className="w-1 bg-red-500 animate-wave-1 rounded-full"></div>
                <div className="w-1 bg-red-500 animate-wave-2 rounded-full"></div>
                <div className="w-1 bg-red-500 animate-wave-3 rounded-full"></div>
                <div className="w-1 bg-red-500 animate-wave-4 rounded-full"></div>
              </div>
            </div>
            <button
              onClick={stopRecording}
              className="flex items-center gap-1 text-red-700 font-bold hover:underline px-2 py-0.5"
            >
              <Square className="w-3 h-3 fill-red-700" /> Stop
            </button>
          </div>
        )}

        {/* Input Bar Form */}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          {/* Mic Record Button */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all shadow-xs active:scale-95 mb-0.5 ${
              isRecording
                ? 'bg-red-600 text-white ring-4 ring-red-100'
                : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200'
            }`}
            title={isRecording ? 'Hentikan Rekaman' : 'Mulai Rekam Suara (Speech to Text)'}
          >
            {isRecording ? <MicOff className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text Area Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={isRecording ? 'Sedang mendengarkan suara Anda...' : 'Tulis catatan, tempel dari papan klip, atau rekam suara...'}
              rows={1}
              className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-2xl py-2.5 pl-4 pr-10 text-sm outline-none transition-all resize-none max-h-[220px] min-h-[44px] overflow-y-auto"
            />
            {text && (
              <button
                type="button"
                onClick={() => setText('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!text.trim() || isSubmitting}
            className="w-11 h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 flex items-center justify-center shrink-0 transition-all shadow-md shadow-indigo-100 active:scale-95 mb-0.5"
            title="Kirim Catatan Ke Room Chat"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
