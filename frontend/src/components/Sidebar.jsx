import React from 'react';
import { Plus, MessageSquare, Trash2, Settings, Volume2, VolumeX, Sun, Moon, X } from 'lucide-react';
import OrionLogo from './OrionLogo';

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onOpenSettings,
  soundEnabled,
  onToggleSound,
  theme,
  onToggleTheme,
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
          <div className="brand-header-left">
            <OrionLogo size="sm" showRings={false} />
            <div className="brand-text-block">
              <span className="brand-name">Orion</span>
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

        {/* Footer */}
        <div className="sidebar-footer">
          <span className="footer-status-text">✦ Orion Online</span>

          <div className="footer-actions-row">
            <button
              type="button"
              className={`footer-icon-btn ${soundEnabled ? 'active' : ''}`}
              onClick={onToggleSound}
              title={soundEnabled ? 'Matikan Suara' : 'Nyalakan Suara'}
              aria-label="Toggle Sound"
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>

            <button
              type="button"
              className="footer-icon-btn"
              onClick={onOpenSettings}
              title="Pengaturan"
              aria-label="Settings"
            >
              <Settings size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
