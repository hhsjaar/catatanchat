/**
 * Convert Markdown (AI reports, paraphrase output) into WhatsApp-style plain
 * text so a copied result pastes cleanly into WhatsApp / Telegram / SMS:
 *
 *   **tebal** / __tebal__      -> *tebal*
 *   *miring*  / _miring_       -> _miring_
 *   ~~coret~~                  -> ~coret~
 *   `kode`                     -> `kode`  (dipertahankan)
 *   # Judul                    -> *Judul*
 *   - / * / +  butir           -> - butir
 *   1. butir                   -> 1. butir
 *   > kutipan                  -> > kutipan
 *   [teks](url)                -> teks (url)
 *   | tabel | markdown |       -> daftar rapi ber-label per baris
 *   ---                        -> garis pemisah
 */

function formatEmphasis(segment: string): string {
  let s = segment;
  // Strikethrough
  s = s.replace(/~~([^~\n]+)~~/g, '~$1~');
  // Italic: a single "*" pair not touching another "*"  ->  _italic_
  s = s.replace(/(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/g, '_$1_');
  // Bold: ** or __  ->  * (WhatsApp bold)
  s = s.replace(/\*\*([^*\n]+?)\*\*/g, '*$1*');
  s = s.replace(/__([^_\n]+?)__/g, '*$1*');
  return s;
}

function convertInline(text: string): string {
  if (!text) return '';
  let t = text;

  // Images then links -> "teks (url)"
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (_m, alt, url) => (alt ? `${alt} (${url})` : url));
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, (_m, label, url) => `${label} (${url})`);

  // Process emphasis outside of `inline code` spans only
  return t
    .split(/(`[^`]+`)/)
    .map(part => (part.startsWith('`') && part.endsWith('`') ? part : formatEmphasis(part)))
    .join('');
}

function splitRow(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(c => c.trim());
}

function tableToWhatsApp(tableLines: string[]): string[] {
  const rows = tableLines.map(splitRow);
  if (rows.length === 0) return [];

  const header = rows[0];
  // Drop the |---|---| separator row and any empty rows
  const bodyRows = rows.slice(1).filter(r => !r.every(c => /^:?-{2,}:?$/.test(c) || c === ''));

  if (bodyRows.length === 0) {
    return header.map(h => `- ${convertInline(h)}`).concat('');
  }

  const indexCol = /^(no\.?|nomor|#|urutan)$/i.test((header[0] || '').trim());
  const out: string[] = [];

  bodyRows.forEach((row, idx) => {
    const startJ = indexCol ? 1 : 0;
    const num = indexCol
      ? (row[0] || '').replace(/[^\d]/g, '') || String(idx + 1)
      : String(idx + 1);
    let titleCell = convertInline((row[startJ] || '').trim()) || (header[startJ] || 'Item');
    if (!/^\*.+\*$/.test(titleCell)) titleCell = `*${titleCell}*`;
    out.push(`${num}. ${titleCell}`);

    for (let j = startJ + 1; j < Math.max(header.length, row.length); j++) {
      const label = convertInline((header[j] || '').trim());
      const value = convertInline((row[j] || '').trim());
      if (!value) continue;
      out.push(label ? `   - ${label}: ${value}` : `   - ${value}`);
    }
    out.push('');
  });

  return out;
}

function convertLine(line: string): string {
  const l = line;

  // Horizontal rule
  if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(l)) return '──────────';

  // Headings -> bold line
  const h = l.match(/^\s*#{1,6}\s+(.*)$/);
  if (h) {
    const heading = convertInline(h[1].replace(/\s*#+\s*$/, '').trim());
    return /^\*.+\*$/.test(heading) ? heading : `*${heading}*`;
  }

  // Blockquote
  const q = l.match(/^\s*>\s?(.*)$/);
  if (q) return `> ${convertInline(q[1])}`;

  // Bullet list ( -, *, + ) -> "- "
  const b = l.match(/^(\s*)[-*+]\s+(.*)$/);
  if (b) return `${b[1]}- ${convertInline(b[2])}`;

  // Ordered list
  const n = l.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
  if (n) return `${n[1]}${n[2]}. ${convertInline(n[3])}`;

  return convertInline(l);
}

export function markdownToWhatsApp(md: string): string {
  if (!md) return '';
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let inFence = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*(```|~~~)/.test(line)) {
      out.push(line.trimEnd());
      inFence = !inFence;
      i++;
      continue;
    }
    if (inFence) {
      out.push(line);
      i++;
      continue;
    }

    // Markdown table: a "| ... |" row followed by a "|---|---|" separator
    const isTableRow = /^\s*\|.*\|\s*$/.test(line);
    const nextIsSeparator =
      i + 1 < lines.length &&
      /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) &&
      lines[i + 1].includes('-');
    if (isTableRow && nextIsSeparator) {
      const tableLines: string[] = [];
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim() !== '') {
        tableLines.push(lines[i]);
        i++;
      }
      out.push(...tableToWhatsApp(tableLines));
      continue;
    }

    out.push(convertLine(line));
    i++;
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
