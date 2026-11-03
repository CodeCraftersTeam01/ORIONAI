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
  Eye,
  EyeOff,
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
  const [showBuiltin, setShowBuiltin] = useState(false); // Sembunyikan default cron secara default

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

  const thirdPartyCron = useMemo(() => cronJobs.filter((c) => !c.isBuiltin), [cronJobs]);
  const builtinCron = useMemo(() => cronJobs.filter((c) => c.isBuiltin), [cronJobs]);

  // Filtered list (default builtin cron disembunyikan kecuali showBuiltin aktif)
  const filteredJobs = useMemo(() => {
    return cronJobs.filter((job) => {
      // Sembunyikan cron default jika showBuiltin false
      if (!showBuiltin && job.isBuiltin) {
        return false;
      }

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
  }, [cronJobs, showBuiltin, searchQuery, statusFilter]);

  const activeCount = useMemo(() => filteredJobs.filter((j) => j.enabled).length, [filteredJobs]);
  const pausedCount = useMemo(() => filteredJobs.filter((j) => !j.enabled).length, [filteredJobs]);
  const totalExecutions = useMemo(
    () => filteredJobs.reduce((sum, j) => sum + (j.totalRuns || 0), 0),
    [filteredJobs]
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
    <div className="minimal-view-wrapper">
      <div className="minimal-view-container">
      {/* ================= HEADER ================= */}
      <div className="minimal-header">
        <div className="minimal-title-group">
          <div className="minimal-title-row">
            <h1 className="minimal-title">AI Cron Scheduler</h1>
            <span className="minimal-tag">CRON TICKER</span>
          </div>
          <p className="minimal-subtitle">
            Jadwalkan eksekusi berkala untuk model AI: standup pagi, audit keamanan otomatis, dan sinkronisasi laporan repositori.
          </p>
        </div>

        <div className="minimal-header-actions">
          <button
            type="button"
            className="minimal-btn-primary"
            onClick={() => setShowCreateModal(true)}
            title="Tambah jadwal AI Cron baru"
          >
            <Plus size={13} />
            <span>Tambah Jadwal</span>
          </button>

          <button
            type="button"
            className="minimal-btn-ghost"
            onClick={loadCronJobs}
            title="Segarkan jadwal"
            aria-label="Refresh"
          >
            <RotateCw size={13} className={loading ? 'is-spinning' : ''} />
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
            <span className="minimal-metric-value">{thirdPartyCron.length} jadwal</span>
          </div>

          <div className="minimal-metric-divider" />

          <div className="minimal-metric-item">
            <span>Aktif:</span>
            <span className="minimal-metric-value">{activeCount}</span>
          </div>

          <div className="minimal-metric-divider" />

          <div className="minimal-metric-item">
            <span>Dijeda:</span>
            <span className="minimal-metric-value">{pausedCount}</span>
          </div>

          <div className="minimal-metric-divider" />

          <div className="minimal-metric-item">
            <span>Bawaan Default:</span>
            <span className="minimal-metric-value" style={{ color: 'var(--text-muted)' }}>
              {builtinCron.length} ({showBuiltin ? 'Tampil' : 'Disembunyikan'})
            </span>
          </div>
        </div>

        <button
          type="button"
          className="minimal-btn-ghost"
          onClick={() => setShowBuiltin((prev) => !prev)}
          style={{ fontSize: '0.74rem', padding: '0.28rem 0.65rem' }}
          title={showBuiltin ? 'Sembunyikan jadwal cron bawaan sistem' : 'Tampilkan jadwal cron bawaan sistem'}
        >
          {showBuiltin ? <EyeOff size={12} /> : <Eye size={12} />}
          <span>{showBuiltin ? 'Sembunyikan Default' : `Tampilkan Default (${builtinCron.length})`}</span>
        </button>
      </div>

      {/* ================= MINIMAL TOOLBAR ================= */}
      <div className="minimal-toolbar">
        <div className="minimal-search-box">
          <Search size={13} className="minimal-search-icon" />
          <input
            type="text"
            className="minimal-search-input"
            placeholder="Cari nama jadwal atau ekspresi cron..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

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
            className={`minimal-tab-btn ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Aktif ({activeCount})
          </button>
          <button
            type="button"
            className={`minimal-tab-btn ${statusFilter === 'paused' ? 'active' : ''}`}
            onClick={() => setStatusFilter('paused')}
          >
            Dijeda ({pausedCount})
          </button>
        </div>
      </div>

      {/* ================= CRON JOBS LIST ================= */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <RotateCw size={20} className="is-spinning" style={{ margin: '0 auto 0.5rem' }} />
          <p style={{ fontSize: '0.82rem', margin: 0 }}>Memuat jadwal AI Cron...</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="minimal-card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <Clock size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 0.5rem' }} />
          <h3 style={{ margin: '0 0 0.25rem', color: 'var(--text-primary)', fontSize: '0.92rem' }}>
            {!showBuiltin
              ? 'Jadwal Cron Default Bawaan Sedang Disembunyikan'
              : 'Tidak ada jadwal cron yang cocok'}
          </h3>
          <p style={{ margin: '0 0 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {!showBuiltin
              ? 'Jadwal cron default bawaan disembunyikan. Anda dapat menambahkan jadwal pihak ketiga baru atau menampilkan jadwal bawaan sistem.'
              : 'Sesuaikan filter atau buat jadwal baru untuk menjalankan prompt berkala.'}
          </p>
          {!showBuiltin && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="minimal-btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={12} />
                <span>Tambah Jadwal Pihak Ketiga</span>
              </button>
              <button
                type="button"
                className="minimal-btn-ghost"
                onClick={() => setShowBuiltin(true)}
              >
                <Eye size={12} />
                <span>Tampilkan Jadwal Default ({builtinCron.length})</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="minimal-list-wrap">
          {filteredJobs.map((job) => {
            const isExec = executingId === job.id;

            return (
              <div key={job.id} className="minimal-row-card">
                <div className="minimal-row-main">
                  <div className="minimal-card-icon" style={{ width: '34px', height: '34px' }}>
                    <Calendar size={15} />
                  </div>

                  <div className="minimal-row-meta">
                    <div className="minimal-row-title-line">
                      <span className="minimal-row-title">{job.name}</span>
                      <span className="minimal-badge">{job.expression}</span>
                      <span className="minimal-badge" style={{ color: 'var(--text-secondary)' }}>
                        {job.humanSchedule || 'Jadwal kustom'}
                      </span>
                      <span className="minimal-badge" style={{ textTransform: 'uppercase' }}>
                        {job.model || 'ORION'}
                      </span>
                    </div>

                    <p className="minimal-row-subtitle" title={job.prompt}>
                      Prompt: {job.prompt}
                    </p>
                  </div>
                </div>

                <div className="minimal-row-side">
                  {/* Status & Next Run */}
                  <div className="minimal-card-status">
                    {job.enabled ? (
                      <>
                        <span className="minimal-status-dot" />
                        <span>Next: {job.nextRunRelative || 'Segera'}</span>
                      </>
                    ) : (
                      <>
                        <span className="minimal-status-dot inactive" />
                        <span style={{ color: 'var(--text-muted)' }}>Dijeda</span>
                      </>
                    )}
                  </div>

                  {/* Toggle */}
                  <label className="mcp-switch-label" title={job.enabled ? 'Jeda jadwal' : 'Aktifkan jadwal'}>
                    <input
                      type="checkbox"
                      className="mcp-switch-input"
                      checked={job.enabled}
                      onChange={() => handleToggle(job.id, job.name, job.enabled)}
                    />
                    <span className="mcp-switch-slider" />
                  </label>

                  {/* Actions */}
                  <div className="minimal-card-actions">
                    <button
                      type="button"
                      className="minimal-icon-btn"
                      onClick={() => handleRunNow(job.id, job.name)}
                      disabled={isExec}
                      title="Trigger eksekusi AI sekarang"
                    >
                      <Play size={11} className={isExec ? 'is-spinning' : ''} />
                      <span>{isExec ? 'Proses...' : 'Run'}</span>
                    </button>

                    <button
                      type="button"
                      className="minimal-icon-btn"
                      onClick={() => setActiveHistoryJob(job)}
                      title="Lihat riwayat dan laporan eksekusi"
                    >
                      <FileText size={11} />
                      <span>Laporan</span>
                    </button>

                    <button
                      type="button"
                      className="minimal-icon-btn danger"
                      onClick={() => handleDelete(job.id, job.name)}
                      title="Hapus jadwal ini"
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

      {/* ================= CREATE SCHEDULE MODAL ================= */}
      {showCreateModal && (
        <div className="minimal-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="minimal-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="minimal-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={15} />
                <h3 className="minimal-modal-title">Tambah Jadwal AI Cron</h3>
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
                  {CRON_PRESETS.slice(0, 4).map((preset) => (
                    <button
                      key={preset.expr}
                      type="button"
                      className="minimal-icon-btn"
                      onClick={() => setFormState({ ...formState, expression: preset.expr })}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>NAMA JADWAL</label>
                  <input
                    type="text"
                    className="minimal-search-input"
                    placeholder="Contoh: Morning Repo Standup Brief"
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>CRON EXPRESSION (5-FIELD)</label>
                    <input
                      type="text"
                      className="minimal-search-input font-mono"
                      placeholder="0 9 * * 1-5"
                      value={formState.expression}
                      onChange={(e) => setFormState({ ...formState, expression: e.target.value })}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>TARGET MODEL</label>
                    <select
                      className="minimal-search-input"
                      value={formState.model}
                      onChange={(e) => setFormState({ ...formState, model: e.target.value })}
                    >
                      <option value="orion">Orion Engine (Official)</option>
                      <option value="agnes-2.5-flash">Agnes 2.5 Flash</option>
                      <option value="nvidia/nemotron-3-ultra-550b-a55b:free">Nemotron-3 Super</option>
                    </select>
                  </div>
                </div>

                <div style={{ padding: '0.55rem 0.75rem', background: 'var(--bg-input)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <strong>Jadwal:</strong> {humanCronDesc}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>PROMPT INSTRUKSI AI</label>
                  <textarea
                    rows={4}
                    className="minimal-search-input font-mono"
                    style={{ height: 'auto', padding: '0.5rem' }}
                    placeholder="Tuliskan prompt yang akan dijalankan oleh AI saat jadwal terpicu..."
                    value={formState.prompt}
                    onChange={(e) => setFormState({ ...formState, prompt: e.target.value })}
                    required
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
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= AI REPORT & HISTORY MODAL ================= */}
      {activeHistoryJob && (
        <div className="minimal-modal-backdrop" onClick={() => setActiveHistoryJob(null)}>
          <div className="minimal-modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="minimal-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={14} />
                <div>
                  <h3 className="minimal-modal-title">Laporan: {activeHistoryJob.name}</h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {activeHistoryJob.expression} ({activeHistoryJob.humanSchedule})
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="minimal-icon-btn"
                onClick={() => setActiveHistoryJob(null)}
              >
                <X size={14} />
              </button>
            </div>

            <div className="minimal-modal-body">
              {activeHistoryJob.lastReport ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.74rem',
                      color: 'var(--text-secondary)',
                      paddingBottom: '0.5rem',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span>Terakhir dieksekusi: {activeHistoryJob.lastRun}</span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>Status: Sukses</span>
                  </div>

                  <div
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '0.85rem',
                      fontSize: '0.8rem',
                      color: 'var(--text-primary)',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      maxHeight: '340px',
                      overflowY: 'auto',
                    }}
                  >
                    {activeHistoryJob.lastReport}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Belum ada laporan eksekusi. Klik tombol 'Run' untuk menghasilkan laporan pertama.
                </div>
              )}
            </div>

            <div className="minimal-modal-footer">
              {activeHistoryJob.lastReport && (
                <button
                  type="button"
                  className="minimal-btn-ghost"
                  onClick={() => copyText(activeHistoryJob.lastReport)}
                >
                  {copiedText ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedText ? 'Tersalin' : 'Salin Laporan'}</span>
                </button>
              )}
              <button
                type="button"
                className="minimal-btn-primary"
                onClick={() => setActiveHistoryJob(null)}
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
