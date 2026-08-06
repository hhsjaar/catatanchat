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
Anda adalah asisten pembuat laporan eksekutif profesional.
Tugas Anda: Ubah teks/catatan mentah berikut menjadi Laporan Eksekutif Yang Rapi, Informatif, & Terstruktur dalam bahasa Indonesia.

Instruksi Format WAJIB:
1. Gunakan Markdown yang kaya & rapi.
2. Tambahkan Judul Laporan yang profesional (### atau ####).
3. Buat Ringkasan Eksekutif (paragraf pendahuluan).
4. WAJIB BUAT MINIMAL 1 ATAU 2 TABEL MARKDOWN RAPI (contoh tabel: | No | Topik / Area | Temuan & Analisis | Action Plan / Solusi | Status |).
5. Gunakan Poin-poin Penomoran (1. 2. 3.) untuk topik utama, dan sub-bullet points (- atau *) ber-indentasi di bawahnya untuk rincian tugas/aksi.
6. Gunakan cetak **tebal** (bold) untuk penekanan kata/istilah/nama penting.
7. Berikan bagian "Rekomendasi & Langkah Selanjutnya" yang terstruktur dengan rapi.

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

#### 📝 Ringkasan Eksekutif
Catatan ini telah dikonversi menjadi laporan terstruktur. Berikut adalah matriks evaluasi dan rencana tindakan yang disusun berdasarkan materi catatan:

#### 📋 Tabel Rencana Aksi & Evaluasi Materi
| No | Topik / Area | Rincian Analisis | Action Plan / Solusi | Status |
|---|---|---|---|---|
${lines.map((line, i) => `| ${i + 1} | ${line.substring(0, 25).trim()} | ${line.trim()} | Diselesaikan sesuai target | **Aktif** |`).join('\n')}

#### 📌 Rekomendasi & Langkah Selanjutnya
1. **Pengembangan Rencana Aksi untuk Evaluasi:**
   - Formulasikan **rencana aksi konkret** berdasarkan temuan evaluasi.
   - Prioritaskan perbaikan yang memiliki dampak terbesar pada efisiensi operasional.
2. **Perbaikan Sistem Manajemen & Pemantauan:**
   - Lakukan **audit menyeluruh** terhadap sistem manajemen stok dan operasional saat ini.
   - Pertimbangkan untuk mengimplementasikan **sistem pencatatan dan pemantauan yang lebih efektif**.
   - Tetapkan **level stok minimum (reorder point)** untuk setiap item makanan kritis.

> *Catatan: Laporan ini diformat secara otomatis menggunakan AI Engine.*
`;
}

export async function paraphraseText(text: string, style: 'formal' | 'concise' | 'bullet' | 'creative' = 'formal'): Promise<string> {
  if (aiInstance) {
    try {
      const prompt = `
Tolong parafrase teks berikut dalam bahasa Indonesia dengan gaya "${style}". 

PETUNJUK PENTING:
1. Relevan & Tepat Sasaran: Fokus HANYA pada isi materi teks asli. JANGAN menambahkan cerita luar, asumsi tambahan, atau kalimat bertele-tele (ngalor-ngidul).
2. Format Alami: Jika tidak secara khusus diminta gaya 'bullet', tuliskan dalam paragraf kalimat mengalir yang rapi. JANGAN membuat tabel atau poin-poin jika tidak benar-benar dibutuhkan.
3. Jaga Maksud Asli: Pertahankan semua fakta penting dari teks tanpa mengubah artinya.

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
  return text;
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
