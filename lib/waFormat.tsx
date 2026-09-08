'use client';

import React from 'react';

/**
 * Renderer for WhatsApp-style plain text formatting.
 *
 * Supported (same rules as WhatsApp):
 *  - *teks*      -> tebal (bold)
 *  - _teks_      -> miring (italic)
 *  - ~teks~      -> coret (strikethrough)
 *  - `teks`      -> monospace inline
 *  - ```teks```  -> blok monospace (multi-baris)
 *  - "- " / "* " / "• "        -> daftar butir (bullet list)
 *  - "1." / "1) "              -> daftar bernomor (ordered list)
 *  - "> "                      -> kutipan (blockquote)
 *
 * The parser is intentionally forgiving: anything it does not recognise is
 * rendered as-is so pasted WhatsApp broadcasts stay readable.
 */

type InlineToken = { marker: string; regex: RegExp; className: string; tag: 'strong' | 'em' | 's' | 'code' };

const INLINE_TOKENS: InlineToken[] = [
  { marker: '`', regex: /`([^`\n]+)`/, className: 'px-1 py-0.5 rounded bg-slate-200/70 text-[0.85em] font-mono text-indigo-700', tag: 'code' },
  { marker: '*', regex: /\*([^*\n]+)\*/, className: 'font-bold text-slate-900', tag: 'strong' },
  { marker: '_', regex: /_([^_\n]+)_/, className: 'italic', tag: 'em' },
  { marker: '~', regex: /~([^~\n]+)~/, className: 'line-through text-slate-500', tag: 's' },
];

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  if (!text) return [text];

  // Find the earliest matching inline marker.
  let best: { token: InlineToken; index: number; match: RegExpMatchArray } | null = null;
  for (const token of INLINE_TOKENS) {
    const m = text.match(token.regex);
    if (m && m.index !== undefined && (best === null || m.index < best.index)) {
      best = { token, index: m.index, match: m };
    }
  }

  if (!best) return [text];

  const { token, index, match } = best;
  const before = text.slice(0, index);
  const inner = match[1];
  const after = text.slice(index + match[0].length);

  const nodes: React.ReactNode[] = [];
  if (before) nodes.push(before);

  const Tag = token.tag;
  const innerNodes = token.tag === 'code' ? [inner] : renderInline(inner, `${keyBase}-i`);
  nodes.push(
    <Tag key={`${keyBase}-${index}`} className={token.className}>
      {innerNodes}
    </Tag>
  );

  nodes.push(...renderInline(after, `${keyBase}-a${index}`));
  return nodes;
}

interface WhatsAppTextProps {
  text: string;
  className?: string;
}

export const WhatsAppText: React.FC<WhatsAppTextProps> = ({ text, className }) => {
  const source = (text ?? '').replace(/\r\n/g, '\n');
  const lines = source.split('\n');

  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];
  let ordered: { marker: string; content: string }[] = [];
  let quote: string[] = [];
  let codeBlock: string[] | null = null;
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const chunk = paragraph;
    paragraph = [];
    blocks.push(
      <p key={`p-${key++}`} className="whitespace-pre-wrap break-words">
        {chunk.map((ln, i) => (
          <React.Fragment key={i}>
            {i > 0 && <br />}
            {renderInline(ln, `p${key}-${i}`)}
          </React.Fragment>
        ))}
      </p>
    );
  };

  const flushBullets = () => {
    if (bullets.length === 0) return;
    const items = bullets;
    bullets = [];
    blocks.push(
      <ul key={`ul-${key++}`} className="list-disc pl-5 space-y-1 marker:text-indigo-400">
        {items.map((it, i) => (
          <li key={i} className="break-words">{renderInline(it, `ul${key}-${i}`)}</li>
        ))}
      </ul>
    );
  };

  const flushOrdered = () => {
    if (ordered.length === 0) return;
    const items = ordered;
    ordered = [];
    const start = parseInt(items[0].marker, 10);
    blocks.push(
      <ol
        key={`ol-${key++}`}
        start={Number.isFinite(start) ? start : 1}
        className="list-decimal pl-5 space-y-1 marker:text-indigo-400 marker:font-semibold"
      >
        {items.map((it, i) => (
          <li key={i} className="break-words">{renderInline(it.content, `ol${key}-${i}`)}</li>
        ))}
      </ol>
    );
  };

  const flushQuote = () => {
    if (quote.length === 0) return;
    const chunk = quote;
    quote = [];
    blocks.push(
      <blockquote
        key={`q-${key++}`}
        className="border-l-2 border-indigo-300 pl-3 text-slate-600 italic whitespace-pre-wrap break-words"
      >
        {chunk.map((ln, i) => (
          <React.Fragment key={i}>
            {i > 0 && <br />}
            {renderInline(ln, `q${key}-${i}`)}
          </React.Fragment>
        ))}
      </blockquote>
    );
  };

  const flushAll = () => {
    flushParagraph();
    flushBullets();
    flushOrdered();
    flushQuote();
  };

  for (const rawLine of lines) {
    const line = rawLine;
    const trimmed = line.trim();

    // Fenced monospace block ```
    if (trimmed.startsWith('```')) {
      if (codeBlock === null) {
        flushAll();
        codeBlock = [];
        const rest = trimmed.slice(3);
        if (rest.endsWith('```') && rest.length > 3) {
          blocks.push(
            <pre key={`code-${key++}`} className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 overflow-x-auto whitespace-pre-wrap">
              {rest.slice(0, -3)}
            </pre>
          );
          codeBlock = null;
        }
      } else {
        blocks.push(
          <pre key={`code-${key++}`} className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 overflow-x-auto whitespace-pre-wrap">
            {codeBlock.join('\n')}
          </pre>
        );
        codeBlock = null;
      }
      continue;
    }
    if (codeBlock !== null) {
      codeBlock.push(line);
      continue;
    }

    // Blank line -> paragraph / block separator
    if (trimmed === '') {
      flushAll();
      continue;
    }

    // Blockquote
    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushBullets();
      flushOrdered();
      quote.push(quoteMatch[1]);
      continue;
    }

    // Bullet list
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      flushOrdered();
      flushQuote();
      bullets.push(bulletMatch[1]);
      continue;
    }

    // Ordered list
    const orderedMatch = trimmed.match(/^(\d{1,3})[.)]\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      flushBullets();
      flushQuote();
      ordered.push({ marker: orderedMatch[1], content: orderedMatch[2] });
      continue;
    }

    // Plain paragraph line
    flushBullets();
    flushOrdered();
    flushQuote();
    paragraph.push(line);
  }

  if (codeBlock !== null) {
    blocks.push(
      <pre key={`code-${key++}`} className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 overflow-x-auto whitespace-pre-wrap">
        {codeBlock.join('\n')}
      </pre>
    );
  }
  flushAll();

  return <div className={['space-y-2 leading-relaxed', className].filter(Boolean).join(' ')}>{blocks}</div>;
};

/**
 * Strip WhatsApp markup to readable plain text (used for previews / clamped cards
 * where block layout would be awkward).
 */
export function stripWaMarkup(text: string): string {
  return (text ?? '')
    .replace(/```([\s\S]*?)```/g, '$1')
    .replace(/[*_~`]([^*_~`\n]+)[*_~`]/g, '$1')
    .replace(/^\s*[-*•]\s+/gm, '• ')
    .replace(/^\s*>\s?/gm, '')
    .trim();
}
