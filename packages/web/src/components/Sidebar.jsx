import React from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  Settings,
  Volume2,
  VolumeX,
  X,
  ArrowLeft,
  Cpu,
  Sparkles,
  LayoutDashboard,
  Terminal,
} from 'lucide-react';
import OrionLogo from './OrionLogo';

export default function Sidebar({
  currentView = 'dashboard',
  onNavigate,
  onOpenProviders,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onOpenSettings,
  soundEnabled,
  onToggleSound,
  isOpen,
  onCloseMobile,
}) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`chat-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div
            className="brand-header-left"
            onClick={() => onNavigate?.('dashboard')}
            style={{ cursor: 'pointer' }}
            title="Kembali ke Dashboard Utama"
          >
            <OrionLogo size="sm" showRings={false} />
            <div className="brand-text-block">
              <span className="brand-name">Orion Agent</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button
              type="button"
              className="mobile-close-btn"
              onClick={onCloseMobile}
              aria-label="Tutup sidebar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content depending on currentView */}
        {currentView !== 'chat' ? (
          /* ================= DASHBOARD & GENERAL NAVIGATION MENU ================= */
          <div className="sidebar-nav-section animate-sidebar-nav">
            <div className="section-label">Navigasi</div>
            <nav className="sidebar-nav-menu">
              <button
                type="button"
                className={`sidebar-nav-item ${currentView === 'chat' ? 'active' : ''}`}
                onClick={() => {
                  onNavigate?.('chat');
                  if (window.innerWidth < 768) onCloseMobile();
                }}
              >
                <MessageSquare size={16} className="nav-item-icon" />
                <span className="nav-item-label">Chat</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${currentView === 'providers' ? 'active' : ''}`}
                onClick={() => {
                  onNavigate?.('providers');
                  if (window.innerWidth < 768) onCloseMobile();
                }}
              >
                <Cpu size={16} className="nav-item-icon" />
                <span className="nav-item-label">Provider</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${currentView === 'models' ? 'active' : ''}`}
                onClick={() => {
                  onNavigate?.('models');
                  if (window.innerWidth < 768) onCloseMobile();
                }}
              >
                <Sparkles size={16} className="nav-item-icon" />
                <span className="nav-item-label">Models</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${currentView === 'logs' ? 'active' : ''}`}
                onClick={() => {
                  onNavigate?.('logs');
                  if (window.innerWidth < 768) onCloseMobile();
                }}
              >
                <Terminal size={16} className="nav-item-icon" />
                <span className="nav-item-label">Logs</span>
              </button>
            </nav>
          </div>
        ) : (
          /* ================= CHAT VIEW SIDEBAR ================= */
          <div className="sidebar-chat-mode-wrap animate-sidebar-chat">
            {/* Back to Dashboard Button (Di atas Chat Baru) */}
            <div className="sidebar-back-wrap">
              <button
                type="button"
                className="btn-back-dashboard"
                onClick={() => {
                  onNavigate?.('dashboard');
                  if (window.innerWidth < 768) onCloseMobile();
                }}
                title="Kembali ke Dashboard Utama"
              >
                <ArrowLeft size={14} className="back-arrow-icon" />
                <span>Kembali ke Dashboard</span>
              </button>
            </div>

            {/* New Chat Button */}
            <div className="sidebar-action-wrap">
              <button
                type="button"
                className="btn-new-chat"
                onClick={() => {
                  onNewSession();
                  if (window.innerWidth < 768) onCloseMobile();
                }}
              >
                <Plus size={15} />
                <span>Chat Baru</span>
              </button>
            </div>

            {/* Sessions List */}
            <div className="sidebar-history-section">
              <div className="section-label">Riwayat</div>
              <div className="sessions-scroll-list">
                {sessions.length === 0 ? (
                  <div className="no-sessions-hint">Belum ada obrolan</div>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`session-item ${session.id === activeSessionId ? 'active' : ''}`}
                      onClick={() => {
                        onSelectSession(session.id);
                        if (window.innerWidth < 768) onCloseMobile();
                      }}
                    >
                      <MessageSquare size={14} className="session-icon" />
                      <span className="session-title" title={session.title}>
                        {session.title || 'Percakapan Tanpa Judul'}
                      </span>
                      {sessions.length > 1 && (
                        <button
                          type="button"
                          className="session-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                          title="Hapus obrolan"
                          aria-label="Hapus obrolan"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer with User Profile & Quick Actions */}
        <div className="sidebar-footer">
          <div
            className="sidebar-user-card"
            onClick={() => {
              onNavigate?.('settings');
              if (window.innerWidth < 768) onCloseMobile?.();
            }}
            title="Arjuna (wardilanang46@gmail.com) — Buka Pengaturan"
          >
            <div className="sidebar-user-avatar">
              <span className="user-initials">A</span>
              <span className="user-online-pip" title="Online" />
            </div>

            <div className="sidebar-user-meta">
              <span className="sidebar-user-name">Arjuna</span>
              <span className="sidebar-user-email">wardilanang46@gmail.com</span>
            </div>
          </div>

          <div className="footer-actions-row">
            <button
              type="button"
              className={`footer-icon-btn ${soundEnabled ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSound();
              }}
              title={soundEnabled ? 'Matikan Suara' : 'Nyalakan Suara'}
              aria-label="Toggle Sound"
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>

            <button
              type="button"
              className={`footer-icon-btn ${currentView === 'logs' ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onNavigate?.('logs');
                if (window.innerWidth < 768) onCloseMobile?.();
              }}
              title="System & Gateway Logs"
              aria-label="Logs"
            >
              <Terminal size={14} />
            </button>

            <button
              type="button"
              className={`footer-icon-btn ${currentView === 'settings' ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onNavigate?.('settings');
                if (window.innerWidth < 768) onCloseMobile?.();
              }}
              title="Pengaturan"
              aria-label="Settings"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
