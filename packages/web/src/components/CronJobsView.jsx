import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Play,
  RotateCw,
  Search,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Pause,
  Terminal,
  Calendar,
  Sparkles,
  Bot,
  Copy,
  Check,
  Trash2,
  Activity,
  Layers,
  FileText,
  Sliders,
  ChevronRight,
  Zap,
  ArrowRight,
  Info,
} from 'lucide-react';

const CRON_PRESETS = [
  { label: 'Tiap 15 Menit', expr: '*/15 * * * *', desc: 'Setiap 15 menit tanpa jeda' },
  { label: 'Tiap 30 Menit', expr: '*/30 * * * *', desc: 'Setiap 30 menit' },
  { label: 'Tiap Jam Tepat', expr: '0 * * * *', desc: 'Setiap jam pada menit ke-0' },
  { label: 'Tiap Hari Kerja 09:00 WIB', expr: '0 9 * * 1-5', desc: 'Senin sampai Jumat pagi' },
  { label: 'Tiap Hari Tengah Malam', expr: '0 0 * * *', desc: 'Setiap hari pukul 00:00 WIB' },
  { label: 'Tiap Hari 23:00 WIB', expr: '0 23 * * *', desc: 'Setiap malam pukul 23:00 WIB' },
  { label: 'Tiap Minggu 03:00 WIB', expr: '0 3 * * 0', desc: 'Hari Minggu dini hari' },
];

export default function CronJobsView({ onClose, showToast }) {
  const [cronJobs, setCronJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'paused'

  // Execution states
  const [executingId, setExecutingId] = useState(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeHistoryJob, setActiveHistoryJob] = useState(null);
  const [copiedText, setCopiedText] = useState(false);

  // Form state
  const [formState, setFormState] = useState({
    name: '',
    expression: '0 9 * * 1-5',
    model: 'orion',
    prompt: '',
    allowedTools: ['read_file', 'git_status'],
  });

  const [humanCronDesc, setHumanCronDesc] = useState('Setiap hari kerja (Senin - Jumat) pukul 09:00 WIB');

  // Load cron jobs
  const loadCronJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cron');
      const data = await res.json();
      if (data.success) {
        setCronJobs(data.jobs || []);
        setStats(data.stats || null);
      } else {
        showToast?.('Gagal memuat cron jobs: ' + data.message);
      }
    } catch (err) {
      showToast?.('Kesalahan koneksi cron: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCronJobs();
  }, []);

  // Update cron human description when expression changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cron/describe?expr=${encodeURIComponent(formState.expression)}`);
        const data = await res.json();
        if (data.success) {
          setHumanCronDesc(data.description);
        }
      } catch {}
    }, 250);
    return () => clearTimeout(timer);
  }, [formState.expression]);

  // Filtered list
  const filteredJobs = useMemo(() => {
    return cronJobs.filter((job) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        job.name.toLowerCase().includes(q) ||
        (job.prompt && job.prompt.toLowerCase().includes(q)) ||
        job.expression.toLowerCase().includes(q) ||
        (job.humanSchedule && job.humanSchedule.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && job.enabled) ||
        (statusFilter === 'paused' && !job.enabled);

      return matchesSearch && matchesStatus;
    });
  }, [cronJobs, searchQuery, statusFilter]);

  const activeCount = useMemo(() => cronJobs.filter((j) => j.enabled).length, [cronJobs]);
  const pausedCount = useMemo(() => cronJobs.filter((j) => !j.enabled).length, [cronJobs]);
  const totalExecutions = useMemo(
    () => cronJobs.reduce((sum, j) => sum + (j.totalRuns || 0), 0),
    [cronJobs]
  );

  // Toggle active/pause
  const handleToggle = async (jobId, jobName, currentState) => {
    try {
      const res = await fetch(`/api/cron/${jobId}/toggle`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setCronJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, enabled: !currentState } : j))
        );
        showToast?.(`AI Cron '${jobName}' ${!currentState ? 'diaktifkan' : 'dijeda'}.`);
        await loadCronJobs();
      }
    } catch (err) {
      showToast?.('Gagal toggle cron: ' + err.message);
    }
  };

  // Run Now
  const handleRunNow = async (jobId, jobName) => {
    setExecutingId(jobId);
    try {
      const res = await fetch(`/api/cron/${jobId}/run`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast?.(`AI Cron '${jobName}' berhasil dieksekusi! Laporan siap.`);
        await loadCronJobs();
        if (activeHistoryJob && activeHistoryJob.id === jobId) {
          setActiveHistoryJob(data.job);
        }
      } else {
        showToast?.('Gagal mengeksekusi cron: ' + data.message);
      }
    } catch (err) {
      showToast?.('Kesalahan eksekusi cron: ' + err.message);
    } finally {
      setExecutingId(null);
    }
  };

  // Delete
  const handleDelete = async (jobId, jobName) => {
    if (!window.confirm(`Hapus AI Cron Job '${jobName}'?`)) return;
    try {
      const res = await fetch(`/api/cron/${jobId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast?.(`Cron Job '${jobName}' berhasil dihapus.`);
        await loadCronJobs();
      }
    } catch (err) {
      showToast?.('Kesalahan menghapus: ' + err.message);
    }
  };

  // Create Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formState.name.trim() || !formState.prompt.trim()) return;

    try {
      const res = await fetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(`AI Cron Job '${formState.name}' berhasil dijadwalkan!`);
        setShowCreateModal(false);
        setFormState({
          name: '',
          expression: '0 9 * * 1-5',
          model: 'orion',
          prompt: '',
          allowedTools: ['read_file', 'git_status'],
        });
        await loadCronJobs();
      } else {
        showToast?.('Gagal membuat cron job: ' + data.message);
      }
    } catch (err) {
      showToast?.('Kesalahan saat menjadwalkan: ' + err.message);
    }
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="models-view-wrapper animate-page-enter">
      <div className="models-view-inner">
        {/* ================= HEADER BAR ================= */}
        <div className="models-main-header">
          <div className="models-title-block">
            <h1 className="models-heading">Cron Job AI</h1>
            <p className="models-subheading">
              Jadwalkan eksekusi berkala otomatis untuk model AI (standup pagi, deteksi anomali log, dan sinkronisasi repositori)
            </p>
          </div>

          <div className="models-header-actions">
            <button
              type="button"
              className="models-btn-primary"
              onClick={() => setShowCreateModal(true)}
              title="Jadwalkan AI Cron Job baru"
            >
              + JADWALKAN AI CRON
            </button>

            <button
              type="button"
              className={`models-refresh-btn ${loading ? 'is-spinning' : ''}`}
              onClick={loadCronJobs}
              title="Segarkan data jadwal"
              aria-label="Refresh"
            >
              <RotateCw size={14} />
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
          {/* Card 1: SCHEDULER ENGINE */}
          <div className="models-surface-card models-settings-hero">
            <div className="models-surface-header">
              <div className="surface-header-title-wrap">
                <Sliders size={14} className="surface-title-icon" />
                <span className="surface-title-text">CRON SCHEDULER ENGINE</span>
              </div>
              <span className="surface-pill-tag">POSIX 5-Field Cron</span>
            </div>

            <div className="models-settings-rows">
              {/* Row 1: Scheduler Ticker */}
              <div className="models-setting-row">
                <div className="setting-row-meta">
                  <div className="setting-row-label">
                    <Clock size={13} className="setting-icon-star" />
                    <span>HEARTBEAT TICKER</span>
                  </div>
                  <div className="setting-row-spec">
                    <span className="spec-badge">RUNNING</span>
                    <span className="spec-dot">·</span>
                    <span className="spec-name">Interval 60s asynchronous scheduler</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="models-btn-ghost"
                  onClick={() => showToast?.('Engine scheduler memeriksa antrean eksekusi tiap 60 detik.')}
                >
                  INFO
                </button>
              </div>

              {/* Row 2: Prompt Dispatch */}
              <div className="models-setting-row">
                <div className="setting-row-meta">
                  <div className="setting-row-label">
                    <Bot size={13} className="setting-icon-cog" />
                    <span>AGENT DISPATCH</span>
                  </div>
                  <div className="setting-row-spec">
                    <span className="spec-count">Autonomous</span>
                    <span className="spec-dot">·</span>
                    <span className="spec-mode">Multi-model prompt runner</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="models-btn-ghost"
                  onClick={() => showToast?.('Model AI mengeksekusi instruksi prompt dan menghasilkan laporan otomatis.')}
                >
                  DISPATCH
                </button>
              </div>

              {/* Row 3: History & Archive */}
              <div className="models-setting-row">
                <div className="setting-row-meta">
                  <div className="setting-row-label">
                    <FileText size={13} className="setting-icon-moa" />
                    <span>OUTPUT ARCHIVE</span>
                  </div>
                  <div className="setting-row-spec">
                    <span className="spec-count">{totalExecutions} total runs</span>
                    <span className="spec-dot">·</span>
                    <span className="spec-mode">Stored in data/cron_jobs.json</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="models-btn-ghost"
                  onClick={() => {
                    const el = document.getElementById('cron-jobs-list-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  EXPLORE
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: METRICS & SUMMARY HERO */}
          <div className="models-surface-card models-analytics-hero">
            <div className="analytics-metrics-list">
              <div className="analytics-metric-item">
                <span className="metric-number">{activeCount}</span>
                <span className="metric-dotted-leader" />
                <span className="metric-label">SCHEDULED JOBS ACTIVE</span>
              </div>

              <div className="analytics-metric-item">
                <span className="metric-number">{totalExecutions}</span>
                <span className="metric-dotted-leader" />
                <span className="metric-label">TOTAL AI EXECUTIONS</span>
              </div>
            </div>

            <div className="analytics-note-box">
              <Info size={13} className="analytics-note-icon" />
              <p className="analytics-note-text">
                Scheduler mengeksekusi instruksi AI secara otonom pada interval waktu cron yang telah ditentukan. Setiap output dianalisis dan disimpan ke dalam arsip laporan hasil eksekusi.
              </p>
            </div>
          </div>
        </div>

        {/* ================= CRON JOBS SECTION ================= */}
        <div className="models-combos-section" id="cron-jobs-list-section">
          <div className="combos-section-header">
            <div className="combos-header-left">
              <div className="combos-title-wrap">
                <Clock size={18} className="combos-main-icon" />
                <h2 className="combos-title">Daftar Jadwal Cron AI</h2>
              </div>
              <p className="combos-subtitle">
                Jadwal cron aktif yang terhubung ke model AI dengan ringkasan instruksi dan jadwal berikutnya.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="models-filter-pills">
              <button
                type="button"
                className={`models-pill-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                Semua ({cronJobs.length})
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
                className={`models-pill-btn ${statusFilter === 'paused' ? 'active' : ''}`}
                onClick={() => setStatusFilter('paused')}
              >
                Dijeda ({pausedCount})
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="models-surface-card" style={{ padding: '0.85rem 1.15rem' }}>
            <div style={{ position: 'relative' }}>
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
                placeholder="Cari jadwal cron, instruksi, atau ekspresi (* * * * *)..."
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
          </div>

          {/* Cron Cards List (Identical to Combos Cards List) */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <RotateCw size={24} className="is-spinning" style={{ margin: '0 auto 0.75rem' }} />
              <p>Memuat engine jadwal cron AI...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="models-surface-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <Clock size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
              <h3 style={{ margin: '0 0 0.35rem', color: 'var(--text-primary)', fontSize: '1rem' }}>
                Tidak ada AI Cron Job yang cocok
              </h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Klik '+ JADWALKAN AI CRON' untuk membuat automasi berkala pertama Anda.
              </p>
            </div>
          ) : (
            <div className="combos-cards-list">
              {filteredJobs.map((job) => {
                const isExecuting = executingId === job.id;

                return (
                  <div
                    key={job.id}
                    className={`models-surface-card combo-item-card ${job.enabled ? 'is-active-combo' : ''}`}
                  >
                    {/* Top Main Row */}
                    <div className="combo-card-main-row">
                      <div className="combo-card-left">
                        <div className="combo-card-icon-box">
                          <Clock size={16} />
                        </div>

                        <div className="combo-card-info">
                          <div className="combo-name-row">
                            <span className="combo-name">{job.name}</span>
                            <span className="spec-badge font-mono">{job.expression}</span>
                            <span className="combo-strategy-tag font-mono">{job.model}</span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontSize: '0.72rem',
                                color: job.enabled
                                  ? 'var(--accent-emerald, #10b981)'
                                  : 'var(--text-muted)',
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
                              {job.enabled ? 'AKTIF TERJADWAL' : 'DIJEDA'}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {job.humanSchedule}
                          </div>
                        </div>
                      </div>

                      {/* Right Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="models-btn-primary"
                          onClick={() => handleRunNow(job.id, job.name)}
                          disabled={isExecuting}
                          title="Jalankan instruksi AI ini sekarang"
                        >
                          <Play size={11} className={isExecuting ? 'is-spinning' : ''} />
                          <span>{isExecuting ? 'MENGEKSEKUSI...' : 'TRIGGER NOW'}</span>
                        </button>

                        <button
                          type="button"
                          className="models-btn-ghost"
                          onClick={() => setActiveHistoryJob(job)}
                          title="Lihat hasil output dan riwayat eksekusi AI"
                        >
                          <FileText size={12} />
                          <span>LAPORAN ({job.history?.length || 0})</span>
                        </button>

                        <button
                          type="button"
                          className={job.enabled ? 'models-btn-ghost' : 'models-btn-primary'}
                          onClick={() => handleToggle(job.id, job.name, job.enabled)}
                          style={{ minWidth: '78px', textAlign: 'center' }}
                        >
                          {job.enabled ? 'JEDA' : 'AKTIFKAN'}
                        </button>

                        <button
                          type="button"
                          className="provider-btn-icon is-danger"
                          onClick={() => handleDelete(job.id, job.name)}
                          title="Hapus cron job ini"
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

                    {/* AI Prompt Box */}
                    <div
                      style={{
                        marginTop: '0.65rem',
                        padding: '0.65rem 0.85rem',
                        background: 'var(--bg-surface)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.78rem',
                        color: 'var(--text-primary)',
                        lineHeight: 1.45,
                      }}
                    >
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: '0.2rem' }}>
                        INSTRUKSI AI:
                      </span>
                      {job.prompt}
                    </div>

                    {/* Allowed Tools & Timing Meta */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        marginTop: '0.55rem',
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <span>Tools:</span>
                        {(job.allowedTools || []).map((t) => (
                          <span key={t} className="spec-badge">
                            {t}
                          </span>
                        ))}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span>
                          Berikutnya:{' '}
                          <strong style={{ color: 'var(--text-primary)' }}>
                            {job.enabled
                              ? new Date(job.nextRun).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
                              : 'Dijeda'}
                          </strong>
                        </span>
                        <span>
                          Terakhir: <strong style={{ color: 'var(--text-primary)' }}>{job.lastDuration || '-'}</strong>
                        </span>
                        <span>
                          Total: <strong style={{ color: 'var(--text-primary)' }}>{job.totalRuns || 0} run</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= CREATE CRON MODAL ================= */}
        {showCreateModal && (
          <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
            <div
              className="modal-dialog modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '620px' }}
            >
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={16} />
                  <h3 className="modal-title">Jadwalkan AI Cron Job Baru</h3>
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
                    Atur jadwal berkala otomatis untuk model AI Orion. Agen akan mengeksekusi instruksi Anda dan menyimpan riwayat output laporan.
                  </p>

                  {/* Presets List */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Preset:
                    </span>
                    {CRON_PRESETS.map((p) => (
                      <button
                        key={p.expr}
                        type="button"
                        className={`models-pill-btn ${formState.expression === p.expr ? 'active' : ''}`}
                        onClick={() => setFormState({ ...formState, expression: p.expr })}
                        title={p.desc}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="form-field">
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      NAMA CRON JOB
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Contoh: Morning AI Briefing & GitHub Pulse"
                      value={formState.name}
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                      required
                      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-field">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        EKSPRESI CRON (5 BAGIAN)
                      </label>
                      <input
                        type="text"
                        className="form-input font-mono"
                        placeholder="0 9 * * 1-5"
                        value={formState.expression}
                        onChange={(e) => setFormState({ ...formState, expression: e.target.value })}
                        required
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                      />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={11} /> {humanCronDesc}
                      </span>
                    </div>

                    <div className="form-field">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        MODEL AGEN AI
                      </label>
                      <select
                        className="form-select"
                        value={formState.model}
                        onChange={(e) => setFormState({ ...formState, model: e.target.value })}
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
                      INSTRUKSI / PROMPT UNTUK AGEN AI
                    </label>
                    <textarea
                      rows={4}
                      className="form-textarea"
                      placeholder="Tulis instruksi lengkap yang harus dilakukan AI setiap kali jadwal tercapai..."
                      value={formState.prompt}
                      onChange={(e) => setFormState({ ...formState, prompt: e.target.value })}
                      required
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
                    SIMPAN & AKTIFKAN
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= AI HISTORY & REPORTS MODAL ================= */}
        {activeHistoryJob && (
          <div className="modal-backdrop" onClick={() => setActiveHistoryJob(null)}>
            <div
              className="modal-dialog modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '720px' }}
            >
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={16} />
                  <div>
                    <h3 className="modal-title">Laporan Eksekusi: {activeHistoryJob.name}</h3>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Jadwal: {activeHistoryJob.humanSchedule} • Model: {activeHistoryJob.model}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setActiveHistoryJob(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body" style={{ maxHeight: '460px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activeHistoryJob.history && activeHistoryJob.history.length > 0 ? (
                  activeHistoryJob.history.map((record) => (
                    <div
                      key={record.id}
                      style={{
                        background: 'var(--bg-surface)',
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
                          borderBottom: '1px solid var(--border-subtle)',
                          fontSize: '0.74rem',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {new Date(record.executedAt).toLocaleString('id-ID')}
                          </span>
                          <span style={{ color: 'var(--accent-emerald, #10b981)', fontWeight: 700 }}>
                            SUKSES ({record.duration})
                          </span>
                          <span className="spec-badge">{record.model}</span>
                        </div>
                        <button
                          type="button"
                          className="models-btn-ghost"
                          onClick={() => copyText(record.output)}
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          {copiedText ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedText ? 'TERSALIN' : 'SALIN'}</span>
                        </button>
                      </div>

                      <div style={{ padding: '0.85rem 1rem' }}>
                        <pre
                          style={{
                            margin: 0,
                            fontFamily: 'var(--font-sans)',
                            fontSize: '0.82rem',
                            color: 'var(--text-primary)',
                            lineHeight: 1.6,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {record.output}
                        </pre>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                    <Clock size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: '0.82rem' }}>
                      Belum ada rekaman eksekusi untuk jadwal ini. Klik 'Trigger Now' untuk menjalankan sekarang.
                    </p>
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.85rem 1.25rem' }}>
                <button
                  type="button"
                  className="models-btn-ghost"
                  onClick={() => setActiveHistoryJob(null)}
                >
                  TUTUP
                </button>
                <button
                  type="button"
                  className="models-btn-primary"
                  onClick={() => handleRunNow(activeHistoryJob.id, activeHistoryJob.name)}
                >
                  TRIGGER RUN SEKARANG
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
