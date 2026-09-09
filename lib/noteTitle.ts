/**
 * Buat judul singkat & rapi untuk sebuah catatan secara otomatis dari isinya.
 * Murni turunan (tidak disimpan), jadi berlaku untuk semua catatan lama.
 */

const PREFIX_PATTERNS: RegExp[] = [
  /^\s*[✨✅🔹▶️➡️•]+\s*/, // simbol hiasan di awal
  /^hasil parafrase\s*(?:\([^)]*\))?\s*:\s*/i,
  /^laporan gabungan otomatis[^:\n]{0,40}:\s*/i,
  /^berikut\b[^:\n]{0,80}parafrase[^:\n]{0,40}:\s*/i,
  /^berikut (?:adalah |ini )?(?:hasil )?parafrase[^:\n]{0,40}:\s*/i,
  /^(?:laporan(?:\s+(?:eksekutif|terstruktur|singkat|utama|harian|kegiatan))?|judul laporan|ringkasan eksekutif)\s*:\s*/i,
  /^(?:catatan|note)\s*:\s*/i,
];

function cleanupLine(raw: string): string {
  let line = raw;
  for (const p of PREFIX_PATTERNS) line = line.replace(p, '');
  // buang penanda markdown / WhatsApp & garis pemisah
  line = line
    .replace(/[*_~`#>|]/g, '')
    .replace(/[=\-]{3,}/g, ' ')
    .replace(/^[\s\-•\d.)\]]+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return line;
}

export function deriveNoteTitle(content: string, opts: { maxWords?: number; maxChars?: number } = {}): string {
  const maxWords = opts.maxWords ?? 8;
  const maxChars = opts.maxChars ?? 58;

  if (!content || !content.trim()) return 'Catatan Tanpa Judul';

  const cleaned = content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(l => cleanupLine(l.trim()))
    .filter(l => l.length > 0);

  if (cleaned.length === 0) return 'Catatan Tanpa Judul';

  let line = cleaned[0];
  // Gabungkan baris pendek berikutnya (mis. kop surat "POLRESTABES SEMARANG" / "POLSEK TEMBALANG")
  if (line.split(/\s+/).length <= 2 && line.length <= 24 && cleaned[1]) {
    line = `${line} ${cleaned[1]}`.trim();
  }

  // Pola "Label : isi"
  const labelMatch = line.match(/^([A-Za-z0-9 /&().'-]{3,44}?)\s*:\s*\S/);
  const genericLabel = /^(laporan|catatan|note|judul|ringkasan|resume|topik|perihal|hal|subjek|subject|dari|kepada|kpd|yth|tanggal|tgl|waktu|lokasi|tempat|isi)\b/i;
  if (labelMatch && labelMatch[1].trim().split(/\s+/).length <= 5 && !genericLabel.test(labelMatch[1].trim())) {
    // label ringkas & bermakna -> pakai sebagai judul
    line = labelMatch[1].trim();
  } else {
    if (labelMatch && genericLabel.test(labelMatch[1].trim())) {
      // label generik ("Laporan:", "Kepada Yth:") -> pakai isinya
      line = line.slice(line.indexOf(':') + 1).trim();
    }
    // potong di tanda baca pertama yang wajar (koma / titik / dsb.)
    const stop = line.search(/[,.!?;:]/);
    if (stop >= 12) line = line.slice(0, stop).trim();
  }

  const words = line.split(/\s+/).filter(Boolean);
  let title = words.slice(0, maxWords).join(' ');

  if (title.length > maxChars) {
    title = title.slice(0, maxChars).replace(/\s+\S*$/, '');
  }
  // buang tanda baca & kata sambung yang menggantung di ujung judul
  const truncated = words.length > maxWords || title.length < line.length;
  title = title.replace(/[\s,\-–—:;.]+$/, '').trim();
  if (truncated) {
    title = title.replace(/\s+(?:via|dan|di|ke|dari|yang|untuk|pada|atau|serta|dengan|the|of|in|on|a)$/i, '').trim();
  }

  if (!title) return 'Catatan Tanpa Judul';

  // Judul yang SEMUA HURUF BESAR & lebih dari satu kata -> ubah ke Title Case
  if (title === title.toUpperCase() && /\s/.test(title) && /[A-Z]/.test(title)) {
    title = title
      .toLowerCase()
      .replace(/\b([a-z])/g, (_m, c) => c.toUpperCase());
  }

  // Kapitalkan huruf pertama
  return title.charAt(0).toUpperCase() + title.slice(1);
}
