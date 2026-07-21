import { NextResponse } from 'next/server';
import { processVoiceAssistantCommand, generateStructuredReport } from '@/lib/gemini';
import { getNotes, createNote } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { command } = body;

    if (!command || typeof command !== 'string') {
      return NextResponse.json({ success: false, error: 'Command string is required' }, { status: 400 });
    }

    const { notes } = await getNotes();
    const assistantResult = await processVoiceAssistantCommand(command, notes);

    let executedActionData = null;

    // Handle actions automatically on behalf of the user
    if (assistantResult.action === 'CREATE_NOTE' && assistantResult.actionData?.content) {
      const created = await createNote({
        content: assistantResult.actionData.content,
        tags: ['Voice Assistant', 'Otomatis'],
        category: 'Asisten AI',
        isAiGenerated: true
      });
      executedActionData = { newNote: created };
    } else if (assistantResult.action === 'MERGE_NOTES') {
      const selectedIds = assistantResult.actionData?.noteIds || notes.slice(-3).map(n => n.id);
      const targetNotes = notes.filter(n => selectedIds.includes(n.id));
      
      const combined = targetNotes.map(n => n.content).join('\n\n');
      const masterReport = await generateStructuredReport(combined);
      const mergedNote = await createNote({
        content: `Laporan Gabungan Otomatis Asisten AI:\n${combined.substring(0, 150)}...`,
        formattedReport: masterReport,
        tags: ['Gabungan AI', 'Laporan Asisten'],
        category: 'Gabungan',
        isAiGenerated: true
      });
      executedActionData = { mergedNote };
    }

    return NextResponse.json({
      success: true,
      replyText: assistantResult.replyText,
      action: assistantResult.action,
      actionData: assistantResult.actionData,
      executedResult: executedActionData
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
