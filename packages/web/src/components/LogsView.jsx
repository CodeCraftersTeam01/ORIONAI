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
      {/* Top Header matching Image 2 */}
      <header className="logs-header-bar">
        <div className="logs-header-left">
          <h1 className="logs-main-title">Logs</h1>
          <div className="logs-badge-pill">
            <span className="pill-part">{selectedFile.toUpperCase()}</span>
            <span className="pill-dot">•</span>
            <span className="pill-part">{selectedLevel}</span>
            <span className="pill-dot">•</span>
            <span className="pill-part">{selectedComponent}</span>
          </div>

          <button
            type="button"
            className={`btn-logs-refresh ${isLoading ? 'is-spinning' : ''}`}
            onClick={() => fetchLogs(false)}
            title="Refresh log manual"
            aria-label="Refresh log"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="logs-header-right">
          <label className="logs-auto-refresh-switch" title="Toggle Auto-Refresh">
            <span className="switch-label">AUTO-REFRESH</span>
            <div
              className={`toggle-switch-track ${autoRefresh ? 'active' : ''}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
              role="switch"
              aria-checked={autoRefresh}
              tabIndex={0}
            >
              <div className="toggle-switch-thumb" />
            </div>
          </label>
        </div>
      </header>

      {/* 4 Filter Rows matching Image 2 */}
      <section className="logs-filters-matrix">
        {/* Row 1: FILE */}
        <div className="filter-row">
          <span className="filter-row-label">FILE</span>
          <div className="filter-button-group">
            {fileOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`filter-btn ${selectedFile === opt.id ? 'active' : ''}`}
                onClick={() => setSelectedFile(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: LEVEL */}
        <div className="filter-row">
          <span className="filter-row-label">LEVEL</span>
          <div className="filter-button-group">
            {levelOptions.map((lvl) => (
              <button
                key={lvl}
                type="button"
                className={`filter-btn ${selectedLevel === lvl ? 'active' : ''}`}
                onClick={() => setSelectedLevel(lvl)}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: COMPONENT */}
        <div className="filter-row">
          <span className="filter-row-label">COMPONENT</span>
          <div className="filter-button-group">
            {componentOptions.map((cmp) => (
              <button
                key={cmp}
                type="button"
                className={`filter-btn ${selectedComponent === cmp ? 'active' : ''}`}
                onClick={() => setSelectedComponent(cmp)}
              >
                {cmp}
              </button>
            ))}
          </div>
        </div>

        {/* Row 4: LINES & SEARCH */}
        <div className="filter-row filter-row-inline-search">
          <div className="filter-lines-subwrap">
            <span className="filter-row-label">LINES</span>
            <div className="filter-button-group">
              {linesOptions.map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`filter-btn ${selectedLines === num ? 'active' : ''}`}
                  onClick={() => setSelectedLines(num)}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="logs-search-box">
            <Search size={13} className="search-icon" />
            <input
              type="text"
              placeholder="Cari log atau filter teks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="logs-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Terminal Box Container matching Image 2 */}
      <section className="logs-terminal-card">
        {/* Card Header (e.g. AGENT.LOG) */}
        <div className="terminal-card-header">
          <div className="terminal-title-group">
            <FileText size={15} className="terminal-file-icon" />
            <span className="terminal-filename">{selectedFile.toUpperCase()}.LOG</span>
            <span className="terminal-count-badge">
              {logs.length} baris {logs.length === selectedLines ? `(dibatasi ${selectedLines})` : ''}
            </span>
          </div>

          <div className="terminal-actions-group">
            {stats && (
              <div className="terminal-quick-stats">
                <span className="stat-item" title="Resident Memory Usage">
                  RSS: {stats.rssMb} MB
                </span>
                <span className="stat-sep">•</span>
                <span className="stat-item" title="Uptime Server">
                  Uptime: {Math.floor(stats.uptimeSeconds / 60)}m
                </span>
              </div>
            )}

            <button
              type="button"
              className="terminal-action-btn"
              onClick={handleCopyLogs}
              title="Salin seluruh log"
            >
              {copied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>

            <button
              type="button"
              className="terminal-action-btn"
              onClick={handleDownloadLogs}
              title="Download file .log"
            >
              <Download size={13} />
              <span>Unduh</span>
            </button>

            <button
              type="button"
              className="terminal-action-btn btn-danger"
              onClick={handleClearLogs}
              title="Bersihkan log aktif"
            >
              <Trash2 size={13} />
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
              <Terminal size={32} className="empty-icon" />
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
            Terakhir diperbarui: {lastRefreshedAt.toLocaleTimeString()}
          </span>
        </div>
      </section>
    </div>
  );
}
