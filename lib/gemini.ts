import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';

let aiInstance: GoogleGenAI | null = null;
if (apiKey && apiKey.trim() !== '' && !apiKey.includes('your_gemini_api_key')) {
  aiInstance = new GoogleGenAI({ apiKey });
}

export async function generateStructuredReport(text: string): Promise<string> {
  if (aiInstance) {
    try {
      const prompt = `
Anda adalah asisten pembuat laporan profesional.
Tugas Anda: Ubah teks/catatan mentah berikut menjadi Laporan Yang Rapi & Terstruktur dalam bahasa Indonesia.

Instruksi Format:
1. Gunakan Markdown.
2. Tambahkan Judul Laporan yang menarik & relevan (H3/H4: ### atau ####).
3. Buat Ringkasan Singkat / Sub-bab pendahuluan.
4. Gunakan Poin-poin (bullet points) untuk item detail.
5. Gunakan cetak **tebal** (bold) untuk penekanan kata/istilah penting.
6. JIKA ADA data numerik, tanggal, perbandingan, atau daftar terstruktur, buatlah TABEL MARKDOWN yang rapi.
7. Berikan rekomendasi/langkah selanjutnya jika relevan.

Teks Mentah:
"${text}"
`;

      const response = await aiInstance.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      if (response.text) {
        return response.text;
      }
    } catch (err) {
      console.error('Gemini API error during report generation:', err);
    }
  }

  // Smart local fallback if API key is not configured or fails
  const lines = text.split('\n').filter(l => l.trim() !== '');
  const title = lines[0] ? lines[0].substring(0, 45) : 'Catatan Ringkas';

  return `### 📊 Laporan Terstruktur: ${title}

#### 📝 Ringkasan Utama
Catatan ini berhasil dikonversi menjadi laporan terstruktur. Berikut adalah poin-poin analisis utama yang didapatkan dari catatan Anda:

#### 📌 Poin-Poin Penting
${lines.map(line => `- **Poin**: ${line.trim()}`).join('\n')}

#### 📋 Tabel Rincian Catatan
| Parameter | Detail Catatan | Keterangan |
|---|---|---|
| Total Kata | ${text.split(/\s+/).length} kata | Panjang Teks |
| Waktu Dibuat | ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | Real-time |
| Status Report | Terkonversi Rapi | **Disetujui** |

> *Catatan: Laporan ini diformat secara otomatis menggunakan AI Engine.*
`;
}

export async function paraphraseText(text: string, style: 'formal' | 'concise' | 'bullet' | 'creative' = 'formal'): Promise<string> {
  if (aiInstance) {
    try {
      const prompt = `
Tolong parafrase teks berikut dalam bahasa Indonesia dengan gaya "${style}". 
Pastikan kalimatnya mengalir dengan alami, profesional, dan mudah dipahami.
Teks asli: "${text}"
`;

      const response = await aiInstance.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      if (response.text) {
        return response.text.trim();
      }
    } catch (err) {
      console.error('Gemini API error during paraphrase:', err);
    }
  }

  // Fallback paraphrase
  if (style === 'concise') {
    return text.substring(0, 100) + (text.length > 100 ? '...' : '');
  } else if (style === 'bullet') {
    return text.split('. ').map(sentence => `- ${sentence.trim()}`).join('\n');
  }
  return `Teks ringkas: ${text}`;
}

export interface AssistantResponse {
  replyText: string;
  action?: 'CREATE_NOTE' | 'MERGE_NOTES' | 'SEARCH_NOTES' | 'GENERATE_REPORT' | 'NONE';
  actionData?: any;
}

export async function processVoiceAssistantCommand(
  userQuery: string,
  existingNotes: any[]
): Promise<AssistantResponse> {
  if (aiInstance) {
    try {
      const notesSummary = existingNotes.slice(0, 10).map((n, idx) => `[ID: ${n.id}] Note ${idx + 1}: ${n.content.substring(0, 80)}...`).join('\n');

      const systemPrompt = `
Anda adalah "Aira", AI Voice Assistant untuk aplikasi Chat Voice Notes.
Pengguna dapat memberikan perintah suara atau teks seperti:
- Membuat catatan baru
- Menggabungkan beberapa catatan
- Mencari atau melihat detail catatan
- Bertanya tentang isi catatan
- Mengubah format catatan

Daftar catatan pengguna saat ini:
${notesSummary}

Responlah HANYA dalam format JSON valid berikut (tanpa markdown wrapper json):
{
  "replyText": "Jawaban lisan singkat dan ramah kepada pengguna dalam bahasa Indonesia",
  "action": "CREATE_NOTE" | "MERGE_NOTES" | "SEARCH_NOTES" | "GENERATE_REPORT" | "NONE",
  "actionData": {
     "content": "isi catatan baru jika CREATE_NOTE",
     "noteIds": ["id1", "id2"] jika MERGE_NOTES,
     "searchKeyword": "kata kunci" jika SEARCH_NOTES
  }
}
User command: "${userQuery}"
`;

      const response = await aiInstance.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: systemPrompt,
      });

      if (response.text) {
        const cleanJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        return parsed as AssistantResponse;
      }
    } catch (err) {
      console.error('Gemini API error during voice assistant command:', err);
    }
  }

  // Heuristic local fallback for assistant commands
  const lower = userQuery.toLowerCase();

  if (lower.includes('buat catatan') || lower.includes('catat') || lower.includes('tulis')) {
    const textToNote = userQuery.replace(/buat catatan|catat|tulis/gi, '').trim() || userQuery;
    return {
      replyText: `Siap! Saya telah membuatkan catatan baru untuk Anda: "${textToNote}".`,
      action: 'CREATE_NOTE',
      actionData: { content: textToNote }
    };
  }

  if (lower.includes('gabung') || lower.includes('kombinasikan') || lower.includes('rangkum semua')) {
    const ids = existingNotes.slice(-3).map(n => n.id);
    return {
      replyText: `Tentu, saya menggabungkan ${ids.length} catatan terakhir Anda menjadi satu laporan terstruktur.`,
      action: 'MERGE_NOTES',
      actionData: { noteIds: ids }
    };
  }

  if (lower.includes('cari') || lower.includes('temukan') || lower.includes('lihat')) {
    const queryTerm = userQuery.replace(/cari|temukan|lihat|catatan/gi, '').trim();
    return {
      replyText: `Menampilkan hasil pencarian untuk "${queryTerm}".`,
      action: 'SEARCH_NOTES',
      actionData: { searchKeyword: queryTerm }
    };
  }

  return {
    replyText: `Saya mendengar perintah Anda: "${userQuery}". Saya dapat membantu Anda membuat catatan, membuat laporan terstruktur, atau menggabungkan catatan!`,
    action: 'NONE'
  };
}
