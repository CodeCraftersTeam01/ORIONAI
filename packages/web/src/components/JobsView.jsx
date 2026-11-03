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
  Info,
  Sliders,
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

  const runningCount = useMemo(() => jobs.filter((j) => j.status === 'running').length, [jobs]);
  const queuedCount = useMemo(() => jobs.filter((j) => j.status === 'queued').length, [jobs]);
  const completedCount = useMemo(() => jobs.filter((j) => j.status === 'completed').length, [jobs]);

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
    if (c === 'security') return <Shield size={16} />;
    if (c === 'testing') return <CheckCircle2 size={16} />;
    if (c === 'maintenance') return <Activity size={16} />;
    if (c === 'documentation') return <FileCode size={16} />;
    if (c === 'backup') return <HardDrive size={16} />;
    if (c === 'optimization') return <Cpu size={16} />;
    return <Workflow size={16} />;
  };

  const copyLogText = () => {
    if (!activeLogJob?.logs) return;
    const text = activeLogJob.logs.map((l) => `[${l.timestamp}] [${l.level?.toUpperCase()}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  return (
    <div className="models-view-wrapper animate-page-enter">
      <div className="models-view-inner">
        {/* ================= HEADER BAR ================= */}
        <div className="models-main-header">
          <div className="models-title-block">
            <h1 className="models-heading">Job & Task Automation</h1>
            <p className="models-subheading">
              Pusat kendali otomatisasi latar belakang: audit kode berkala, test runner otomatis, dan pemeliharaan repositori
            </p>
          </div>

          <div className="models-header-actions">
            <button
              type="button"
              className="models-btn-ghost"
              onClick={handleRunAll}
              disabled={isRunningAll}
              title="Jalankan semua job aktif"
            >
              <Play size={12} className={isRunningAll ? 'is-spinning' : ''} />
              <span>{isRunningAll ? 'MENJALANKAN...' : 'JALANKAN SEMUA'}</span>
            </button>

            <button
              type="button"
              className="models-btn-primary"
              onClick={() => setShowCreateModal(true)}
              title="Buat job otomatisasi baru"
            >
              + BUAT JOB BARU
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
          {/* Card 1: WORKER ENGINE CONFIG */}
          <div className="models-surface-card models-settings-hero">
            <div className="models-surface-header">
              <div className="surface-header-title-wrap">
                <Sliders size={14} className="surface-title-icon" />
                <span className="surface-title-text">BACKGROUND WORKER ENGINE</span>
              </div>
              <span className="surface-pill-tag">In-process Async Queue</span>
            </div>

            <div className="models-settings-rows">
              {/* Row 1: Execution Pipeline */}
              <div className="models-setting-row">
                <div className="setting-row-meta">
                  <div className="setting-row-label">
                    <Workflow size={13} className="setting-icon-star" />
                    <span>AGENT PIPELINE</span>
                  </div>
                  <div className="setting-row-spec">
                    <span className="spec-badge">STANDALONE</span>
                    <span className="spec-dot">·</span>
                    <span className="spec-name">Autonomous Loop with Tool Calling</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="models-btn-ghost"
                  onClick={() => showToast?.('Engine otomatisasi berjalan di latar belakang tanpa memblokir sesi chat.')}
                >
                  INFO
                </button>
              </div>

              {/* Row 2: Security & Permissions */}
              <div className="models-setting-row">
                <div className="setting-row-meta">
                  <div className="setting-row-label">
                    <Shield size={13} className="setting-icon-cog" />
                    <span>SANDBOX BOUNDARY</span>
                  </div>
                  <div className="setting-row-spec">
                    <span className="spec-count">Workspace Only</span>
                    <span className="spec-dot">·</span>
                    <span className="spec-mode">Strict Path Access & Timeouts</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="models-btn-ghost"
                  onClick={() => showToast?.('Proteksi path aktif untuk seluruh direktori kerja.')}
                >
                  SECURITY
                </button>
              </div>

              {/* Row 3: Log Retention */}
              <div className="models-setting-row">
                <div className="setting-row-meta">
                  <div className="setting-row-label">
                    <Terminal size={13} className="setting-icon-moa" />
                    <span>EXECUTION TRACES</span>
                  </div>
                  <div className="setting-row-spec">
                    <span className="spec-count">{jobs.length} jobs indexed</span>
                    <span className="spec-dot">·</span>
                    <span className="spec-mode">Per-task live terminal logs</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="models-btn-ghost"
                  onClick={() => {
                    const el = document.getElementById('jobs-list-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  VIEW LOGS
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: METRICS & SUMMARY HERO */}
          <div className="models-surface-card models-analytics-hero">
            <div className="analytics-metrics-list">
              <div className="analytics-metric-item">
                <span className="metric-number">{jobs.length}</span>
                <span className="metric-dotted-leader" />
                <span className="metric-label">JOBS REGISTERED</span>
              </div>

              <div className="analytics-metric-item">
                <span className="metric-number">{completedCount}</span>
                <span className="metric-dotted-leader" />
                <span className="metric-label">SUCCESSFUL RUNS</span>
              </div>
            </div>

            <div className="analytics-note-box">
              <Info size={13} className="analytics-note-icon" />
              <p className="analytics-note-text">
                Tugas latar belakang dieksekusi secara otonom oleh model AI terpilih. Log terminal mencatat setiap stdout, durasi pemrosesan, dan status akhir pekerjaan secara transparan.
              </p>
            </div>
          </div>
        </div>

        {/* ================= JOBS SECTION ================= */}
        <div className="models-combos-section" id="jobs-list-section">
          <div className="combos-section-header">
            <div className="combos-header-left">
              <div className="combos-title-wrap">
                <Workflow size={18} className="combos-main-icon" />
                <h2 className="combos-title">Daftar Background Jobs</h2>
              </div>
              <p className="combos-subtitle">
                Pekerjaan otomatis berkala dan batch workflows yang dikelola oleh Orion AI.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="models-filter-pills">
              <button
                type="button"
                className={`models-pill-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                Semua ({jobs.length})
              </button>
              <button
                type="button"
                className={`models-pill-btn ${statusFilter === 'running' ? 'active' : ''}`}
                onClick={() => setStatusFilter('running')}
              >
                Berjalan ({runningCount})
              </button>
              <button
                type="button"
                className={`models-pill-btn ${statusFilter === 'queued' ? 'active' : ''}`}
                onClick={() => setStatusFilter('queued')}
              >
                Antrean ({queuedCount})
              </button>
              <button
                type="button"
                className={`models-pill-btn ${statusFilter === 'completed' ? 'active' : ''}`}
                onClick={() => setStatusFilter('completed')}
              >
                Selesai ({completedCount})
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
                  placeholder="Cari nama job atau kategori..."
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

          {/* Jobs List (Identical to Combos Cards List) */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <RotateCw size={24} className="is-spinning" style={{ margin: '0 auto 0.75rem' }} />
              <p>Memuat daftar task dan background jobs...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="models-surface-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <Workflow size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
              <h3 style={{ margin: '0 0 0.35rem', color: 'var(--text-primary)', fontSize: '1rem' }}>
                Tidak ada job yang cocok
              </h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Klik '+ BUAT JOB BARU' untuk menjadwalkan pekerjaan otomatis pertama Anda.
              </p>
            </div>
          ) : (
            <div className="combos-cards-list">
              {filteredJobs.map((job) => {
                const isRunning = job.status === 'running';
                const isQueued = job.status === 'queued';
                const isActionLoading = actionLoadingId === job.id;

                return (
                  <div
                    key={job.id}
                    className={`models-surface-card combo-item-card ${isRunning ? 'is-active-combo' : ''}`}
                  >
                    {/* Top Main Row */}
                    <div className="combo-card-main-row">
                      <div className="combo-card-left">
                        <div className="combo-card-icon-box">
                          {getCategoryIcon(job.category)}
                        </div>

                        <div className="combo-card-info">
                          <div className="combo-name-row">
                            <span className="combo-name">{job.title}</span>
                            <span className="combo-strategy-tag">{job.category}</span>
                            <span className="spec-badge font-mono">{job.model}</span>

                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontSize: '0.72rem',
                                color: isRunning
                                  ? 'var(--accent-amber, #fbbf24)'
                                  : isQueued
                                  ? 'var(--accent-blue, #60a5fa)'
                                  : 'var(--accent-emerald, #10b981)',
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
                              {isRunning ? 'RUNNING' : isQueued ? 'QUEUED' : 'COMPLETED'}
                            </span>
                          </div>

                          <p
                            style={{
                              margin: 0,
                              color: 'var(--text-secondary)',
                              fontSize: '0.82rem',
                              lineHeight: 1.45,
                            }}
                          >
                            {job.description}
                          </p>
                        </div>
                      </div>

                      {/* Right Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {isRunning ? (
                          <button
                            type="button"
                            className="models-btn-ghost"
                            onClick={() => handleCancelJob(job.id, job.title)}
                            style={{ color: 'var(--accent-danger, #f87171)' }}
                            title="Hentikan eksekusi sekarang"
                          >
                            <Square size={12} />
                            <span>STOP</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="models-btn-primary"
                            onClick={() => handleRunJob(job.id, job.title)}
                            disabled={isActionLoading || !job.enabled}
                            title="Jalankan job ini sekarang"
                          >
                            <Play size={11} className={isActionLoading ? 'is-spinning' : ''} />
                            <span>{isActionLoading ? 'MEMULAI...' : 'RUN NOW'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="models-btn-ghost"
                          onClick={() => setActiveLogJob(job)}
                          title="Buka terminal log eksekusi"
                        >
                          <Terminal size={12} />
                          <span>LOG</span>
                        </button>

                        <button
                          type="button"
                          className="provider-btn-icon is-danger"
                          onClick={() => handleDeleteJob(job.id, job.title)}
                          title="Hapus job ini"
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
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {(isRunning || job.progress > 0) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.65rem' }}>
                        <div
                          style={{
                            flex: 1,
                            height: '5px',
                            background: 'var(--bg-surface)',
                            borderRadius: '999px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${job.progress}%`,
                              background: 'var(--accent-solid, #ffffff)',
                              borderRadius: '999px',
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {job.progress}%
                        </span>
                      </div>
                    )}

                    {/* Metadata line */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.25rem',
                        marginTop: '0.5rem',
                        fontSize: '0.74rem',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={11} />
                        <span>Jadwal: <strong style={{ color: 'var(--text-primary)' }}>{job.schedule}</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={11} />
                        <span>Durasi: <strong style={{ color: 'var(--text-primary)' }}>{job.lastDuration || '-'}</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Activity size={11} />
                        <span>Sukses: <strong style={{ color: 'var(--text-primary)' }}>{job.successRate || '100%'}</strong> ({job.totalRuns || 0} run)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= CREATE JOB MODAL ================= */}
        {showCreateModal && (
          <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
            <div
              className="modal-dialog modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '620px' }}
            >
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Workflow size={16} />
                  <h3 className="modal-title">Jadwalkan Job Baru</h3>
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
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Konfigurasikan tugas otomatisasi untuk dijalankan oleh agen di latar belakang.
                  </p>

                  {/* Preset Templates */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Preset:
                    </span>
                    <button
                      type="button"
                      className="models-pill-btn"
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
                      Security Scan
                    </button>
                    <button
                      type="button"
                      className="models-pill-btn"
                      onClick={() =>
                        setCreateForm({
                          title: 'Automated E2E & Unit Test Verification',
                          category: 'Testing',
                          schedule: 'Tiap Commit / Webhook',
                          cron: 'on-push',
                          model: 'orion',
                          description: 'Menjalankan rangkaian pengujian otomatis terhadap endpoint server dan build web.',
                          prompt: 'Lakukan build test dan verifikasi semua skema controller aman.',
                        })
                      }
                    >
                      Test Runner
                    </button>
                    <button
                      type="button"
                      className="models-pill-btn"
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-field">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        JUDUL JOB
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Contoh: Auto Daily Vulnerability Scan"
                        value={createForm.title}
                        onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
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
                        value={createForm.category}
                        onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                      >
                        <option value="Security">Security</option>
                        <option value="Testing">Testing</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Documentation">Documentation</option>
                        <option value="Backup">Backup</option>
                        <option value="Optimization">Optimization</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-field">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        JADWAL EKSEKUSI
                      </label>
                      <select
                        className="form-select"
                        value={createForm.schedule}
                        onChange={(e) => setCreateForm({ ...createForm, schedule: e.target.value })}
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                      >
                        <option value="Manual">Manual (Sesuai Permintaan)</option>
                        <option value="Tiap 1 Jam">Tiap 1 Jam</option>
                        <option value="Tiap 6 Jam">Tiap 6 Jam</option>
                        <option value="Setiap Hari @ 02:00 WIB">Setiap Hari @ 02:00 WIB</option>
                        <option value="Tiap Hari @ 23:59 WIB">Tiap Hari @ 23:59 WIB</option>
                        <option value="Tiap Minggu @ 00:00 WIB">Tiap Minggu @ 00:00 WIB</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        MODEL AGEN
                      </label>
                      <select
                        className="form-select"
                        value={createForm.model}
                        onChange={(e) => setCreateForm({ ...createForm, model: e.target.value })}
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                      >
                        <option value="orion">Orion Autonomous (Recommended)</option>
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                        <option value="claude-3-7-sonnet">Claude 3.7 Sonnet</option>
                        <option value="deepseek-r1">DeepSeek R1 Reasoner</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      DESKRIPSI SINGKAT
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Apa yang dilakukan job ini..."
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      INSTRUKSI / PROMPT AGEN
                    </label>
                    <textarea
                      rows={3}
                      className="form-textarea"
                      placeholder="Instruksi terperinci untuk AI ketika job ini berjalan..."
                      value={createForm.prompt}
                      onChange={(e) => setCreateForm({ ...createForm, prompt: e.target.value })}
                      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.85rem 1.25rem' }}>
                  <button
                    type="button"
                    className="models-btn-ghost"
                    onClick={() => setShowCreateModal(false)}
                  >
                    BATAL
                  </button>
                  <button type="submit" className="models-btn-primary">
                    SIMPAN & JADWALKAN
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
              className="modal-dialog modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '720px' }}
            >
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Terminal size={16} />
                  <div>
                    <h3 className="modal-title">Log Eksekusi: {activeLogJob.title}</h3>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
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

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div
                  style={{
                    background: '#090b10',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.85rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>task://{activeLogJob.id}</span>
                    <button
                      type="button"
                      className="models-btn-ghost"
                      onClick={copyLogText}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      {copiedLog ? <Check size={11} /> : <Copy size={11} />}
                      <span>{copiedLog ? 'TERSALIN' : 'SALIN'}</span>
                    </button>
                  </div>

                  <div
                    style={{
                      padding: '0.85rem 1rem',
                      maxHeight: '260px',
                      overflowY: 'auto',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.76rem',
                      lineHeight: 1.6,
                    }}
                  >
                    {activeLogJob.logs && activeLogJob.logs.length > 0 ? (
                      activeLogJob.logs.map((line, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>[{line.timestamp}]</span>
                          <span
                            style={{
                              fontWeight: 700,
                              color:
                                line.level === 'success'
                                  ? 'var(--accent-emerald, #10b981)'
                                  : line.level === 'warn'
                                  ? 'var(--accent-amber, #fbbf24)'
                                  : line.level === 'error'
                                  ? 'var(--accent-danger, #f87171)'
                                  : 'var(--accent-blue, #60a5fa)',
                              flexShrink: 0,
                            }}
                          >
                            [{line.level?.toUpperCase()}]
                          </span>
                          <span style={{ color: 'var(--text-primary)' }}>{line.text}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: 'var(--text-muted)' }}>Belum ada log eksekusi.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.85rem 1.25rem' }}>
                <button
                  type="button"
                  className="models-btn-ghost"
                  onClick={() => setActiveLogJob(null)}
                >
                  TUTUP
                </button>
                <button
                  type="button"
                  className="models-btn-primary"
                  onClick={() => {
                    handleRunJob(activeLogJob.id, activeLogJob.title);
                    setActiveLogJob(null);
                  }}
                >
                  JALANKAN SEKARANG
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
