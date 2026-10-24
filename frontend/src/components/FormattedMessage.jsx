import React, { useState } from 'react';
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

function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <span className="code-block-lang">{language || 'code'}</span>
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
      <pre className="code-block-content">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function FormattedMessage({ content, isStreaming = false }) {
  if (!content) return null;

  // Split content by code blocks and display math blocks ($$...$$ or \[...\])
  const parts = [];
  const blockRegex = /(```([a-zA-Z0-9_-]*)\n([\s\S]*?)```)|(\$\$([\s\S]*?)\$\$)|(\\\[([\s\S]*?)\\\])/g;
  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        value: content.substring(lastIndex, match.index),
      });
    }

    if (match[1]) {
      // Code block
      parts.push({
        type: 'code',
        language: match[2] || 'text',
        value: match[3],
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

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      value: content.substring(lastIndex),
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
          if (
            lang === 'mermaid' ||
            /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|pie|gantt|mindmap|timeline)\b/m.test(trimmedCode)
          ) {
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
              language={part.language}
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
