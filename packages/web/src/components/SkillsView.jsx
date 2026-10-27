import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Download,
  RotateCw,
  Search,
  Check,
  ExternalLink,
  Trash2,
  Eye,
  Plus,
  X,
  Sparkles,
  Layers,
  Bot,
  Zap,
  Shield,
  Tag,
  CheckCircle2,
  AlertCircle,
  FileCode,
} from 'lucide-react';

export default function SkillsView({ onClose, showToast }) {
  const [activeTab, setActiveTab] = useState('hub'); // 'hub' | 'installed'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all'); // 'all' | 'claude' | 'gemini' | 'hermes' | 'universal'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [displayLimit, setDisplayLimit] = useState(48);

  const [installedSkills, setInstalledSkills] = useState([]);
  const [hubCatalog, setHubCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);

  // Inspector modal state
  const [inspectSkill, setInspectSkill] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Install URL modal state
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [installUrlInput, setInstallUrlInput] = useState('');
  const [installingUrl, setInstallingUrl] = useState(false);

  // Fetch installed skills & catalog
  const loadData = async () => {
    setLoading(true);
    try {
      const [installedRes, hubRes] = await Promise.all([
        fetch('/api/skills').then((r) => r.json()),
        fetch('/api/skills/hub').then((r) => r.json()),
      ]);

      if (installedRes.success) {
        setInstalledSkills(installedRes.skills || []);
      }
      if (hubRes.success) {
        setHubCatalog(hubRes.catalog || []);
      }
    } catch (err) {
      showToast?.('Gagal memuat data keahlian: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Installed IDs set for quick lookup
  const installedIds = useMemo(() => {
    return new Set(installedSkills.map((s) => s.id.toLowerCase()));
  }, [installedSkills]);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set(['all']);
    hubCatalog.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats);
  }, [hubCatalog]);

  // Filtered Hub catalog
  const filteredHub = useMemo(() => {
    return hubCatalog.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

      const matchesPlatform =
        selectedPlatform === 'all' || item.platform.toLowerCase() === selectedPlatform.toLowerCase();

      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;

      return matchesSearch && matchesPlatform && matchesCategory;
    });
  }, [hubCatalog, searchQuery, selectedPlatform, selectedCategory]);

  // Filtered Installed skills
  const filteredInstalled = useMemo(() => {
    return installedSkills.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPlatform =
        selectedPlatform === 'all' || item.platform.toLowerCase() === selectedPlatform.toLowerCase();

      return matchesSearch && matchesPlatform;
    });
  }, [installedSkills, searchQuery, selectedPlatform]);

  // Handle 1-click install from Hub
  const handleInstallFromHub = async (item) => {
    try {
      showToast?.(`Mengunduh & memasang '${item.name}' dari internet...`);
      const res = await fetch('/api/skills/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          name: item.name,
          description: item.description,
          platform: item.platform,
          version: item.version,
          author: item.author,
          tags: item.tags,
          content: item.content,
          sourceUrl: item.sourceUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(`Skill '${item.name}' berhasil dipasang dan siap diakses AI!`);
        await loadData();
      } else {
        showToast?.(`Gagal memasang: ${data.error || 'Terjadi kesalahan'}`);
      }
    } catch (err) {
      showToast?.('Kesalahan koneksi saat memasang skill: ' + err.message);
    }
  };

  // Handle toggle skill active/inactive
  const handleToggle = async (skillId, currentState) => {
    try {
      const nextState = !currentState;
      const res = await fetch('/api/skills/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: skillId, enabled: nextState }),
      });
      const data = await res.json();
      if (data.success) {
        setInstalledSkills((prev) =>
          prev.map((s) => (s.id === skillId ? { ...s, enabled: nextState } : s))
        );
        showToast?.(`Skill '${skillId}' ${nextState ? 'diaktifkan' : 'dinonaktifkan'}.`);
      } else {
        showToast?.('Gagal mengubah status: ' + data.error);
      }
    } catch (err) {
      showToast?.('Gagal toggle skill: ' + err.message);
    }
  };

  // Handle update single skill
  const handleUpdate = async (skillId) => {
    try {
      const res = await fetch(`/api/skills/update/${skillId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast?.(`Skill '${skillId}' berhasil diperbarui ke versi terbaru.`);
        await loadData();
      } else {
        showToast?.('Gagal update: ' + data.error);
      }
    } catch (err) {
      showToast?.('Gagal memperbarui skill: ' + err.message);
    }
  };

  // Handle update all skills & sync open source registry from internet
  const handleUpdateAll = async () => {
    setIsUpdatingAll(true);
    try {
      showToast?.('Menyinkronkan Gudang Skill dari repositori open-source internet...');
      const [hubSyncRes, updateAllRes] = await Promise.all([
        fetch('/api/skills/hub?refresh=true').then((r) => r.json()).catch(() => null),
        fetch('/api/skills/update-all', { method: 'POST' }).then((r) => r.json()).catch(() => null),
      ]);

      if (hubSyncRes?.success) {
        setHubCatalog(hubSyncRes.catalog || []);
      }
      if (updateAllRes?.success) {
        const count = updateAllRes.results?.filter((r) => r.status === 'success').length || 0;
        showToast?.(`Sinkronisasi selesai! ${count} keahlian terpasang diperbarui, ${hubSyncRes?.count || 0} keahlian online tersedia.`);
      } else {
        showToast?.(`Sinkronisasi online selesai! ${hubSyncRes?.count || 0} keahlian open-source tersedia.`);
      }
      await loadData();
    } catch (err) {
      showToast?.('Gagal memperbarui seluruh skill: ' + err.message);
    } finally {
      setIsUpdatingAll(false);
    }
  };

  // Handle delete skill
  const handleDelete = async (skillId, skillName) => {
    if (!window.confirm(`Hapus keahlian '${skillName}' dari Orion Agent?`)) return;
    try {
      const res = await fetch(`/api/skills/${skillId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast?.(`Skill '${skillName}' berhasil dihapus.`);
        await loadData();
      } else {
        showToast?.('Gagal menghapus: ' + data.error);
      }
    } catch (err) {
      showToast?.('Gagal menghapus skill: ' + err.message);
    }
  };

  // Inspect skill details modal
  const handleInspect = async (skillId) => {
    setInspectLoading(true);
    try {
      const res = await fetch(`/api/skills/${skillId}`);
      const data = await res.json();
      if (data.success) {
        setInspectSkill(data.skill);
      } else {
        showToast?.('Gagal membuka detail: ' + data.error);
      }
    } catch (err) {
      showToast?.('Gagal membuka skill: ' + err.message);
    } finally {
      setInspectLoading(false);
    }
  };

  // Handle install from remote URL
  const handleInstallFromUrl = async (e) => {
    e.preventDefault();
    if (!installUrlInput.trim()) return;
    setInstallingUrl(true);
    try {
      const res = await fetch('/api/skills/install-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: installUrlInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(`Skill '${data.id}' berhasil diunduh dan dipasang.`);
        setInstallUrlInput('');
        setShowUrlModal(false);
        await loadData();
      } else {
        showToast?.('Gagal mengunduh skill: ' + data.error);
      }
    } catch (err) {
      showToast?.('Kesalahan jaringan: ' + err.message);
    } finally {
      setInstallingUrl(false);
    }
  };

  const getPlatformBadge = (platform) => {
    const p = (platform || 'universal').toLowerCase();
    if (p === 'claude') {
      return <span className="platform-tag claude"><Layers size={11} /> Claude</span>;
    }
    if (p === 'gemini') {
      return <span className="platform-tag gemini"><Zap size={11} /> Gemini</span>;
    }
    if (p === 'hermes') {
      return <span className="platform-tag hermes"><Bot size={11} /> Hermes</span>;
    }
    return <span className="platform-tag universal"><Sparkles size={11} /> Universal</span>;
  };

  return (
    <div className="page-view-container">
      <div className="models-page-content is-page-mode">
        {/* Header */}
        <div className="page-view-header">
          <div className="page-view-header-left">
            <div className="header-title-row">
              <Boxes size={22} className="header-title-icon" />
              <h1 className="page-view-title">Skills Hub</h1>
            </div>
            <p className="page-view-subtitle">
              Pusat keahlian otonom multi-platform (Claude, Gemini, Hermes, dan Universal). Terhubung langsung ke registry Open Source publik dunia ({hubCatalog.length}+ keahlian komunitas siap pakai).
            </p>
          </div>

          <div className="page-view-header-right skills-header-actions">
            <button
              type="button"
              className="skills-header-btn"
              onClick={() => setShowUrlModal(true)}
              title="Pasang dari GitHub URL"
            >
              <Plus size={14} />
              <span>Pasang dari GitHub</span>
            </button>

            <button
              type="button"
              className="skills-header-btn"
              onClick={handleUpdateAll}
              disabled={isUpdatingAll}
              title="Sinkronkan registry open-source dari internet & perbarui keahlian terpasang"
            >
              <RotateCw size={13} className={isUpdatingAll ? 'animate-spin' : ''} />
              <span>{isUpdatingAll ? 'Menyinkronkan...' : 'Sinkronkan dari Internet'}</span>
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

        {/* Tab & Filter Bar */}
        <div className="skills-nav-bar">
          <div className="skills-tab-group">
            <button
              type="button"
              className={`skills-tab-btn ${activeTab === 'hub' ? 'active' : ''}`}
              onClick={() => setActiveTab('hub')}
            >
              <Boxes size={14} /> Gudang Skill (Store)
              <span className="skills-counter">{hubCatalog.length}</span>
            </button>

            <button
              type="button"
              className={`skills-tab-btn ${activeTab === 'installed' ? 'active' : ''}`}
              onClick={() => setActiveTab('installed')}
            >
              <CheckCircle2 size={14} /> Terpasang (Installed)
              <span className="skills-counter">{installedSkills.length}</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="skills-search-wrapper">
            <Search size={14} className="skills-search-icon" />
            <input
              type="text"
              className="skills-search-input"
              placeholder="Cari keahlian, topik, atau kata kunci..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

        {/* Platform & Category Pills */}
        <div className="skills-filter-row">
          <div className="skills-filter-group">
            <span className="filter-label">Platform:</span>
            {['all', 'claude', 'gemini', 'hermes', 'universal'].map((p) => (
              <button
                key={p}
                type="button"
                className={`filter-pill ${selectedPlatform === p ? 'active' : ''}`}
                onClick={() => setSelectedPlatform(p)}
              >
                {p === 'all' ? 'Semua Platform' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === 'hub' && (
            <div className="skills-filter-group">
              <span className="filter-label">Kategori:</span>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`filter-pill ${selectedCategory === c ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(c)}
                >
                  {c === 'all' ? 'Semua Kategori' : c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="skills-loading-state">
            <RotateCw size={24} className="animate-spin text-muted" />
            <span>Memindai direktori keahlian multi-platform...</span>
          </div>
        ) : activeTab === 'hub' ? (
          /* ================= GUDANG SKILL (STORE / CATALOG) ================= */
          <div className="skills-grid">
            {filteredHub.length === 0 ? (
              <div className="skills-empty-state">
                <AlertCircle size={28} className="text-muted" />
                <p>Tidak ada keahlian yang cocok dengan pencarian atau filter.</p>
              </div>
            ) : (
              <>
                {filteredHub.slice(0, displayLimit).map((item) => {
                  const isInstalled = installedIds.has(item.id.toLowerCase());
                  return (
                    <div key={item.id} className="skill-card">
                      <div className="skill-card-top">
                        <div className="skill-card-badges">
                          {getPlatformBadge(item.platform)}
                          {item.category && (
                            <span className="category-tag">{item.category}</span>
                          )}
                          {item.popular && (
                            <span className="popular-tag">Populer</span>
                          )}
                        </div>
                        <span className="skill-version">v{item.version}</span>
                      </div>

                      <h3 className="skill-card-title">{item.name}</h3>
                      <p className="skill-card-desc">{item.description}</p>

                      {item.tags && item.tags.length > 0 && (
                        <div className="skill-card-tags">
                          {item.tags.slice(0, 3).map((t) => (
                            <span key={t} className="skill-mini-tag">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="skill-card-footer">
                        <div className="skill-card-author">
                          <span>Oleh: {item.author || 'Komunitas'}</span>
                        </div>

                        <div className="skill-card-actions">
                          <button
                            type="button"
                            className="skill-btn-secondary"
                            onClick={() => {
                              setInspectSkill({
                                id: item.id,
                                name: item.name,
                                description: item.description,
                                platform: item.platform,
                                version: item.version,
                                author: item.author,
                                tags: item.tags,
                                rawContent: item.content,
                                sourceUrl: item.sourceUrl,
                              });
                            }}
                            title="Lihat petunjuk lengkap"
                          >
                            <Eye size={13} />
                          </button>

                          {isInstalled ? (
                            <button
                              type="button"
                              className="skill-btn-installed"
                              disabled
                            >
                              <Check size={13} /> Terpasang
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="skill-btn-install"
                              onClick={() => handleInstallFromHub(item)}
                            >
                              <Download size={13} /> Pasang
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredHub.length > displayLimit && (
                  <div
                    className="skills-load-more-row"
                    style={{
                      gridColumn: '1 / -1',
                      display: 'flex',
                      justifyContent: 'center',
                      padding: '1.25rem 0',
                    }}
                  >
                    <button
                      type="button"
                      className="models-btn-secondary"
                      onClick={() => setDisplayLimit((prev) => prev + 48)}
                      style={{
                        padding: '0.65rem 1.4rem',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        gap: '0.5rem',
                      }}
                    >
                      <Download size={14} /> Tampilkan Lebih Banyak ({displayLimit} dari {filteredHub.length} keahlian)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* ================= SKILL TERPASANG (INSTALLED) ================= */
          <div className="skills-grid">
            {filteredInstalled.length === 0 ? (
              <div className="skills-empty-state">
                <Boxes size={32} className="text-muted" />
                <p>Belum ada keahlian yang terpasang untuk filter ini.</p>
                <button
                  type="button"
                  className="models-btn-primary"
                  onClick={() => setActiveTab('hub')}
                  style={{ marginTop: '0.75rem' }}
                >
                  Jelajahi Gudang Skill
                </button>
              </div>
            ) : (
              filteredInstalled.map((item) => (
                <div
                  key={item.id}
                  className={`skill-card ${item.enabled ? 'is-enabled' : 'is-disabled'}`}
                >
                  <div className="skill-card-top">
                    <div className="skill-card-badges">
                      {getPlatformBadge(item.platform)}
                      <span className="source-location-tag">
                        {item.sourceLocation === 'gemini_global'
                          ? 'Global Gemini'
                          : item.sourceLocation === 'claude_global'
                          ? 'Global Claude'
                          : item.sourceLocation === 'hermes_global'
                          ? 'Global Hermes'
                          : 'Orion Local'}
                      </span>
                    </div>

                    {/* Toggle Switch */}
                    <label
                      className="skill-toggle-switch"
                      title={item.enabled ? 'Keahlian Aktif (Klik untuk matikan)' : 'Keahlian Nonaktif (Klik untuk aktifkan)'}
                    >
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => handleToggle(item.id, item.enabled)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  <h3 className="skill-card-title">{item.name}</h3>
                  <p className="skill-card-desc">{item.description}</p>

                  <div className="skill-path-box" title={item.filePath}>
                    <FileCode size={12} />
                    <span className="skill-path-text">{item.filePath}</span>
                  </div>

                  <div className="skill-card-footer">
                    <div className="skill-status-indicator">
                      <span className={`status-dot ${item.enabled ? 'active' : 'inactive'}`} />
                      <span className="status-label">
                        {item.enabled ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>

                    <div className="skill-card-actions">
                      {item.sourceUrl && (
                        <button
                          type="button"
                          className="skill-btn-secondary"
                          onClick={() => handleUpdate(item.id)}
                          title="Perbarui ke versi terbaru dari upstream"
                        >
                          <RotateCw size={13} />
                        </button>
                      )}

                      <button
                        type="button"
                        className="skill-btn-secondary"
                        onClick={() => handleInspect(item.id)}
                        title="Buka petunjuk instruksi SKILL.md"
                      >
                        <Eye size={13} /> Petunjuk
                      </button>

                      {item.sourceLocation === 'orion' && (
                        <button
                          type="button"
                          className="skill-btn-danger"
                          onClick={() => handleDelete(item.id, item.name)}
                          title="Hapus keahlian dari penyimpanan lokal"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ================= INSPECT MODAL ================= */}
        {inspectSkill && (
          <div className="modal-backdrop" onClick={() => setInspectSkill(null)}>
            <div
              className="modal-dialog skill-inspect-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="modal-header-left">
                  <div className="modal-header-badges">
                    {getPlatformBadge(inspectSkill.platform)}
                    <span className="category-tag">v{inspectSkill.version || '1.0.0'}</span>
                  </div>
                  <h2 className="modal-title">{inspectSkill.name}</h2>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setInspectSkill(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body skill-inspect-body">
                <div className="inspect-meta-box">
                  <div className="inspect-meta-row">
                    <span className="meta-key">Deskripsi:</span>
                    <span className="meta-val">{inspectSkill.description}</span>
                  </div>
                  {inspectSkill.allowedTools && inspectSkill.allowedTools.length > 0 && (
                    <div className="inspect-meta-row">
                      <span className="meta-key">Tools Diizinkan:</span>
                      <div className="meta-tools">
                        {inspectSkill.allowedTools.map((t) => (
                          <span key={t} className="tool-pill">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {inspectSkill.sourceUrl && (
                    <div className="inspect-meta-row">
                      <span className="meta-key">Sumber Remote:</span>
                      <a
                        href={inspectSkill.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="meta-link"
                      >
                        {inspectSkill.sourceUrl} <ExternalLink size={11} />
                      </a>
                    </div>
                  )}
                </div>

                <div className="inspect-instructions-header">
                  <FileCode size={14} /> Isi Berkas SKILL.md
                </div>
                <pre className="inspect-markdown-content">
                  {inspectSkill.rawContent || inspectSkill.instructions || 'Tidak ada konten.'}
                </pre>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="models-btn-secondary"
                  onClick={() => setInspectSkill(null)}
                >
                  Tutup
                </button>
                {!installedIds.has(inspectSkill.id?.toLowerCase()) && inspectSkill.rawContent && (
                  <button
                    type="button"
                    className="models-btn-primary"
                    onClick={() => {
                      handleInstallFromHub({
                        ...inspectSkill,
                        content: inspectSkill.rawContent,
                      });
                      setInspectSkill(null);
                    }}
                  >
                    <Download size={14} /> Pasang Keahlian Ini
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= INSTALL FROM URL MODAL ================= */}
        {showUrlModal && (
          <div className="modal-backdrop" onClick={() => setShowUrlModal(false)}>
            <div
              className="modal-dialog skill-url-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title">Pasang Keahlian dari GitHub / Remote URL</h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowUrlModal(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleInstallFromUrl}>
                <div className="modal-body">
                  <p className="url-modal-desc">
                    Masukkan URL repositori GitHub atau tautan raw <code>SKILL.md</code>. Orion otomatis mengunduh, mengekstrak konfigurasi YAML, dan mendaftarkannya ke dalam sistem agen Anda.
                  </p>

                  <div className="url-input-field">
                    <label className="url-input-label">URL Repositori / File SKILL.md:</label>
                    <input
                      type="text"
                      className="url-text-input"
                      placeholder="Contoh: VoltAgent/awesome-agent-skills/skills/git-pro atau https://raw.githubusercontent.com/..."
                      value={installUrlInput}
                      onChange={(e) => setInstallUrlInput(e.target.value)}
                      required
                    />
                  </div>

                  <div className="url-presets-box">
                    <span className="presets-label">Contoh sumber terbuka siap unduh:</span>
                    <button
                      type="button"
                      className="preset-chip"
                      onClick={() => setInstallUrlInput('VoltAgent/awesome-agent-skills/skills/git-pro')}
                    >
                      git-pro (Awesome Skills)
                    </button>
                    <button
                      type="button"
                      className="preset-chip"
                      onClick={() => setInstallUrlInput('anthropics/skills/code-review')}
                    >
                      code-review (Claude Skills)
                    </button>
                    <button
                      type="button"
                      className="preset-chip"
                      onClick={() => setInstallUrlInput('NousResearch/hermes-agent-skills/json-validator')}
                    >
                      json-validator (Hermes Skills)
                    </button>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="models-btn-secondary"
                    onClick={() => setShowUrlModal(false)}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="models-btn-primary"
                    disabled={installingUrl || !installUrlInput.trim()}
                  >
                    <Download size={14} className={installingUrl ? 'animate-spin' : ''} />
                    {installingUrl ? 'Mengunduh...' : 'Unduh & Pasang'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
