import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Server,
  Workflow,
  Clock,
  ArrowRight,
  MessageSquare,
  Plus,
  Zap,
  Activity,
  Terminal,
  Calendar,
  Layers,
  ArrowUpRight,
  Cpu,
  Search,
} from 'lucide-react';
import OrionLogo from './OrionLogo';

export default function DashboardView({
  onNavigate,
  onNewSession,
  onSelectSession,
  onSendMessage,
  sessions = [],
  activeSessionId,
  selectedModel = 'orion',
  customProviders = [],
  authUser,
  showToast,
}) {
  const [promptText, setPromptText] = useState('');
  const [stats, setStats] = useState({
    mcpCount: 10,
    mcpActive: 10,
    jobsCount: 3,
    cronCount: 2,
    loading: false,
  });

  // Fetch real counts from server
  useEffect(() => {
    let mounted = true;
    async function fetchDashboardStats() {
      try {
        const [mcpRes, jobsRes, cronRes] = await Promise.allSettled([
          fetch('/api/mcp').then((r) => r.json()),
          fetch('/api/jobs').then((r) => r.json()),
          fetch('/api/cron').then((r) => r.json()),
        ]);

        if (!mounted) return;

        let mcpCount = 10;
        let mcpActive = 10;
        let jobsCount = 3;
        let cronCount = 2;

        if (mcpRes.status === 'fulfilled' && mcpRes.value?.success) {
          const list = mcpRes.value.servers || [];
          mcpCount = list.length;
          mcpActive = list.filter((s) => s.enabled !== false).length;
        }

        if (jobsRes.status === 'fulfilled' && jobsRes.value?.success) {
          jobsCount = (jobsRes.value.jobs || []).length;
        }

        if (cronRes.status === 'fulfilled' && cronRes.value?.success) {
          cronCount = (cronRes.value.jobs || []).length;
        }

        setStats({
          mcpCount,
          mcpActive,
          jobsCount,
          cronCount,
          loading: false,
        });
      } catch {
        // quiet fallback
      }
    }
    fetchDashboardStats();
    return () => {
      mounted = false;
    };
  }, []);

  // Time-based polite Indonesian greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const getFormattedDate = () => {
    try {
      return new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Hari ini';
    }
  };

  const handleSubmitPrompt = (e) => {
    e?.preventDefault();
    const trimmed = promptText.trim();
    if (!trimmed) return;
    onSendMessage?.(trimmed);
    onNavigate?.('chat');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitPrompt();
    }
  };

  // Quick Action Chips
  const quickActions = [
    {
      id: 'jadwal',
      label: 'Jadwal Kuliah Hari Ini',
      icon: Calendar,
      prompt: 'jadwal hari ini apa aja',
    },
    {
      id: 'ethol',
      label: 'Presensi ETHOL PENS',
      icon: Activity,
      prompt: 'bg absenkan aku di ethol dong',
    },
    {
      id: 'mcp-hub',
      label: 'Katalog MCP Server',
      icon: Server,
      action: () => onNavigate?.('mcp'),
    },
    {
      id: 'jobs-runner',
      label: 'Automated Job Runner',
      icon: Workflow,
      action: () => onNavigate?.('jobs'),
    },
  ];

  // Latest 4 sessions
  const recentSessions = (sessions || []).slice(0, 4);

  return (
    <div className="dashboard-page-container animate-dashboard-enter">
      {/* ================= 1. HEADER & GREETING ================= */}
      <header className="dashboard-hero-header">
        <div className="dashboard-status-pill">
          <span className="dashboard-status-dot" />
          <span className="dashboard-status-label">Orion Core Operational</span>
          <span className="dashboard-status-divider">•</span>
          <span className="dashboard-status-time">{getFormattedDate()}</span>
        </div>

        <div className="dashboard-greeting-row">
          <div className="dashboard-greeting-text">
            <h1 className="dashboard-title">
              {getGreeting()}, <span className="highlight-name">{authUser || 'Arjuna'}</span>
            </h1>
            <p className="dashboard-subtitle">
              Sistem agen multi-model siap mengeksekusi instruksi, integrasi MCP, dan otomatisasi background.
            </p>
          </div>
          <div className="dashboard-logo-wrap">
            <OrionLogo size="md" showRings={false} />
          </div>
        </div>
      </header>

      {/* ================= 2. OMNIBAR / INSTANT PROMPT BAR ================= */}
      <section className="dashboard-omnibar-section">
        <form className="dashboard-omnibar-form" onSubmit={handleSubmitPrompt}>
          <div className="dashboard-omnibar-input-wrap">
            <Search size={16} className="dashboard-omnibar-search-icon" />
            <input
              type="text"
              className="dashboard-omnibar-input"
              placeholder="Tanya sesuatu, minta riset, jadwalkan kuliah, atau ketik instruksi..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {promptText.trim() && (
              <button type="submit" className="dashboard-omnibar-submit" title="Kirim instruksi">
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </form>

        {/* Quick Action Chips */}
        <div className="dashboard-chips-scroll">
          {quickActions.map((chip) => {
            const Icon = chip.icon;
            return (
              <button
                key={chip.id}
                type="button"
                className="dashboard-chip-btn"
                onClick={() => {
                  if (chip.prompt) {
                    onSendMessage?.(chip.prompt);
                    onNavigate?.('chat');
                  } else if (chip.action) {
                    chip.action();
                  }
                }}
              >
                <Icon size={12} className="dashboard-chip-icon" />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ================= 3. FOUR BENTO METRIC CARDS ================= */}
      <section className="dashboard-grid-section">
        <div className="dashboard-cards-grid">
          {/* Card 1: Models & Inference */}
          <div
            className="dashboard-metric-card"
            onClick={() => onNavigate?.('models')}
            role="button"
            tabIndex={0}
            title="Kelola model & provider AI"
          >
            <div className="card-top-row">
              <span className="card-tag">INFERENCE ENGINE</span>
              <Cpu size={14} className="card-icon" />
            </div>
            <div className="card-main-metric">
              <span className="metric-primary-text">{selectedModel || 'Agnes 2.5 Pro'}</span>
            </div>
            <div className="card-desc-text">
              Multi-model router aktif dengan failover otomatis & penalaran bertingkat.
            </div>
            <div className="card-footer-link">
              <span>Kelola Models</span>
              <ArrowUpRight size={12} />
            </div>
          </div>

          {/* Card 2: MCP Server Hub */}
          <div
            className="dashboard-metric-card"
            onClick={() => onNavigate?.('mcp')}
            role="button"
            tabIndex={0}
            title="Buka MCP Server Hub"
          >
            <div className="card-top-row">
              <span className="card-tag">MODEL CONTEXT PROTOCOL</span>
              <Server size={14} className="card-icon" />
            </div>
            <div className="card-main-metric">
              <span className="metric-number">{stats.mcpActive}</span>
              <span className="metric-unit">/ {stats.mcpCount} Connected</span>
            </div>
            <div className="card-desc-text">
              Filesystem, Web Fetch, STDIO & SSE tools terhubung aman ke LLM context.
            </div>
            <div className="card-footer-link">
              <span>Buka MCP Hub</span>
              <ArrowUpRight size={12} />
            </div>
          </div>

          {/* Card 3: Jobs & Autonomous Tasks */}
          <div
            className="dashboard-metric-card"
            onClick={() => onNavigate?.('jobs')}
            role="button"
            tabIndex={0}
            title="Lihat Job & Task"
          >
            <div className="card-top-row">
              <span className="card-tag">TASK RUNNER</span>
              <Workflow size={14} className="card-icon" />
            </div>
            <div className="card-main-metric">
              <span className="metric-number">{stats.jobsCount}</span>
              <span className="metric-unit">Agent Jobs Siap</span>
            </div>
            <div className="card-desc-text">
              Pemeriksaan berkala, automasi background, dan eksekusi tugas terjadwal.
            </div>
            <div className="card-footer-link">
              <span>Lihat Task & Job</span>
              <ArrowUpRight size={12} />
            </div>
          </div>

          {/* Card 4: Cron & Telemetry */}
          <div
            className="dashboard-metric-card"
            onClick={() => onNavigate?.('cron')}
            role="button"
            tabIndex={0}
            title="Buka Cron Job AI"
          >
            <div className="card-top-row">
              <span className="card-tag">AUTONOMOUS HEARTBEAT</span>
              <Clock size={14} className="card-icon" />
            </div>
            <div className="card-main-metric">
              <span className="metric-number">{stats.cronCount}</span>
              <span className="metric-unit">Active Schedules</span>
            </div>
            <div className="card-desc-text">
              Sinkronisasi memori otak, geofence kampus, dan monitoring WhatsApp.
            </div>
            <div className="card-footer-link">
              <span>Buka Cron AI</span>
              <ArrowUpRight size={12} />
            </div>
          </div>
        </div>
      </section>

      {/* ================= 4. RECENT SESSIONS & WORKSPACE ================= */}
      <section className="dashboard-recent-section">
        <div className="dashboard-recent-header">
          <div className="recent-title-group">
            <h2 className="recent-section-heading">Sesi Percakapan Terbaru</h2>
            <span className="recent-section-count">({sessions.length} total)</span>
          </div>

          <button
            type="button"
            className="dashboard-btn-new-chat"
            onClick={() => {
              onNewSession?.();
              onNavigate?.('chat');
            }}
          >
            <Plus size={13} />
            <span>Chat Baru</span>
          </button>
        </div>

        {recentSessions.length === 0 ? (
          <div className="dashboard-recent-empty">
            <MessageSquare size={20} className="empty-icon" />
            <p className="empty-text">Belum ada riwayat percakapan.</p>
            <span className="empty-subtext">Mulai percakapan baru di atas untuk berkonsultasi dengan Orion.</span>
          </div>
        ) : (
          <div className="dashboard-sessions-list">
            {recentSessions.map((session) => {
              const msgCount = (session.messages || []).length;
              const isCurrent = session.id === activeSessionId;
              const lastUpdated = session.updatedAt
                ? new Date(session.updatedAt).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '-';

              return (
                <div
                  key={session.id}
                  className={`dashboard-session-item ${isCurrent ? 'is-active-session' : ''}`}
                  onClick={() => {
                    onSelectSession?.(session.id);
                    onNavigate?.('chat');
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="session-item-left">
                    <MessageSquare size={14} className="session-item-icon" />
                    <div className="session-item-info">
                      <span className="session-item-title">{session.title || 'Percakapan Baru'}</span>
                      <span className="session-item-meta">
                        {msgCount} pesan • Terakhir aktif {lastUpdated}
                      </span>
                    </div>
                  </div>

                  <div className="session-item-right">
                    <span className="session-action-hint">Buka</span>
                    <ArrowRight size={12} className="session-arrow" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
