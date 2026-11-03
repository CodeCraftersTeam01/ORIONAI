import React, { useState, useEffect, useMemo } from 'react';
import {
  Server,
  Cpu,
  Search,
  Plus,
  RotateCw,
  X,
  CheckCircle2,
  AlertCircle,
  Play,
  Terminal,
  Layers,
  Zap,
  Folder,
  Globe,
  GitBranch,
  Brain,
  GitPullRequest,
  Database,
  Compass,
  Box,
  Eye,
  Activity,
  Check,
  Copy,
  Sliders,
  Trash2,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function McpView({ onClose, showToast }) {
  const [servers, setServers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'disabled'

  // Testing states
  const [testingId, setTestingId] = useState(null);
  const [pingResults, setPingResults] = useState({});
  const [isTestingAll, setIsTestingAll] = useState(false);

  // Expanded tools accordion per server
  const [expandedServerTools, setExpandedServerTools] = useState({});

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showToolModal, setShowToolModal] = useState(false);
  const [activeToolContext, setActiveToolContext] = useState(null);
  const [toolArgsInput, setToolArgsInput] = useState('{}');
  const [executingTool, setExecutingTool] = useState(false);
  const [toolExecResult, setToolExecResult] = useState(null);

  // New server form
  const [newServerForm, setNewServerForm] = useState({
    name: '',
    category: 'Development',
    description: '',
    transport: 'stdio',
    command: 'npx',
    args: '',
  });

  // Load MCP servers
  const loadServers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mcp');
      const data = await res.json();
      if (data.success) {
        setServers(data.servers || []);
        setStats(data.stats || null);
      } else {
        showToast?.('Gagal memuat MCP servers: ' + (data.message || 'Error'));
      }
    } catch (err) {
      showToast?.('Kesalahan koneksi MCP: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServers();
  }, []);

  // Filtered servers
  const filteredServers = useMemo(() => {
    return servers.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (s.tools && s.tools.some((t) => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)));

      const matchesCat =
        selectedCategory === 'all' || s.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && s.enabled) ||
        (statusFilter === 'disabled' && !s.enabled);

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [servers, searchQuery, selectedCategory, statusFilter]);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set(['all']);
    servers.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [servers]);

  const activeCount = useMemo(() => servers.filter((s) => s.enabled).length, [servers]);
  const disabledCount = useMemo(() => servers.filter((s) => !s.enabled).length, [servers]);
  const totalTools = useMemo(
    () => servers.reduce((acc, s) => acc + (s.enabled && s.tools ? s.tools.length : 0), 0),
    [servers]
  );

  // Toggle server enabled
  const handleToggle = async (serverId, currentState) => {
    const nextState = !currentState;
    try {
      const res = await fetch(`/api/mcp/${serverId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState, status: nextState ? 'connected' : 'disabled' }),
      });
      const data = await res.json();
      if (data.success) {
        setServers((prev) =>
          prev.map((s) =>
            s.id === serverId ? { ...s, enabled: nextState, status: nextState ? 'connected' : 'disabled' } : s
          )
        );
        showToast?.(`MCP Server '${serverId}' ${nextState ? 'diaktifkan' : 'dinonaktifkan'}.`);
      } else {
        showToast?.('Gagal mengubah status: ' + data.message);
      }
    } catch (err) {
      showToast?.('Kesalahan saat toggle: ' + err.message);
    }
  };

  // Test single server connection
  const handlePing = async (serverId) => {
    setTestingId(serverId);
    try {
      const res = await fetch(`/api/mcp/${serverId}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.result) {
        setPingResults((prev) => ({
          ...prev,
          [serverId]: {
            success: true,
            latency: data.result.latencyMs,
            message: data.result.message,
            timestamp: new Date().toLocaleTimeString('id-ID'),
          },
        }));
        showToast?.(`Koneksi '${serverId}' OK (${data.result.latencyMs}ms)`);
      } else {
        setPingResults((prev) => ({
          ...prev,
          [serverId]: { success: false, message: data.message || 'Koneksi gagal' },
        }));
        showToast?.(`Gagal ping '${serverId}': ${data.message}`);
      }
    } catch (err) {
      showToast?.(`Error ping '${serverId}': ${err.message}`);
    } finally {
      setTestingId(null);
    }
  };

  // Test all servers
  const handleTestAll = async () => {
    setIsTestingAll(true);
    try {
      const res = await fetch('/api/mcp/test-all', { method: 'POST' });
      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        const mapped = {};
        data.results.forEach((r) => {
          mapped[r.id] = {
            success: r.status === 'connected',
            latency: r.latencyMs || 15,
            message: r.message,
            timestamp: new Date().toLocaleTimeString('id-ID'),
          };
        });
        setPingResults(mapped);
        showToast?.(`Berhasil memverifikasi ${data.results.length} server MCP.`);
        await loadServers();
      }
    } catch (err) {
      showToast?.('Gagal menguji server: ' + err.message);
    } finally {
      setIsTestingAll(false);
    }
  };

  // Delete custom server
  const handleDeleteServer = async (serverId, serverName) => {
    if (!window.confirm(`Hapus MCP Server '${serverName}'?`)) return;
    try {
      const res = await fetch(`/api/mcp/${serverId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast?.(`MCP Server '${serverName}' berhasil dihapus.`);
        await loadServers();
      } else {
        showToast?.(data.message || 'Gagal menghapus server');
      }
    } catch (err) {
      showToast?.('Kesalahan menghapus server: ' + err.message);
    }
  };

  // Create new server
  const handleCreateServer = async (e) => {
    e.preventDefault();
    if (!newServerForm.name.trim()) return;

    try {
      const argsArray = newServerForm.args
        ? newServerForm.args.split(' ').map((a) => a.trim()).filter(Boolean)
        : [];

      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newServerForm.name.trim(),
          category: newServerForm.category,
          description: newServerForm.description.trim() || 'Custom MCP Server',
          transport: newServerForm.transport,
          command: newServerForm.command.trim() || 'npx',
          args: argsArray,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(`MCP Server '${newServerForm.name}' berhasil didaftarkan!`);
        setShowAddModal(false);
        setNewServerForm({
          name: '',
          category: 'Development',
          description: '',
          transport: 'stdio',
          command: 'npx',
          args: '',
        });
        await loadServers();
      } else {
        showToast?.('Gagal membuat server: ' + data.message);
      }
    } catch (err) {
      showToast?.('Kesalahan saat menambah server: ' + err.message);
    }
  };

  // Open Tool Tester Modal
  const handleOpenToolTester = (server, tool) => {
    setActiveToolContext({ server, tool });
    setToolExecResult(null);

    const sample = {};
    if (tool.parameters) {
      Object.keys(tool.parameters).forEach((paramKey) => {
        const p = tool.parameters[paramKey];
        if (paramKey === 'path') sample[paramKey] = 'README.md';
        else if (paramKey === 'url') sample[paramKey] = 'https://modelcontextprotocol.io';
        else if (paramKey === 'query') sample[paramKey] = 'AI Agent workflows';
        else if (paramKey === 'command') sample[paramKey] = 'git status';
        else if (p.type === 'boolean') sample[paramKey] = true;
        else if (p.type === 'number') sample[paramKey] = 5;
        else sample[paramKey] = 'sample_value';
      });
    }
    setToolArgsInput(JSON.stringify(sample, null, 2));
    setShowToolModal(true);
  };

  // Execute Tool Test
  const handleExecuteTool = async () => {
    if (!activeToolContext) return;
    setExecutingTool(true);
    setToolExecResult(null);

    let parsedArgs = {};
    try {
      parsedArgs = JSON.parse(toolArgsInput);
    } catch (err) {
      showToast?.('Format JSON parameter tidak valid: ' + err.message);
      setExecutingTool(false);
      return;
    }

    try {
      const res = await fetch('/api/mcp/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: activeToolContext.tool.name,
          args: parsedArgs,
          serverId: activeToolContext.server.id,
        }),
      });
      const data = await res.json();
      if (data.success && data.execution) {
        setToolExecResult(data.execution);
        showToast?.(`Tool '${activeToolContext.tool.name}' berhasil dieksekusi!`);
      } else {
        setToolExecResult({ error: data.message || 'Eksekusi gagal' });
      }
    } catch (err) {
      setToolExecResult({ error: err.message });
    } finally {
      setExecutingTool(false);
    }
  };

  const getServerIcon = (id) => {
    if (id === 'filesystem') return <Folder size={16} />;
    if (id === 'fetch') return <Globe size={16} />;
    if (id === 'git') return <GitBranch size={16} />;
    if (id === 'memory') return <Brain size={16} />;
    if (id === 'github') return <GitPullRequest size={16} />;
    if (id === 'sqlite') return <Database size={16} />;
    if (id === 'brave-search') return <Compass size={16} />;
    if (id === 'terminal-shell') return <Terminal size={16} />;
    if (id === 'docker') return <Box size={16} />;
    if (id === 'puppeteer') return <Eye size={16} />;
    return <Server size={16} />;
  };

  const toggleToolsAccordion = (serverId) => {
    setExpandedServerTools((prev) => ({
      ...prev,
      [serverId]: !prev[serverId],
    }));
  };

  return (
    <div className="models-view-wrapper animate-page-enter">
      <div className="models-view-inner">
        {/* ================= HEADER BAR ================= */}
        <div className="models-main-header">
          <div className="models-title-block">
            <h1 className="models-heading">MCP Server Hub</h1>
            <p className="models-subheading">
              Katalog dan konfigurasi Model Context Protocol (MCP) untuk menghubungkan LLM ke filesystem, database, Git, dan tools eksternal
            </p>
          </div>

          <div className="models-header-actions">
            <button
              type="button"
              className="models-btn-ghost"
              onClick={handleTestAll}
              disabled={isTestingAll}
              title="Ping & verifikasi koneksi seluruh server MCP"
            >
              <RotateCw size={12} className={isTestingAll ? 'is-spinning' : ''} />
              <span>{isTestingAll ? 'MEMVERIFIKASI...' : 'TEST SEMUA'}</span>
            </button>

            <button
              type="button"
              className="models-btn-primary"
              onClick={() => setShowAddModal(true)}
              title="Tambah MCP Server kustom"
            >
              + TAMBAH SERVER
            </button>

            {onClose && (
              <button
                type="button"
                className="models-refresh-btn"
                onClick={onClose}
                aria-label="Tutup halaman"
                title="Tutup halaman"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ================= TOP TWO SURFACE CARDS (HERMES / MODELS SYMMETRICAL HERO) ================= */}
        <div className="models-hero-grid">
          {/* Card 1: PROTOCOL & RUNTIME SETTINGS */}
          <div className="models-surface-card models-settings-hero">
            <div className="models-surface-header">
              <div className="surface-header-title-wrap">
                <Sliders size={14} className="surface-title-icon" />
                <span className="surface-title-text">MCP PROTOCOL & RUNTIME</span>
              </div>
              <span className="surface-pill-tag">JSON-RPC 2.0 v1.2</span>
            </div>

            <div className="models-settings-rows">
              {/* Row 1: Protocol Transport */}
              <div className="models-setting-row">
                <div className="setting-row-meta">
                  <div className="setting-row-label">
                    <Terminal size={13} className="setting-icon-star" />
                    <span>TRANSPORT ENGINE</span>
                  </div>
                  <div className="setting-row-spec">
                    <span className="spec-badge">STDIO & SSE</span>
                    <span className="spec-dot">·</span>
                    <span className="spec-name">Subprocess pipes & EventStreams</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="models-btn-ghost"
                  onClick={() => showToast?.('Protokol MCP v1.2 berjalan pada standard I/O dan Server-Sent Events.')}
                >
                  INFO
                </button>
              </div>

              {/* Row 2: Active Registry */}
              <div className="models-setting-row">
                <div className="setting-row-meta">
                  <div className="setting-row-label">
                    <Server size={13} className="setting-icon-cog" />
                    <span>REGISTERED SERVERS</span>
                  </div>
                  <div className="setting-row-spec">
                    <span className="spec-count">{servers.length} servers</span>
                    <span className="spec-dot">·</span>
                    <span className="spec-mode">
                      {activeCount} aktif, {disabledCount} nonaktif
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="models-btn-ghost"
                  onClick={handleTestAll}
                  disabled={isTestingAll}
                >
                  PING ALL
                </button>
              </div>

              {/* Row 3: Active Tool Registry */}
              <div className="models-setting-row">
                <div className="setting-row-meta">
                  <div className="setting-row-label">
                    <Layers size={13} className="setting-icon-moa" />
                    <span>TOOL REGISTRY</span>
                  </div>
                  <div className="setting-row-spec">
                    <span className="spec-count">{totalTools} tools active</span>
                    <span className="spec-dot">·</span>
                    <span className="spec-mode">Injected to Agent loop</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="models-btn-ghost"
                  onClick={() => {
                    const el = document.getElementById('mcp-servers-list-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  EXPLORE
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: METRICS & SUMMARY HERO (Symmetrical to Models Analytics) */}
          <div className="models-surface-card models-analytics-hero">
            <div className="analytics-metrics-list">
              <div className="analytics-metric-item">
                <span className="metric-number">{activeCount}</span>
                <span className="metric-dotted-leader" />
                <span className="metric-label">SERVERS CONNECTED</span>
              </div>

              <div className="analytics-metric-item">
                <span className="metric-number">{totalTools}</span>
                <span className="metric-dotted-leader" />
                <span className="metric-label">TOOLS REGISTERED</span>
              </div>
            </div>

            <div className="analytics-note-box">
              <Info size={13} className="analytics-note-icon" />
              <p className="analytics-note-text">
                Model Context Protocol (MCP) memungkinkan LLM mengakses berkas lokal, git, SQLite, dan endpoint web secara terproteksi. Seluruh tool yang diaktifkan di bawah otomatis tersedia di prompt reasoning Orion Agent.
              </p>
            </div>
          </div>
        </div>

        {/* ================= MCP SERVERS SECTION ================= */}
        <div className="models-combos-section" id="mcp-servers-list-section">
          <div className="combos-section-header">
            <div className="combos-header-left">
              <div className="combos-title-wrap">
                <Server size={18} className="combos-main-icon" />
                <h2 className="combos-title">Daftar Server Terpasang</h2>
              </div>
              <p className="combos-subtitle">
                Server Model Context Protocol aktif dengan konfigurasi transport dan perkakas eksekusi.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="models-filter-pills">
              <button
                type="button"
                className={`models-pill-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                Semua ({servers.length})
              </button>
              <button
                type="button"
                className={`models-pill-btn ${statusFilter === 'active' ? 'active' : ''}`}
                onClick={() => setStatusFilter('active')}
              >
                Aktif ({activeCount})
              </button>
              <button
                type="button"
                className={`models-pill-btn ${statusFilter === 'disabled' ? 'active' : ''}`}
                onClick={() => setStatusFilter('disabled')}
              >
                Nonaktif ({disabledCount})
              </button>
            </div>
          </div>

          {/* Search Bar & Categories */}
          <div className="models-surface-card" style={{ padding: '0.85rem 1.15rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Cari server MCP atau nama tool (contoh: git, read_file, brave)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.45rem 0.75rem 0.45rem 2rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    fontFamily: 'var(--font-sans)',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Category Pills */}
              <div className="models-filter-pills" style={{ flexWrap: 'wrap' }}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`models-pill-btn ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat === 'all' ? 'Semua Kategori' : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Servers Cards List (Identical to Combos Cards List) */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <RotateCw size={24} className="is-spinning" style={{ margin: '0 auto 0.75rem' }} />
              <p>Memuat konfigurasi Model Context Protocol...</p>
            </div>
          ) : filteredServers.length === 0 ? (
            <div className="models-surface-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <Server size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
              <h3 style={{ margin: '0 0 0.35rem', color: 'var(--text-primary)', fontSize: '1rem' }}>
                Tidak ada server MCP yang cocok
              </h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Ubah kata kunci pencarian atau reset filter status/kategori.
              </p>
            </div>
          ) : (
            <div className="combos-cards-list">
              {filteredServers.map((server) => {
                const pingInfo = pingResults[server.id];
                const isPinging = testingId === server.id;
                const isToolsExpanded = Boolean(expandedServerTools[server.id]);

                return (
                  <div
                    key={server.id}
                    className={`models-surface-card combo-item-card ${server.enabled ? 'is-active-combo' : ''}`}
                  >
                    {/* Top Main Row */}
                    <div className="combo-card-main-row">
                      <div className="combo-card-left">
                        <div className="combo-card-icon-box">
                          {getServerIcon(server.id)}
                        </div>

                        <div className="combo-card-info">
                          <div className="combo-name-row">
                            <span className="combo-name">{server.name}</span>
                            <span className="spec-badge">
                              {server.isBuiltin ? 'BUILT-IN' : 'CUSTOM'}
                            </span>
                            <span className="combo-strategy-tag">{server.category}</span>
                            <span className="spec-badge font-mono">
                              {server.transport.toUpperCase()}
                            </span>

                            {server.enabled ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  fontSize: '0.72rem',
                                  color: 'var(--accent-emerald, #10b981)',
                                  fontWeight: 600,
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                <span
                                  style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: 'currentColor',
                                  }}
                                />
                                {pingInfo ? `${pingInfo.latency}ms OK` : `${server.latencyMs || 15}ms OK`}
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  color: 'var(--text-muted)',
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                OFFLINE
                              </span>
                            )}
                          </div>

                          <p
                            style={{
                              margin: 0,
                              color: 'var(--text-secondary)',
                              fontSize: '0.82rem',
                              lineHeight: 1.45,
                            }}
                          >
                            {server.description}
                          </p>
                        </div>
                      </div>

                      {/* Right Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="models-btn-ghost"
                          onClick={() => handlePing(server.id)}
                          disabled={isPinging || !server.enabled}
                          title="Uji latensi koneksi server MCP ini"
                        >
                          <Activity size={12} className={isPinging ? 'is-spinning' : ''} />
                          <span>{isPinging ? 'PING...' : 'TEST PING'}</span>
                        </button>

                        <button
                          type="button"
                          className="models-btn-ghost"
                          onClick={() => toggleToolsAccordion(server.id)}
                          title="Buka daftar perkakas server ini"
                        >
                          <Layers size={12} />
                          <span>TOOLS ({server.tools?.length || 0})</span>
                          {isToolsExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>

                        <button
                          type="button"
                          className={server.enabled ? 'models-btn-primary' : 'models-btn-ghost'}
                          onClick={() => handleToggle(server.id, server.enabled)}
                          style={{ minWidth: '78px', textAlign: 'center' }}
                        >
                          {server.enabled ? 'AKTIF' : 'NONAKTIF'}
                        </button>

                        {!server.isBuiltin && (
                          <button
                            type="button"
                            className="provider-btn-icon is-danger"
                            onClick={() => handleDeleteServer(server.id, server.name)}
                            title="Hapus server kustom ini"
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-muted)',
                              padding: '0.42rem 0.55rem',
                              borderRadius: '7px',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Command bar */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginTop: '0.5rem',
                        padding: '0.45rem 0.75rem',
                        background: 'var(--bg-surface)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.74rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                      }}
                    >
                      <Terminal size={12} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {server.command} {Array.isArray(server.args) ? server.args.join(' ') : server.args}
                      </span>
                    </div>

                    {/* Expandable Tools Accordion */}
                    {isToolsExpanded && (
                      <div
                        style={{
                          marginTop: '0.75rem',
                          paddingTop: '0.75rem',
                          borderTop: '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.45rem',
                        }}
                      >
                        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          TOOLS DISEDIAKAN OLEH {server.name.toUpperCase()}:
                        </div>

                        {server.tools && server.tools.length > 0 ? (
                          server.tools.map((tool) => (
                            <div
                              key={tool.name}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '1rem',
                                padding: '0.55rem 0.75rem',
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '6px',
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <code
                                    style={{
                                      fontFamily: 'var(--font-mono)',
                                      fontSize: '0.78rem',
                                      fontWeight: 700,
                                      color: 'var(--text-primary)',
                                    }}
                                  >
                                    {tool.name}
                                  </code>
                                </div>
                                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                                  {tool.description}
                                </span>
                              </div>

                              <button
                                type="button"
                                className="models-btn-ghost"
                                onClick={() => handleOpenToolTester(server, tool)}
                                style={{ padding: '0.3rem 0.7rem', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                              >
                                <Play size={10} />
                                <span>COBA TOOL</span>
                              </button>
                            </div>
                          ))
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Tidak ada tool yang didefinisikan.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= ADD SERVER MODAL ================= */}
        {showAddModal && (
          <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
            <div
              className="modal-dialog modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '580px' }}
            >
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Server size={16} />
                  <h3 className="modal-title">Daftarkan MCP Server Baru</h3>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowAddModal(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateServer}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Tambahkan server Model Context Protocol lokal (stdio) atau remote SSE untuk memperluas kapabilitas agen.
                  </p>

                  {/* Presets Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Preset:
                    </span>
                    <button
                      type="button"
                      className="models-pill-btn"
                      onClick={() =>
                        setNewServerForm({
                          name: 'PostgreSQL Database MCP',
                          category: 'Database',
                          description: 'Koneksi ke PostgreSQL untuk query schema dan analisis data.',
                          transport: 'stdio',
                          command: 'npx',
                          args: '-y @modelcontextprotocol/server-postgres postgresql://localhost/mydb',
                        })
                      }
                    >
                      PostgreSQL
                    </button>
                    <button
                      type="button"
                      className="models-pill-btn"
                      onClick={() =>
                        setNewServerForm({
                          name: 'Slack Workspace MCP',
                          category: 'Development',
                          description: 'Kirim pesan dan baca feed channel Slack langsung dari AI.',
                          transport: 'stdio',
                          command: 'npx',
                          args: '-y @modelcontextprotocol/server-slack',
                        })
                      }
                    >
                      Slack
                    </button>
                    <button
                      type="button"
                      className="models-pill-btn"
                      onClick={() =>
                        setNewServerForm({
                          name: 'Redis Cache MCP',
                          category: 'Database',
                          description: 'Inspeksi key-value Redis dan monitoring performa cache.',
                          transport: 'stdio',
                          command: 'npx',
                          args: '-y @modelcontextprotocol/server-redis redis://localhost:6379',
                        })
                      }
                    >
                      Redis
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-field">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        NAMA SERVER
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Contoh: Sentry Tracker"
                        value={newServerForm.name}
                        onChange={(e) => setNewServerForm({ ...newServerForm, name: e.target.value })}
                        required
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div className="form-field">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        KATEGORI
                      </label>
                      <select
                        className="form-select"
                        value={newServerForm.category}
                        onChange={(e) => setNewServerForm({ ...newServerForm, category: e.target.value })}
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                      >
                        <option value="Development">Development</option>
                        <option value="Database">Database</option>
                        <option value="Storage & Files">Storage & Files</option>
                        <option value="Web & Research">Web & Research</option>
                        <option value="AI & Knowledge Graph">AI & Knowledge Graph</option>
                        <option value="System & Execution">System & Execution</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      DESKRIPSI
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Penjelasan fungsi MCP server ini untuk model..."
                      value={newServerForm.description}
                      onChange={(e) => setNewServerForm({ ...newServerForm, description: e.target.value })}
                      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-field">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        TRANSPORT
                      </label>
                      <select
                        className="form-select"
                        value={newServerForm.transport}
                        onChange={(e) => setNewServerForm({ ...newServerForm, transport: e.target.value })}
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                      >
                        <option value="stdio">stdio (Standard I/O)</option>
                        <option value="sse">sse (Server-Sent Events)</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        COMMAND EKSEKUSI
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="npx / uvx / node"
                        value={newServerForm.command}
                        onChange={(e) => setNewServerForm({ ...newServerForm, command: e.target.value })}
                        required
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      ARGUMEN (DIPISAH SPASI)
                    </label>
                    <input
                      type="text"
                      className="form-input font-mono"
                      placeholder="-y @modelcontextprotocol/server-package --param value"
                      value={newServerForm.args}
                      onChange={(e) => setNewServerForm({ ...newServerForm, args: e.target.value })}
                      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.85rem 1.25rem' }}>
                  <button
                    type="button"
                    className="models-btn-ghost"
                    onClick={() => setShowAddModal(false)}
                  >
                    BATAL
                  </button>
                  <button type="submit" className="models-btn-primary">
                    SIMPAN SERVER
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= INTERACTIVE TOOL TESTER MODAL ================= */}
        {showToolModal && activeToolContext && (
          <div className="modal-backdrop" onClick={() => setShowToolModal(false)}>
            <div
              className="modal-dialog modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '600px' }}
            >
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Play size={16} />
                  <div>
                    <h3 className="modal-title">
                      Uji Tool: <code>{activeToolContext.tool.name}</code>
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Server: {activeToolContext.server.name} ({activeToolContext.server.transport})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowToolModal(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <p style={{ margin: 0, padding: '0.65rem 0.85rem', background: 'var(--bg-surface)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {activeToolContext.tool.description}
                </p>

                <div className="form-field">
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    PARAMETER INPUT (JSON)
                  </label>
                  <textarea
                    rows={4}
                    className="form-textarea font-mono"
                    value={toolArgsInput}
                    onChange={(e) => setToolArgsInput(e.target.value)}
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                  />
                </div>

                {toolExecResult && (
                  <div
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        padding: '0.45rem 0.75rem',
                        borderBottom: '1px solid var(--border-subtle)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--accent-emerald, #10b981)',
                      }}
                    >
                      OUTPUT HASIL EKSEKUSI ({toolExecResult.durationMs || 18}ms)
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        padding: '0.75rem',
                        maxHeight: '180px',
                        overflowY: 'auto',
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-primary)',
                        lineHeight: 1.45,
                      }}
                    >
                      {JSON.stringify(toolExecResult.result || toolExecResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.85rem 1.25rem' }}>
                <button
                  type="button"
                  className="models-btn-ghost"
                  onClick={() => setShowToolModal(false)}
                >
                  TUTUP
                </button>
                <button
                  type="button"
                  className="models-btn-primary"
                  onClick={handleExecuteTool}
                  disabled={executingTool}
                >
                  {executingTool ? 'MENGEKSEKUSI...' : 'JALANKAN TOOL'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
