import { Note } from '@/lib/db';

export interface ExcelTable {
  headers: string[];
  rows: string[][];
}

// Simple markdown-to-HTML parser for Word exports
export function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  // Replace bold and italics
  let html = markdown
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');

  const lines = html.split('\n');
  let outputHtml = '';
  let inList = false;
  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (tableHeaders.length > 0 || tableRows.length > 0) {
      const headerHtml = tableHeaders.length > 0
        ? `<tr>${tableHeaders.map(h => `<th style="background-color: #f1f5f9; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; white-space: nowrap;">${h}</th>`).join('')}</tr>`
        : '';
      const rowsHtml = tableRows.map(row => `<tr>${row.map(cell => `<td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left;">${cell}</td>`).join('')}</tr>`).join('');
      outputHtml += `<table style="border-collapse: collapse; width: auto; margin: 15px 0; border: 1px solid #cbd5e1;">${headerHtml}${rowsHtml}</table>\n`;
      tableHeaders = [];
      tableRows = [];
    }
    inTable = false;
  };

  const flushList = () => {
    if (inList) {
      outputHtml += `</ul>\n`;
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Table checking
    if (trimmed.startsWith('|')) {
      flushList();
      inTable = true;
      const cells = trimmed.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      
      // Separator line?
      if (cells.every(c => /^[-:]+$/.test(c))) {
        continue;
      }
      
      if (tableHeaders.length === 0) {
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else {
      if (inTable) {
        flushTable();
      }
    }

    // List checking
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        inList = true;
        outputHtml += `<ul>\n`;
      }
      outputHtml += `<li>${trimmed.substring(2)}</li>\n`;
      continue;
    } else {
      flushList();
    }

    // Headings and blockquotes
    if (trimmed.startsWith('### ')) {
      outputHtml += `<h3>${trimmed.substring(4)}</h3>\n`;
    } else if (trimmed.startsWith('## ')) {
      outputHtml += `<h2>${trimmed.substring(3)}</h2>\n`;
    } else if (trimmed.startsWith('# ')) {
      outputHtml += `<h1>${trimmed.substring(2)}</h1>\n`;
    } else if (trimmed.startsWith('> ')) {
      outputHtml += `<blockquote style="border-left: 3px solid #6366f1; padding-left: 10px; color: #475569; font-style: italic; margin: 10px 0; background-color: #f8fafc; padding-top: 5px; padding-bottom: 5px;">${trimmed.substring(2)}</blockquote>\n`;
    } else if (trimmed === '') {
      outputHtml += `<br/>\n`;
    } else {
      outputHtml += `<p style="margin: 8px 0; line-height: 1.5;">${trimmed}</p>\n`;
    }
  }

  // Flush remaining elements
  if (inTable) flushTable();
  if (inList) flushList();

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
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const parsedContent = parseMarkdownToHtml(note.content);
  const parsedReport = note.formattedReport ? parseMarkdownToHtml(note.formattedReport) : '';

  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${note.folder || 'Catatan'}</title>
      <style>
        body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.6; color: #1e293b; }
        h1 { color: #1e1b4b; font-size: 24px; border-bottom: 2px solid #4f46e5; padding-bottom: 5px; }
        h2 { color: #334155; font-size: 18px; margin-top: 20px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; }
        h3 { color: #475569; font-size: 14px; margin-top: 15px; }
        p { margin: 8px 0; }
        table { border-collapse: collapse; width: auto; margin: 15px 0; }
        th { background-color: #f1f5f9; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
        td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
        blockquote { border-left: 3px solid #6366f1; padding-left: 10px; color: #475569; font-style: italic; margin: 10px 0; background-color: #f8fafc; padding-top: 5px; padding-bottom: 5px; }
        .meta { color: #64748b; font-size: 12px; margin-bottom: 20px; }
        .badge { background-color: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 10px; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>Laporan Catatan: ${note.folder || 'Umum'}</h1>
      <div class="meta">
        <span class="badge">Folder: ${note.folder || 'Umum'}</span> &bull; 
        <span>Dibuat pada: ${formattedDate}</span>
      </div>
      
      <h2>Isi Catatan Utama</h2>
      <div>${parsedContent}</div>
      
      ${note.formattedReport ? `
        <h2>Laporan Terstruktur (AI)</h2>
        <div>${parsedReport}</div>
      ` : ''}
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
