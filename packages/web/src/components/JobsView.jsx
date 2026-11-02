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
  ChevronRight,
  Activity,
  Calendar,
} from 'lucide-react';

export default function JobsView({ onClose, showToast }) {
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'running' | 'queued' | 'completed'

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
    // Auto refresh every 5 seconds to show live progress
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

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
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
  }, [jobs, searchQuery, selectedCategory, statusFilter]);

  // Categories
  const categories = useMemo(() => {
    const set = new Set(['all']);
    jobs.forEach((j) => {
      if (j.category) set.add(j.category);
    });
    return Array.from(set);
  }, [jobs]);

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

  // Toggle job active
  const handleToggleJob = async (jobId, currentState) => {
    const nextState = !currentState;
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState }),
      });
      const data = await res.json();
      if (data.success) {
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, enabled: nextState } : j))
        );
        showToast?.(`Job ${nextState ? 'diaktifkan' : 'dijeda'}.`);
      }
    } catch (err) {
      showToast?.('Gagal mengubah status job: ' + err.message);
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
    if (c === 'security') return <Shield size={16} className="text-emerald" />;
    if (c === 'testing') return <CheckCircle2 size={16} className="text-blue" />;
    if (c === 'maintenance') return <Activity size={16} className="text-amber" />;
    if (c === 'documentation') return <FileCode size={16} className="text-purple" />;
    if (c === 'backup') return <HardDrive size={16} className="text-cyan" />;
    if (c === 'optimization') return <Cpu size={16} className="text-indigo" />;
    return <Workflow size={16} className="text-muted" />;
  };

  const copyLogText = () => {
    if (!activeLogJob?.logs) return;
    const text = activeLogJob.logs.map((l) => `[${l.timestamp}] [${l.level?.toUpperCase()}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  return (
    <div className="page-view-container">
      <div className="models-page-content is-page-mode">
        {/* ================= HEADER ================= */}
        <div className="page-view-header">
          <div className="page-view-header-left">
            <div className="header-title-row">
              <Workflow size={22} className="header-title-icon" style={{ color: 'var(--brand-accent, #6366f1)' }} />
              <h1 className="page-view-title">Job & Task Automation</h1>
              <span className="mcp-spec-pill">Agent Scheduler</span>
            </div>
            <p className="page-view-subtitle">
              Pusat kendali otomatisasi pekerjaan agen: audit keamanan, pengujian otomatis, sinkronisasi memori, dan tugas berkala tanpa pengawasan manual.
            </p>
          </div>

          <div className="page-view-header-right skills-header-actions">
            <button
              type="button"
              className="skills-header-btn"
              onClick={() => setShowCreateModal(true)}
              title="Buat job otomatisasi baru"
            >
              <Plus size={14} />
              <span>Buat Job Baru</span>
            </button>

            <button
              type="button"
              className="skills-header-btn"
              onClick={handleRunAll}
              disabled={isRunningAll}
              title="Jalankan semua job yang sedang aktif"
            >
              <Play size={13} className={isRunningAll ? 'animate-spin' : ''} />
              <span>{isRunningAll ? 'Menjalankan...' : 'Jalankan Semua'}</span>
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

        {/* ================= STATS SUMMARY ================= */}
        {stats && (
          <div className="mcp-stats-grid">
            <div className="mcp-stat-card">
              <div className="mcp-stat-icon-wrap stat-icon-blue">
                <Workflow size={18} />
              </div>
              <div className="mcp-stat-info">
                <div className="mcp-stat-number">{stats.total}</div>
                <div className="mcp-stat-label">Total Jobs</div>
              </div>
            </div>

            <div className="mcp-stat-card">
              <div className="mcp-stat-icon-wrap stat-icon-amber">
                <Activity size={18} />
              </div>
              <div className="mcp-stat-info">
                <div className="mcp-stat-number">{stats.running}</div>
                <div className="mcp-stat-label">Sedang Berjalan</div>
              </div>
            </div>

            <div className="mcp-stat-card">
              <div className="mcp-stat-icon-wrap stat-icon-purple">
                <Clock size={18} />
              </div>
              <div className="mcp-stat-info">
                <div className="mcp-stat-number">{stats.queued}</div>
                <div className="mcp-stat-label">Dalam Antrean</div>
              </div>
            </div>

            <div className="mcp-stat-card">
              <div className="mcp-stat-icon-wrap stat-icon-emerald">
                <CheckCircle2 size={18} />
              </div>
              <div className="mcp-stat-info">
                <div className="mcp-stat-number">{stats.completed}</div>
                <div className="mcp-stat-label">Selesai / Sukses</div>
              </div>
            </div>
          </div>
        )}

        {/* ================= FILTER & SEARCH BAR ================= */}
        <div className="skills-nav-bar">
          <div className="skills-tab-group">
            <button
              type="button"
              className={`skills-tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              Semua ({jobs.length})
            </button>
            <button
              type="button"
              className={`skills-tab-btn ${statusFilter === 'running' ? 'active' : ''}`}
              onClick={() => setStatusFilter('running')}
            >
              Berjalan ({jobs.filter((j) => j.status === 'running').length})
            </button>
            <button
              type="button"
              className={`skills-tab-btn ${statusFilter === 'queued' ? 'active' : ''}`}
              onClick={() => setStatusFilter('queued')}
            >
              Antrean ({jobs.filter((j) => j.status === 'queued').length})
            </button>
            <button
              type="button"
              className={`skills-tab-btn ${statusFilter === 'completed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('completed')}
            >
              Selesai ({jobs.filter((j) => j.status === 'completed').length})
            </button>
          </div>

          <div className="skills-search-box">
            <Search size={14} className="skills-search-icon" />
            <input
              type="text"
              placeholder="Cari nama job atau kategori..."
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

        {/* ================= CATEGORY CHIPS ================= */}
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

        {/* ================= JOBS LIST ================= */}
        {loading ? (
          <div className="skills-loading-state">
            <RotateCw size={24} className="animate-spin text-muted" />
            <p>Memuat daftar task dan background jobs...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="skills-empty-state">
            <Workflow size={36} className="text-muted" />
            <h3>Tidak ada Job yang ditemukan</h3>
            <p>Klik 'Buat Job Baru' untuk menjadwalkan otomatisasi pertama Anda.</p>
          </div>
        ) : (
          <div className="jobs-list-container">
            {filteredJobs.map((job) => {
              const isRunning = job.status === 'running';
              const isQueued = job.status === 'queued';
              const isCompleted = job.status === 'completed';
              const isActionLoading = actionLoadingId === job.id;

              return (
                <div
                  key={job.id}
                  className={`job-card-item ${isRunning ? 'is-running' : ''} ${!job.enabled ? 'is-disabled' : ''}`}
                >
                  <div className="job-card-main">
                    {/* Left Icon & Meta */}
                    <div className="job-icon-col">
                      <div className={`job-category-badge ${job.category?.toLowerCase()}`}>
                        {getCategoryIcon(job.category)}
                      </div>
                    </div>

                    {/* Middle Content */}
                    <div className="job-info-col">
                      <div className="job-title-row">
                        <h3 className="job-title-text">{job.title}</h3>
                        <div className="job-badges-wrap">
                          <span className="job-badge-category">{job.category}</span>
                          <span className="job-badge-model">{job.model}</span>
                          <span
                            className={`job-status-badge ${
                              isRunning ? 'running' : isQueued ? 'queued' : 'completed'
                            }`}
                          >
                            <span className="status-dot" />
                            {isRunning ? 'Sedang Berjalan' : isQueued ? 'Dalam Antrean' : 'Selesai'}
                          </span>
                        </div>
                      </div>

                      <p className="job-desc-text">{job.description}</p>

                      {/* Progress Bar if running or completed */}
                      {(isRunning || job.progress > 0) && (
                        <div className="job-progress-wrapper">
                          <div className="job-progress-bar">
                            <div
                              className={`job-progress-fill ${isRunning ? 'animated-stripes' : ''}`}
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                          <span className="job-progress-label">{job.progress}%</span>
                        </div>
                      )}

                      {/* Execution Details Bar */}
                      <div className="job-meta-details">
                        <div className="job-meta-item">
                          <Calendar size={12} />
                          <span>Jadwal: <strong>{job.schedule}</strong></span>
                        </div>
                        <div className="job-meta-item">
                          <Clock size={12} />
                          <span>Terakhir: <strong>{job.lastDuration || '-'}</strong></span>
                        </div>
                        <div className="job-meta-item">
                          <Activity size={12} />
                          <span>Tingkat Sukses: <strong>{job.successRate || '100%'}</strong> ({job.totalRuns || 0} run)</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="job-actions-col">
                      {isRunning ? (
                        <button
                          type="button"
                          className="job-btn-cancel"
                          onClick={() => handleCancelJob(job.id, job.title)}
                          title="Hentikan eksekusi sekarang"
                        >
                          <Square size={13} />
                          <span>Stop</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="job-btn-run"
                          onClick={() => handleRunJob(job.id, job.title)}
                          disabled={isActionLoading || !job.enabled}
                          title="Jalankan job ini sekarang"
                        >
                          <Play size={13} className={isActionLoading ? 'animate-spin' : ''} />
                          <span>{isActionLoading ? 'Memulai...' : 'Run Now'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="job-btn-log"
                        onClick={() => setActiveLogJob(job)}
                        title="Buka terminal log eksekusi"
                      >
                        <Terminal size={13} />
                        <span>Log</span>
                      </button>

                      <button
                        type="button"
                        className="job-btn-delete"
                        onClick={() => handleDeleteJob(job.id, job.title)}
                        title="Hapus job ini"
                      >
                        <Trash2 size={13} />
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
          <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
            <div
              className="modal-dialog mcp-modal-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="modal-header-left">
                  <Workflow size={18} style={{ color: 'var(--brand-accent, #6366f1)' }} />
                  <h2 className="modal-title">Jadwalkan Job Baru</h2>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body">
                  <p className="url-modal-desc">
                    Konfigurasikan tugas agen terjadwal atau batch alur kerja. Agen akan mengeksekusi instruksi ini secara otonom sesuai frekuensi yang ditentukan.
                  </p>

                  {/* Preset Templates */}
                  <div className="mcp-presets-bar">
                    <span className="presets-label">Preset Cepat:</span>
                    <button
                      type="button"
                      className="preset-chip"
                      onClick={() =>
                        setCreateForm({
                          title: 'Code Security & Dependency Scan',
                          category: 'Security',
                          schedule: 'Setiap Hari @ 02:00 WIB',
                          cron: '0 2 * * *',
                          model: 'orion',
                          description: 'Audit keamanan berkala terhadap file kredensial dan CVE dependensi.',
                          prompt: 'Periksa paket dependensi npm dan cari celah keamanan di workspace.',
                        })
                      }
                    >
                      Security Audit
                    </button>
                    <button
                      type="button"
                      className="preset-chip"
                      onClick={() =>
                        setCreateForm({
                          title: 'Automated E2E & Unit Test Verification',
                          category: 'Testing',
                          schedule: 'Tiap Commit / Webhook',
                          cron: 'on-push',
                          model: 'orion',
                          description: 'Menjalankan rangkaian pengujian otomatis terhadap endpoint server dan build bundle web.',
                          prompt: 'Lakukan build test dan verifikasi semua skema controller aman.',
                        })
                      }
                    >
                      Test Runner
                    </button>
                    <button
                      type="button"
                      className="preset-chip"
                      onClick={() =>
                        setCreateForm({
                          title: 'Git Branch Sync & Stash Backup',
                          category: 'Backup',
                          schedule: 'Tiap Hari @ 23:59 WIB',
                          cron: '59 23 * * *',
                          model: 'orion',
                          description: 'Backup rutin status repositori dan bersihkan cache sementara.',
                          prompt: 'Sinkronkan status git dan catat riwayat commit terakhir.',
                        })
                      }
                    >
                      Git Backup
                    </button>
                  </div>

                  <div className="form-group-grid">
                    <div className="form-field">
                      <label className="form-label">Judul Job</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Contoh: Auto Daily Vulnerability Scan"
                        value={createForm.title}
                        onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label className="form-label">Kategori</label>
                      <select
                        className="form-select"
                        value={createForm.category}
                        onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                      >
                        <option value="Security">Security</option>
                        <option value="Testing">Testing</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Documentation">Documentation</option>
                        <option value="Backup">Backup</option>
                        <option value="Optimization">Optimization</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group-grid">
                    <div className="form-field">
                      <label className="form-label">Jadwal Eksekusi</label>
                      <select
                        className="form-select"
                        value={createForm.schedule}
                        onChange={(e) => setCreateForm({ ...createForm, schedule: e.target.value })}
                      >
                        <option value="Manual">Manual (Sesuai Permintaan)</option>
                        <option value="Tiap 1 Jam">Tiap 1 Jam</option>
                        <option value="Tiap 6 Jam">Tiap 6 Jam</option>
                        <option value="Setiap Hari @ 02:00 WIB">Setiap Hari @ 02:00 WIB</option>
                        <option value="Tiap Hari @ 23:59 WIB">Tiap Hari @ 23:59 WIB</option>
                        <option value="Tiap Minggu @ 00:00 WIB">Tiap Minggu @ 00:00 WIB</option>
                        <option value="Tiap Commit / Webhook">Tiap Commit / Webhook</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label className="form-label">Model Agen</label>
                      <select
                        className="form-select"
                        value={createForm.model}
                        onChange={(e) => setCreateForm({ ...createForm, model: e.target.value })}
                      >
                        <option value="orion">Orion Autonomous (Recommended)</option>
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                        <option value="claude-3-7-sonnet">Claude 3.7 Sonnet</option>
                        <option value="deepseek-r1">DeepSeek R1 Reasoner</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="form-label">Deskripsi Singkat</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Apa yang dilakukan job ini..."
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">Instruksi / Prompt Agen</label>
                    <textarea
                      rows={3}
                      className="form-textarea"
                      placeholder="Instruksi terperinci untuk AI ketika job ini berjalan..."
                      value={createForm.prompt}
                      onChange={(e) => setCreateForm({ ...createForm, prompt: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="models-btn-secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Batal
                  </button>
                  <button type="submit" className="models-btn-primary">
                    <Plus size={14} /> Buat & Jadwalkan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= LOG TERMINAL MODAL ================= */}
        {activeLogJob && (
          <div className="modal-backdrop" onClick={() => setActiveLogJob(null)}>
            <div
              className="modal-dialog job-terminal-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="modal-header-left">
                  <Terminal size={18} style={{ color: 'var(--brand-accent, #6366f1)' }} />
                  <div>
                    <h2 className="modal-title">Log Eksekusi: {activeLogJob.title}</h2>
                    <span className="modal-subtitle-text">
                      Status: {activeLogJob.status} • Model: {activeLogJob.model} • Terakhir: {activeLogJob.lastRun}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setActiveLogJob(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body job-terminal-body">
                <div className="terminal-screen-box">
                  <div className="terminal-header-bar">
                    <div className="terminal-dots">
                      <span className="dot red" />
                      <span className="dot yellow" />
                      <span className="dot green" />
                    </div>
                    <span className="terminal-title-text">orion-agent-runner://{activeLogJob.id}</span>
                    <button
                      type="button"
                      className="btn-copy-terminal"
                      onClick={copyLogText}
                      title="Salin seluruh isi log"
                    >
                      {copiedLog ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedLog ? 'Tersalin' : 'Salin Log'}</span>
                    </button>
                  </div>

                  <div className="terminal-output-scroll">
                    {activeLogJob.logs && activeLogJob.logs.length > 0 ? (
                      activeLogJob.logs.map((line, idx) => (
                        <div key={idx} className={`terminal-line line-${line.level || 'info'}`}>
                          <span className="line-time">[{line.timestamp}]</span>
                          <span className={`line-badge badge-${line.level || 'info'}`}>
                            {line.level?.toUpperCase() || 'INFO'}
                          </span>
                          <span className="line-text">{line.text}</span>
                        </div>
                      ))
                    ) : (
                      <div className="terminal-line line-info">
                        <span className="line-text">Belum ada riwayat log untuk job ini.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="models-btn-secondary"
                  onClick={() => setActiveLogJob(null)}
                >
                  Tutup
                </button>
                <button
                  type="button"
                  className="models-btn-primary"
                  onClick={() => {
                    handleRunJob(activeLogJob.id, activeLogJob.title);
                    setActiveLogJob(null);
                  }}
                >
                  <Play size={13} /> Jalankan Sekarang
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

