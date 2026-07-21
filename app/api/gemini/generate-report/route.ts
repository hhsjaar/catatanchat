import { NextResponse } from 'next/server';
import { generateStructuredReport } from '@/lib/gemini';
import { getNotes, updateNote, createNote } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, noteId, noteIds } = body;

    // Single note report generation
    if (noteId && content) {
      const report = await generateStructuredReport(content);
      await updateNote(noteId, { formattedReport: report });
      return NextResponse.json({ success: true, report });
    }

    // Merging multiple notes into 1 master report
    if (Array.isArray(noteIds) && noteIds.length > 0) {
      const { notes } = await getNotes();
      const selectedNotes = notes.filter(n => noteIds.includes(n.id));
      
      const combinedText = selectedNotes
        .map((n, idx) => `Catatan ${idx + 1} (${new Date(n.createdAt).toLocaleDateString('id-ID')}):\n${n.content}`)
        .join('\n\n---\n\n');

      const masterReport = await generateStructuredReport(combinedText);

      // Save merged note
      const mergedNote = await createNote({
        content: `Gabungan dari ${selectedNotes.length} catatan:\n\n${combinedText.substring(0, 200)}...`,
        formattedReport: masterReport,
        tags: ['Hasil Gabungan', 'Laporan Master', 'AI Report'],
        category: 'Gabungan',
        isAiGenerated: true
      });

      return NextResponse.json({ success: true, report: masterReport, note: mergedNote });
    }

    if (content) {
      const report = await generateStructuredReport(content);
      return NextResponse.json({ success: true, report });
    }

    return NextResponse.json({ success: false, error: 'Content or noteId is required' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
