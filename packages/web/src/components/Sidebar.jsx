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
  LogOut,
  Boxes,
  ArrowUpCircle,
} from 'lucide-react';
import OrionLogo from './OrionLogo';

export default function Sidebar({
  currentView = 'dashboard',
  onNavigate,
  onOpenProviders,
  sessions,
  activeSessionId,
  hasUpdate = false,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onOpenSettings,
  soundEnabled,
  onToggleSound,
  isOpen,
  onCloseMobile,
  authUser,
  onLogout,
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
                className={`sidebar-nav-item ${currentView === 'skills' ? 'active' : ''}`}
                onClick={() => {
                  onNavigate?.('skills');
                  if (window.innerWidth < 768) onCloseMobile();
                }}
              >
                <Boxes size={16} className="nav-item-icon" />
                <span className="nav-item-label">Skills Hub</span>
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

              <button
                type="button"
                className={`sidebar-nav-item ${currentView === 'updates' ? 'active' : ''}`}
                onClick={() => {
                  onNavigate?.('updates');
                  if (window.innerWidth < 768) onCloseMobile();
                }}
              >
                <ArrowUpCircle size={16} className="nav-item-icon" />
                <span className="nav-item-label">Pembaruan</span>
                {hasUpdate && (
                  <span
                    className="ml-auto w-2 h-2 rounded-full bg-amber-400"
                    title="Pembaruan tersedia"
                  />
                )}
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
              <div className="section-label">
                <span>Riwayat</span>
              </div>
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
            role="button"
            tabIndex={0}
            onClick={() => {
              onNavigate?.('settings');
              if (window.innerWidth < 768) onCloseMobile?.();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onNavigate?.('settings');
                if (window.innerWidth < 768) onCloseMobile?.();
              }
            }}
            title={`${authUser || 'Arjuna'}: Profil dan Pengaturan`}
          >
            <div className="sidebar-user-avatar">
              <span className="user-initials">
                {(authUser || 'Arjuna').charAt(0).toUpperCase()}
              </span>
              <span className="user-online-pip" title="Status: Online" />
            </div>

            <div className="sidebar-user-meta">
              <span className="sidebar-user-name">{authUser || 'Arjuna'}</span>
              <span className="sidebar-user-email">Pengelola Sistem</span>
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
              title={soundEnabled ? 'Audio Respon: Aktif' : 'Audio Respon: Senyap'}
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
              title="Log Sistem dan Gateway"
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
              title="Pengaturan Aplikasi"
              aria-label="Settings"
            >
              <Settings size={14} />
            </button>

            {onLogout && (
              <button
                type="button"
                className="footer-icon-btn footer-logout-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onLogout();
                }}
                title="Keluar dari Akun"
                aria-label="Logout"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
