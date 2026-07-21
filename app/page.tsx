'use client';

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { MessageSquare, Mic } from 'lucide-react';

import { Note } from '@/lib/db';
import { Navbar } from '@/components/Navbar';
import { ChatBubble } from '@/components/ChatBubble';
import { VoiceInputBar } from '@/components/VoiceInputBar';
import { VoiceAssistant } from '@/components/VoiceAssistant';
import { HistoryDrawer } from '@/components/HistoryDrawer';
import { NoteDetailModal } from '@/components/NoteDetailModal';

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Modals & Drawers
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [activeDetailNote, setActiveDetailNote] = useState<Note | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      if (data.success) {
        setNotes(data.notes || []);
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [notes, isSubmittingNote]);

  const handleSendNote = async (content: string, rawTranscript?: string, autoGenerateReport?: boolean, folder?: string) => {
    setIsSubmittingNote(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, rawAudioTranscript: rawTranscript, autoGenerateReport, folder })
      });

      const data = await res.json();
      if (data.success && data.note) {
        setNotes(prev => [...prev, data.note]);
        if (data.note.formattedReport) {
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
        }
      }
    } catch (err) {
      console.error('Error creating note:', err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleGenerateReport = async (noteId: string, content: string) => {
    try {
      const res = await fetch('/api/gemini/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId, content })
      });

      const data = await res.json();
      if (data.success && data.report) {
        setNotes(prev =>
          prev.map(n => (n.id === noteId ? { ...n, formattedReport: data.report } : n))
        );
        if (activeDetailNote && activeDetailNote.id === noteId) {
          setActiveDetailNote(prev => prev ? { ...prev, formattedReport: data.report } : null);
        }
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } });
      }
    } catch (err) {
      console.error('Error generating report:', err);
    }
  };

  const handleParaphrase = async (noteId: string, content: string, style: 'formal' | 'concise' | 'bullet') => {
    try {
      const targetNote = notes.find(n => n.id === noteId);
      const noteFolder = targetNote?.folder || 'Umum';

      const res = await fetch('/api/gemini/paraphrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, style })
      });

      const data = await res.json();
      if (data.success && data.paraphrased) {
        const patchRes = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `✨ Hasil Parafrase (${style.toUpperCase()}):\n${data.paraphrased}`,
            folder: noteFolder
          })
        });
        const patchData = await patchRes.json();
        if (patchData.success) {
          setNotes(prev => [...prev, patchData.note]);
        }
      }
    } catch (err) {
      console.error('Error paraphrasing:', err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await fetch(`/api/notes?id=${noteId}`, { method: 'DELETE' });
      setNotes(prev => prev.filter(n => n.id !== noteId));
      if (activeDetailNote?.id === noteId) {
        setActiveDetailNote(null);
      }
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  const handleMergeNotes = async (noteIds: string[]) => {
    try {
      const res = await fetch('/api/gemini/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteIds })
      });

      const data = await res.json();
      if (data.success && data.note) {
        setNotes(prev => [...prev, data.note]);
        setActiveDetailNote(data.note);
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      }
    } catch (err) {
      console.error('Error merging notes:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        noteCount={notes.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenAssistant={() => setIsAssistantOpen(true)}
      />

      {/* Main Single-Page Chat Stream */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 pb-36">
        {/* Intro Room Header */}
        <div className="my-3 p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Room Catatan Anda</h2>
              <p className="text-xs text-slate-500">Rekam suara atau ketik pesan. Klik catatan untuk membuka detail lengkap.</p>
            </div>
          </div>
        </div>

        {/* Notes Stream Timeline */}
        {isLoading ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-medium">Memuat catatan room chat...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/80 p-8 my-6 space-y-4">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto border border-indigo-100">
              <Mic className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Belum ada catatan</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Mulai buat catatan pertama Anda dengan menekan tombol mikrofon di bawah atau mengetik langsung di room chat.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map(note => (
              <ChatBubble
                key={note.id}
                note={note}
                onOpenDetail={n => setActiveDetailNote(n)}
                onDelete={handleDeleteNote}
              />
            ))}
          </div>
        )}

        {isSubmittingNote && (
          <div className="flex justify-end my-3">
            <div className="bg-indigo-600 text-white text-xs px-4 py-2.5 rounded-2xl rounded-tr-xs shadow-xs flex items-center gap-2 animate-pulse">
              <span>Menambahkan catatan ke room chat...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </main>

      {/* Bottom Speech-to-Text Input Bar */}
      <VoiceInputBar
        onSendNote={handleSendNote}
        isSubmitting={isSubmittingNote}
      />

      {/* Slide-over & Modals */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        notes={notes}
        onDeleteNote={handleDeleteNote}
        onMergeNotes={handleMergeNotes}
        onOpenDetailNote={n => {
          setIsHistoryOpen(false);
          setActiveDetailNote(n);
        }}
      />

      <VoiceAssistant
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onRefreshNotes={fetchNotes}
      />

      <NoteDetailModal
        note={activeDetailNote}
        onClose={() => setActiveDetailNote(null)}
        onDelete={handleDeleteNote}
        onGenerateReport={handleGenerateReport}
        onParaphrase={handleParaphrase}
      />
    </div>
  );
}
