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

  // 2. Normalize markdown headings and tables if glued together
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
  if (trimmed.startsWith('|')) trimmed = trimmed.substring(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.substring(0, trimmed.length - 1);
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
            // Defer SVG conversion while AI is actively typing the diagram code
            if (isStreaming && !part.isClosed) {
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
            if (isStreaming && !part.isClosed) {
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
        return renderTextSegment(part.value, index, isLastPart);
      })}
    </div>
  );
}

export default React.memo(FormattedMessage);
