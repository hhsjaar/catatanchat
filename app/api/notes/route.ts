import { NextResponse } from 'next/server';
import { getNotes, createNote, deleteNote, updateNote } from '@/lib/db';
import { generateStructuredReport } from '@/lib/gemini';

export async function GET() {
  try {
    const { notes, isNeon } = await getNotes();
    return NextResponse.json({ success: true, notes, isNeon });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, rawAudioTranscript, autoGenerateReport, tags, category } = body;

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json({ success: false, error: 'Content is required' }, { status: 400 });
    }

    let formattedReport = null;
    if (autoGenerateReport) {
      formattedReport = await generateStructuredReport(content);
    }

    const note = await createNote({
      content,
      rawAudioTranscript,
      formattedReport,
      tags: tags || ['Chat Note'],
      category: category || 'Umum',
      isAiGenerated: false
    });

    return NextResponse.json({ success: true, note });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Note ID is required' }, { status: 400 });
    }

    await deleteNote(id);
    return NextResponse.json({ success: true, message: 'Note deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, isFavorite, content, formattedReport } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Note ID is required' }, { status: 400 });
    }

    const updated = await updateNote(id, { isFavorite, content, formattedReport });
    return NextResponse.json({ success: true, note: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
