import { NextResponse } from 'next/server';
import { paraphraseText } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, style } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ success: false, error: 'Text is required' }, { status: 400 });
    }

    const result = await paraphraseText(text, style || 'formal');
    return NextResponse.json({ success: true, paraphrased: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
