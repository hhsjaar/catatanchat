import { Note } from '@/lib/db';

export interface ExcelTable {
  headers: string[];
  rows: string[][];
}

// Helper function to format inline markdown elements (bold, italic, code, key-values) with MS Word compatibility
function formatInlineMarkdown(text: string): string {
  if (!text) return '';
  let formatted = text;

  // Code inline
  formatted = formatted.replace(/`([^`]+)`/g, '<code style="background-color: #f1f5f9; padding: 2px 5px; font-family: Consolas, monospace; border-radius: 3px; font-size: 0.9em; color: #4338ca;">$1</code>');
  
  // Bold with ** or __ (inherit parent text color so white on dark containers works seamlessly)
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<b><strong style="font-weight: bold;">$1</strong></b>');
  formatted = formatted.replace(/__(.*?)__/g, '<b><strong style="font-weight: bold;">$1</strong></b>');
  
  // Italic with * or _
  formatted = formatted.replace(/\*(.*?)\*/g, '<i><em style="font-style: italic;">$1</em></i>');
  formatted = formatted.replace(/_(.*?)_/g, '<i><em style="font-style: italic;">$1</em></i>');

  // Auto-bold key label before colon if line starts with key: value pattern (e.g. Hari/Tanggal: Minggu)
  formatted = formatted.replace(/^([A-Za-z0-9\s\/&().-]+):\s+([^\s<].*)$/, (match, p1, p2) => {
    if (p1.includes('http') || p1.includes('https') || p1.startsWith('<b>') || p1.startsWith('<strong')) {
      return match;
    }
    return `<b>${p1}:</b> ${p2}`;
  });

  return formatted;
}

// Comprehensive markdown-to-HTML parser for Word & rich exports
export function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';

  const lines = markdown.split('\n');
  let outputHtml = '';

  type ListType = 'ol' | 'ul';
  interface ListState {
    type: ListType;
    indent: number;
  }
  const listStack: ListState[] = [];
  let openLi = false;

  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const closeAllLists = () => {
    while (listStack.length > 0) {
      if (openLi) {
        outputHtml += '</li>\n';
        openLi = false;
      }
      const top = listStack.pop();
      if (top) {
        outputHtml += `</${top.type}>\n`;
      }
    }
  };

  const flushTable = () => {
    if (tableHeaders.length > 0 || tableRows.length > 0) {
      const headerHtml = tableHeaders.length > 0
        ? `<thead><tr>${tableHeaders.map(h => `<th style="background-color: #1e293b; color: #ffffff !important; font-weight: bold; border: 1pt solid #cbd5e1; padding: 7pt 10pt; text-align: left; font-family: 'Calibri', 'Arial', sans-serif;"><span style="color: #ffffff !important;">${formatInlineMarkdown(h)}</span></th>`).join('')}</tr></thead>`
        : '';
      const rowsHtml = tableRows.map((row, idx) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        return `<tr>${row.map(cell => `<td style="border: 1pt solid #cbd5e1; padding: 6pt 10pt; text-align: left; vertical-align: top; background-color: ${bg}; color: #1e293b; font-family: 'Calibri', 'Arial', sans-serif;">${formatInlineMarkdown(cell)}</td>`).join('')}</tr>`;
      }).join('');
      outputHtml += `<table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; width: 100%; margin-top: 10pt; margin-bottom: 10pt; border: 1pt solid #cbd5e1; font-size: 10pt; font-family: 'Calibri', 'Arial', sans-serif;">${headerHtml}<tbody>${rowsHtml}</tbody></table>\n`;
      tableHeaders = [];
      tableRows = [];
    }
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Table Detection
    if (trimmed.startsWith('|')) {
      closeAllLists();
      inTable = true;
      const cells = trimmed.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      
      // Check if divider line like |---|---|
      if (cells.every(c => /^[-:]+$/.test(c))) {
        continue;
      }
      
      if (tableHeaders.length === 0) {
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    // 2. Horizontal Divider Detection (lines with --- or === or ___)
    const isDivider = /^[-=_]{3,}$/.test(trimmed) || /^[-=_\s]{5,}$/.test(trimmed);
    if (isDivider) {
      closeAllLists();
      outputHtml += `<hr style="border: none; border-top: 1pt solid #cbd5e1; margin: 10pt 0 10pt 0;" />\n`;
      continue;
    }

    // 3. List Item Detection (Ordered or Unordered)
    const indentMatch = line.match(/^(\s*)/);
    const indentLength = indentMatch ? indentMatch[1].length : 0;
    
    // Bullet check (- *, •, +)
    const isBullet = /^[-*•+]\s+/.test(trimmed);
    
    // Numbered section heading vs numbered list item check
    const isNumberMatch = trimmed.match(/^(\d+|[A-Z]|[I|V|X]+)\.\s+(.*)$/);
    let isNumberedHeading = false;
    let isNumberList = false;

    if (isNumberMatch) {
      const restText = isNumberMatch[2].trim();
      
      // If line looks like a major numbered title section (e.g. 1. Informasi Umum Kegiatan)
      const isHeadingKeyword = /^(Informasi|Ringkasan|Pendahuluan|Latar|Tujuan|Hasil|Pelaksanaan|Rekomendasi|Kesimpulan|Analisis|Penutup|Catatan|Agenda|Susunan|Data|Peserta|Lokasi|Waktu)/i.test(restText);
      const isShortHeading = restText.length < 80 && !restText.endsWith('.') && /^[A-Z0-9]/.test(restText);

      if (isHeadingKeyword || isShortHeading) {
        isNumberedHeading = true;
      } else {
        isNumberList = true;
      }
    }

    if (isNumberedHeading) {
      closeAllLists();
      outputHtml += `<h2 style="font-size: 13pt; font-weight: bold; color: #0f172a; margin-top: 14pt; margin-bottom: 5pt; border-bottom: 1pt solid #cbd5e1; padding-bottom: 3pt; font-family: 'Calibri', 'Arial', sans-serif;">${formatInlineMarkdown(trimmed)}</h2>\n`;
      continue;
    }

    if (isBullet || isNumberList) {
      const targetType: ListType = isBullet ? 'ul' : 'ol';
      const itemContent = isBullet 
        ? trimmed.replace(/^[-*•+]\s+/, '') 
        : trimmed.replace(/^(\d+|[A-Z]|[I|V|X]+)\.\s+/, '');

      const listStyle = targetType === 'ol'
        ? 'margin-top: 3pt; margin-bottom: 4pt; margin-left: 0cm; padding-left: 18pt; list-style-type: decimal; color: #0f172a;'
        : 'margin-top: 3pt; margin-bottom: 4pt; margin-left: 0cm; padding-left: 18pt; list-style-type: disc; color: #1e293b;';

      if (listStack.length === 0) {
        outputHtml += `<${targetType} style="${listStyle}">\n`;
        listStack.push({ type: targetType, indent: indentLength });
      } else {
        const topState = listStack[listStack.length - 1];
        if (topState.type === targetType && Math.abs(indentLength - topState.indent) <= 1) {
          // Same level list item
          if (openLi) {
            outputHtml += '</li>\n';
            openLi = false;
          }
        } else if (indentLength > topState.indent) {
          // Sub-level list item
          const nestedStyle = targetType === 'ol'
            ? 'margin-top: 2pt; margin-bottom: 3pt; margin-left: 0cm; padding-left: 18pt; list-style-type: decimal; color: #0f172a;'
            : 'margin-top: 2pt; margin-bottom: 3pt; margin-left: 0cm; padding-left: 18pt; list-style-type: circle; color: #1e293b;';
          outputHtml += `\n<${targetType} style="${nestedStyle}">\n`;
          listStack.push({ type: targetType, indent: indentLength });
        } else {
          // Unindent back to appropriate parent list
          while (listStack.length > 1 && listStack[listStack.length - 1].indent > indentLength) {
            if (openLi) {
              outputHtml += '</li>\n';
              openLi = false;
            }
            const popped = listStack.pop();
            if (popped) {
              outputHtml += `</${popped.type}>\n`;
            }
          }
          if (openLi) {
            outputHtml += '</li>\n';
            openLi = false;
          }
        }
      }

      outputHtml += `<li style="margin-top: 2pt; margin-bottom: 3pt; line-height: 1.45; font-size: 11pt; font-family: 'Calibri', 'Arial', sans-serif;">${formatInlineMarkdown(itemContent)}`;
      openLi = true;
      continue;
    }

    // Not a list item
    closeAllLists();

    // 4. Headings & Special Text Blocks
    if (trimmed.startsWith('#### ')) {
      outputHtml += `<h4 style="color: #334155; font-size: 11pt; font-weight: bold; margin-top: 10pt; margin-bottom: 3pt; font-family: 'Calibri', 'Arial', sans-serif;">${formatInlineMarkdown(trimmed.substring(5))}</h4>\n`;
    } else if (trimmed.startsWith('### ')) {
      outputHtml += `<h3 style="color: #1e293b; font-size: 12pt; font-weight: bold; margin-top: 12pt; margin-bottom: 4pt; font-family: 'Calibri', 'Arial', sans-serif;">${formatInlineMarkdown(trimmed.substring(4))}</h3>\n`;
    } else if (trimmed.startsWith('## ')) {
      outputHtml += `<h2 style="color: #0f172a; font-size: 13.5pt; font-weight: bold; margin-top: 14pt; margin-bottom: 5pt; border-bottom: 1pt solid #e2e8f0; padding-bottom: 3pt; font-family: 'Calibri', 'Arial', sans-serif;">${formatInlineMarkdown(trimmed.substring(3))}</h2>\n`;
    } else if (trimmed.startsWith('# ')) {
      outputHtml += `<h1 style="color: #0f172a; font-size: 16pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt; font-family: 'Calibri', 'Arial', sans-serif;">${formatInlineMarkdown(trimmed.substring(2))}</h1>\n`;
    } else if (trimmed.startsWith('> ')) {
      outputHtml += `<blockquote style="border-left: 3pt solid #3b82f6; background-color: #f8fafc; padding: 6pt 10pt; margin: 8pt 0; color: #334155; font-style: italic; font-family: 'Calibri', 'Arial', sans-serif;">${formatInlineMarkdown(trimmed.substring(2))}</blockquote>\n`;
    } else if (trimmed === '') {
      outputHtml += `<div style="height: 4pt;"></div>\n`;
    } else if (/^(Laporan Eksekutif|Laporan Terstruktur|Laporan Utama|Judul Laporan):/i.test(trimmed)) {
      // Main document title line
      outputHtml += `<h1 style="color: #0f172a; font-size: 15pt; font-weight: bold; margin-top: 10pt; margin-bottom: 6pt; font-family: 'Calibri', 'Arial', sans-serif;">${formatInlineMarkdown(trimmed)}</h1>\n`;
    } else if (/^(Kepada Yth|Dari|Tanggal|Perihal):/i.test(trimmed)) {
      // Formal document metadata line (e.g. Kepada Yth.: KAPOLRESTABES SEMARANG Dari: KAPOLSEK TEMBALANG)
      outputHtml += `<p style="font-size: 11pt; font-weight: bold; color: #1e293b; margin-top: 4pt; margin-bottom: 6pt; font-family: 'Calibri', 'Arial', sans-serif;">${formatInlineMarkdown(trimmed)}</p>\n`;
    } else {
      outputHtml += `<p style="margin-top: 0cm; margin-bottom: 6pt; line-height: 1.5; color: #1e293b; font-size: 11pt; font-family: 'Calibri', 'Arial', sans-serif;">${formatInlineMarkdown(trimmed)}</p>\n`;
    }
  }

  if (inTable) flushTable();
  closeAllLists();

  return outputHtml;
}

// Extract Markdown tables or fallback to a metadata grid
export function extractTablesOrFallback(note: Note): ExcelTable[] {
  const tables: ExcelTable[] = [];
  
  // Use structured report if available, otherwise note content (e.g. paraphrase or note)
  const hasReport = Boolean(note.formattedReport && note.formattedReport.trim().length > 0);
  const targetText = hasReport ? note.formattedReport! : note.content;
  const lines = targetText.split('\n');
  
  let inTable = false;
  let headers: string[] = [];
  let rows: string[][] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|')) {
      inTable = true;
      const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      
      // Separator check
      if (cells.every(c => /^[-:]+$/.test(c))) {
        continue;
      }
      
      if (headers.length === 0) {
        headers = cells;
      } else {
        rows.push(cells);
      }
    } else {
      if (inTable) {
        if (headers.length > 0 || rows.length > 0) {
          tables.push({ headers, rows });
        }
        headers = [];
        rows = [];
        inTable = false;
      }
    }
  }
  
  if (inTable && (headers.length > 0 || rows.length > 0)) {
    tables.push({ headers, rows });
  }
  
  // Fallback if no tables found
  if (tables.length === 0) {
    const isParaphrased = !hasReport && note.content.includes('Hasil Parafrase');
    const contentLabel = hasReport ? 'Laporan Terstruktur' : (isParaphrased ? 'Hasil Parafrase' : 'Isi Catatan');
    
    tables.push({
      headers: ['Atribut Dokumen', 'Keterangan / Isi'],
      rows: [
        ['Folder / Kategori', note.folder || note.category || 'Umum'],
        ['Tanggal Dibuat', new Date(note.createdAt).toLocaleString('id-ID')],
        [contentLabel, targetText]
      ]
    });
  }
  
  return tables;
}

// Generate Excel HTML with auto-fitting column styling
export function generateExcelHtml(tables: ExcelTable[]): string {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Catatan</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; margin-bottom: 20px; }
        th { background-color: #4f46e5; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
        td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; vertical-align: top; }
        .title-row { font-size: 16px; font-weight: bold; color: #1e1b4b; padding-bottom: 10px; }
      </style>
    </head>
    <body>
  `;

  tables.forEach((table, index) => {
    if (tables.length > 1) {
      html += `<div class="title-row">Tabel ${index + 1}</div>`;
    }
    html += '<table>';
    
    // Headers
    if (table.headers.length > 0) {
      html += '<thead><tr>';
      table.headers.forEach(h => {
        html += `<th>${h}</th>`;
      });
      html += '</tr></thead>';
    }
    
    // Rows
    html += '<tbody>';
    table.rows.forEach(row => {
      html += '<tr>';
      row.forEach(cell => {
        const formattedCell = cell.replace(/\n/g, '<br/>');
        html += `<td>${formattedCell}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table><br/>';
  });

  html += `
    </body>
    </html>
  `;
  
  return html;
}

// Download functions - Export clean, formal structured report / paraphrase to Word
export function exportToWord(note: Note) {
  const formattedDate = new Date(note.createdAt).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const hasReport = Boolean(note.formattedReport && note.formattedReport.trim().length > 0);
  const isParaphrased = !hasReport && note.content.includes('Hasil Parafrase');
  const mainMarkdown = hasReport ? note.formattedReport! : note.content;
  const parsedMainContent = parseMarkdownToHtml(mainMarkdown);
  const badgeLabel = hasReport ? 'LAPORAN TERSTRUKTUR' : (isParaphrased ? 'HASIL PARAFRASE' : 'CATATAN');
  const docTitle = hasReport ? 'Laporan Terstruktur' : (isParaphrased ? 'Hasil Parafrase' : (note.folder || 'Catatan'));

  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${docTitle}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForCustomXSL/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 595.3pt 841.9pt;
          margin: 1.0in 1.0in 1.0in 1.0in;
          mso-header-margin: 0.5in;
          mso-footer-margin: 0.5in;
        }
        div.Section1 { page: Section1; }
        
        body, p, td, th, li, h1, h2, h3, h4, div, span {
          font-family: 'Calibri', 'Segoe UI', 'Arial', sans-serif;
        }
        body {
          font-size: 11.0pt;
          line-height: 1.5;
          color: #0f172a;
          margin: 0;
          padding: 0;
        }
        p.MsoNormal, li.MsoNormal, div.MsoNormal {
          margin-top: 0cm;
          margin-bottom: 6.0pt;
          line-height: 1.5;
          font-family: 'Calibri', 'Segoe UI', 'Arial', sans-serif;
          font-size: 11.0pt;
          color: #0f172a;
        }
        h1 {
          font-size: 16.0pt;
          font-weight: bold;
          color: #0f172a;
          margin-top: 14.0pt;
          margin-bottom: 6.0pt;
        }
        h2 {
          font-size: 13.0pt;
          font-weight: bold;
          color: #0f172a;
          margin-top: 12.0pt;
          margin-bottom: 5.0pt;
          border-bottom: 1pt solid #cbd5e1;
          padding-bottom: 3.0pt;
        }
        h3 {
          font-size: 12.0pt;
          font-weight: bold;
          color: #1e293b;
          margin-top: 10.0pt;
          margin-bottom: 4.0pt;
        }
        h4 {
          font-size: 11.0pt;
          font-weight: bold;
          color: #334155;
          margin-top: 8.0pt;
          margin-bottom: 3.0pt;
        }
        ul, ol {
          margin-top: 3.0pt;
          margin-bottom: 6.0pt;
          margin-left: 0cm;
          padding-left: 18.0pt;
        }
        li {
          margin-top: 2.0pt;
          margin-bottom: 3.0pt;
          line-height: 1.45;
          font-size: 11.0pt;
          color: #1e293b;
        }
        strong, b {
          font-weight: bold;
          color: #0f172a;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          margin-top: 10.0pt;
          margin-bottom: 10.0pt;
          font-size: 10.0pt;
        }
        th {
          background-color: #1e293b;
          color: #ffffff !important;
          font-weight: bold;
          border: 1pt solid #cbd5e1;
          padding: 6.0pt 10.0pt;
          text-align: left;
        }
        th strong, th b, th span, th p {
          color: #ffffff !important;
        }
        td {
          border: 1pt solid #cbd5e1;
          padding: 6.0pt 10.0pt;
          text-align: left;
          vertical-align: top;
        }
        hr {
          border: none;
          border-top: 1pt solid #cbd5e1;
          margin: 10.0pt 0 10.0pt 0;
        }
        blockquote {
          border-left: 3.0pt solid #3b82f6;
          background-color: #f8fafc;
          padding: 6.0pt 10.0pt;
          margin: 8.0pt 0;
          color: #334155;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        <!-- Formal Document Header Bar -->
        <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; margin-bottom: 14pt; border-bottom: 2pt solid #0f172a; padding-bottom: 6pt;">
          <tr>
            <td style="border: none; padding: 0 0 6pt 0; vertical-align: bottom;">
              <span style="font-size: 9.5pt; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: 0.5pt;">
                FOLDER: ${note.folder || note.category || 'PEKERJAAN'} &bull; ${formattedDate}
              </span>
            </td>
            <td align="right" style="border: none; padding: 0 0 6pt 0; text-align: right; vertical-align: bottom;">
              <span style="font-size: 9.5pt; font-weight: bold; color: #059669; background-color: #ecfdf5; border: 1pt solid #a7f3d0; padding: 3pt 8pt; border-radius: 4pt;">
                ${badgeLabel}
              </span>
            </td>
          </tr>
        </table>

        <!-- Main Content -->
        <div style="font-size: 11pt; line-height: 1.5; color: #0f172a;">
          ${parsedMainContent}
        </div>

        <!-- Footer -->
        <div style="border-top: 1pt solid #e2e8f0; padding-top: 8pt; font-size: 8.5pt; color: #94a3b8; text-align: center; margin-top: 24pt;">
          Dokumen ${badgeLabel} &bull; Diekspor otomatis pada ${new Date().toLocaleDateString('id-ID')}
        </div>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const sanitizedTitle = (note.folder || 'laporan').toLowerCase().replace(/[^a-z0-9]/g, '_');
  a.download = `${sanitizedTitle}_note_${note.id}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Download functions - Export clean, formal structured report / paraphrase to PDF
export function exportToPDF(note: Note) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const formattedDate = new Date(note.createdAt).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const hasReport = Boolean(note.formattedReport && note.formattedReport.trim().length > 0);
  const isParaphrased = !hasReport && note.content.includes('Hasil Parafrase');
  const mainMarkdown = hasReport ? note.formattedReport! : note.content;
  const parsedMainContent = parseMarkdownToHtml(mainMarkdown);
  const badgeLabel = hasReport ? 'LAPORAN TERSTRUKTUR' : (isParaphrased ? 'HASIL PARAFRASE' : 'CATATAN');
  const docTitle = hasReport ? 'Laporan Terstruktur' : (isParaphrased ? 'Hasil Parafrase' : (note.folder || 'Catatan'));

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${docTitle} - PDF Export</title>
        <style>
          @page {
            size: A4;
            margin: 20mm 20mm 20mm 20mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 30px 40px;
            color: #0f172a;
            line-height: 1.6;
            font-size: 11pt;
            background: #ffffff;
          }
          .header {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .meta-left {
            font-size: 10pt;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .badge {
            background: #ecfdf5;
            color: #059669;
            border: 1px solid #a7f3d0;
            font-size: 9.5pt;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 6px;
            text-transform: uppercase;
          }
          .content-body {
            font-size: 11pt;
            color: #0f172a;
            line-height: 1.6;
          }
          h1, h2, h3, h4 {
            color: #0f172a;
            font-family: inherit;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 14px 0;
            font-size: 10pt;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 7px 10px;
            text-align: left;
            vertical-align: top;
          }
          th {
            background-color: #1e293b !important;
            color: #ffffff !important;
            font-weight: 700;
          }
          blockquote {
            border-left: 3px solid #3b82f6;
            background-color: #f8fafc;
            margin: 10px 0;
            padding: 8px 12px;
            color: #334155;
            font-style: italic;
          }
          .footer {
            margin-top: 36px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            font-size: 8.5pt;
            color: #94a3b8;
            text-align: center;
          }
          @media print {
            body { margin: 0; }
            .header { margin-top: 0; }
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="meta-left">
            FOLDER: ${note.folder || note.category || 'PEKERJAAN'} &bull; ${formattedDate}
          </div>
          <div class="badge">
            ${badgeLabel}
          </div>
        </div>

        <div class="content-body">
          ${parsedMainContent}
        </div>

        <div class="footer">
          Dokumen ${badgeLabel} &bull; Diekspor otomatis pada ${new Date().toLocaleDateString('id-ID')}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

export function exportToExcel(note: Note) {
  const tables = extractTablesOrFallback(note);
  const excelHtml = generateExcelHtml(tables);
  const blob = new Blob(['\ufeff' + excelHtml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const sanitizedTitle = (note.folder || 'catatan').toLowerCase().replace(/[^a-z0-9]/g, '_');
  a.download = `${sanitizedTitle}_note_${note.id}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
