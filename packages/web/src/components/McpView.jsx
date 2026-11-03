import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  RotateCw,
  X,
  ExternalLink,
  Power,
  Zap,
  Key,
  Trash2,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function McpView({ onClose, showToast }) {
  const [servers, setServers] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [showBuiltin, setShowBuiltin] = useState(false); // Default: hidden

  // Catalog search (clean single-line input, no messy wrapped pills)
  const [searchCatalogQuery, setSearchCatalogQuery] = useState('');

  // Expanded setup notes per catalog item
  const [expandedNotes, setExpandedNotes] = useState({});

  // Testing & ping states
  const [pingResults, setPingResults] = useState({});
  const [pingingId, setPingingId] = useState(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTargetServer, setAuthTargetServer] = useState(null);
  const [authCredentialInput, setAuthCredentialInput] = useState('');

  // Add Server Form
  const [addForm, setAddForm] = useState({
    id: '',
    name: '',
    transport: 'http',
    endpoint: '',
    command: 'npx',
    args: '',
    auth: 'none',
    description: '',
    category: 'Custom MCP',
  });

  // Load Installed MCP Servers
  const loadServers = async () => {
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

  // Load Curated Catalog (Hermes Specification)
  const loadCatalog = async () => {
    try {
      const res = await fetch('/api/mcp/catalog');
      const data = await res.json();
      if (data.success) {
        setCatalog(data.catalog || []);
      }
    } catch (err) {
      console.error('Gagal memuat katalog MCP:', err);
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    loadServers();
    loadCatalog();
  }, []);

  // Installed servers separation
  const userInstalledServers = useMemo(() => {
    return servers.filter((s) => !s.isBuiltin);
  }, [servers]);

  const builtinServers = useMemo(() => {
    return servers.filter((s) => s.isBuiltin);
  }, [servers]);

  // Set of installed server IDs
  const installedIds = useMemo(() => {
    return new Set(servers.map((s) => s.id.toLowerCase()));
  }, [servers]);

  // Filtered Catalog
  const filteredCatalog = useMemo(() => {
    const q = searchCatalogQuery.toLowerCase().trim();
    if (!q) return catalog;
    return catalog.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.endpoint && item.endpoint.toLowerCase().includes(q)) ||
        (item.command && item.command.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q))
      );
    });
  }, [catalog, searchCatalogQuery]);

  // 1-Click Install from Catalog
  const handleInstallCatalog = async (item) => {
    try {
      const res = await fetch(`/api/mcp/catalog/${item.id}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(`MCP '${item.name}' berhasil diinstal.`);
        await loadServers();
      } else {
        showToast?.('Gagal menginstal: ' + (data.message || 'Error'));
      }
    } catch (err) {
      showToast?.('Error saat instalasi: ' + err.message);
    }
  };

  // Toggle server active/disabled
  const handleToggle = async (serverId) => {
    try {
      const res = await fetch(`/api/mcp/${serverId}/toggle`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setServers((prev) =>
          prev.map((s) => (s.id === serverId ? data.server : s))
        );
        showToast?.(
          `Server '${data.server.name || data.server.id}' ${data.server.enabled ? 'diaktifkan' : 'dinonaktifkan'}.`
        );
      } else {
        showToast?.('Gagal mengubah status: ' + (data.message || 'Error'));
      }
    } catch (err) {
      showToast?.('Kesalahan: ' + err.message);
    }
  };

  // Ping / Test Server
  const handlePing = async (serverId) => {
    setPingingId(serverId);
    try {
      const res = await fetch(`/api/mcp/${serverId}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setPingResults((prev) => ({
          ...prev,
          [serverId]: { ok: true, latency: data.result.latencyMs, time: Date.now() },
        }));
        showToast?.(`Ping ${serverId}: ${data.result.latencyMs}ms (Sehat)`);
      } else {
        setPingResults((prev) => ({
          ...prev,
          [serverId]: { ok: false, error: data.message, time: Date.now() },
        }));
        showToast?.(`Gagal ping ${serverId}: ` + data.message);
      }
    } catch (err) {
      setPingResults((prev) => ({
        ...prev,
        [serverId]: { ok: false, error: err.message, time: Date.now() },
      }));
      showToast?.('Ping error: ' + err.message);
    } finally {
      setPingingId(null);
    }
  };

  // Delete Server (Non-builtin)
  const handleDelete = async (serverId, serverName) => {
    if (!window.confirm(`Hapus MCP server '${serverName || serverId}' dari instalasi Anda?`)) return;
    try {
      const res = await fetch(`/api/mcp/${serverId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast?.(`Server '${serverName || serverId}' berhasil dihapus.`);
        setServers((prev) => prev.filter((s) => s.id !== serverId));
      } else {
        showToast?.('Gagal menghapus: ' + (data.message || 'Error'));
      }
    } catch (err) {
      showToast?.('Kesalahan menghapus: ' + err.message);
    }
  };

  // Open Authenticate Modal
  const handleOpenAuth = (server) => {
    setAuthTargetServer(server);
    setAuthCredentialInput(server.authCredentials?.apiKey || server.authCredentials?.token || '');
    setShowAuthModal(true);
  };

  // Save Authenticate
  const handleSaveAuth = async () => {
    if (!authTargetServer) return;
    try {
      const res = await fetch(`/api/mcp/${authTargetServer.id}/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: authCredentialInput, token: authCredentialInput }),
      });
      const data = await res.json();
      if (data.success) {
        setServers((prev) =>
          prev.map((s) => (s.id === authTargetServer.id ? data.server : s))
        );
        showToast?.(`Otentikasi untuk '${authTargetServer.name || authTargetServer.id}' berhasil disimpan.`);
        setShowAuthModal(false);
      } else {
        showToast?.('Gagal menyimpan otentikasi: ' + (data.message || 'Error'));
      }
    } catch (err) {
      showToast?.('Kesalahan: ' + err.message);
    }
  };

  // Create Custom Server
  const handleAddServer = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      showToast?.('Nama server wajib diisi.');
      return;
    }
    const cleanId = (addForm.id || addForm.name).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cleanId,
          name: addForm.name.trim(),
          transport: addForm.transport,
          endpoint: addForm.endpoint.trim() || null,
          command: addForm.command.trim() || 'npx',
          args: addForm.args ? addForm.args.split(' ').filter(Boolean) : [],
          auth: addForm.auth,
          description: addForm.description.trim() || 'Custom Model Context Protocol Server',
          category: addForm.category,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(`Server '${data.server.name || data.server.id}' berhasil ditambahkan.`);
        setShowAddModal(false);
        setAddForm({
          id: '',
          name: '',
          transport: 'http',
          endpoint: '',
          command: 'npx',
          args: '',
          auth: 'none',
          description: '',
          category: 'Custom MCP',
        });
        await loadServers();
      } else {
        showToast?.('Gagal menambahkan server: ' + (data.message || 'Error'));
      }
    } catch (err) {
      showToast?.('Kesalahan: ' + err.message);
    }
  };

  // Toggle notes accordion
  const toggleNotes = (id) => {
    setExpandedNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="minimal-view-wrapper">
      <div className="minimal-view-container" style={{ maxWidth: '1060px' }}>
        {/* ================= HERMES TOP HEADER ================= */}
        <div className="hermes-header-top">
          <h1 className="hermes-title">MCP</h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              className="hermes-header-btn"
              onClick={() => setShowAddModal(true)}
            >
              ADD SERVER
            </button>

            {onClose && (
              <button
                type="button"
                className="minimal-btn-icon"
                onClick={onClose}
                title="Tutup halaman MCP"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* ================= SECTION 1: YOUR MCP SERVERS ================= */}
        <div className="hermes-section">
          <div className="hermes-section-header">
            <h2 className="hermes-section-title">
              <span style={{ fontSize: '1.1rem', opacity: 0.9 }}>⚯</span>
              <span>Your MCP servers ({userInstalledServers.length + (showBuiltin ? builtinServers.length : 0)})</span>
            </h2>

            {builtinServers.length > 0 && (
              <button
                type="button"
                className="minimal-btn-ghost"
                onClick={() => setShowBuiltin((prev) => !prev)}
                style={{ fontSize: '0.74rem', padding: '0.24rem 0.6rem' }}
                title={showBuiltin ? 'Sembunyikan bawaan sistem' : 'Tampilkan bawaan sistem'}
              >
                {showBuiltin ? <EyeOff size={12} /> : <Eye size={12} />}
                <span>{showBuiltin ? 'Sembunyikan Default' : `Tampilkan Default (${builtinServers.length})`}</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="hermes-card" style={{ padding: '1.75rem', textAlign: 'center' }}>
              <RotateCw size={18} className="spin" style={{ color: 'var(--text-muted)', margin: '0 auto 0.4rem' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Memuat MCP servers terpasang...</span>
            </div>
          ) : userInstalledServers.length === 0 && !showBuiltin ? (
            <div
              className="hermes-card"
              style={{
                textAlign: 'center',
                padding: '2.25rem 1.5rem',
                borderStyle: 'dashed',
                borderColor: 'rgba(255, 255, 255, 0.12)',
              }}
            >
              <p style={{ margin: '0 0 0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Belum ada MCP server yang diinstal. Pilih salah satu dari katalog di bawah atau klik ADD SERVER.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="hermes-header-btn"
                  onClick={() => setShowAddModal(true)}
                >
                  ADD SERVER
                </button>
                <button
                  type="button"
                  className="minimal-btn-ghost"
                  onClick={() => setShowBuiltin(true)}
                  style={{ fontSize: '0.75rem' }}
                >
                  <Eye size={12} />
                  <span>Lihat Bawaan Sistem ({builtinServers.length})</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {/* User Installed Servers */}
              {userInstalledServers.map((server) => {
                const transport = server.transport || 'http';
                const authType = server.auth || (server.authCredentials ? 'api-key' : 'none');
                const endpointText =
                  server.endpoint ||
                  (server.command ? `${server.command} ${(server.args || []).join(' ')}` : '-');
                const pingData = pingResults[server.id];

                return (
                  <div key={server.id} className="hermes-card">
                    <div className="hermes-row-top">
                      <div className="hermes-item-left">
                        <div className="hermes-title-bar">
                          <span className="hermes-item-name">{server.id}</span>
                          <span className="hermes-badge-transport">{transport}</span>
                          <span className="hermes-badge-auth">auth: {authType}</span>
                          {server.authenticated && (
                            <span
                              className="hermes-badge-auth"
                              style={{ color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)' }}
                            >
                              ✓ authenticated
                            </span>
                          )}
                          {pingData && (
                            <span
                              className="hermes-badge-auth"
                              style={{
                                color: pingData.ok ? '#34d399' : '#f87171',
                                borderColor: pingData.ok ? 'rgba(52, 211, 153, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                              }}
                            >
                              {pingData.ok ? `${pingData.latency}ms OK` : 'offline'}
                            </span>
                          )}
                        </div>

                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'rgba(255, 255, 255, 0.55)', marginTop: '0.2rem' }}>
                          {endpointText}
                        </div>
                      </div>

                      <div className="hermes-actions-wrap">
                        {authType !== 'none' && (
                          <button
                            type="button"
                            className="hermes-action-btn"
                            onClick={() => handleOpenAuth(server)}
                            title="Konfigurasi otentikasi / API key"
                          >
                            <Key size={13} />
                            <span>Authenticate</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className={`hermes-action-btn ${server.enabled ? 'active-power' : 'inactive-power'}`}
                          onClick={() => handleToggle(server.id)}
                          title={server.enabled ? 'Nonaktifkan server' : 'Aktifkan server'}
                        >
                          <Power size={13} />
                          <span>{server.enabled ? 'Disable' : 'Enable'}</span>
                        </button>

                        <button
                          type="button"
                          className="hermes-action-btn"
                          onClick={() => handlePing(server.id)}
                          disabled={pingingId === server.id}
                          title="Ping & uji koneksi"
                        >
                          <Zap size={13} style={{ color: pingingId === server.id ? '#eab308' : 'currentColor' }} />
                        </button>

                        <button
                          type="button"
                          className="hermes-action-btn danger"
                          onClick={() => handleDelete(server.id, server.name)}
                          title="Hapus server ini"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Built-in Servers (if showBuiltin is true) */}
              {showBuiltin &&
                builtinServers.map((server) => {
                  const transport = server.transport || 'stdio';
                  const endpointText =
                    server.endpoint ||
                    (server.command ? `${server.command} ${(server.args || []).join(' ')}` : '-');
                  const pingData = pingResults[server.id];

                  return (
                    <div
                      key={server.id}
                      className="hermes-card"
                      style={{ opacity: 0.88, borderStyle: 'dotted' }}
                    >
                      <div className="hermes-row-top">
                        <div className="hermes-item-left">
                          <div className="hermes-title-bar">
                            <span className="hermes-item-name">{server.id}</span>
                            <span className="hermes-badge-transport">{transport}</span>
                            <span className="hermes-badge-auth">builtin: core</span>
                            {pingData && (
                              <span
                                className="hermes-badge-auth"
                                style={{
                                  color: pingData.ok ? '#34d399' : '#f87171',
                                  borderColor: pingData.ok ? 'rgba(52, 211, 153, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                                }}
                              >
                                {pingData.ok ? `${pingData.latency}ms OK` : 'offline'}
                              </span>
                            )}
                          </div>

                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'rgba(255, 255, 255, 0.55)', marginTop: '0.2rem' }}>
                            {endpointText}
                          </div>
                        </div>

                        <div className="hermes-actions-wrap">
                          <button
                            type="button"
                            className={`hermes-action-btn ${server.enabled ? 'active-power' : 'inactive-power'}`}
                            onClick={() => handleToggle(server.id)}
                            title={server.enabled ? 'Nonaktifkan server bawaan' : 'Aktifkan server bawaan'}
                          >
                            <Power size={13} />
                            <span>{server.enabled ? 'Disable' : 'Enable'}</span>
                          </button>

                          <button
                            type="button"
                            className="hermes-action-btn"
                            onClick={() => handlePing(server.id)}
                            disabled={pingingId === server.id}
                            title="Ping & uji koneksi"
                          >
                            <Zap size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* ================= SECTION 2: CATALOG (65) ================= */}
        <div className="hermes-section" style={{ marginTop: '1.75rem' }}>
          <div className="hermes-section-header">
            <div>
              <h2 className="hermes-section-title">
                <span style={{ fontSize: '1.1rem', opacity: 0.9 }}>⎔</span>
                <span>Catalog ({catalog.length})</span>
              </h2>
              <p className="hermes-section-subtitle">
                Browse Nous & Orion-approved MCP servers and install them with one click.
              </p>
            </div>
          </div>

          {/* Slim Search Input (No category pills cluttering) */}
          <div style={{ maxWidth: '420px', margin: '0.5rem 0 0.85rem' }}>
            <div className="minimal-search-box">
              <Search size={13} className="minimal-search-icon" />
              <input
                type="text"
                className="minimal-search-input"
                placeholder="Cari server di katalog (contoh: figma, git, slack)..."
                value={searchCatalogQuery}
                onChange={(e) => setSearchCatalogQuery(e.target.value)}
              />
              {searchCatalogQuery && (
                <button
                  type="button"
                  className="minimal-search-clear"
                  onClick={() => setSearchCatalogQuery('')}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Catalog List */}
          {catalogLoading ? (
            <div className="hermes-card" style={{ padding: '2rem', textAlign: 'center' }}>
              <RotateCw size={18} className="spin" style={{ color: 'var(--text-muted)', margin: '0 auto 0.4rem' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Memuat template katalog...</span>
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div className="hermes-card" style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Tidak ada server di katalog yang cocok dengan pencarian Anda.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredCatalog.map((item) => {
                const isInstalled = installedIds.has(item.id.toLowerCase());
                const isNotesOpen = !!expandedNotes[item.id];
                const endpointDisplay = item.endpoint || item.command || `https://mcp.${item.id}.com/mcp`;

                return (
                  <div key={item.id} className="hermes-card">
                    <div className="hermes-row-top">
                      <div className="hermes-item-left">
                        <div className="hermes-title-bar">
                          <span className="hermes-item-name">{item.name}</span>
                          <span className="hermes-badge-transport">{item.transport || 'http'}</span>
                          <span className="hermes-badge-auth">auth: {item.auth || 'none'}</span>
                          {item.sourceUrl && (
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="hermes-badge-source"
                              title="Lihat dokumentasi sumber"
                            >
                              <span>source</span>
                              <ExternalLink size={10} />
                            </a>
                          )}
                        </div>

                        <p className="hermes-item-desc">{item.description}</p>

                        <div className="hermes-endpoint-line">
                          <span>Endpoint:</span>
                          <span className="hermes-endpoint-code">{endpointDisplay}</span>
                        </div>

                        <div>
                          <button
                            type="button"
                            className="hermes-notes-toggle"
                            onClick={() => toggleNotes(item.id)}
                          >
                            <span>{isNotesOpen ? '▼' : '▶'}</span>
                            <span>Setup notes</span>
                          </button>

                          {isNotesOpen && (
                            <div className="hermes-notes-content">
                              {item.setupNotes || 'Tidak ada konfigurasi khusus yang diperlukan.'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0, paddingTop: '0.1rem' }}>
                        {isInstalled ? (
                          <div className="hermes-installed-badge">
                            <Check size={12} strokeWidth={2.5} />
                            <span>INSTALLED</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="hermes-install-btn"
                            onClick={() => handleInstallCatalog(item)}
                          >
                            INSTALL
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= MODAL: ADD SERVER ================= */}
        {showAddModal && (
          <div className="minimal-modal-backdrop" onClick={() => setShowAddModal(false)}>
            <div className="minimal-modal-panel" onClick={(e) => e.stopPropagation()}>
              <div className="minimal-modal-header">
                <h3 className="minimal-modal-title">Add Custom MCP Server</h3>
                <button
                  type="button"
                  className="minimal-btn-icon"
                  onClick={() => setShowAddModal(false)}
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleAddServer}>
                <div className="minimal-modal-body">
                  <div className="minimal-field">
                    <label className="minimal-label">Server Identifier (Slug)</label>
                    <input
                      type="text"
                      className="minimal-input"
                      placeholder="e.g. internal-db, figma-custom"
                      value={addForm.id}
                      onChange={(e) => setAddForm({ ...addForm, id: e.target.value })}
                    />
                  </div>

                  <div className="minimal-field">
                    <label className="minimal-label">Display Name *</label>
                    <input
                      type="text"
                      className="minimal-input"
                      placeholder="e.g. My Workspace MCP"
                      value={addForm.name}
                      onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <div className="minimal-field">
                      <label className="minimal-label">Transport Protocol</label>
                      <select
                        className="minimal-select"
                        value={addForm.transport}
                        onChange={(e) => setAddForm({ ...addForm, transport: e.target.value })}
                      >
                        <option value="http">HTTP (SSE / Streamable)</option>
                        <option value="stdio">Standard I/O (Subprocess)</option>
                        <option value="sse">Server-Sent Events (SSE)</option>
                      </select>
                    </div>

                    <div className="minimal-field">
                      <label className="minimal-label">Authentication Method</label>
                      <select
                        className="minimal-select"
                        value={addForm.auth}
                        onChange={(e) => setAddForm({ ...addForm, auth: e.target.value })}
                      >
                        <option value="none">None (Public / Local)</option>
                        <option value="oauth">OAuth 2.0</option>
                        <option value="api-key">API Key / Bearer Token</option>
                      </select>
                    </div>
                  </div>

                  {addForm.transport === 'http' || addForm.transport === 'sse' ? (
                    <div className="minimal-field">
                      <label className="minimal-label">Endpoint URL *</label>
                      <input
                        type="url"
                        className="minimal-input"
                        placeholder="https://mcp.your-domain.com/mcp"
                        value={addForm.endpoint}
                        onChange={(e) => setAddForm({ ...addForm, endpoint: e.target.value })}
                        required
                      />
                    </div>
                  ) : (
                    <>
                      <div className="minimal-field">
                        <label className="minimal-label">Command Executable</label>
                        <input
                          type="text"
                          className="minimal-input"
                          placeholder="npx, uvx, node, python3"
                          value={addForm.command}
                          onChange={(e) => setAddForm({ ...addForm, command: e.target.value })}
                        />
                      </div>
                      <div className="minimal-field">
                        <label className="minimal-label">Arguments</label>
                        <input
                          type="text"
                          className="minimal-input"
                          placeholder="-y @modelcontextprotocol/server-postgres postgresql://..."
                          value={addForm.args}
                          onChange={(e) => setAddForm({ ...addForm, args: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  <div className="minimal-field">
                    <label className="minimal-label">Description</label>
                    <textarea
                      className="minimal-textarea"
                      rows={2}
                      placeholder="Ringkasan fungsi dan resource yang disediakan server MCP ini..."
                      value={addForm.description}
                      onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
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
                  <button type="submit" className="hermes-header-btn">
                    Register Server
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL: AUTHENTICATE ================= */}
        {showAuthModal && authTargetServer && (
          <div className="minimal-modal-backdrop" onClick={() => setShowAuthModal(false)}>
            <div className="minimal-modal-panel" onClick={(e) => e.stopPropagation()}>
              <div className="minimal-modal-header">
                <h3 className="minimal-modal-title">
                  Authenticate: {authTargetServer.name || authTargetServer.id}
                </h3>
                <button
                  type="button"
                  className="minimal-btn-icon"
                  onClick={() => setShowAuthModal(false)}
                >
                  <X size={15} />
                </button>
              </div>

              <div className="minimal-modal-body">
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Server ini memerlukan otentikasi ({authTargetServer.auth || 'api-key'}). Masukkan token atau API key Anda:
                </p>

                <div className="minimal-field">
                  <label className="minimal-label">API Key / Access Token</label>
                  <input
                    type="password"
                    className="minimal-input"
                    placeholder="e.g. pat-xxx, sk-ant-xxx, xoxb-xxx"
                    value={authCredentialInput}
                    onChange={(e) => setAuthCredentialInput(e.target.value)}
                    autoFocus
                  />
                </div>

                {authTargetServer.setupNotes && (
                  <div className="hermes-notes-content" style={{ marginTop: 0 }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>Petunjuk Setup:</div>
                    {authTargetServer.setupNotes}
                  </div>
                )}
              </div>

              <div className="minimal-modal-footer">
                <button
                  type="button"
                  className="minimal-btn-ghost"
                  onClick={() => setShowAuthModal(false)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="hermes-header-btn"
                  onClick={handleSaveAuth}
                  disabled={!authCredentialInput.trim()}
                >
                  Simpan Kredensial
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
