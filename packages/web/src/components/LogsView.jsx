import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RefreshCw,
  Trash2,
  Download,
  Copy,
  Check,
  Search,
  ArrowDown,
  FileText,
  AlertCircle,
  Activity,
  Terminal,
  ShieldAlert,
  Server,
  Zap,
} from 'lucide-react';

export default function LogsView({ onClose }) {
  // Filters matching Image 2 (Hermes Reference)
  const [selectedFile, setSelectedFile] = useState('agent');
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [selectedComponent, setSelectedComponent] = useState('ALL');
  const [selectedLines, setSelectedLines] = useState(100);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);

  // Data & UI states
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date());

  const logContainerRef = useRef(null);

  // Fetch logs from API
  const fetchLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const params = new URLSearchParams({
        file: selectedFile,
        level: selectedLevel,
        component: selectedComponent,
        limit: selectedLines,
      });
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const res = await fetch(`/api/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data || []);
        if (data.stats) setStats(data.stats);
        setLastRefreshedAt(new Date());
      }
    } catch (err) {
      console.warn('Failed to fetch logs:', err.message);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [selectedFile, selectedLevel, selectedComponent, selectedLines, searchQuery]);

  // Initial load & when filters change
  useEffect(() => {
    fetchLogs(false);
  }, [fetchLogs]);

  // Auto-refresh interval (polling every 1.5s when active)
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchLogs(true);
    }, 1500);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchLogs]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Handle scroll detection (if user scrolls up, disable auto-scroll)
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    if (autoScroll !== isAtBottom) {
      setAutoScroll(isAtBottom);
    }
  };

  // Copy logs to clipboard
  const handleCopyLogs = () => {
    const textContent = logs
      .map((l) => `${l.timestamp} ${l.level} ${l.component.toLowerCase()}: ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Clear logs
  const handleClearLogs = async () => {
    if (!window.confirm(`Bersihkan semua catatan log '${selectedFile}'?`)) return;
    try {
      await fetch('/api/logs/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: selectedFile }),
      });
      setLogs([]);
      fetchLogs(false);
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  // Download raw log file
  const handleDownloadLogs = () => {
    window.open(`/api/logs/download?file=${selectedFile}`, '_blank');
  };

  // Filter lists
  const fileOptions = [
    { id: 'agent', label: 'AGENT' },
    { id: 'errors', label: 'ERRORS' },
    { id: 'gateway', label: 'GATEWAY' },
  ];

  const levelOptions = ['ALL', 'DEBUG', 'INFO', 'WARNING', 'ERROR'];
  const componentOptions = ['ALL', 'GATEWAY', 'AGENT', 'TOOLS', 'CLI', 'CRON'];
  const linesOptions = [50, 100, 200, 500];

  return (
    <div className="logs-view-container animate-fade-in">
      {/* Sleek Header */}
      <header className="logs-header-bar">
        <div className="logs-header-left">
          <div className="logs-title-stack">
            <h1 className="logs-main-title">System & Gateway Logs</h1>
            <p className="logs-subtitle">Monitor aktivitas gateway, agent, dan eksekusi sistem secara real-time</p>
          </div>
        </div>

        <div className="logs-header-right">
          <div className="logs-status-indicator" title={autoRefresh ? 'Pembaruan otomatis aktif (setiap 1.5s)' : 'Pembaruan otomatis dijeda'}>
            <span className={`logs-status-dot ${autoRefresh ? 'is-live' : 'is-paused'}`} />
            <span className="logs-status-label">{autoRefresh ? 'Live Stream' : 'Paused'}</span>
          </div>

          <button
            type="button"
            className={`logs-btn-toggle-auto ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Jeda pembaruan otomatis' : 'Aktifkan pembaruan otomatis'}
          >
            {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
          </button>

          <button
            type="button"
            className={`btn-logs-refresh ${isLoading ? 'is-spinning' : ''}`}
            onClick={() => fetchLogs(false)}
            title="Muat ulang log manual"
            aria-label="Muat ulang log"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </header>

      {/* Unified Filter & Search Toolbar (Clean, non-cluttered, no 4-row pill dump) */}
      <section className="logs-toolbar">
        {/* Left: Target Log Tabs */}
        <div className="logs-file-tabs">
          {fileOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`logs-file-tab ${selectedFile === opt.id ? 'active' : ''}`}
              onClick={() => setSelectedFile(opt.id)}
            >
              <span>{opt.label}</span>
              {opt.id === 'errors' && stats?.errorCount > 0 && (
                <span className="logs-error-counter">{stats.errorCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Right: Dropdowns & Search */}
        <div className="logs-toolbar-controls">
          <div className="logs-filter-group">
            <label className="logs-filter-label" htmlFor="logs-level-select">Level</label>
            <select
              id="logs-level-select"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="logs-filter-select"
            >
              {levelOptions.map((lvl) => (
                <option key={lvl} value={lvl}>{lvl === 'ALL' ? 'Semua Level' : lvl}</option>
              ))}
            </select>
          </div>

          <div className="logs-filter-group">
            <label className="logs-filter-label" htmlFor="logs-component-select">Komponen</label>
            <select
              id="logs-component-select"
              value={selectedComponent}
              onChange={(e) => setSelectedComponent(e.target.value)}
              className="logs-filter-select"
            >
              {componentOptions.map((cmp) => (
                <option key={cmp} value={cmp}>{cmp === 'ALL' ? 'Semua Komponen' : cmp}</option>
              ))}
            </select>
          </div>

          <div className="logs-filter-group">
            <label className="logs-filter-label" htmlFor="logs-lines-select">Batas</label>
            <select
              id="logs-lines-select"
              value={selectedLines}
              onChange={(e) => setSelectedLines(Number(e.target.value))}
              className="logs-filter-select"
            >
              {linesOptions.map((num) => (
                <option key={num} value={num}>{num} baris</option>
              ))}
            </select>
          </div>

          <div className="logs-search-box">
            <Search size={13} className="search-icon" />
            <input
              type="text"
              placeholder="Cari log atau endpoint..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="logs-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                title="Hapus pencarian"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Terminal Box Container */}
      <section className="logs-terminal-card">
        {/* Terminal Header */}
        <div className="terminal-card-header">
          <div className="terminal-title-group">
            <div className="terminal-active-file-pill">
              <span className="terminal-file-dot" />
              <span className="terminal-filename">{selectedFile}.log</span>
            </div>
            <span className="terminal-count-badge">
              {logs.length} baris {logs.length === selectedLines ? `(limit ${selectedLines})` : ''}
            </span>
          </div>

          <div className="terminal-actions-group">
            {stats && (
              <div className="terminal-quick-stats">
                <span className="stat-item" title="Resident Set Size (Memory)">
                  {stats.rssMb} MB RSS
                </span>
                <span className="stat-sep">•</span>
                <span className="stat-item" title="Uptime Server">
                  {Math.floor(stats.uptimeSeconds / 60)}m uptime
                </span>
              </div>
            )}

            <button
              type="button"
              className="terminal-action-btn"
              onClick={handleCopyLogs}
              title="Salin seluruh log ke clipboard"
            >
              {copied ? <Check size={12} className="text-emerald" /> : <Copy size={12} />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>

            <button
              type="button"
              className="terminal-action-btn"
              onClick={handleDownloadLogs}
              title="Unduh file log mentah"
            >
              <Download size={12} />
              <span>Unduh</span>
            </button>

            <button
              type="button"
              className="terminal-action-btn btn-danger"
              onClick={handleClearLogs}
              title="Bersihkan log saat ini"
            >
              <Trash2 size={12} />
              <span>Bersihkan</span>
            </button>
          </div>
        </div>

        {/* Monospace Log Viewer Terminal */}
        <div
          ref={logContainerRef}
          onScroll={handleScroll}
          className="terminal-log-content-body"
        >
          {logs.length === 0 ? (
            <div className="logs-empty-state">
              <Terminal size={28} className="empty-icon" />
              <p className="empty-title">Tidak ada catatan log yang cocok</p>
              <p className="empty-desc">
                Coba sesuaikan filter level, komponen, atau bersihkan kata pencarian.
              </p>
            </div>
          ) : (
            logs.map((log) => {
              const isError = log.level === 'ERROR';
              const isWarn = log.level === 'WARN' || log.level === 'WARNING';
              const isDebug = log.level === 'DEBUG';

              let levelClass = 'level-info';
              if (isError) levelClass = 'level-error';
              else if (isWarn) levelClass = 'level-warn';
              else if (isDebug) levelClass = 'level-debug';

              // Format HTTP method & status if available
              const hasHttp = log.meta?.method && log.meta?.status;
              let statusBadgeClass = 'status-ok';
              if (log.meta?.status >= 500) statusBadgeClass = 'status-server-err';
              else if (log.meta?.status >= 400) statusBadgeClass = 'status-client-err';

              return (
                <div
                  key={log.id}
                  className={`log-line-item ${levelClass}`}
                >
                  <span className="log-col-time">{log.timestamp}</span>
                  <span className={`log-col-level ${levelClass}`}>{log.level}</span>
                  <span className="log-col-component">{log.component.toLowerCase()}</span>
                  <span className="log-col-sep">:</span>

                  <span className="log-col-message">
                    {hasHttp ? (
                      <span className="http-log-chunk">
                        <span className="http-method-tag">{log.meta.method}</span>
                        <span className="http-path-tag">{log.meta.path}</span>
                        <span className={`http-status-tag ${statusBadgeClass}`}>
                          {log.meta.status}
                        </span>
                        {log.meta.durationMs !== undefined && (
                          <span className="http-duration-tag">
                            {log.meta.durationMs.toFixed(2)}ms
                          </span>
                        )}
                      </span>
                    ) : (
                      log.message
                    )}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Terminal Bottom Toolbar */}
        <div className="terminal-card-footer">
          <label className="autoscroll-toggle">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            <span>Auto-scroll ke baris terbaru</span>
          </label>

          <span className="footer-last-sync">
            Diperbarui {lastRefreshedAt.toLocaleTimeString()}
          </span>
        </div>
      </section>
    </div>
  );
}
