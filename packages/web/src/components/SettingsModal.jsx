import React, { useEffect } from 'react';
import { X, Sun, Moon, Laptop, Volume2, Trash2 } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

export default function SettingsModal({
  isOpen,
  onClose,
  soundEnabled,
  onToggleSound,
  themeMode = 'system',
  theme = 'light',
  onSelectThemeMode,
  onClearAllSessions,
}) {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} aria-modal="true" role="dialog">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Pengaturan</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Tutup pengaturan"
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Section: Theme Selector */}
          <div className="settings-row theme-settings-row">
            <div>
              <div className="settings-item-title">Tema Tampilan</div>
              <div className="settings-item-desc">
                Default putih, opsional hitam, atau ikuti preferensi sistem browser secara otomatis
              </div>
            </div>
            <div className="theme-selector-group">
              <button
                type="button"
                className={`theme-selector-btn ${themeMode === 'system' ? 'active' : ''}`}
                onClick={() => onSelectThemeMode('system')}
                title="Ikuti sistem browser/OS secara otomatis"
              >
                <Laptop size={13} />
                <span>Sistem</span>
              </button>
              <button
                type="button"
                className={`theme-selector-btn ${themeMode === 'light' ? 'active' : ''}`}
                onClick={() => onSelectThemeMode('light')}
                title="Tema Terang (Putih / Default)"
              >
                <Sun size={13} />
                <span>Terang</span>
              </button>
              <button
                type="button"
                className={`theme-selector-btn ${themeMode === 'dark' ? 'active' : ''}`}
                onClick={() => onSelectThemeMode('dark')}
                title="Tema Gelap (Hitam / Opsional)"
              >
                <Moon size={13} />
                <span>Gelap</span>
              </button>
            </div>
          </div>

          {/* Section: Sound */}
          <div className="settings-row">
            <div>
              <div className="settings-item-title">Suara Notifikasi</div>
              <div className="settings-item-desc">
                Nada lembut Web Audio saat mengirim dan menerima pesan
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                className="btn-pill-action"
                onClick={() => soundEffects.playReceive()}
              >
                Tes
              </button>
              <button
                type="button"
                className={`toggle-switch ${soundEnabled ? 'on' : 'off'}`}
                onClick={onToggleSound}
                aria-label="Toggle Sound"
              >
                <span className="toggle-thumb" />
              </button>
            </div>
          </div>

          {/* Section: AI Model & Endpoint */}
          <div className="settings-row">
            <div>
              <div className="settings-item-title">Model AI Aktif</div>
              <div className="settings-item-desc">
                Model: <code>orion</code> (Koneksi terenkripsi aktif)
              </div>
            </div>
            <span className="badge-active">Terhubung</span>
          </div>

          {/* Section: Clear History */}
          <div className="settings-row danger">
            <div>
              <div className="settings-item-title">Hapus Riwayat Chat</div>
              <div className="settings-item-desc">
                Bersihkan semua percakapan yang tersimpan di perangkat ini.
              </div>
            </div>
            <button
              type="button"
              className="btn-danger-pill"
              onClick={() => {
                if (confirm('Hapus seluruh riwayat percakapan?')) {
                  onClearAllSessions();
                  onClose();
                }
              }}
            >
              <Trash2 size={13} />
              <span>Bersihkan</span>
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-modal-done" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
