import React, { useEffect, useState, useRef } from 'react';
import { Copy, Check, Download, Code2, Eye, RefreshCw } from 'lucide-react';
import mermaid from 'mermaid';

// Initialize mermaid with cozy Apple-like aesthetic
let mermaidInitialized = false;

function ensureMermaidInit(isDark) {
  try {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      suppressErrorRendering: true, // Prevents Mermaid from injecting ugly red bomb error into document.body
      theme: isDark ? 'dark' : 'neutral',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Rounded", "SF Pro Text", sans-serif',
      fontSize: 13,
      flowchart: {
        curve: 'basis',
        htmlLabels: true,
        useMaxWidth: true,
        padding: 14,
      },
      themeVariables: isDark
        ? {
            primaryColor: '#1c2844',
            primaryTextColor: '#f5f4ef',
            primaryBorderColor: '#3b82f6',
            lineColor: '#60a5fa',
            secondaryColor: '#1e2029',
            tertiaryColor: '#151722',
            background: 'transparent',
            mainBkg: '#161924',
            nodeBorder: '#3b82f6',
            clusterBkg: 'rgba(255, 255, 255, 0.03)',
            clusterBorder: '#2e354b',
            edgeLabelBackground: '#191b24',
          }
        : {
            primaryColor: '#edf5ff',
            primaryTextColor: '#1c1b18',
            primaryBorderColor: '#0055ff',
            lineColor: '#0055ff',
            secondaryColor: '#f3f4f8',
            tertiaryColor: '#f8fafc',
            background: 'transparent',
            mainBkg: '#ffffff',
            nodeBorder: '#93c5fd',
            clusterBkg: 'rgba(0, 85, 255, 0.03)',
            clusterBorder: '#cbd5e1',
            edgeLabelBackground: '#f1f5f9',
          },
    });
    mermaidInitialized = true;
  } catch (err) {
    console.warn('Mermaid init error:', err);
  }
}

/**
 * Intelligent Auto-Repair for Mermaid Syntax
 * Fixes common syntax errors such as:
 * - Unquoted brackets inside node labels: Compare[array[j] > array[j+1]?] -> Compare["array[j] > array[j+1]?"]
 * - Unquoted conditions in decision nodes: CheckOuter{i < n-1?} -> CheckOuter{"i < n-1?"}
 * - Unquoted stadium pills: Start([Mulai]) -> Start(["Mulai"])
 * - Unquoted subgraphs: subgraph Name [Loop Dalam] -> subgraph Name ["Loop Dalam"]
 */
export function autoRepairMermaid(code) {
  if (!code || typeof code !== 'string') return code;

  const lines = code.split('\n');
  const repaired = lines.map((line) => {
    // Preserve comments and directives
    if (line.trim().startsWith('%%')) return line;

    let processed = line;

    // 1. Dotted arrows with invalid syntax: A -. "Label" -> B OR A -. Label -> B OR A -. "Label" .-> B
    processed = processed.replace(
      /([a-zA-Z0-9_-]+)\s*-\.\s*"?([^"\n\r]+?)"?\s*(?:->|\.->)\s*([a-zA-Z0-9_-]+)/g,
      (match, from, label, to) => {
        const cleanLabel = label.trim().replace(/"/g, "'");
        return `${from} -.->|"${cleanLabel}"| ${to}`;
      }
    );

    // 2. Solid arrows with invalid syntax: A -- "Label" -> B OR A -- Label -> B OR A -- "Label" --> B
    processed = processed.replace(
      /([a-zA-Z0-9_-]+)\s*--\s*"?([^"\n\r|]+?)"?\s*(?:-->|->)\s*([a-zA-Z0-9_-]+)/g,
      (match, from, label, to) => {
        const cleanLabel = label.trim().replace(/"/g, "'");
        return `${from} -->|"${cleanLabel}"| ${to}`;
      }
    );

    // 3. Subgraph labels with brackets: subgraph InnerLoop [Loop Dalam] -> subgraph InnerLoop ["Loop Dalam"]
    processed = processed.replace(
      /^(.*subgraph\s+[a-zA-Z0-9_-]+\s*)\[([^"\n\r\]]+)\](.*)$/i,
      '$1["$2"]$3'
    );

    // 4. Stadium nodes: Start([Mulai]) -> Start(["Mulai"])
    processed = processed.replace(
      /([a-zA-Z0-9_-]+)\(\[\s*([^"\n\r]+?)\s*\]\)/g,
      (match, id, text) => {
        if (text.startsWith('"') && text.endsWith('"')) return match;
        const clean = text.replace(/"/g, "'");
        return `${id}(["${clean}"])`;
      }
    );

    // 5. Decision rhombus nodes with comparison/brackets: CheckOuter{i < n-1?} -> CheckOuter{"i < n-1?"}
    processed = processed.replace(
      /([a-zA-Z0-9_-]+)\{\s*([^"\n\r{}]+?)\s*\}/g,
      (match, id, text) => {
        if (text.startsWith('"') && text.endsWith('"')) return match;
        const clean = text.replace(/"/g, "'");
        return `${id}{"${clean}"}`;
      }
    );

    // 6. Rectangular nodes with nested brackets or arithmetic: Compare[array[j] > array[j+1]?] -> Compare["array[j] > array[j+1]?"]
    // Matches node identifier followed by [...] that is not yet quoted
    processed = processed.replace(
      /([a-zA-Z0-9_-]+)\[([^"\n\r]+)\]/g,
      (match, id, text) => {
        if (text.startsWith('"') && text.endsWith('"')) return match;
        const clean = text.replace(/"/g, "'");
        return `${id}["${clean}"]`;
      }
    );

    return processed;
  });

  return repaired.join('\n');
}

/**
 * Intelligent ASCII Box Flowchart Converter to Mermaid Syntax
 * Converts ASCII box drawing (like in the user's screenshot) to valid Mermaid flowchart.
 */
export function tryConvertAsciiToMermaid(text) {
  if (!text || typeof text !== 'string') return null;

  // Check if text has box drawing characters
  const hasBoxChars = /[┌└├│─┼┬┴┐┘┤▼▲]/.test(text) || (text.includes('-->') && text.includes('|'));
  if (!hasBoxChars) return null;

  const lines = text.split('\n');
  const extractedNodes = [];
  let loopLabel = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect loop/cycle indication at bottom or side
    if (/loop\s+berulang|looping|cycle|berulang\s+terus/i.test(line)) {
      const match = line.match(/\(([^)]+)\)/);
      loopLabel = match ? match[1].trim() : 'Loop berulang';
    }

    // Detect box content between vertical bars: │ ... │
    const boxMatch = line.match(/│\s*([^│]+?)\s*│/);
    if (boxMatch) {
      const label = boxMatch[1].trim();
      // Ignore divider lines or empty strings
      if (label && !/^[─\-_+=]+$/.test(label) && !extractedNodes.includes(label)) {
        extractedNodes.push(label);
      }
    }
  }

  // Need at least 2 distinct nodes to form a meaningful flowchart
  if (extractedNodes.length < 2) return null;

  // Construct Mermaid flowchart syntax
  const sanitizeId = (str, idx) => `node_${idx}_${str.replace(/[^a-zA-Z0-9]/g, '_')}`;

  let mermaidCode = 'flowchart TD\n';
  for (let i = 0; i < extractedNodes.length; i++) {
    const id = sanitizeId(extractedNodes[i], i);
    const label = extractedNodes[i].replace(/"/g, "'");
    mermaidCode += `  ${id}["${label}"]\n`;
  }

  // Add sequential connections
  for (let i = 0; i < extractedNodes.length - 1; i++) {
    const fromId = sanitizeId(extractedNodes[i], i);
    const toId = sanitizeId(extractedNodes[i + 1], i + 1);
    mermaidCode += `  ${fromId} --> ${toId}\n`;
  }

  // Add loop back to first node if detected
  if (loopLabel || /loop/i.test(text)) {
    const lastId = sanitizeId(extractedNodes[extractedNodes.length - 1], extractedNodes.length - 1);
    const firstId = sanitizeId(extractedNodes[0], 0);
    const textLabel = loopLabel ? `|"${loopLabel.replace(/"/g, "'")}"| ` : '';
    mermaidCode += `  ${lastId} -.->${textLabel}${firstId}\n`;
  }

  return mermaidCode;
}

export default function MermaidBlock({ code, title = 'Flowchart' }) {
  const [svgHtml, setSvgHtml] = useState('');
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('visual'); // 'visual' | 'code'
  const [copied, setCopied] = useState(false);
  const containerRef = useRef(null);

  // Helper to remove any Mermaid error artifacts injected into body
  const cleanupMermaidArtifacts = (renderId) => {
    try {
      const stray = document.querySelectorAll(`[id^="${renderId}"], [id^="dmermaid"], svg[aria-roledescription="error"]`);
      stray.forEach((el) => {
        // If element is not inside container, remove it from document body
        if (!containerRef.current || !containerRef.current.contains(el)) {
          el.remove();
        }
      });
    } catch {
      // ignore
    }
  };

  const [retryCount, setRetryCount] = useState(0);

  // Re-render when theme, retry, or code changes
  useEffect(() => {
    let isMounted = true;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    ensureMermaidInit(isDark);

    // Clean alpha-only prefix ID for safe SVG DOM generation
    const renderId = 'mmd_' + Math.random().toString(36).substring(2, 10);
    const sanitizedCode = autoRepairMermaid(code.trim());

    try {
      mermaid
        .render(renderId, sanitizedCode)
        .then(({ svg }) => {
          if (isMounted) {
            setSvgHtml(svg);
            setError(null);
            cleanupMermaidArtifacts(renderId);
          }
        })
        .catch((err) => {
          console.warn('Mermaid render error:', err);
          if (isMounted) {
            setError(err.message || 'Format diagram tidak dikenali');
            cleanupMermaidArtifacts(renderId);
          }
        });
    } catch (err) {
      if (isMounted) {
        setError(err.message || 'Format diagram tidak dikenali');
        cleanupMermaidArtifacts(renderId);
      }
    }

    return () => {
      isMounted = false;
      cleanupMermaidArtifacts(renderId);
    };
  }, [code, retryCount]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    if (!svgHtml) return;
    const blob = new Blob([svgHtml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowchart-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRetry = () => {
    setError(null);
    setRetryCount((prev) => prev + 1);
  };

  return (
    <div className="mermaid-block-container">
      {/* Header with Diagram Controls */}
      <div className="mermaid-block-header">
        <div className="mermaid-header-title">
          <span className="mermaid-badge">SVG Flowchart</span>
          <span className="mermaid-caption">{title}</span>
        </div>

        <div className="mermaid-header-actions">
          {/* Tab toggle: Visual vs Code */}
          <div className="mermaid-tab-pills">
            <button
              type="button"
              className={`mermaid-tab-btn ${viewMode === 'visual' ? 'active' : ''}`}
              onClick={() => setViewMode('visual')}
              title="Tampilkan diagram visual"
            >
              <Eye size={12} />
              <span>Visual</span>
            </button>
            <button
              type="button"
              className={`mermaid-tab-btn ${viewMode === 'code' ? 'active' : ''}`}
              onClick={() => setViewMode('code')}
              title="Tampilkan sintaks kode"
            >
              <Code2 size={12} />
              <span>Kode</span>
            </button>
          </div>

          {/* Retry render button if error */}
          {error && (
            <button
              type="button"
              className="mermaid-action-btn"
              onClick={handleRetry}
              title="Coba proses ulang diagram"
              aria-label="Coba lagi"
            >
              <RefreshCw size={13} />
            </button>
          )}

          {/* Download SVG */}
          {svgHtml && !error && (
            <button
              type="button"
              className="mermaid-action-btn"
              onClick={handleDownloadSvg}
              title="Unduh file SVG"
              aria-label="Unduh SVG"
            >
              <Download size={13} />
            </button>
          )}

          {/* Copy Mermaid Code */}
          <button
            type="button"
            className="mermaid-action-btn"
            onClick={handleCopy}
            title="Salin kode diagram"
            aria-label="Salin kode diagram"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      {/* Main Diagram Canvas or Code View */}
      {viewMode === 'visual' && !error && (
        <div
          ref={containerRef}
          className="mermaid-svg-viewport"
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      )}

      {(viewMode === 'code' || error) && (
        <pre className="mermaid-raw-code">
          <code>{code}</code>
        </pre>
      )}

      {error && (
        <div className="mermaid-error-banner">
          <span>⚠️ {error}. Menampilkan kode teks di atas.</span>
        </div>
      )}
    </div>
  );
}
