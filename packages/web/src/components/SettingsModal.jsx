import React, { useEffect } from 'react';
import { X, Sun, Moon, Laptop, Volume2, Trash2, ArrowLeft, ShieldCheck, Cpu } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

export default function SettingsModal({
  isOpen = false,
  onClose,
  soundEnabled,
  onToggleSound,
  themeMode = 'system',
  theme = 'light',
  onSelectThemeMode,
  onClearAllSessions,
  isPage = false,
}) {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    if (isOpen || isPage) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPage, onClose]);

  if (!isOpen && !isPage) return null;

  const content = (
    <div className={`settings-card-wrapper ${isPage ? 'is-page-mode' : 'modal-dialog'}`}>
      <div className={isPage ? 'page-view-header' : 'modal-header'}>
        <div className="page-view-header-content">
          <h1 className={isPage ? 'page-view-title' : 'modal-title'}>Pengaturan</h1>
          <p className="page-view-subtitle">
            Preferensi antarmuka visual, efek audio notifikasi, dan manajemen privasi obrolan Orion Agent.
          </p>
        </div>
        {!isPage && (
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Tutup pengaturan"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className={isPage ? 'page-view-body' : 'modal-body'}>
        {/* Section: Theme Selector */}
        <div className="settings-row theme-settings-row">
          <div>
            <div className="settings-item-title">Tema Tampilan</div>
            <div className="settings-item-desc">
              Pilih gaya visual antarmuka: default terang bersih, gelap OLED elegan, atau otomatis ikuti preferensi sistem.
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
              Efek suara lembut Web Audio synthesizer saat mengirim dan menerima jawaban asisten.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-pill-action"
              onClick={() => soundEffects.playReceive()}
              title="Dengarkan sampel suara notifikasi"
            >
              <Volume2 size={13} />
              <span>Tes Suara</span>
            </button>
            <button
              type="button"
              className={`toggle-switch ${soundEnabled ? 'on' : 'off'}`}
              onClick={onToggleSound}
              aria-label="Toggle Sound"
              title={soundEnabled ? 'Matikan Suara Notifikasi' : 'Nyalakan Suara Notifikasi'}
            >
              <span className="toggle-thumb" />
            </button>
          </div>
        </div>

        {/* Section: AI Model & Endpoint */}
        <div className="settings-row">
          <div>
            <div className="settings-item-title">Status Sistem & Mesin AI</div>
            <div className="settings-item-desc">
              Orion Agent <code>v1.0.0</code> — Fullstack Core Engine aktif dengan enkripsi lokal.
            </div>
          </div>
          <div className="settings-status-badge">
            <ShieldCheck size={13} />
            <span>Terlindungi & Online</span>
          </div>
        </div>

        {/* Section: Clear History */}
        <div className="settings-row danger">
          <div>
            <div className="settings-item-title">Hapus Riwayat Chat</div>
            <div className="settings-item-desc">
              Bersihkan seluruh riwayat sesi percakapan yang tersimpan di perangkat lokal ini secara permanen.
            </div>
          </div>
          <button
            type="button"
            className="btn-danger-pill"
            onClick={() => {
              if (confirm('Apakah Anda yakin ingin menghapus seluruh riwayat percakapan?')) {
                onClearAllSessions();
                if (!isPage) onClose?.();
              }
            }}
          >
            <Trash2 size={13} />
            <span>Bersihkan Semua</span>
          </button>
        </div>
      </div>

      {!isPage && (
        <div className="modal-footer">
          <button type="button" className="btn-modal-done" onClick={onClose}>
            Tutup
          </button>
        </div>
      )}
    </div>
  );

  if (isPage) {
    return (
      <div className="page-view-container settings-page-view animate-page-enter">
        {content}
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose} aria-modal="true" role="dialog">
      <div onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}
