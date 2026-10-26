import React, { useState, useMemo } from 'react';
import { Copy, Check } from 'lucide-react';
import katex from 'katex';
import MermaidBlock, { tryConvertAsciiToMermaid } from './MermaidBlock';

function MathBlock({ formula }) {
  try {
    const html = katex.renderToString(formula.trim(), {
      displayMode: true,
      throwOnError: false,
    });
    return (
      <div
        className="math-block-container"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    return <div className="math-block-container math-fallback">{formula}</div>;
  }
}

function MathInline({ formula }) {
  try {
    const html = katex.renderToString(formula.trim(), {
      displayMode: false,
      throwOnError: false,
    });
    return (
      <span
        className="math-inline"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    return <span className="math-inline math-fallback">{formula}</span>;
  }
}

function formatHtmlPrettier(html) {
  if (!html) return '';
  let clean = html.trim();

  // 1. Basic syntax repairs
  clean = clean.replace(/<!DOCTYPE\s*([a-zA-Z0-9]+)>/gi, '<!DOCTYPE $1>');
  clean = clean.replace(
    /(<[a-zA-Z1-6]+)(id|class|href|src|type|name|content|rel|style|title|alt|width|height|value|placeholder|target|method|action|lang|charset)=/gi,
    '$1 $2='
  );
  clean = clean.replace(/<title([A-Za-z0-9\s]+)<\/title>/gi, '<title>$1</title>');
  clean = clean.replace(/<!--([^\s-][\s\S]*?[^\s-])-->/g, '<!-- $1 -->');

  // 2. Put newline between consecutive tags: "><" -> ">\n<"
  clean = clean.replace(/>\s*(?=<)/g, '>\n');

  const voidTags = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr|!doctype)$/i;

  const rawLines = clean.split('\n');
  const lines = [];
  for (let l of rawLines) {
    let t = l.trim();
    if (!t) continue;
    // Merge inline closing tags like </p>, </li>, </a> with opening tag on same line if single line element
    if (/^<\/([a-zA-Z1-6]+)>/i.test(t) && lines.length > 0) {
      const tag = RegExp.$1.toLowerCase();
      const prev = lines[lines.length - 1];
      if (new RegExp('^<' + tag + '\\b', 'i').test(prev) && !prev.includes('</' + tag + '>')) {
        lines[lines.length - 1] += t;
        continue;
      }
    }
    lines.push(t);
  }

  let indentLevel = 0;
  const result = [];

  for (let trimmed of lines) {
    // Comments stay at current indent
    if (trimmed.startsWith('<!--')) {
      result.push('  '.repeat(indentLevel) + trimmed);
      continue;
    }

    const isClosing = /^<\/[a-zA-Z0-9_-]+>/i.test(trimmed);
    const isSingleLinePair = /^<([a-zA-Z0-9_-]+)[^>]*>[\s\S]*<\/\1>$/i.test(trimmed);
    const isOpening =
      /^<([a-zA-Z0-9_-]+)[^>]*>/i.test(trimmed) &&
      !trimmed.endsWith('/>') &&
      !isSingleLinePair &&
      !isClosing;

    const openingMatch = trimmed.match(/^<([a-zA-Z0-9_-]+)/i);
    const isVoid = openingMatch && voidTags.test(openingMatch[1]);

    if (isClosing) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    result.push('  '.repeat(indentLevel) + trimmed);

    if (isOpening && !isVoid) {
      indentLevel++;
    }
  }

  return result.join('\n');
}

function formatCodeContent(rawCode, language) {
  if (!rawCode) return '';
  let cleaned = rawCode;

  const isHtml =
    /^(html|htm|xml|svg)$/i.test(language) ||
    /<!DOCTYPE|<html|<\/[a-z]+>/i.test(cleaned);

  const isCss =
    /^(css|scss|less|style)$/i.test(language) ||
    (!isHtml && /([.#a-zA-Z0-9_\-:* >+~]+\s*\{[\s\S]*?\})/i.test(cleaned));

  if (isHtml) {
    return formatHtmlPrettier(cleaned);
  }

  if (isCss) {
    // Strip stray leading }
    cleaned = cleaned.replace(/^\s*\}\s*/, '');
    // Separate glued closing brace and next selector: "}header{" -> "}\n\nheader {"
    cleaned = cleaned.replace(/\}\s*([.#a-zA-Z0-9_\-:* >+~]+)\s*\{/g, '}\n\n$1 {');
    // Opening brace on selector: "selector{prop:" -> "selector {\n  prop:"
    cleaned = cleaned.replace(/([.#a-zA-Z0-9_\-:* >+~]+)\s*\{\s*([a-zA-Z_\-]+:)/g, '$1 {\n  $2');
    // Semicolon followed by another property: ";cursor:" -> ";\n  cursor:"
    cleaned = cleaned.replace(/;(?!\s*[\r\n])\s*([a-zA-Z_\-]+:)/g, ';\n  $1');
    // Space after property colon: "cursor:pointer" -> "cursor: pointer"
    cleaned = cleaned.replace(
      /(?<![:a-zA-Z0-9_\-])([a-zA-Z_\-]+):(?!\s|\/\/|hover|focus|active|visited|before|after|disabled|root)([^\s;\}]+)/gi,
      '$1: $2'
    );
    // Closing brace on own line: ";}" -> ";\n}"
    cleaned = cleaned.replace(/;(?!\s*[\r\n])\s*\}/g, ';\n}');

    // Indent rules cleanly
    const lines = cleaned.split('\n');
    let inRule = false;
    const formatted = lines.map((line) => {
      let trimmed = line.trim();
      if (!trimmed) return '';
      if (trimmed.endsWith('{')) {
        inRule = true;
        return trimmed;
      }
      if (trimmed === '}' || trimmed.startsWith('}')) {
        inRule = false;
        return '}';
      }
      if (inRule) {
        return '  ' + trimmed;
      }
      return trimmed;
    });
    return formatted.join('\n');
  }

  return cleaned;
}

function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);
  const formattedCode = useMemo(() => {
    const clean = formatCodeContent(code, language);
    return clean ? clean.replace(/^\r?\n/, '') : '';
  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedCode || code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = useMemo(() => {
    const text = formattedCode || code || '';
    return text.split('\n');
  }, [formattedCode, code]);

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <div className="code-block-header-left">
          <div className="code-window-dots" aria-hidden="true">
            <span className="code-window-dot dot-red" />
            <span className="code-window-dot dot-yellow" />
            <span className="code-window-dot dot-green" />
          </div>
          <span className="code-block-lang">{language || 'code'}</span>
        </div>
        <button
          type="button"
          className="code-copy-btn"
          onClick={handleCopy}
          aria-label="Salin kode"
        >
          {copied ? (
            <>
              <Check size={13} />
              <span>Tersalin</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Salin</span>
            </>
          )}
        </button>
      </div>
      <div className="code-block-body">
        <div className="code-block-gutter" aria-hidden="true">
          {lines.map((_, idx) => (
            <span key={idx} className="code-line-number">
              {idx + 1}
            </span>
          ))}
        </div>
        <pre className="code-block-content">
          <code>{formattedCode || code}</code>
        </pre>
      </div>
    </div>
  );
}

export function cleanIndonesianFormatting(text) {
  if (!text || typeof text !== 'string') return text;

  // 1. Protect inline code `...`
  const codePlaceholders = [];
  let res = text.replace(/`([^`\n]+)`/g, (match) => {
    codePlaceholders.push(match);
    return `__INLINE_CODE_${codePlaceholders.length - 1}__`;
  });

  // 2. Protect markdown links [text](url)
  const linkPlaceholders = [];
  res = res.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (match) => {
    linkPlaceholders.push(match);
    return `__MD_LINK_${linkPlaceholders.length - 1}__`;
  });

  // 3. Punctuation spacing (exclamation, question mark, comma, semicolon, colon, period)
  res = res.replace(/([?!])([a-zA-Z0-9\u00C0-\u017F])/g, '$1 $2');
  res = res.replace(/,([a-zA-Z\u00C0-\u017F])/g, ', $1');
  res = res.replace(/;([a-zA-Z\u00C0-\u017F])/g, '; $1');
  res = res.replace(/(?<!https?|ftp|file|ws|wss):([a-zA-Z\u00C0-\u017F])/g, ': $1');
  res = res.replace(/(?<=[a-zA-Z0-9\u00C0-\u017F])\.([A-Z\u00C0-\u017F])/g, '. $1');

  // 4. Em-dash and En-dash spacing
  res = res.replace(/([—–])(?=[^\s])/g, '$1 ').replace(/(?<=[^\s])([—–])/g, ' $1');

  // 5. Lowercase followed directly by Uppercase (CamelCase squished Indonesian prose)
  res = res.replace(/([a-z\u00C0-\u017F])([A-Z])/g, '$1 $2');

  // 6. Markdown bold glue
  res = res.replace(/([a-zA-Z0-9\u00C0-\u017F])(\*\*[^\*\n]+\*\*)/g, '$1 $2');
  res = res.replace(/(\*\*[^\*\n]+\*\*)([a-zA-Z0-9\u00C0-\u017F])/g, '$1 $2');

  // 7. Prepositions & conjunctions glued to common Indonesian root nouns/verbs
  const prepPattern = '\\b(dari|ke|di|pada|untuk|dengan|tanpa|dalam|hingga|sampai|mulai|serta|sebagai)';
  const nounPattern = '(penjelasan|perencanaan|kebutuhan|analisis|pemecahan|pertanyaan|pembuatan|pengembangan|pembelajaran|penggunaan|pelaksanaan|pekerjaan|konsep|masalah|informasi|berbagai)';
  res = res.replace(new RegExp(prepPattern + nounPattern + '\\b', 'gi'), '$1 $2');

  // 8. Modal verbs glued with verbs
  const modalPattern = '\\b(siap|dapat|bisa|akan|telah|sudah|sedang|ingin|harus|perlu)';
  const verbPattern = '(membantu|menjawab|menjelaskan|menganalisis|merancang|menyelesaikan|memberikan|menemukan|melakukan|bekerja)';
  res = res.replace(new RegExp(modalPattern + verbPattern + '\\b', 'gi'), '$1 $2');

  // 9. Pronouns glued with words ("buatanyang" -> "buatan yang")
  res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,})(yang|ini|itu|tersebut)\b/gi, (match, p1, p2) => {
    if (/^(go|sa|la|wa|ba|pe|se)yang$/i.test(match)) return match;
    return `${p1} ${p2}`;
  });

  // 10. Fix foreign/Chinese hallucination characters mixed into Indonesian prose (e.g. meng确认 -> mengonfirmasi)
  res = res.replace(/meng\u786e\u8ba4/gi, 'mengonfirmasi');
  res = res.replace(/\u786e\u8ba4/g, 'konfirmasi');

  // 11. Dictionary of known glued Indonesian phrases
  const SQUISHED_MAP = [
    [/\bSenangbertemudengan\b/gi, 'Senang bertemu dengan'],
    [/\bbertemudengan\b/gi, 'bertemu dengan'],
    [/\bSenangbertemu\b/gi, 'Senang bertemu'],
    [/\bselamatpagi\b/gi, 'Selamat pagi'],
    [/\bselamatsiang\b/gi, 'Selamat siang'],
    [/\bselamatsore\b/gi, 'Selamat sore'],
    [/\bselamatmalam\b/gi, 'Selamat malam'],
    [/\bselamatdatang\b/gi, 'Selamat datang'],
    [/\bterimakasih\b/gi, 'terima kasih'],
    [/\bsamadengan\b/gi, 'sama dengan'],
    [/\basistenkecerdasan\b/gi, 'asisten kecerdasan'],
    [/\bkecerdasanbuatan\b/gi, 'kecerdasan buatan'],
    [/\bbuatanyang\b/gi, 'buatan yang'],
    [/\byangsiap\b/gi, 'yang siap'],
    [/\bsiapmembantu\b/gi, 'siap membantu'],
    [/\badalahasisten\b/gi, 'adalah asisten'],
    [/\bberbagaikebutuhan\b/gi, 'berbagai kebutuhan'],
    [/\bdaripenjelasan\b/gi, 'dari penjelasan'],
    [/\bmulaidaripenjelasan\b/gi, 'mulai dari penjelasan'],
    [/\bmulaidari\b/gi, 'mulai dari'],
    [/\bhinggaperencanaan\b/gi, 'hingga perencanaan'],
    [/\bhinggasaat\b/gi, 'hingga saat'],
    [/\bsampaidengan\b/gi, 'sampai dengan'],
    [/\buntuktugas\b/gi, 'untuk tugas'],
    [/\buntukmembantu\b/gi, 'untuk membantu'],
    [/\bdengancara\b/gi, 'dengan cara'],
    [/\bdenganberbagai\b/gi, 'dengan berbagai'],
    [/\bpadadasarnya\b/gi, 'pada dasarnya'],
    [/\bolehkarenaitu\b/gi, 'oleh karena itu'],
    [/\bolehsebabitu\b/gi, 'oleh sebab itu'],
    [/\bdandapat\b/gi, 'dan dapat'],
    [/\bdapatmembantu\b/gi, 'dapat membantu'],
    [/\bbisabantu\b/gi, 'bisa bantu'],
    [/\bsayabantu\b/gi, 'saya bantu'],
    [/\bhariini\b/gi, 'hari ini'],
    [/\bapakahada\b/gi, 'apakah ada'],
    [/\badayang\b/gi, 'ada yang'],
  ];

  for (const [re, repl] of SQUISHED_MAP) {
    res = res.replace(re, repl);
  }

  // 11. Normalize multiple spaces (preserving newlines)
  res = res.replace(/[ \t]{2,}/g, ' ');

  // 12. Restore protected markdown links and inline code
  res = res.replace(/__MD_LINK_(\d+)__/g, (_, idx) => linkPlaceholders[Number(idx)] || '');
  res = res.replace(/__INLINE_CODE_(\d+)__/g, (_, idx) => codePlaceholders[Number(idx)] || '');

  return res;
}

// Helper to unpack and repair markdown tables glued on one line or missing newlines
function repairGluedMarkdownTables(text) {
  if (!text || typeof text !== 'string') return text;

  // 0. Normalize delimiters that lack pipes (e.g. "No | Nama File | Ukuran\n--------" -> "| No | Nama File | Ukuran |\n| --- | --- | --- |")
  let result = text.replace(
    /(^|\n)([^\n|]*\|[^\n]*)\n\s*(-{3,})\s*(?=\n|$)/g,
    (m, pre, header, dashes) => {
      const headerClean = header.trim().replace(/^\|+/, '').replace(/\|+$/, '');
      const cells = headerClean.split('|').map((c) => c.trim());
      if (cells.length >= 2) {
        const cleanHeader = '| ' + cells.join(' | ') + ' |';
        const cleanDelim = '| ' + cells.map(() => '---').join(' | ') + ' |';
        return `${pre}${cleanHeader}\n${cleanDelim}`;
      }
      return m;
    }
  );

  // Separate trailing non-table text glued to the last pipe of a table row
  result = result.replace(
    /(^|\n)(\|(?:\s*[^|\n]+\s*\|){2,})\s*([^\s\n|][^|\n]*)$/gm,
    '$1$2\n\n$3'
  );

  // Regex to match markdown table delimiter row (e.g. |---|---| or ||-------|-------||)
  const delimRegex = /\|+(\s*:?-{2,}:?\s*\|+)+/g;
  let match;

  while ((match = delimRegex.exec(result)) !== null) {
    const delimFull = match[0];
    const delimIndex = match.index;

    // Extract columns from delimiter
    const delimCols = delimFull
      .split('|')
      .map((c) => c.trim())
      .filter((c) => /^:?-{2,}:?$/.test(c));
    const numCols = delimCols.length;
    if (numCols < 2) continue;

    const hasLeadingNewline = delimIndex === 0 || result[delimIndex - 1] === '\n';
    const hasTrailingNewline =
      delimIndex + delimFull.length >= result.length || result[delimIndex + delimFull.length] === '\n';

    // 1. Extract header row from textBefore
    const textBefore = result.slice(0, delimIndex).trimEnd();
    let headerStart = 0;
    let pipeCount = 0;
    for (let i = textBefore.length - 1; i >= 0; i--) {
      if (textBefore[i] === '\n') {
        headerStart = i + 1;
        break;
      }
      if (textBefore[i] === '|') {
        pipeCount++;
        if (pipeCount >= numCols) {
          if (
            i === 0 ||
            textBefore[i - 1] === ':' ||
            textBefore[i - 1] === '`' ||
            textBefore[i - 1] === '\n' ||
            textBefore[i - 1] === ' '
          ) {
            headerStart = i;
            break;
          }
        }
      }
    }

    const headerRaw = textBefore.slice(headerStart).trim();
    const headerClean = headerRaw.replace(/^\|+/, '').replace(/\|+$/, '');
    const headerCells = headerClean
      .split('|')
      .map((c) => c.trim())
      .filter((_, idx) => idx < numCols);
    if (headerCells.length !== numCols) continue;

    const textAfter = result.slice(delimIndex + delimFull.length);

    // If already properly formatted with newlines on every row, leave as-is
    if (hasLeadingNewline && hasTrailingNewline && !textBefore.slice(headerStart).includes('\n') && textAfter.startsWith('\n')) {
      const firstLineAfter = textAfter.trimStart().split('\n')[0] || '';
      const pipesInFirstLine = (firstLineAfter.match(/\|/g) || []).length;
      if (pipesInFirstLine <= numCols + 1) {
        continue;
      }
    }

    // 2. Extract body rows from textAfter
    const bodyRows = [];
    let currentCells = [];
    let currentCellText = '';
    let inCode = false;
    let lastRowEndIndex = 0;
    let i = 0;

    while (i < textAfter.length) {
      const ch = textAfter[i];
      if (ch === '`') inCode = !inCode;

      if (ch === '|' && !inCode) {
        const trimmedCell = currentCellText.trim();
        if (currentCells.length === 0 && trimmedCell === '') {
          // leading pipe, ignore
        } else {
          currentCells.push(trimmedCell);
        }
        currentCellText = '';

        if (currentCells.length === numCols) {
          bodyRows.push(currentCells);
          currentCells = [];
          lastRowEndIndex = i + 1;
        }
      } else if (ch === '\n' && !inCode) {
        if (currentCells.length === 0) {
          if (textAfter[i + 1] === '\n') {
            lastRowEndIndex = i;
            break;
          }
        } else {
          currentCellText += ch;
        }
      } else {
        currentCellText += ch;
      }
      i++;
    }

    if (bodyRows.length > 0) {
      const cleanHeaderLine = '| ' + headerCells.join(' | ') + ' |';
      const cleanDelimLine = '| ' + delimCols.map(() => '---').join(' | ') + ' |';
      const cleanBodyLines = bodyRows.map((row) => '| ' + row.join(' | ') + ' |').join('\n');
      const cleanTable = `${cleanHeaderLine}\n${cleanDelimLine}\n${cleanBodyLines}`;

      const preTable = textBefore.slice(0, headerStart).trim();
      const postTable = textAfter.slice(lastRowEndIndex).trim();

      const repaired = `${preTable ? preTable + '\n\n' : ''}${cleanTable}${postTable ? '\n\n' + postTable : ''}`;
      result = repaired;
      break;
    }
  }

  return result;
}

function FormattedMessage({ content, isStreaming = false }) {
  if (!content) return null;

  // 1. Normalize code boundaries:
  // - Separate code block if glued to preceding text (e.g. coba:```html -> coba:\n\n```html)
  // - Ensure newline after ```<lang> only when directly glued (NEVER split language names!)
  let normalizedContent = content
    .replace(/([^\s\n])(```)/g, '$1\n\n$2')
    .replace(
      /(```(html|css|javascript|js|json|mermaid|python|sql|bash|sh|ts|typescript|xml|yaml|yml))([a-zA-Z<\{\$\!])/gi,
      '$1\n$3'
    )
    .replace(/(```[a-zA-Z0-9_#-]+)(<|[\$\!\{])/g, '$1\n$2');

  // 2. Normalize markdown headings and tables
  // - Repair tables glued onto single line or with missing newlines
  normalizedContent = repairGluedMarkdownTables(normalizedContent);

  // - Heading without space: ##Penjelasan -> ## Penjelasan
  normalizedContent = normalizedContent.replace(/(^|\n)(#{1,6})([^\s#\n])/g, '$1$2 $3');
  // - Heading glued to table: ## Heading| Col1 | Col2 | -> ## Heading\n\n| Col1 | Col2 |
  normalizedContent = normalizedContent.replace(/^(#{1,6}\s+[^|\n]+)(\|)/gm, '$1\n\n$2');
  // - Table delimiter glued to first row: |---|---| Text -> |---|---|\n| Text
  normalizedContent = normalizedContent.replace(/(\|(?::?-+:?\|)+)\s*([^\s\n|])/g, '$1\n| $2');
  // - Consecutive table rows glued on one line: ... dibuat ||2. Pilih -> ... dibuat |\n| 2. Pilih
  normalizedContent = normalizedContent.replace(/(\|\s*)\|\s*([0-9a-zA-Z])/g, '$1\n| $2');

  // 3. If content has raw un-fenced HTML document snippet, wrap it in a code block
  if (!normalizedContent.includes('```')) {
    normalizedContent = normalizedContent.replace(
      /(^|\n)([ \t]*(?:<!DOCTYPE\s+html|<html[\s>])[\s\S]*?<\/html>)/gi,
      '$1\n```html\n$2\n```\n'
    );
  }

  // Split content by code blocks and display math blocks ($$...$$ or \[...\])
  const parts = [];
  const blockRegex = /(```([a-zA-Z0-9_#-]*)[ \t]*(?:\r?\n)?([\s\S]*?)(?:```|$))|(\$\$([\s\S]*?)\$\$)|(\\\[([\s\S]*?)\\\])/g;
  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(normalizedContent)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        value: normalizedContent.substring(lastIndex, match.index),
      });
    }

    if (match[1]) {
      // Code block
      const fullMatch = match[1];
      const isClosed = fullMatch.endsWith('```');
      let lang = (match[2] || '').trim();
      const codeVal = match[3] || '';
      if (!lang || lang === 'text') {
        if (/<!DOCTYPE|<html|<\/[a-z]+>/i.test(codeVal)) {
          lang = 'html';
        }
      }
      parts.push({
        type: 'code',
        language: lang || 'code',
        value: codeVal,
        isClosed,
      });
    } else if (match[4]) {
      // Math block $$...$$
      parts.push({
        type: 'math',
        value: match[5],
      });
    } else if (match[6]) {
      // Math block \[...\]
      parts.push({
        type: 'math',
        value: match[7],
      });
    }

    if (match[0].length === 0) {
      blockRegex.lastIndex++;
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < normalizedContent.length) {
    parts.push({
      type: 'text',
      value: normalizedContent.substring(lastIndex),
    });
  }

  // Helper to render streaming lines where ONLY the trailing edge gets the blur reveal
  const renderStreamingLine = (str, isStreamingActive) => {
    if (!isStreamingActive) {
      return renderInline(str);
    }

    // Isolate blur animation strictly to the newest characters being revealed
    const blurWindow = 18;
    if (str.length <= blurWindow) {
      return (
        <span className="streaming-line-content">
          <span className="streaming-token-blur">{renderInline(str)}</span>
          <span className="streaming-cursor" />
        </span>
      );
    }

    const stablePrefix = str.slice(0, -blurWindow);
    const trailingHead = str.slice(-blurWindow);

    return (
      <span className="streaming-line-content">
        {renderInline(stablePrefix)}
        <span className="streaming-token-blur">{renderInline(trailingHead)}</span>
        <span className="streaming-cursor" />
      </span>
    );
  };

// Helper to parse a markdown table row into cells
function parseTableRow(line) {
  let trimmed = line.trim();
  // Strip all leading and trailing pipes (including double pipes like ||)
  trimmed = trimmed.replace(/^\|+/, '').replace(/\|+$/, '');
  return trimmed.split('|').map((c) => c.trim());
}

// Helper to check if a line is a markdown table delimiter row (e.g. |---|---|)
function isTableDelimiter(line) {
  const cells = parseTableRow(line);
  if (cells.length === 0) return false;
  return cells.every((c) => /^\s*:?-{2,}:?\s*$/.test(c));
}

// Helper to extract text alignments from delimiter row
function getTableAlignments(line) {
  const cells = parseTableRow(line);
  return cells.map((c) => {
    const trimmed = c.trim();
    const startColon = trimmed.startsWith(':');
    const endColon = trimmed.endsWith(':');
    if (startColon && endColon) return 'center';
    if (endColon) return 'right';
    return 'left';
  });
}

  // Helper to parse basic markdown inside text (tables, headings, bold, lists, quotes, inline code)
  const renderTextSegment = (text, segKey, isLastSegment) => {
    const lines = text.split('\n');
    const elements = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      const isLastLine = isLastSegment && i === lines.length - 1;
      const isStreamingActive = isStreaming && isLastLine;

      // 1. Table Detection: line has '|' and next line is a table delimiter
      if (
        trimmed.includes('|') &&
        i + 1 < lines.length &&
        isTableDelimiter(lines[i + 1])
      ) {
        const headerRow = parseTableRow(line);
        const alignments = getTableAlignments(lines[i + 1]);
        const bodyRows = [];
        i += 2; // skip header and delimiter lines

        while (i < lines.length) {
          const bodyLine = lines[i];
          const bodyTrimmed = bodyLine.trim();
          if (!bodyTrimmed || !bodyTrimmed.includes('|')) {
            break;
          }
          bodyRows.push(parseTableRow(bodyLine));
          i++;
        }

        elements.push(
          <div key={`table-${i}`} className="table-wrapper">
            <table className="msg-table">
              <thead>
                <tr>
                  {headerRow.map((cell, cIdx) => (
                    <th
                      key={cIdx}
                      style={{ textAlign: alignments[cIdx] || 'left' }}
                    >
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        style={{ textAlign: alignments[cIdx] || 'left' }}
                      >
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      // 2. Horizontal Divider: '---' or '***' or '___'
      if (/^(---|\*\*\*|___)$/.test(trimmed)) {
        elements.push(<hr key={`hr-${i}`} className="msg-divider" />);
        i++;
        continue;
      }

      // 3. Headings (# through ######)
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = headingMatch[2];
        const Tag = `h${level}`;
        const className = `msg-h${level}`;
        elements.push(
          <Tag key={i} className={className}>
            {renderStreamingLine(headingText, isStreamingActive)}
          </Tag>
        );
        i++;
        continue;
      }

      // 4. Blockquote
      if (trimmed.startsWith('> ')) {
        elements.push(
          <blockquote key={i} className="msg-quote">
            {renderStreamingLine(trimmed.substring(2), isStreamingActive)}
          </blockquote>
        );
        i++;
        continue;
      }

      // 5. Bullet point (- * + • · ✦ ‣ or unicode bullets)
      const bulletMatch = trimmed.match(/^([-*+•·✦‣]|[\u2022\u00b7\u25cf])\s*(.*)/);
      if (bulletMatch) {
        const indentSpaces = (line.match(/^\s*/)[0] || '').length;
        const indentLevel = Math.min(Math.floor(indentSpaces / 2), 4);
        elements.push(
          <div
            key={i}
            className="msg-list-item"
            style={indentLevel > 0 ? { paddingLeft: `${indentLevel * 1.25}rem` } : undefined}
          >
            <span className="msg-bullet">•</span>
            <div className="msg-list-content">
              {renderStreamingLine(bulletMatch[2], isStreamingActive)}
            </div>
          </div>
        );
        i++;
        continue;
      }

      // 6. Numbered list (e.g. "1. " or "1) ")
      const numMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);
      if (numMatch) {
        const indentSpaces = (line.match(/^\s*/)[0] || '').length;
        const indentLevel = Math.min(Math.floor(indentSpaces / 2), 4);
        elements.push(
          <div
            key={i}
            className="msg-list-item"
            style={indentLevel > 0 ? { paddingLeft: `${indentLevel * 1.25}rem` } : undefined}
          >
            <span className="msg-number">{numMatch[1]}.</span>
            <div className="msg-list-content">
              {renderStreamingLine(numMatch[2], isStreamingActive)}
            </div>
          </div>
        );
        i++;
        continue;
      }

      // 7. Empty line
      if (trimmed === '') {
        elements.push(<div key={i} className="msg-spacer" />);
        i++;
        continue;
      }

      // 8. Normal paragraph
      elements.push(
        <p key={i} className="msg-paragraph">
          {renderStreamingLine(line, isStreamingActive)}
        </p>
      );
      i++;
    }

    return (
      <div key={segKey} className="markdown-prose">
        {elements}
      </div>
    );
  };

  // Helper for links, bold, italic, inline code, and inline LaTeX math
  const renderInline = (str) => {
    if (!str || typeof str !== 'string') return str;
    const tokens = [];
    const inlineRegex = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(`([^`]+)`)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(~~([^~]+)~~)|(\\\((.+?)\\\))|(\$([^\$\n]+?)\$)/g;
    let lastIdx = 0;
    let m;

    while ((m = inlineRegex.exec(str)) !== null) {
      if (m.index > lastIdx) {
        tokens.push(str.substring(lastIdx, m.index));
      }
      if (m[1]) {
        // [text](url)
        tokens.push(
          <a
            key={m.index}
            href={m[3]}
            target="_blank"
            rel="noopener noreferrer"
            className="msg-link"
          >
            {m[2]}
          </a>
        );
      } else if (m[4]) {
        // `code`
        tokens.push(
          <code key={m.index} className="inline-code">
            {m[5]}
          </code>
        );
      } else if (m[6]) {
        // **bold**
        tokens.push(
          <strong key={m.index} className="inline-bold">
            {m[7]}
          </strong>
        );
      } else if (m[8]) {
        // *italic*
        tokens.push(
          <em key={m.index} className="inline-italic">
            {m[9]}
          </em>
        );
      } else if (m[10]) {
        // ~~strikethrough~~
        tokens.push(
          <del key={m.index} className="inline-del">
            {m[11]}
          </del>
        );
      } else if (m[12]) {
        // \(math\)
        tokens.push(
          <MathInline key={m.index} formula={m[13]} />
        );
      } else if (m[14]) {
        // $math$ (ignore plain currency like $100 or $5.50)
        const val = m[15];
        if (/^\s*\d+(\.\d+)?\s*$/.test(val)) {
          tokens.push(m[14]);
        } else {
          tokens.push(
            <MathInline key={m.index} formula={val} />
          );
        }
      }
      lastIdx = m.index + m[0].length;
    }

    if (lastIdx < str.length) {
      tokens.push(str.substring(lastIdx));
    }

    return tokens.length > 0 ? tokens : str;
  };

  return (
    <div className={`formatted-message-wrapper ${isStreaming ? 'is-streaming' : ''}`}>
      {parts.map((part, index) => {
        const isLastPart = index === parts.length - 1;
        if (part.type === 'code') {
          const lang = (part.language || '').toLowerCase().trim();
          const trimmedCode = (part.value || '').trim();

          // 1. Explicit mermaid block or direct diagram declaration
          const isMermaid =
            /^merma/i.test(lang) ||
            /(flowchart|graph)\s*(TD|TB|BT|RL|LR)?/i.test(trimmedCode) ||
            /^(sequenceDiagram|classDiagram|stateDiagram|erDiagram|pie|gantt|mindmap|timeline)\b/im.test(trimmedCode);

          if (isMermaid) {
            // Defer SVG conversion while AI is actively typing the diagram code or if code is empty
            if ((isStreaming && !part.isClosed) || !trimmedCode) {
              return (
                <CodeBlock
                  key={index}
                  code={part.value}
                  language={lang || 'mermaid'}
                />
              );
            }

            return (
              <MermaidBlock
                key={index}
                code={trimmedCode}
                title="Flowchart"
              />
            );
          }

          // 2. ASCII Box Flowchart auto-detection (converts box drawing like in user screenshot to Mermaid SVG)
          const convertedMermaid = tryConvertAsciiToMermaid(part.value);
          if (convertedMermaid) {
            if ((isStreaming && !part.isClosed) || !trimmedCode) {
              return (
                <CodeBlock
                  key={index}
                  code={part.value}
                  language={lang || part.language}
                />
              );
            }

            return (
              <MermaidBlock
                key={index}
                code={convertedMermaid}
                title="Flowchart Visual (SVG)"
              />
            );
          }

          return (
            <CodeBlock
              key={index}
              code={part.value}
              language={lang || part.language}
            />
          );
        }
        if (part.type === 'math') {
          return (
            <MathBlock
              key={index}
              formula={part.value}
            />
          );
        }
        return renderTextSegment(cleanIndonesianFormatting(part.value), index, isLastPart);
      })}
    </div>
  );
}

export default React.memo(FormattedMessage);
