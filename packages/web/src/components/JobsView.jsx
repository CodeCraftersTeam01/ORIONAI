import React, { useState, useEffect, useMemo } from 'react';
import {
  Workflow,
  Play,
  RotateCw,
  Search,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
  Shield,
  Layers,
  FileCode,
  HardDrive,
  Cpu,
  Trash2,
  Square,
  Sparkles,
  Bot,
  Copy,
  Check,
  Activity,
  Calendar,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function JobsView({ onClose, showToast }) {
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'running' | 'queued' | 'completed'
  const [showBuiltin, setShowBuiltin] = useState(false); // Sembunyikan default jobs secara default

  // Running actions
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [isRunningAll, setIsRunningAll] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeLogJob, setActiveLogJob] = useState(null);
  const [copiedLog, setCopiedLog] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    title: '',
    category: 'Security',
    schedule: 'Setiap Hari @ 02:00 WIB',
    cron: '0 2 * * *',
    model: 'orion',
    description: '',
    prompt: '',
  });

  // Load jobs
  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs || []);
        setStats(data.stats || null);
      } else {
        showToast?.('Gagal memuat daftar job: ' + data.message);
      }
    } catch (err) {
      showToast?.('Kesalahan koneksi jobs: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/jobs');
        const data = await res.json();
        if (data.success) {
          setJobs(data.jobs || []);
          setStats(data.stats || null);
        }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const thirdPartyJobs = useMemo(() => jobs.filter((j) => !j.isBuiltin), [jobs]);
  const builtinJobs = useMemo(() => jobs.filter((j) => j.isBuiltin), [jobs]);

  // Filtered jobs (default builtin jobs disembunyikan kecuali showBuiltin aktif)
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      // Sembunyikan job bawaan sistem jika showBuiltin false
      if (!showBuiltin && j.isBuiltin) {
        return false;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        j.title.toLowerCase().includes(q) ||
        (j.description && j.description.toLowerCase().includes(q)) ||
        (j.category && j.category.toLowerCase().includes(q));

      const matchesCat =
        selectedCategory === 'all' || j.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'running' && j.status === 'running') ||
        (statusFilter === 'queued' && j.status === 'queued') ||
        (statusFilter === 'completed' && j.status === 'completed');

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [jobs, showBuiltin, searchQuery, selectedCategory, statusFilter]);

  // Categories
  const categories = useMemo(() => {
    const set = new Set(['all']);
    jobs.forEach((j) => {
      if (j.category) set.add(j.category);
    });
    return Array.from(set);
  }, [jobs]);

  const runningCount = useMemo(() => filteredJobs.filter((j) => j.status === 'running').length, [filteredJobs]);
  const queuedCount = useMemo(() => filteredJobs.filter((j) => j.status === 'queued').length, [filteredJobs]);
  const completedCount = useMemo(() => filteredJobs.filter((j) => j.status === 'completed').length, [filteredJobs]);

  // Trigger Run Job
  const handleRunJob = async (jobId, jobTitle) => {
    setActionLoadingId(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}/run`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast?.(`Job '${jobTitle}' dimulai! Agen sedang bekerja.`);
        await loadJobs();
      } else {
        showToast?.('Gagal menjalankan job: ' + data.message);
      }
    } catch (err) {
      showToast?.('Kesalahan saat menjalankan job: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Cancel Job
  const handleCancelJob = async (jobId, jobTitle) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast?.(`Job '${jobTitle}' dibatalkan.`);
        await loadJobs();
      }
    } catch (err) {
      showToast?.('Gagal membatalkan job: ' + err.message);
    }
  };

  // Run all active jobs
  const handleRunAll = async () => {
    setIsRunningAll(true);
    try {
      const res = await fetch('/api/jobs/run-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast?.(`Batch run aktif: ${data.message}`);
        await loadJobs();
      }
    } catch (err) {
      showToast?.('Gagal menjalankan batch: ' + err.message);
    } finally {
      setIsRunningAll(false);
    }
  };

  // Delete Job
  const handleDeleteJob = async (jobId, jobTitle) => {
    if (!window.confirm(`Hapus Job '${jobTitle}'?`)) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast?.(`Job '${jobTitle}' berhasil dihapus.`);
        await loadJobs();
      } else {
        showToast?.(data.message || 'Gagal menghapus');
      }
    } catch (err) {
      showToast?.('Kesalahan menghapus: ' + err.message);
    }
  };

  // Create Job Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim()) return;

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(`Job baru '${createForm.title}' berhasil dijadwalkan!`);
        setShowCreateModal(false);
        setCreateForm({
          title: '',
          category: 'Security',
          schedule: 'Setiap Hari @ 02:00 WIB',
          cron: '0 2 * * *',
          model: 'orion',
          description: '',
          prompt: '',
        });
        await loadJobs();
      } else {
        showToast?.('Gagal membuat job: ' + data.message);
      }
    } catch (err) {
      showToast?.('Kesalahan saat membuat job: ' + err.message);
    }
  };

  const getCategoryIcon = (category) => {
    const c = (category || '').toLowerCase();
    if (c === 'security') return <Shield size={15} />;
    if (c === 'testing') return <CheckCircle2 size={15} />;
    if (c === 'maintenance') return <Activity size={15} />;
    if (c === 'documentation') return <FileCode size={15} />;
    if (c === 'backup') return <HardDrive size={15} />;
    if (c === 'optimization') return <Cpu size={15} />;
    return <Workflow size={15} />;
  };

  const copyLogText = () => {
    if (!activeLogJob?.logs) return;
    const text = activeLogJob.logs.map((l) => `[${l.timestamp}] [${l.level?.toUpperCase()}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  return (
    <div className="minimal-view-wrapper">
      <div className="minimal-view-container">
      {/* ================= HEADER ================= */}
      <div className="minimal-header">
        <div className="minimal-title-group">
          <div className="minimal-title-row">
            <h1 className="minimal-title">Job & Task Automation</h1>
            <span className="minimal-tag">WORKER POOL</span>
          </div>
          <p className="minimal-subtitle">
            Pusat eksekusi tugas berkala dan background worker: automated testing, security audit, dan pemeliharaan repositori.
          </p>
        </div>

        <div className="minimal-header-actions">
          <button
            type="button"
            className="minimal-btn-ghost"
            onClick={handleRunAll}
            disabled={isRunningAll}
            title="Jalankan semua task sekarang"
          >
            <Play size={12} className={isRunningAll ? 'is-spinning' : ''} />
            <span>{isRunningAll ? 'Menjalankan...' : 'Run All'}</span>
          </button>

          <button
            type="button"
            className="minimal-btn-primary"
            onClick={() => setShowCreateModal(true)}
            title="Tambah otomatisasi baru"
          >
            <Plus size={13} />
            <span>Tambah Job</span>
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
            <span>Pihak Ketiga:</span>
            <span className="minimal-metric-value">{thirdPartyJobs.length} tasks</span>
          </div>

          <div className="minimal-metric-divider" />

          <div className="minimal-metric-item">
            <span>Berjalan:</span>
            <span className="minimal-metric-value">{runningCount}</span>
          </div>

          <div className="minimal-metric-divider" />

          <div className="minimal-metric-item">
            <span>Selesai:</span>
            <span className="minimal-metric-value">{completedCount}</span>
          </div>

          <div className="minimal-metric-divider" />

          <div className="minimal-metric-item">
            <span>Bawaan Default:</span>
            <span className="minimal-metric-value" style={{ color: 'var(--text-muted)' }}>
              {builtinJobs.length} ({showBuiltin ? 'Tampil' : 'Disembunyikan'})
            </span>
          </div>
        </div>

        <button
          type="button"
          className="minimal-btn-ghost"
          onClick={() => setShowBuiltin((prev) => !prev)}
          style={{ fontSize: '0.74rem', padding: '0.28rem 0.65rem' }}
          title={showBuiltin ? 'Sembunyikan job bawaan sistem' : 'Tampilkan job bawaan sistem'}
        >
          {showBuiltin ? <EyeOff size={12} /> : <Eye size={12} />}
          <span>{showBuiltin ? 'Sembunyikan Default' : `Tampilkan Default (${builtinJobs.length})`}</span>
        </button>
      </div>

      {/* ================= MINIMAL TOOLBAR ================= */}
      <div className="minimal-toolbar">
        <div className="minimal-search-box">
          <Search size={13} className="minimal-search-icon" />
          <input
            type="text"
            className="minimal-search-input"
            placeholder="Cari nama job atau kategori..."
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
              Semua ({filteredJobs.length})
            </button>
            <button
              type="button"
              className={`minimal-tab-btn ${statusFilter === 'running' ? 'active' : ''}`}
              onClick={() => setStatusFilter('running')}
            >
              Berjalan ({runningCount})
            </button>
            <button
              type="button"
              className={`minimal-tab-btn ${statusFilter === 'queued' ? 'active' : ''}`}
              onClick={() => setStatusFilter('queued')}
            >
              Antrean ({queuedCount})
            </button>
            <button
              type="button"
              className={`minimal-tab-btn ${statusFilter === 'completed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('completed')}
            >
              Selesai ({completedCount})
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

      {/* ================= JOBS LIST ================= */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <RotateCw size={20} className="is-spinning" style={{ margin: '0 auto 0.5rem' }} />
          <p style={{ fontSize: '0.82rem', margin: 0 }}>Memuat daftar job latar belakang...</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="minimal-card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <Workflow size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 0.5rem' }} />
          <h3 style={{ margin: '0 0 0.25rem', color: 'var(--text-primary)', fontSize: '0.92rem' }}>
            {!showBuiltin
              ? 'Job Default Bawaan Sedang Disembunyikan'
              : 'Tidak ada background job yang cocok'}
          </h3>
          <p style={{ margin: '0 0 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {!showBuiltin
              ? 'Job default bawaan disembunyikan. Anda dapat menambahkan job pihak ketiga baru atau menampilkan job bawaan sistem.'
              : 'Sesuaikan filter atau buat job baru untuk memulai otomatisasi.'}
          </p>
          {!showBuiltin && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="minimal-btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={12} />
                <span>Tambah Job Pihak Ketiga</span>
              </button>
              <button
                type="button"
                className="minimal-btn-ghost"
                onClick={() => setShowBuiltin(true)}
              >
                <Eye size={12} />
                <span>Tampilkan Job Default ({builtinJobs.length})</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="minimal-list-wrap">
          {filteredJobs.map((job) => {
            const isActing = actionLoadingId === job.id;
            const isRunning = job.status === 'running';

            return (
              <div key={job.id} className="minimal-row-card">
                <div className="minimal-row-main">
                  <div className="minimal-card-icon" style={{ width: '34px', height: '34px' }}>
                    {getCategoryIcon(job.category)}
                  </div>

                  <div className="minimal-row-meta">
                    <div className="minimal-row-title-line">
                      <span className="minimal-row-title">{job.title}</span>
                      <span className="minimal-badge">{job.category}</span>
                      <span className="minimal-badge">{job.cron || 'MANUAL'}</span>
                      <span className="minimal-badge" style={{ textTransform: 'uppercase' }}>
                        {job.model || 'ORION'}
                      </span>
                    </div>

                    <p className="minimal-row-subtitle">{job.description}</p>

                    {/* Progress Bar for Running Tasks */}
                    {isRunning && (
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '320px',
                          height: '3px',
                          background: 'var(--border-subtle)',
                          borderRadius: '2px',
                          overflow: 'hidden',
                          marginTop: '0.35rem',
                        }}
                      >
                        <div
                          style={{
                            width: `${job.progress || 45}%`,
                            height: '100%',
                            background: 'var(--text-primary)',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="minimal-row-side">
                  {/* Status Indicator */}
                  <div className="minimal-card-status">
                    {isRunning ? (
                      <>
                        <span className="minimal-status-dot pulse" />
                        <span>{job.progress || 45}% Working</span>
                      </>
                    ) : job.status === 'completed' ? (
                      <>
                        <span className="minimal-status-dot" />
                        <span>{job.lastRunDuration || '2.4s'} OK</span>
                      </>
                    ) : job.status === 'queued' ? (
                      <>
                        <span className="minimal-status-dot warning" />
                        <span style={{ color: 'var(--text-muted)' }}>Antrean</span>
                      </>
                    ) : (
                      <>
                        <span className="minimal-status-dot inactive" />
                        <span style={{ color: 'var(--text-muted)' }}>Siap</span>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="minimal-card-actions">
                    {isRunning ? (
                      <button
                        type="button"
                        className="minimal-icon-btn danger"
                        onClick={() => handleCancelJob(job.id, job.title)}
                        title="Batalkan proses yang sedang berjalan"
                      >
                        <Square size={11} />
                        <span>Stop</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="minimal-icon-btn"
                        onClick={() => handleRunJob(job.id, job.title)}
                        disabled={isActing}
                        title="Jalankan job ini sekarang"
                      >
                        <Play size={11} className={isActing ? 'is-spinning' : ''} />
                        <span>{isActing ? 'Mulai...' : 'Run'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="minimal-icon-btn"
                      onClick={() => setActiveLogJob(job)}
                      title="Lihat terminal output logs"
                    >
                      <Terminal size={11} />
                      <span>Logs</span>
                    </button>

                    <button
                      type="button"
                      className="minimal-icon-btn danger"
                      onClick={() => handleDeleteJob(job.id, job.title)}
                      title="Hapus job ini"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= CREATE JOB MODAL ================= */}
      {showCreateModal && (
        <div className="minimal-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="minimal-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="minimal-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Workflow size={15} />
                <h3 className="minimal-modal-title">Jadwalkan Job & Task Baru</h3>
              </div>
              <button
                type="button"
                className="minimal-icon-btn"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="minimal-modal-body">
                {/* Presets */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Preset:
                  </span>
                  <button
                    type="button"
                    className="minimal-icon-btn"
                    onClick={() =>
                      setCreateForm({
                        title: 'Weekly Vulnerability Audit',
                        category: 'Security',
                        schedule: 'Tiap Senin @ 03:00 WIB',
                        cron: '0 3 * * 1',
                        model: 'orion',
                        description: 'Audit dependensi npm/pnpm dan berikan saran patch keamanan.',
                        prompt: 'Periksa seluruh dependencies di workspace dan laporkan temuan CVE penting.',
                      })
                    }
                  >
                    Security Audit
                  </button>
                  <button
                    type="button"
                    className="minimal-icon-btn"
                    onClick={() =>
                      setCreateForm({
                        title: 'Auto Unit Test Runner',
                        category: 'Testing',
                        schedule: 'Tiap 6 Jam',
                        cron: '0 */6 * * *',
                        model: 'orion',
                        description: 'Jalankan test suite vitest dan rangkum regression error.',
                        prompt: 'Jalankan `npm test` dan ekstrak fungsi yang gagal serta rekomendasi solusi.',
                      })
                    }
                  >
                    Test Suite
                  </button>
                  <button
                    type="button"
                    className="minimal-icon-btn"
                    onClick={() =>
                      setCreateForm({
                        title: 'Sync Codebase Docs',
                        category: 'Documentation',
                        schedule: 'Tiap Hari @ 23:00 WIB',
                        cron: '0 23 * * *',
                        model: 'orion',
                        description: 'Sinkronisasi markdown documentation dari perubahan kode terbaru.',
                        prompt: 'Periksa git commit hari ini dan perbarui README atau dokumen arsitektur terkait.',
                      })
                    }
                  >
                    Doc Sync
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>NAMA JOB</label>
                  <input
                    type="text"
                    className="minimal-search-input"
                    placeholder="Contoh: Daily Database Vacuum"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>KATEGORI</label>
                    <select
                      className="minimal-search-input"
                      value={createForm.category}
                      onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    >
                      <option value="Security">Security</option>
                      <option value="Testing">Testing</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Documentation">Documentation</option>
                      <option value="Backup">Backup</option>
                      <option value="Optimization">Optimization</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>CRON EXPRESSION</label>
                    <input
                      type="text"
                      className="minimal-search-input font-mono"
                      placeholder="0 */6 * * *"
                      value={createForm.cron}
                      onChange={(e) => setCreateForm({ ...createForm, cron: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>DESKRIPSI TUGAS</label>
                  <input
                    type="text"
                    className="minimal-search-input"
                    placeholder="Penjelasan ringkas pekerjaan ini..."
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>INSTRUKSI PROMPT AGENT</label>
                  <textarea
                    rows={3}
                    className="minimal-search-input font-mono"
                    style={{ height: 'auto', padding: '0.5rem' }}
                    placeholder="Instruksi terperinci yang akan dieksekusi oleh Orion Agent saat job berjalan..."
                    value={createForm.prompt}
                    onChange={(e) => setCreateForm({ ...createForm, prompt: e.target.value })}
                  />
                </div>
              </div>

              <div className="minimal-modal-footer">
                <button
                  type="button"
                  className="minimal-btn-ghost"
                  onClick={() => setShowCreateModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="minimal-btn-primary">
                  Simpan Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= TERMINAL LOGS MODAL ================= */}
      {activeLogJob && (
        <div className="minimal-modal-backdrop" onClick={() => setActiveLogJob(null)}>
          <div className="minimal-modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="minimal-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={14} />
                <div>
                  <h3 className="minimal-modal-title">Logs: {activeLogJob.title}</h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Status: {activeLogJob.status} · Runner: {activeLogJob.model || 'ORION'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="minimal-icon-btn"
                onClick={() => setActiveLogJob(null)}
              >
                <X size={14} />
              </button>
            </div>

            <div className="minimal-modal-body" style={{ background: 'var(--code-bg, #0e0e10)' }}>
              {activeLogJob.logs && activeLogJob.logs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>
                  {activeLogJob.logs.map((log, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.65rem', lineHeight: 1.45 }}>
                      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>[{log.timestamp}]</span>
                      <span
                        style={{
                          color:
                            log.level === 'error'
                              ? '#ef4444'
                              : log.level === 'warn'
                              ? '#f59e0b'
                              : log.level === 'success'
                              ? '#10b981'
                              : 'var(--text-primary)',
                        }}
                      >
                        {log.text}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Belum ada catatan log eksekusi untuk job ini.
                </div>
              )}
            </div>

            <div className="minimal-modal-footer">
              <button
                type="button"
                className="minimal-btn-ghost"
                onClick={copyLogText}
                disabled={!activeLogJob.logs?.length}
              >
                {copiedLog ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedLog ? 'Tersalin' : 'Salin Log'}</span>
              </button>
              <button
                type="button"
                className="minimal-btn-primary"
                onClick={() => setActiveLogJob(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
