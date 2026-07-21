'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Mic, 
  MicOff, 
  Send, 
  X, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Layers, 
  Search, 
  PlusCircle,
  RefreshCw
} from 'lucide-react';

interface VoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshNotes: () => void;
}

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  actionDone?: string;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  isOpen,
  onClose,
  onRefreshNotes
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: 'Halo! Saya Aira, Asisten Suara AI Anda. Anda bisa memberi tahu saya apa saja, seperti: "Gabungkan catatan terakhir", "Buat catatan pengingat", atau "Cari catatan rapat".'
    }
  ]);
  const [inputCommand, setInputCommand] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const speakText = (text: string) => {
    if (!ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    window.speechSynthesis.speak(utterance);
  };

  const startVoiceCommand = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Browser belum mendukung Web Speech API.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const spoken = event.results[0][0].transcript;
        setInputCommand(spoken);
        handleSend(spoken);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Mic error:', err);
      setIsListening(false);
    }
  };

  const handleSend = async (cmdToSend?: string) => {
    const cmd = (cmdToSend || inputCommand).trim();
    if (!cmd || isProcessing) return;

    setMessages(prev => [...prev, { sender: 'user', text: cmd }]);
    setInputCommand('');
    setIsProcessing(true);

    try {
      const res = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      });

      const data = await res.json();
      if (data.success) {
        const reply = data.replyText || 'Perintah berhasil diproses!';
        setMessages(prev => [
          ...prev, 
          { 
            sender: 'assistant', 
            text: reply,
            actionDone: data.action !== 'NONE' ? data.action : undefined
          }
        ]);

        speakText(reply);

        // Refresh notes feed if action changed notes
        if (data.action === 'CREATE_NOTE' || data.action === 'MERGE_NOTES') {
          onRefreshNotes();
        }
      } else {
        setMessages(prev => [...prev, { sender: 'assistant', text: 'Maaf, terjadi kendala saat memproses perintah.' }]);
      }
    } catch (err) {
      console.error('Assistant error:', err);
      setMessages(prev => [...prev, { sender: 'assistant', text: 'Gagal menghubungkan ke layanan AI.' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg h-[80vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">Aira - Voice Assistant</h3>
                <p className="text-xs text-indigo-100">Kendalikan catatan dengan perintah suara</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={`p-2 rounded-xl text-white transition-all ${ttsEnabled ? 'bg-white/20' : 'bg-white/10 opacity-60'}`}
                title={ttsEnabled ? 'Suara AI Aktif' : 'Suara AI Hening'}
              >
                {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Command Suggestions */}
          <div className="px-4 py-2 bg-indigo-50/60 border-b border-indigo-100 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
            <span className="text-indigo-800 font-semibold shrink-0">Contoh:</span>
            <button
              onClick={() => handleSend('Gabungkan 3 catatan terakhir menjadi laporan')}
              className="px-2.5 py-1 rounded-full bg-white text-indigo-700 font-medium hover:bg-indigo-100 border border-indigo-200/80 shrink-0 transition-all"
            >
              ⚡ Gabung 3 Catatan
            </button>
            <button
              onClick={() => handleSend('Buat catatan pengingat meeting besok jam 10 pagi')}
              className="px-2.5 py-1 rounded-full bg-white text-indigo-700 font-medium hover:bg-indigo-100 border border-indigo-200/80 shrink-0 transition-all"
            >
              📝 Catat Pengingat
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                  msg.sender === 'user' ? 'bg-slate-800 text-white' : 'bg-indigo-600 text-white'
                }`}>
                  {msg.sender === 'user' ? 'U' : <Bot className="w-4 h-4" />}
                </div>
                <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-slate-900 text-white rounded-tr-xs'
                    : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs shadow-2xs'
                }`}>
                  {msg.text}
                  {msg.actionDone && (
                    <div className="mt-2 pt-1.5 border-t border-indigo-100 text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Aksi Terencana: {msg.actionDone}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex gap-2 mr-auto items-center text-xs text-slate-400">
                <Bot className="w-4 h-4 text-indigo-600 animate-spin" />
                <span>Aira sedang berpikir...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Bottom Command Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <button
              onClick={isListening ? () => {} : startVoiceCommand}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                isListening
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'
              }`}
              title="Perintah Suara"
            >
              <Mic className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={inputCommand}
              onChange={e => setInputCommand(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={isListening ? 'Mendengarkan...' : 'Ketik perintah untuk AI Voice Assistant...'}
              className="flex-1 bg-slate-100 focus:bg-white text-slate-900 text-xs px-3 py-2.5 rounded-2xl outline-none border border-slate-200 focus:border-indigo-500 transition-all"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputCommand.trim() || isProcessing}
              className="w-10 h-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white flex items-center justify-center shrink-0 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
