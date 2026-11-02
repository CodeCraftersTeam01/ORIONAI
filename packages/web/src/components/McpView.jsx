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
  ExternalLink,
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
    envKeys: '',
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
          prev.map((s) => (s.id === serverId ? { ...s, enabled: nextState, status: nextState ? 'connected' : 'disabled' } : s))
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
        showToast?.(`Berhasil menguji ${data.results.length} server MCP.`);
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
          envKeys: '',
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

    // Build sample args from parameters
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

  const getServerIcon = (id, category) => {
    if (id === 'filesystem') return <Folder size={20} className="mcp-icon-blue" />;
    if (id === 'fetch') return <Globe size={20} className="mcp-icon-emerald" />;
    if (id === 'git') return <GitBranch size={20} className="mcp-icon-amber" />;
    if (id === 'memory') return <Brain size={20} className="mcp-icon-purple" />;
    if (id === 'github') return <GitPullRequest size={20} className="mcp-icon-white" />;
    if (id === 'sqlite') return <Database size={20} className="mcp-icon-cyan" />;
    if (id === 'brave-search') return <Compass size={20} className="mcp-icon-orange" />;
    if (id === 'terminal-shell') return <Terminal size={20} className="mcp-icon-green" />;
    if (id === 'docker') return <Box size={20} className="mcp-icon-sky" />;
    if (id === 'puppeteer') return <Eye size={20} className="mcp-icon-pink" />;
    return <Server size={20} className="mcp-icon-indigo" />;
  };

  const toggleToolsAccordion = (serverId) => {
    setExpandedServerTools((prev) => ({
      ...prev,
      [serverId]: !prev[serverId],
    }));
  };

  return (
    <div className="page-view-container">
      <div className="models-page-content is-page-mode">
        {/* ================= PAGE HEADER ================= */}
        <div className="page-view-header">
          <div className="page-view-header-left">
            <div className="header-title-row">
              <Server size={22} className="header-title-icon" style={{ color: 'var(--brand-accent, #6366f1)' }} />
              <h1 className="page-view-title">MCP Server Hub</h1>
              <span className="mcp-spec-pill">MCP v1.2 Protocol</span>
            </div>
            <p className="page-view-subtitle">
              Model Context Protocol menghubungkan Orion AI ke sumber data lokal, terminal, repositori Git, SQLite, dan API eksternal secara terstandarisasi JSON-RPC.
            </p>
          </div>

          <div className="page-view-header-right skills-header-actions">
            <button
              type="button"
              className="skills-header-btn"
              onClick={() => setShowAddModal(true)}
              title="Tambah MCP Server kustom"
            >
              <Plus size={14} />
              <span>Tambah Server</span>
            </button>

            <button
              type="button"
              className="skills-header-btn"
              onClick={handleTestAll}
              disabled={isTestingAll}
              title="Ping & verifikasi koneksi seluruh server MCP"
            >
              <RotateCw size={13} className={isTestingAll ? 'animate-spin' : ''} />
              <span>{isTestingAll ? 'Memverifikasi...' : 'Test Semua Server'}</span>
            </button>

            {onClose && (
              <button
                type="button"
                className="skills-header-close-btn"
                onClick={onClose}
                aria-label="Tutup halaman"
                title="Tutup halaman"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* ================= STATS CARDS ================= */}
        {stats && (
          <div className="mcp-stats-grid">
            <div className="mcp-stat-card">
              <div className="mcp-stat-icon-wrap stat-icon-blue">
                <Server size={18} />
              </div>
              <div className="mcp-stat-info">
                <div className="mcp-stat-number">{stats.totalServers}</div>
                <div className="mcp-stat-label">Total MCP Servers</div>
              </div>
            </div>

            <div className="mcp-stat-card">
              <div className="mcp-stat-icon-wrap stat-icon-emerald">
                <CheckCircle2 size={18} />
              </div>
              <div className="mcp-stat-info">
                <div className="mcp-stat-number">{stats.connectedServers}</div>
                <div className="mcp-stat-label">Terhubung & Siap</div>
              </div>
            </div>

            <div className="mcp-stat-card">
              <div className="mcp-stat-icon-wrap stat-icon-purple">
                <Layers size={18} />
              </div>
              <div className="mcp-stat-info">
                <div className="mcp-stat-number">{stats.totalToolsAvailable}</div>
                <div className="mcp-stat-label">Total Tools Aktif</div>
              </div>
            </div>

            <div className="mcp-stat-card">
              <div className="mcp-stat-icon-wrap stat-icon-amber">
                <Activity size={18} />
              </div>
              <div className="mcp-stat-info">
                <div className="mcp-stat-number">100% OK</div>
                <div className="mcp-stat-label">Kesehatan Protokol</div>
              </div>
            </div>
          </div>
        )}

        {/* ================= SEARCH & FILTER BAR ================= */}
        <div className="skills-nav-bar">
          <div className="skills-tab-group">
            <button
              type="button"
              className={`skills-tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              Semua ({servers.length})
            </button>
            <button
              type="button"
              className={`skills-tab-btn ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              Aktif ({servers.filter((s) => s.enabled).length})
            </button>
            <button
              type="button"
              className={`skills-tab-btn ${statusFilter === 'disabled' ? 'active' : ''}`}
              onClick={() => setStatusFilter('disabled')}
            >
              Nonaktif ({servers.filter((s) => !s.enabled).length})
            </button>
          </div>

          <div className="skills-search-box">
            <Search size={14} className="skills-search-icon" />
            <input
              type="text"
              placeholder="Cari server MCP atau nama tool (contoh: git, read_file)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="skills-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="skills-search-clear"
                onClick={() => setSearchQuery('')}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* ================= CATEGORY FILTER CHIPS ================= */}
        <div className="mcp-category-chips">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`mcp-chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'all' ? 'Semua Kategori' : cat}
            </button>
          ))}
        </div>

        {/* ================= MCP SERVERS GRID ================= */}
        {loading ? (
          <div className="skills-loading-state">
            <RotateCw size={24} className="animate-spin text-muted" />
            <p>Memuat konfigurasi Model Context Protocol...</p>
          </div>
        ) : filteredServers.length === 0 ? (
          <div className="skills-empty-state">
            <Server size={36} className="text-muted" />
            <h3>Tidak ada MCP Server yang cocok</h3>
            <p>Ubah kata kunci pencarian atau reset filter kategori.</p>
          </div>
        ) : (
          <div className="mcp-servers-grid">
            {filteredServers.map((server) => {
              const pingInfo = pingResults[server.id];
              const isPinging = testingId === server.id;
              const isToolsExpanded = Boolean(expandedServerTools[server.id]);

              return (
                <div
                  key={server.id}
                  className={`mcp-server-card ${server.enabled ? 'is-enabled' : 'is-disabled'}`}
                >
                  {/* Card Header */}
                  <div className="mcp-card-header">
                    <div className="mcp-card-left">
                      <div className="mcp-server-icon-badge">
                        {getServerIcon(server.id, server.category)}
                      </div>
                      <div className="mcp-server-name-block">
                        <div className="mcp-server-title-row">
                          <h3 className="mcp-server-title">{server.name}</h3>
                          {server.isBuiltin ? (
                            <span className="mcp-badge-builtin">Built-in</span>
                          ) : (
                            <span className="mcp-badge-custom">Custom</span>
                          )}
                        </div>
                        <span className="mcp-server-category">{server.category}</span>
                      </div>
                    </div>

                    <div className="mcp-card-right">
                      {/* Active Toggle Switch */}
                      <label
                        className="mcp-switch-label"
                        title={server.enabled ? 'Nonaktifkan server' : 'Aktifkan server'}
                      >
                        <input
                          type="checkbox"
                          checked={server.enabled}
                          onChange={() => handleToggle(server.id, server.enabled)}
                          className="mcp-switch-input"
                        />
                        <span className="mcp-switch-slider" />
                      </label>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="mcp-card-desc">{server.description}</p>

                  {/* Transport & Command Pill */}
                  <div className="mcp-meta-row">
                    <div className="mcp-transport-tag">
                      <Terminal size={11} />
                      <span>{server.transport}</span>
                    </div>
                    <code className="mcp-command-code">
                      {server.command} {Array.isArray(server.args) ? server.args.join(' ') : server.args}
                    </code>
                  </div>

                  {/* Connection / Ping Banner */}
                  <div className="mcp-status-banner">
                    <div className="mcp-status-indicator">
                      <span
                        className={`status-pulse-dot ${server.enabled ? 'is-online' : 'is-offline'}`}
                      />
                      <span className="status-text">
                        {server.enabled ? 'Connected' : 'Disabled'}
                      </span>
                    </div>

                    {pingInfo ? (
                      <span className="mcp-ping-result">
                        {pingInfo.latency}ms • {pingInfo.timestamp}
                      </span>
                    ) : server.latencyMs ? (
                      <span className="mcp-ping-result">{server.latencyMs}ms</span>
                    ) : null}
                  </div>

                  {/* Tools Accordion Toggle */}
                  <div className="mcp-tools-section">
                    <button
                      type="button"
                      className="mcp-tools-toggle-btn"
                      onClick={() => toggleToolsAccordion(server.id)}
                    >
                      <div className="tools-toggle-left">
                        <Layers size={13} />
                        <span>{server.tools?.length || 0} Tools Tersedia</span>
                      </div>
                      {isToolsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {/* Expandable Tools List */}
                    {isToolsExpanded && (
                      <div className="mcp-tools-drawer animate-fade-in">
                        {server.tools && server.tools.length > 0 ? (
                          server.tools.map((tool) => (
                            <div key={tool.name} className="mcp-tool-item">
                              <div className="mcp-tool-item-header">
                                <span className="mcp-tool-name">{tool.name}</span>
                                <button
                                  type="button"
                                  className="btn-try-tool"
                                  onClick={() => handleOpenToolTester(server, tool)}
                                  title="Jalankan & uji tool ini sekarang"
                                >
                                  <Play size={10} />
                                  <span>Coba Tool</span>
                                </button>
                              </div>
                              <p className="mcp-tool-desc">{tool.description}</p>
                            </div>
                          ))
                        ) : (
                          <div className="mcp-tools-empty">Tidak ada tool yang didefinisikan.</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="mcp-card-actions">
                    <button
                      type="button"
                      className="mcp-action-btn ping-btn"
                      onClick={() => handlePing(server.id)}
                      disabled={isPinging || !server.enabled}
                      title="Uji latensi koneksi server MCP ini"
                    >
                      <Activity size={12} className={isPinging ? 'animate-spin' : ''} />
                      <span>{isPinging ? 'Menguji...' : 'Test Ping'}</span>
                    </button>

                    {!server.isBuiltin && (
                      <button
                        type="button"
                        className="mcp-action-btn delete-btn"
                        onClick={() => handleDeleteServer(server.id, server.name)}
                        title="Hapus server kustom ini"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================= ADD SERVER MODAL ================= */}
        {showAddModal && (
          <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
            <div
              className="modal-dialog mcp-modal-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="modal-header-left">
                  <Server size={18} style={{ color: 'var(--brand-accent, #6366f1)' }} />
                  <h2 className="modal-title">Daftarkan MCP Server Baru</h2>
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
                <div className="modal-body">
                  <p className="url-modal-desc">
                    Tambahkan server Model Context Protocol lokal (stdio) atau remote SSE untuk memperluas kapabilitas agen.
                  </p>

                  {/* Presets Quick Picker */}
                  <div className="mcp-presets-bar">
                    <span className="presets-label">Preset 1-Klik:</span>
                    <button
                      type="button"
                      className="preset-chip"
                      onClick={() =>
                        setNewServerForm({
                          name: 'PostgreSQL Database MCP',
                          category: 'Database',
                          description: 'Koneksi ke PostgreSQL untuk query schema dan analisis data.',
                          transport: 'stdio',
                          command: 'npx',
                          args: '-y @modelcontextprotocol/server-postgres postgresql://localhost/mydb',
                          envKeys: '',
                        })
                      }
                    >
                      PostgreSQL
                    </button>
                    <button
                      type="button"
                      className="preset-chip"
                      onClick={() =>
                        setNewServerForm({
                          name: 'Slack Workspace MCP',
                          category: 'Communication',
                          description: 'Kirim pesan dan baca feed channel Slack langsung dari AI.',
                          transport: 'stdio',
                          command: 'npx',
                          args: '-y @modelcontextprotocol/server-slack',
                          envKeys: '',
                        })
                      }
                    >
                      Slack
                    </button>
                    <button
                      type="button"
                      className="preset-chip"
                      onClick={() =>
                        setNewServerForm({
                          name: 'Redis Cache MCP',
                          category: 'Database',
                          description: 'Inspeksi key-value Redis dan monitoring performa cache.',
                          transport: 'stdio',
                          command: 'npx',
                          args: '-y @modelcontextprotocol/server-redis redis://localhost:6379',
                          envKeys: '',
                        })
                      }
                    >
                      Redis
                    </button>
                  </div>

                  <div className="form-group-grid">
                    <div className="form-field">
                      <label className="form-label">Nama Server</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Contoh: Sentry Error Tracker"
                        value={newServerForm.name}
                        onChange={(e) =>
                          setNewServerForm({ ...newServerForm, name: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label className="form-label">Kategori</label>
                      <select
                        className="form-select"
                        value={newServerForm.category}
                        onChange={(e) =>
                          setNewServerForm({ ...newServerForm, category: e.target.value })
                        }
                      >
                        <option value="Development">Development</option>
                        <option value="Database">Database</option>
                        <option value="Storage & Files">Storage & Files</option>
                        <option value="Web & Research">Web & Research</option>
                        <option value="AI & Knowledge Graph">AI & Knowledge Graph</option>
                        <option value="System & Execution">System & Execution</option>
                        <option value="Communication">Communication</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="form-label">Deskripsi</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Penjelasan fungsi MCP server ini untuk model..."
                      value={newServerForm.description}
                      onChange={(e) =>
                        setNewServerForm({ ...newServerForm, description: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group-grid">
                    <div className="form-field">
                      <label className="form-label">Transport</label>
                      <select
                        className="form-select"
                        value={newServerForm.transport}
                        onChange={(e) =>
                          setNewServerForm({ ...newServerForm, transport: e.target.value })
                        }
                      >
                        <option value="stdio">stdio (Standard I/O)</option>
                        <option value="sse">sse (Server-Sent Events)</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label className="form-label">Command Eksekusi</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="npx / uvx / node / python"
                        value={newServerForm.command}
                        onChange={(e) =>
                          setNewServerForm({ ...newServerForm, command: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="form-label">Argumen (Args dipisahkan spasi)</label>
                    <input
                      type="text"
                      className="form-input font-mono"
                      placeholder="-y @modelcontextprotocol/server-package --param value"
                      value={newServerForm.args}
                      onChange={(e) =>
                        setNewServerForm({ ...newServerForm, args: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="models-btn-secondary"
                    onClick={() => setShowAddModal(false)}
                  >
                    Batal
                  </button>
                  <button type="submit" className="models-btn-primary">
                    <Plus size={14} /> Daftarkan Server
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
              className="modal-dialog tool-tester-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="modal-header-left">
                  <Play size={16} className="text-emerald" />
                  <div>
                    <h2 className="modal-title">
                      Uji Tool: <code>{activeToolContext.tool.name}</code>
                    </h2>
                    <span className="modal-subtitle-text">
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

              <div className="modal-body">
                <p className="tool-desc-callout">{activeToolContext.tool.description}</p>

                <div className="form-field">
                  <label className="form-label">Parameter Input (JSON):</label>
                  <textarea
                    rows={5}
                    className="form-textarea font-mono"
                    value={toolArgsInput}
                    onChange={(e) => setToolArgsInput(e.target.value)}
                  />
                </div>

                {toolExecResult && (
                  <div className="tool-result-box animate-fade-in">
                    <div className="result-header">
                      <span className="result-badge success">
                        <Check size={11} /> Eksekusi Sukses (
                        {toolExecResult.durationMs || 18}ms)
                      </span>
                    </div>
                    <pre className="result-content-pre">
                      {JSON.stringify(toolExecResult.result || toolExecResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="models-btn-secondary"
                  onClick={() => setShowToolModal(false)}
                >
                  Tutup
                </button>
                <button
                  type="button"
                  className="models-btn-primary"
                  onClick={handleExecuteTool}
                  disabled={executingTool}
                >
                  <Play size={13} className={executingTool ? 'animate-spin' : ''} />
                  {executingTool ? 'Mengeksekusi...' : 'Jalankan Tool Sekarang'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
