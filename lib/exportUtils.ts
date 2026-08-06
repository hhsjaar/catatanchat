import { Note } from '@/lib/db';

export interface ExcelTable {
  headers: string[];
  rows: string[][];
}

// Helper function to format inline markdown elements (bold, italic, code) with MS Word compatibility
function formatInlineMarkdown(text: string): string {
  if (!text) return '';
  return text
    // Code inline
    .replace(/`([^`]+)`/g, '<code style="background-color: #f1f5f9; padding: 2px 5px; font-family: Consolas, monospace; border-radius: 4px; font-size: 0.9em; color: #4338ca;">$1</code>')
    // Bold with ** or __
    .replace(/\*\*(.*?)\*\*/g, '<b><strong style="font-weight: bold; mso-bidi-font-weight: bold; color: #0f172a;">$1</strong></b>')
    .replace(/__(.*?)__/g, '<b><strong style="font-weight: bold; mso-bidi-font-weight: bold; color: #0f172a;">$1</strong></b>')
    // Italic with * or _
    .replace(/\*(.*?)\*/g, '<i><em style="font-style: italic;">$1</em></i>')
    .replace(/_(.*?)_/g, '<i><em style="font-style: italic;">$1</em></i>');
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
        ? `<thead><tr>${tableHeaders.map(h => `<th style="background-color: #4f46e5; background: #4f46e5; color: #ffffff; font-weight: bold; border: 1pt solid #cbd5e1; padding: 8pt 10pt; text-align: left;">${formatInlineMarkdown(h)}</th>`).join('')}</tr></thead>`
        : '';
      const rowsHtml = tableRows.map((row, idx) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        return `<tr>${row.map(cell => `<td style="border: 1pt solid #cbd5e1; padding: 7pt 10pt; text-align: left; vertical-align: top; background-color: ${bg};">${formatInlineMarkdown(cell)}</td>`).join('')}</tr>`;
      }).join('');
      outputHtml += `<table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; margin-top: 12pt; margin-bottom: 12pt; border: 1pt solid #cbd5e1; font-size: 10pt;">${headerHtml}<tbody>${rowsHtml}</tbody></table>\n`;
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

    // 2. List Item Detection (Ordered or Unordered)
    const indentMatch = line.match(/^(\s*)/);
    const indentLength = indentMatch ? indentMatch[1].length : 0;
    const isBullet = /^[-*]\s+/.test(trimmed);
    const isNumber = /^\d+\.\s+/.test(trimmed);

    if (isBullet || isNumber) {
      const targetType: ListType = isBullet ? 'ul' : 'ol';
      const itemContent = isBullet ? trimmed.replace(/^[-*]\s+/, '') : trimmed.replace(/^\d+\.\s+/, '');

      if (listStack.length === 0) {
        const listStyle = targetType === 'ol'
          ? 'margin-top: 4pt; margin-bottom: 6pt; margin-left: 24pt; padding-left: 0cm; list-style-type: decimal; color: #0f172a; mso-para-margin-left: 2.0gd;'
          : 'margin-top: 4pt; margin-bottom: 6pt; margin-left: 24pt; padding-left: 0cm; list-style-type: disc; color: #1e293b; mso-para-margin-left: 2.0gd;';
        outputHtml += `<${targetType} style="${listStyle}">\n`;
        listStack.push({ type: targetType, indent: indentLength });
      } else {
        const topState = listStack[listStack.length - 1];
        if (topState.type === targetType && indentLength <= topState.indent) {
          // Same level list item
          if (openLi) {
            outputHtml += '</li>\n';
            openLi = false;
          }
        } else if (targetType === 'ul' && topState.type === 'ol') {
          // Sub-bullet point under an ordered item!
          const nestedStyle = 'margin-top: 3pt; margin-bottom: 4pt; margin-left: 48pt; padding-left: 0cm; list-style-type: disc; color: #1e293b; mso-para-margin-left: 4.0gd;';
          outputHtml += `\n<ul style="${nestedStyle}">\n`;
          listStack.push({ type: 'ul', indent: indentLength });
        } else if (targetType === 'ol' && topState.type === 'ul') {
          // Pop nested ul and continue parent ol
          if (openLi) {
            outputHtml += '</li>\n';
            openLi = false;
          }
          const popped = listStack.pop();
          if (popped) {
            outputHtml += `</${popped.type}>\n`;
          }
          if (openLi) {
            outputHtml += '</li>\n';
            openLi = false;
          }
        } else if (indentLength > topState.indent) {
          // Indented sub-level
          const nestedStyle = targetType === 'ol'
            ? 'margin-top: 3pt; margin-bottom: 4pt; margin-left: 48pt; padding-left: 0cm; list-style-type: decimal; color: #0f172a; mso-para-margin-left: 4.0gd;'
            : 'margin-top: 3pt; margin-bottom: 4pt; margin-left: 48pt; padding-left: 0cm; list-style-type: disc; color: #1e293b; mso-para-margin-left: 4.0gd;';
          outputHtml += `\n<${targetType} style="${nestedStyle}">\n`;
          listStack.push({ type: targetType, indent: indentLength });
        }
      }

      outputHtml += `<li style="margin-top: 0cm; margin-bottom: 4pt; line-height: 1.5; mso-line-height-rule: exactly; font-size: 11pt;">${formatInlineMarkdown(itemContent)}`;
      openLi = true;
      continue;
    }

    // Not a list item
    closeAllLists();

    // 3. Headings & Blockquotes
    if (trimmed.startsWith('#### ')) {
      outputHtml += `<h4 style="mso-style-name:'Heading 4'; color: #475569; font-size: 11pt; font-weight: bold; margin-top: 10pt; margin-bottom: 3pt; font-family: 'Calibri', 'Arial', sans-serif;">${formatInlineMarkdown(trimmed.substring(5))}</h4>\n`;
    } else if (trimmed.startsWith('### ')) {
      outputHtml += `<h3 style="mso-style-name:'Heading 3'; color: #334155; font-size: 12pt; font-weight: bold; margin-top: 12pt; margin-bottom: 4pt; font-family: 'Calibri', 'Arial', sans-serif;">${formatInlineMarkdown(trimmed.substring(4))}</h3>\n`;
    } else if (trimmed.startsWith('## ')) {
      outputHtml += `<h2 style="mso-style-name:'Heading 2'; color: #1e293b; font-size: 14pt; font-weight: bold; margin-top: 14pt; margin-bottom: 5pt; border-bottom: 1pt solid #cbd5e1; padding-bottom: 3pt; font-family: 'Calibri', 'Arial', sans-serif;">${formatInlineMarkdown(trimmed.substring(3))}</h2>\n`;
    } else if (trimmed.startsWith('# ')) {
      outputHtml += `<h1 style="mso-style-name:'Heading 1'; color: #1e1b4b; font-size: 18pt; font-weight: bold; margin-top: 16pt; margin-bottom: 6pt; border-bottom: 2pt solid #4f46e5; padding-bottom: 4pt; font-family: 'Calibri', 'Arial', sans-serif;">${formatInlineMarkdown(trimmed.substring(2))}</h1>\n`;
    } else if (trimmed.startsWith('> ')) {
      outputHtml += `<blockquote style="border-left: 4pt solid #6366f1; background-color: #f8fafc; padding: 6pt 10pt; margin: 8pt 0; color: #334155; font-style: italic; border-radius: 4px;">${formatInlineMarkdown(trimmed.substring(2))}</blockquote>\n`;
    } else if (trimmed === '') {
      outputHtml += `<div style="height: 6pt;"></div>\n`;
    } else {
      outputHtml += `<p style="margin-top: 0cm; margin-bottom: 6pt; line-height: 1.5; mso-line-height-rule: exactly; color: #1e293b; font-size: 11pt;">${formatInlineMarkdown(trimmed)}</p>\n`;
    }
  }

  if (inTable) flushTable();
  closeAllLists();

  return outputHtml;
}

// Extract Markdown tables or fallback to a metadata grid
export function extractTablesOrFallback(note: Note): ExcelTable[] {
  const tables: ExcelTable[] = [];
  
  // Find markdown tables in note content and report
  const fullText = `${note.content}\n\n${note.formattedReport || ''}`;
  const lines = fullText.split('\n');
  
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
    tables.push({
      headers: ['Atribut Catatan', 'Nilai / Isi'],
      rows: [
        ['ID Catatan', note.id],
        ['Folder', note.folder || 'Umum'],
        ['Tanggal Dibuat', new Date(note.createdAt).toLocaleString('id-ID')],
        ['Sumber Suara', note.rawAudioTranscript ? 'Ya' : 'Tidak'],
        ['Isi Catatan Utama', note.content],
        ['Laporan Terstruktur', note.formattedReport || '-']
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

// Download functions
export function exportToWord(note: Note) {
  const formattedDate = new Date(note.createdAt).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const parsedContent = parseMarkdownToHtml(note.content);
  const parsedReport = note.formattedReport ? parseMarkdownToHtml(note.formattedReport) : '';

  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${note.folder || 'Catatan'}</title>
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
        @page { size: A4; margin: 1.0in 1.0in 1.0in 1.0in; mso-header-margin: 0.5in; mso-footer-margin: 0.5in; }
        body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11.0pt; line-height: 1.5; mso-line-height-rule: exactly; color: #0f172a; margin: 0; padding: 0; }
        p.MsoNormal, li.MsoNormal, div.MsoNormal { margin-top: 0cm; margin-bottom: 6.0pt; line-height: 1.5; mso-line-height-rule: exactly; font-family: 'Calibri', 'Arial', sans-serif; font-size: 11.0pt; color: #0f172a; }
        h1 { mso-style-name: "Heading 1"; font-family: 'Calibri', 'Arial', sans-serif; font-size: 18.0pt; font-weight: bold; mso-bidi-font-weight: bold; color: #1e1b4b; margin-top: 16.0pt; margin-bottom: 6.0pt; border-bottom: 2pt solid #4f46e5; padding-bottom: 4.0pt; }
        h2 { mso-style-name: "Heading 2"; font-family: 'Calibri', 'Arial', sans-serif; font-size: 14.0pt; font-weight: bold; mso-bidi-font-weight: bold; color: #1e293b; margin-top: 14.0pt; margin-bottom: 5.0pt; border-bottom: 1pt solid #cbd5e1; padding-bottom: 3.0pt; }
        h3 { mso-style-name: "Heading 3"; font-family: 'Calibri', 'Arial', sans-serif; font-size: 12.0pt; font-weight: bold; mso-bidi-font-weight: bold; color: #334155; margin-top: 12.0pt; margin-bottom: 4.0pt; }
        h4 { mso-style-name: "Heading 4"; font-family: 'Calibri', 'Arial', sans-serif; font-size: 11.0pt; font-weight: bold; mso-bidi-font-weight: bold; color: #475569; margin-top: 10.0pt; margin-bottom: 3.0pt; }
        ul { margin-top: 4.0pt; margin-bottom: 8.0pt; margin-left: 24.0pt; padding-left: 0cm; list-style-type: disc; mso-para-margin-left: 2.0gd; }
        ol { margin-top: 4.0pt; margin-bottom: 8.0pt; margin-left: 24.0pt; padding-left: 0cm; list-style-type: decimal; mso-para-margin-left: 2.0gd; }
        ul ul, ol ul { margin-top: 3.0pt; margin-bottom: 4.0pt; margin-left: 48.0pt; padding-left: 0cm; list-style-type: disc; mso-para-margin-left: 4.0gd; }
        li { margin-top: 0cm; margin-bottom: 4.0pt; line-height: 1.5; mso-line-height-rule: exactly; font-size: 11.0pt; }
        strong, b { font-weight: bold; mso-bidi-font-weight: bold; color: #0f172a; }
        table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; margin-top: 12.0pt; margin-bottom: 12.0pt; font-size: 10.0pt; }
        th { background-color: #4f46e5; background: #4f46e5; color: #ffffff; font-weight: bold; mso-bidi-font-weight: bold; border: 1pt solid #cbd5e1; padding: 7.0pt 10.0pt; text-align: left; }
        td { border: 1pt solid #cbd5e1; padding: 7.0pt 10.0pt; text-align: left; vertical-align: top; }
        tr:nth-child(even) td { background-color: #f8fafc; }
        blockquote { border-left: 4.0pt solid #6366f1; background-color: #f8fafc; padding: 6.0pt 10.0pt; margin: 8.0pt 0; color: #334155; font-style: italic; }
        p { margin-top: 0cm; margin-bottom: 6.0pt; line-height: 1.5; mso-line-height-rule: exactly; }
        .header-card { background-color: #f8fafc; border: 1pt solid #e2e8f0; border-left: 6.0pt solid #4f46e5; padding: 14.0pt 18.0pt; margin-bottom: 18.0pt; }
        .doc-title { font-size: 18.0pt; font-weight: bold; mso-bidi-font-weight: bold; color: #1e1b4b; margin: 0 0 6.0pt 0; }
        .meta-row { font-size: 9.5pt; color: #64748b; margin-top: 4.0pt; }
        .badge-folder { background-color: #e0e7ff; color: #3730a3; padding: 3.0pt 10.0pt; font-weight: bold; mso-bidi-font-weight: bold; font-size: 9.0pt; }
        .section-title { font-size: 13.0pt; font-weight: bold; mso-bidi-font-weight: bold; color: #1e293b; margin-top: 18.0pt; margin-bottom: 8.0pt; border-bottom: 2.0pt solid #6366f1; padding-bottom: 4.0pt; text-transform: uppercase; letter-spacing: 0.5pt; }
        .section-box { background-color: #ffffff; border: 1pt solid #e2e8f0; padding: 14.0pt 18.0pt; margin-bottom: 16.0pt; }
        .report-box { background-color: #f0fdf4; border: 1pt solid #bbf7d0; border-left: 5.0pt solid #10b981; padding: 14.0pt 18.0pt; margin-bottom: 16.0pt; }
        .footer-note { border-top: 1pt solid #e2e8f0; padding-top: 10.0pt; font-size: 8.5pt; color: #94a3b8; text-align: center; margin-top: 24.0pt; }
      </style>
    </head>
    <body>
      <div class="header-card">
        <div class="doc-title">Laporan Catatan: ${note.folder || 'Umum'}</div>
        <div class="meta-row">
          <span class="badge-folder">Folder: ${note.folder || 'Umum'}</span> &bull; 
          <span>Dibuat pada: ${formattedDate}</span>
          ${note.rawAudioTranscript ? ' &bull; <span>[Sumber: Rekaman Suara]</span>' : ''}
        </div>
      </div>

      <div class="section-title">Isi Catatan Utama</div>
      <div class="section-box">
        ${parsedContent}
      </div>

      ${note.formattedReport ? `
        <div class="section-title" style="color: #047857; border-bottom-color: #10b981;">Laporan Terstruktur (Hasil AI)</div>
        <div class="report-box">
          ${parsedReport}
        </div>
      ` : ''}

      <div class="footer-note">
        Dokumen Laporan Catatan Suara &bull; Diekspor otomatis pada ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const sanitizedTitle = (note.folder || 'catatan').toLowerCase().replace(/[^a-z0-9]/g, '_');
  a.download = `${sanitizedTitle}_note_${note.id}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
