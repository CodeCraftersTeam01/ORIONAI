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
        // If history modal is open for this job, refresh it
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
    <div className="page-view-container">
      <div className="models-page-content is-page-mode">
        {/* ================= HEADER ================= */}
        <div className="page-view-header">
          <div className="page-view-header-left">
            <div className="header-title-row">
              <Clock size={22} className="header-title-icon" style={{ color: 'var(--brand-accent, #6366f1)' }} />
              <h1 className="page-view-title">AI Cron Job Scheduler</h1>
              <span className="mcp-spec-pill">Automated Agent Runner</span>
            </div>
            <p className="page-view-subtitle">
              Jadwalkan eksekusi berkala untuk Agen AI (standup pagi, pemantauan error, auto sync git, dan digest keamanan) dengan format ekspresi Cron fleksibel.
            </p>
          </div>

          <div className="page-view-header-right skills-header-actions">
            <button
              type="button"
              className="skills-header-btn"
              onClick={() => setShowCreateModal(true)}
              title="Jadwalkan AI Cron Job baru"
            >
              <Plus size={14} />
              <span>Jadwalkan AI Cron</span>
            </button>

            <button
              type="button"
              className="skills-header-btn"
              onClick={loadCronJobs}
              disabled={loading}
              title="Segarkan data jadwal"
            >
              <RotateCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Memuat...' : 'Refresh'}</span>
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
                <Clock size={18} />
              </div>
              <div className="mcp-stat-info">
                <div className="mcp-stat-number">{stats.total}</div>
                <div className="mcp-stat-label">Total AI Cron Jobs</div>
              </div>
            </div>

            <div className="mcp-stat-card">
              <div className="mcp-stat-icon-wrap stat-icon-emerald">
                <CheckCircle2 size={18} />
              </div>
              <div className="mcp-stat-info">
                <div className="mcp-stat-number">{stats.active}</div>
                <div className="mcp-stat-label">Aktif Terjadwal</div>
              </div>
            </div>

            <div className="mcp-stat-card">
              <div className="mcp-stat-icon-wrap stat-icon-amber">
                <Pause size={18} />
              </div>
              <div className="mcp-stat-info">
                <div className="mcp-stat-number">{stats.paused}</div>
                <div className="mcp-stat-label">Sedang Dijeda</div>
              </div>
            </div>

            <div className="mcp-stat-card">
              <div className="mcp-stat-icon-wrap stat-icon-purple">
                <Activity size={18} />
              </div>
              <div className="mcp-stat-info">
                <div className="mcp-stat-number">{stats.totalExecutions}</div>
                <div className="mcp-stat-label">Total Eksekusi AI</div>
              </div>
            </div>
          </div>
        )}

        {/* ================= NAV FILTER BAR ================= */}
        <div className="skills-nav-bar">
          <div className="skills-tab-group">
            <button
              type="button"
              className={`skills-tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              Semua ({cronJobs.length})
            </button>
            <button
              type="button"
              className={`skills-tab-btn ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              Aktif ({cronJobs.filter((j) => j.enabled).length})
            </button>
            <button
              type="button"
              className={`skills-tab-btn ${statusFilter === 'paused' ? 'active' : ''}`}
              onClick={() => setStatusFilter('paused')}
            >
              Dijeda ({cronJobs.filter((j) => !j.enabled).length})
            </button>
          </div>

          <div className="skills-search-box">
            <Search size={14} className="skills-search-icon" />
            <input
              type="text"
              placeholder="Cari cron job, instruksi, atau ekspresi (* * * * *)..."
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

        {/* ================= CRON JOBS LIST ================= */}
        {loading ? (
          <div className="skills-loading-state">
            <RotateCw size={24} className="animate-spin text-muted" />
            <p>Memuat engine jadwal cron AI...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="skills-empty-state">
            <Clock size={36} className="text-muted" />
            <h3>Tidak ada AI Cron Job yang ditemukan</h3>
            <p>Klik 'Jadwalkan AI Cron' untuk membuat automasi berkala pertama Anda.</p>
          </div>
        ) : (
          <div className="cron-jobs-grid">
            {filteredJobs.map((job) => {
              const isExecuting = executingId === job.id;
              const hasHistory = job.history && job.history.length > 0;

              return (
                <div
                  key={job.id}
                  className={`cron-card-box ${job.enabled ? 'is-active' : 'is-paused'}`}
                >
                  {/* Top Bar */}
                  <div className="cron-card-top">
                    <div className="cron-meta-left">
                      <div className="cron-icon-badge">
                        <Clock size={16} />
                      </div>
                      <div>
                        <div className="cron-title-row">
                          <h3 className="cron-title-text">{job.name}</h3>
                        </div>
                        <span className="cron-human-desc">{job.humanSchedule}</span>
                      </div>
                    </div>

                    <div className="cron-toggle-wrap">
                      <label
                        className="mcp-switch-label"
                        title={job.enabled ? 'Jeda cron job' : 'Aktifkan cron job'}
                      >
                        <input
                          type="checkbox"
                          checked={job.enabled}
                          onChange={() => handleToggle(job.id, job.name, job.enabled)}
                          className="mcp-switch-input"
                        />
                        <span className="mcp-switch-slider" />
                      </label>
                    </div>
                  </div>

                  {/* Cron Expression & Model Pill */}
                  <div className="cron-badges-row">
                    <div className="cron-pill-expr" title="Ekspresi Cron Standar">
                      <code>{job.expression}</code>
                    </div>
                    <div className="cron-pill-model">
                      <Bot size={11} />
                      <span>{job.model}</span>
                    </div>
                    <div className="cron-pill-runs">
                      <Activity size={11} />
                      <span>{job.totalRuns || 0} kali dijalankan</span>
                    </div>
                  </div>

                  {/* AI Prompt / Instruction */}
                  <div className="cron-prompt-box">
                    <div className="prompt-label">Instruksi AI:</div>
                    <p className="prompt-text">{job.prompt}</p>
                  </div>

                  {/* Allowed Tools */}
                  {job.allowedTools && job.allowedTools.length > 0 && (
                    <div className="cron-tools-row">
                      <span className="tools-caption">Tools:</span>
                      {job.allowedTools.map((t) => (
                        <span key={t} className="tool-tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Timing Meta */}
                  <div className="cron-timing-meta">
                    <div className="timing-item">
                      <span className="timing-label">Jadwal Berikutnya:</span>
                      <span className="timing-value">
                        {job.enabled ? new Date(job.nextRun).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : 'Dijeda'}
                      </span>
                    </div>
                    <div className="timing-item">
                      <span className="timing-label">Terakhir:</span>
                      <span className="timing-value">{job.lastDuration || '-'}</span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="cron-card-actions">
                    <button
                      type="button"
                      className="cron-btn-run"
                      onClick={() => handleRunNow(job.id, job.name)}
                      disabled={isExecuting}
                      title="Jalankan instruksi AI ini sekarang"
                    >
                      <Play size={12} className={isExecuting ? 'animate-spin' : ''} />
                      <span>{isExecuting ? 'Mengeksekusi...' : 'Trigger Now'}</span>
                    </button>

                    <button
                      type="button"
                      className="cron-btn-history"
                      onClick={() => setActiveHistoryJob(job)}
                      title="Lihat hasil output dan riwayat eksekusi AI"
                    >
                      <FileText size={12} />
                      <span>Laporan AI ({job.history?.length || 0})</span>
                    </button>

                    <button
                      type="button"
                      className="cron-btn-delete"
                      onClick={() => handleDelete(job.id, job.name)}
                      title="Hapus cron job ini"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================= CREATE CRON MODAL ================= */}
        {showCreateModal && (
          <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
            <div
              className="modal-dialog cron-modal-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="modal-header-left">
                  <Clock size={18} style={{ color: 'var(--brand-accent, #6366f1)' }} />
                  <h2 className="modal-title">Jadwalkan AI Cron Job Baru</h2>
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
                    Atur jadwal berkala otomatis untuk model AI Orion. Agen akan mengeksekusi instruksi Anda dan menyimpan riwayat output laporan.
                  </p>

                  {/* Presets 1-Click */}
                  <div className="cron-presets-group">
                    <span className="presets-label">Pilih Jadwal Cepat:</span>
                    <div className="cron-presets-list">
                      {CRON_PRESETS.map((p) => (
                        <button
                          key={p.expr}
                          type="button"
                          className={`preset-chip ${formState.expression === p.expr ? 'is-selected' : ''}`}
                          onClick={() => setFormState({ ...formState, expression: p.expr })}
                          title={p.desc}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="form-label">Nama Cron Job</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Contoh: Morning AI Briefing & GitHub Pulse"
                      value={formState.name}
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group-grid">
                    <div className="form-field">
                      <label className="form-label">Ekspresi Cron (5 Bagian)</label>
                      <input
                        type="text"
                        className="form-input font-mono"
                        placeholder="0 9 * * 1-5"
                        value={formState.expression}
                        onChange={(e) => setFormState({ ...formState, expression: e.target.value })}
                        required
                      />
                      <span className="cron-human-helper">
                        <Calendar size={11} /> {humanCronDesc}
                      </span>
                    </div>

                    <div className="form-field">
                      <label className="form-label">Model Agen AI</label>
                      <select
                        className="form-select"
                        value={formState.model}
                        onChange={(e) => setFormState({ ...formState, model: e.target.value })}
                      >
                        <option value="orion">Orion Autonomous (Recommended)</option>
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                        <option value="claude-3-7-sonnet">Claude 3.7 Sonnet</option>
                        <option value="deepseek-r1">DeepSeek R1 Reasoner</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="form-label">Instruksi / Prompt untuk Agen AI</label>
                    <textarea
                      rows={4}
                      className="form-textarea"
                      placeholder="Tulis instruksi lengkap yang harus dilakukan AI setiap kali jadwal tercapai..."
                      value={formState.prompt}
                      onChange={(e) => setFormState({ ...formState, prompt: e.target.value })}
                      required
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
                    <Plus size={14} /> Simpan & Aktifkan Jadwal
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
              className="modal-dialog cron-history-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="modal-header-left">
                  <FileText size={18} style={{ color: 'var(--brand-accent, #6366f1)' }} />
                  <div>
                    <h2 className="modal-title">Laporan Eksekusi AI: {activeHistoryJob.name}</h2>
                    <span className="modal-subtitle-text">
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

              <div className="modal-body cron-history-body">
                {activeHistoryJob.history && activeHistoryJob.history.length > 0 ? (
                  <div className="history-reports-list">
                    {activeHistoryJob.history.map((record) => (
                      <div key={record.id} className="history-report-card">
                        <div className="report-card-header">
                          <div className="report-meta-left">
                            <span className="report-time">
                              {new Date(record.executedAt).toLocaleString('id-ID')}
                            </span>
                            <span className="report-badge success">
                              <CheckCircle2 size={11} /> Sukses ({record.duration})
                            </span>
                            <span className="report-badge-model">{record.model}</span>
                          </div>
                          <button
                            type="button"
                            className="btn-copy-report"
                            onClick={() => copyText(record.output)}
                            title="Salin isi laporan"
                          >
                            {copiedText ? <Check size={12} /> : <Copy size={12} />}
                            <span>{copiedText ? 'Tersalin' : 'Salin'}</span>
                          </button>
                        </div>

                        <div className="report-content-body">
                          <pre className="report-markdown-pre">{record.output}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="history-empty-state">
                    <Clock size={32} className="text-muted" />
                    <p>Belum ada rekaman eksekusi untuk jadwal ini. Klik 'Trigger Now' untuk menjalankan sekarang.</p>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="models-btn-secondary"
                  onClick={() => setActiveHistoryJob(null)}
                >
                  Tutup
                </button>
                <button
                  type="button"
                  className="models-btn-primary"
                  onClick={() => handleRunNow(activeHistoryJob.id, activeHistoryJob.name)}
                >
                  <Play size={13} /> Trigger Run Sekarang
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

