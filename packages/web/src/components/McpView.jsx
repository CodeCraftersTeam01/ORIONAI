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
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function McpView({ onClose, showToast }) {
  const [servers, setServers] = useState([]);
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
    if (id === 'filesystem') return <Folder size={15} />;
    if (id === 'fetch') return <Globe size={15} />;
    if (id === 'git') return <GitBranch size={15} />;
    if (id === 'memory') return <Brain size={15} />;
    if (id === 'github') return <GitPullRequest size={15} />;
    if (id === 'sqlite') return <Database size={15} />;
    if (id === 'brave-search') return <Compass size={15} />;
    if (id === 'terminal-shell') return <Terminal size={15} />;
    if (id === 'docker') return <Box size={15} />;
    if (id === 'puppeteer') return <Eye size={15} />;
    return <Server size={15} />;
  };

  const toggleToolsAccordion = (serverId) => {
    setExpandedServerTools((prev) => ({
      ...prev,
      [serverId]: !prev[serverId],
    }));
  };

  return (
    <div className="minimal-view-wrapper">
      <div className="minimal-view-container">
      {/* ================= HEADER ================= */}
      <div className="minimal-header">
        <div className="minimal-title-group">
          <div className="minimal-title-row">
            <h1 className="minimal-title">MCP Server Hub</h1>
            <span className="minimal-tag">JSON-RPC v1.2</span>
          </div>
          <p className="minimal-subtitle">
            Model Context Protocol menghubungkan LLM ke filesystem, database, terminal, Git, dan tools eksternal secara aman.
          </p>
        </div>

        <div className="minimal-header-actions">
          <button
            type="button"
            className="minimal-btn-ghost"
            onClick={handleTestAll}
            disabled={isTestingAll}
            title="Ping & verifikasi koneksi seluruh server MCP"
          >
            <RotateCw size={13} className={isTestingAll ? 'is-spinning' : ''} />
            <span>{isTestingAll ? 'Memverifikasi...' : 'Test All'}</span>
          </button>

          <button
            type="button"
            className="minimal-btn-primary"
            onClick={() => setShowAddModal(true)}
            title="Tambah MCP Server kustom"
          >
            <Plus size={13} />
            <span>Tambah Server</span>
          </button>

          {onClose && (
            <button
              type="button"
              className="minimal-btn-ghost"
              onClick={onClose}
              aria-label="Tutup"
              title="Tutup halaman"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ================= MINIMAL GLANCE METRIC STRIP ================= */}
      <div className="minimal-metric-strip">
        <div className="minimal-metric-items">
          <div className="minimal-metric-item">
            <span className="minimal-status-dot pulse" />
            <span>Engine:</span>
            <span className="minimal-metric-value">Active</span>
          </div>

          <div className="minimal-metric-divider" />

          <div className="minimal-metric-item">
            <span>Servers:</span>
            <span className="minimal-metric-value">{activeCount} / {servers.length} connected</span>
          </div>

          <div className="minimal-metric-divider" />

          <div className="minimal-metric-item">
            <span>Tools:</span>
            <span className="minimal-metric-value">{totalTools} registered</span>
          </div>

          <div className="minimal-metric-divider" />

          <div className="minimal-metric-item">
            <span>Transport:</span>
            <span className="minimal-metric-value">STDIO & SSE</span>
          </div>
        </div>

        <div className="minimal-metric-item" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
          Subprocess pipes & EventStreams
        </div>
      </div>

      {/* ================= MINIMAL TOOLBAR ================= */}
      <div className="minimal-toolbar">
        <div className="minimal-search-box">
          <Search size={13} className="minimal-search-icon" />
          <input
            type="text"
            className="minimal-search-input"
            placeholder="Cari server MCP atau nama tool..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Status Tabs */}
          <div className="minimal-tabs">
            <button
              type="button"
              className={`minimal-tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              Semua ({servers.length})
            </button>
            <button
              type="button"
              className={`minimal-tab-btn ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              Aktif ({activeCount})
            </button>
            <button
              type="button"
              className={`minimal-tab-btn ${statusFilter === 'disabled' ? 'active' : ''}`}
              onClick={() => setStatusFilter('disabled')}
            >
              Nonaktif ({disabledCount})
            </button>
          </div>

          {/* Category Tabs */}
          <div className="minimal-tabs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`minimal-tab-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'all' ? 'Semua Kategori' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================= MCP SERVERS GRID ================= */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <RotateCw size={20} className="is-spinning" style={{ margin: '0 auto 0.5rem' }} />
          <p style={{ fontSize: '0.82rem', margin: 0 }}>Memuat konfigurasi Model Context Protocol...</p>
        </div>
      ) : filteredServers.length === 0 ? (
        <div className="minimal-card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <Server size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 0.5rem' }} />
          <h3 style={{ margin: '0 0 0.25rem', color: 'var(--text-primary)', fontSize: '0.92rem' }}>
            Tidak ada server MCP yang cocok
          </h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Sesuaikan filter atau kata kunci pencarian.
          </p>
        </div>
      ) : (
        <div className="minimal-grid-cards">
          {filteredServers.map((server) => {
            const pingInfo = pingResults[server.id];
            const isPinging = testingId === server.id;
            const isToolsExpanded = Boolean(expandedServerTools[server.id]);

            return (
              <div key={server.id} className="minimal-card">
                {/* Header */}
                <div className="minimal-card-header">
                  <div className="minimal-card-title-wrap">
                    <div className="minimal-card-icon">
                      {getServerIcon(server.id)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="minimal-card-name">{server.name}</div>
                      <div className="minimal-card-badges">
                        <span className="minimal-badge">{server.isBuiltin ? 'BUILT-IN' : 'CUSTOM'}</span>
                        <span className="minimal-badge">{server.category}</span>
                        <span className="minimal-badge">{server.transport.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  <label className="mcp-switch-label" title={server.enabled ? 'Nonaktifkan' : 'Aktifkan'}>
                    <input
                      type="checkbox"
                      className="mcp-switch-input"
                      checked={server.enabled}
                      onChange={() => handleToggle(server.id, server.enabled)}
                    />
                    <span className="mcp-switch-slider" />
                  </label>
                </div>

                {/* Description */}
                <p className="minimal-card-desc">{server.description}</p>

                {/* Terminal Command bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.35rem 0.6rem',
                    background: 'var(--bg-input)',
                    borderRadius: '5px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                    overflow: 'hidden',
                  }}
                >
                  <Terminal size={11} style={{ flexShrink: 0, color: 'var(--text-secondary)' }} />
                  <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {server.command} {Array.isArray(server.args) ? server.args.join(' ') : server.args}
                  </span>
                </div>

                {/* Expandable Tools List */}
                {isToolsExpanded && (
                  <div
                    style={{
                      paddingTop: '0.65rem',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      PERKAKAS ({server.tools?.length || 0}):
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {server.tools && server.tools.length > 0 ? (
                        server.tools.map((tool) => (
                          <button
                            key={tool.name}
                            type="button"
                            onClick={() => handleOpenToolTester(server, tool)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '4px',
                              padding: '0.2rem 0.45rem',
                              fontSize: '0.72rem',
                              fontFamily: 'var(--font-mono)',
                              color: 'var(--text-primary)',
                              cursor: 'pointer',
                              transition: 'border-color 0.15s ease',
                            }}
                            title={`Uji parameter tool: ${tool.description || tool.name}`}
                          >
                            <Play size={9} style={{ color: 'var(--text-muted)' }} />
                            <span>{tool.name}</span>
                          </button>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          Tidak ada tool terdaftar
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="minimal-card-footer">
                  <div className="minimal-card-status">
                    {server.enabled ? (
                      <>
                        <span className="minimal-status-dot" />
                        <span>{pingInfo ? `${pingInfo.latency}ms OK` : `${server.latencyMs || 15}ms OK`}</span>
                      </>
                    ) : (
                      <>
                        <span className="minimal-status-dot inactive" />
                        <span style={{ color: 'var(--text-muted)' }}>Offline</span>
                      </>
                    )}
                  </div>

                  <div className="minimal-card-actions">
                    <button
                      type="button"
                      className="minimal-icon-btn"
                      onClick={() => toggleToolsAccordion(server.id)}
                      title="Buka perkakas server"
                    >
                      <Layers size={11} />
                      <span>{server.tools?.length || 0}</span>
                      {isToolsExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>

                    <button
                      type="button"
                      className="minimal-icon-btn"
                      onClick={() => handlePing(server.id)}
                      disabled={isPinging || !server.enabled}
                      title="Uji latensi server"
                    >
                      <Activity size={11} className={isPinging ? 'is-spinning' : ''} />
                      <span>{isPinging ? 'Ping...' : 'Ping'}</span>
                    </button>

                    {!server.isBuiltin && (
                      <button
                        type="button"
                        className="minimal-icon-btn danger"
                        onClick={() => handleDeleteServer(server.id, server.name)}
                        title="Hapus server kustom"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= ADD SERVER MODAL ================= */}
      {showAddModal && (
        <div className="minimal-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="minimal-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="minimal-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Server size={15} />
                <h3 className="minimal-modal-title">Tambah MCP Server Baru</h3>
              </div>
              <button
                type="button"
                className="minimal-icon-btn"
                onClick={() => setShowAddModal(false)}
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateServer}>
              <div className="minimal-modal-body">
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  Daftarkan server Model Context Protocol lokal (stdio) atau endpoint remote SSE untuk memperluas kapabilitas eksekusi LLM.
                </p>

                {/* Presets */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Preset:
                  </span>
                  <button
                    type="button"
                    className="minimal-icon-btn"
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
                    className="minimal-icon-btn"
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
                    className="minimal-icon-btn"
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>NAMA SERVER</label>
                    <input
                      type="text"
                      className="minimal-search-input"
                      placeholder="Contoh: Sentry Tracker"
                      value={newServerForm.name}
                      onChange={(e) => setNewServerForm({ ...newServerForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>KATEGORI</label>
                    <select
                      className="minimal-search-input"
                      value={newServerForm.category}
                      onChange={(e) => setNewServerForm({ ...newServerForm, category: e.target.value })}
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>DESKRIPSI</label>
                  <input
                    type="text"
                    className="minimal-search-input"
                    placeholder="Fungsi dan tujuan server..."
                    value={newServerForm.description}
                    onChange={(e) => setNewServerForm({ ...newServerForm, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>TRANSPORT</label>
                    <select
                      className="minimal-search-input"
                      value={newServerForm.transport}
                      onChange={(e) => setNewServerForm({ ...newServerForm, transport: e.target.value })}
                    >
                      <option value="stdio">stdio (Standard I/O)</option>
                      <option value="sse">sse (Server-Sent Events)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>COMMAND</label>
                    <input
                      type="text"
                      className="minimal-search-input"
                      placeholder="npx / uvx / node"
                      value={newServerForm.command}
                      onChange={(e) => setNewServerForm({ ...newServerForm, command: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>ARGUMEN (DIPISAH SPASI)</label>
                  <input
                    type="text"
                    className="minimal-search-input font-mono"
                    placeholder="-y @modelcontextprotocol/server-package --param value"
                    value={newServerForm.args}
                    onChange={(e) => setNewServerForm({ ...newServerForm, args: e.target.value })}
                  />
                </div>
              </div>

              <div className="minimal-modal-footer">
                <button
                  type="button"
                  className="minimal-btn-ghost"
                  onClick={() => setShowAddModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="minimal-btn-primary">
                  Simpan Server
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= INTERACTIVE TOOL TESTER MODAL ================= */}
      {showToolModal && activeToolContext && (
        <div className="minimal-modal-backdrop" onClick={() => setShowToolModal(false)}>
          <div className="minimal-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="minimal-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Play size={14} />
                <div>
                  <h3 className="minimal-modal-title">
                    Uji Tool: <code>{activeToolContext.tool.name}</code>
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {activeToolContext.server.name} ({activeToolContext.server.transport})
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="minimal-icon-btn"
                onClick={() => setShowToolModal(false)}
              >
                <X size={14} />
              </button>
            </div>

            <div className="minimal-modal-body">
              <p style={{ margin: 0, padding: '0.55rem 0.75rem', background: 'var(--bg-input)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {activeToolContext.tool.description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>PARAMETER INPUT (JSON)</label>
                <textarea
                  rows={4}
                  className="minimal-search-input font-mono"
                  style={{ height: 'auto', padding: '0.5rem' }}
                  value={toolArgsInput}
                  onChange={(e) => setToolArgsInput(e.target.value)}
                />
              </div>

              {toolExecResult && (
                <div
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '0.4rem 0.65rem',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--accent-emerald, #10b981)',
                    }}
                  >
                    HASIL EKSEKUSI ({toolExecResult.durationMs || 18}ms)
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: '0.65rem',
                      maxHeight: '180px',
                      overflowY: 'auto',
                      fontSize: '0.74rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-primary)',
                      lineHeight: 1.4,
                    }}
                  >
                    {JSON.stringify(toolExecResult.result || toolExecResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="minimal-modal-footer">
              <button
                type="button"
                className="minimal-btn-ghost"
                onClick={() => setShowToolModal(false)}
              >
                Tutup
              </button>
              <button
                type="button"
                className="minimal-btn-primary"
                onClick={handleExecuteTool}
                disabled={executingTool}
              >
                {executingTool ? 'Mengeksekusi...' : 'Jalankan Tool'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
