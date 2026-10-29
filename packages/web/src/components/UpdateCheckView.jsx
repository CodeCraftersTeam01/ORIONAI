import React from 'react';
import {
  RefreshCw,
  CheckCircle2,
  ArrowUpCircle,
  AlertCircle,
  RotateCcw,
  GitCommit,
  Calendar,
  ExternalLink,
  Download
} from 'lucide-react';

/**
 * UpdateCheckView
 * Minimalist antislop monochrome aesthetic:
 * 1. Restrained monochrome palette matching the Orion design system.
 * 2. Clean, un-nested status rows without loud rainbow borders or colors.
 * 3. Minimalist monospace badges for commit hashes, branches, and changelog categories.
 * 4. Crisp typography, honest copy without AI hype.
 */
export default function UpdateCheckView({
  updateInfo,
  isChecking,
  isUpdating,
  updateResult,
  updateError,
  onCheckUpdates,
  onPerformUpdate,
}) {
  const hasUpdate = updateInfo?.hasUpdate ?? false;
  const currentVersion = updateResult?.currentVersion || updateInfo?.currentVersion || '1.0.0';
  const latestVersion = updateInfo?.latestVersion || `v${currentVersion}`;
  const currentCommit = updateResult?.currentCommit || updateInfo?.currentCommit;
  const activeBranch = updateInfo?.activeBranch || 'feat/cli-package';
  const changelog = updateInfo?.changelog || [];

  const getTagBadge = (type) => {
    const labelMap = {
      feature: 'Fitur',
      improvement: 'Peningkatan',
      fix: 'Perbaikan',
      style: 'Tampilan',
      docs: 'Dokumen',
      change: 'Kode'
    };
    const label = labelMap[type] || 'Kode';

    return (
      <span className="changelog-type-pill">
        {label}
      </span>
    );
  };

  return (
    <div className="update-view-wrapper">
      {/* 1. Page Header */}
      <div className="update-page-header">
        <h1 className="update-page-title">Pembaruan Sistem</h1>
        <p className="update-page-subtitle">
          Status versi lokal dan sinkronisasi dengan repositori GitHub.
        </p>
      </div>

      {/* 2. Main Card: Version info + Status row */}
      <div className="update-main-card">
        <div className="update-card-top-row">
          <div className="update-brand-info">
            <div className="update-brand-tags">
              <span className="update-brand-name">Orion AI</span>
              <span className="update-version-badge">v{currentVersion}</span>
              {currentCommit && currentCommit !== 'unknown' && (
                <span className="update-commit-badge" title="Git commit aktif">
                  <GitCommit size={12} strokeWidth={2} />
                  {currentCommit}
                </span>
              )}
              <span className="update-branch-badge">
                {activeBranch}
              </span>
            </div>
            <p className="update-brand-tagline">
              Cabang kerja aktif dan sinkronisasi repositori lokal.
            </p>
          </div>

          <div>
            <button
              type="button"
              disabled={isChecking || isUpdating}
              onClick={onCheckUpdates}
              className="btn-check-action"
              aria-label="Periksa ketersediaan pembaruan"
            >
              <RefreshCw
                size={13}
                className={isChecking ? 'animate-spin' : ''}
                style={isChecking ? { animation: 'orionSpin 1s linear infinite' } : {}}
              />
              {isChecking ? 'Memeriksa...' : 'Periksa Pembaruan'}
            </button>
          </div>
        </div>

        {/* Status Section */}
        <div className="update-status-panel">
          {/* CASE A: Update Just Succeeded */}
          {updateResult ? (
            <div className="update-status-row is-success">
              <div className="update-status-left">
                <CheckCircle2 size={16} className="update-icon-success" />
                <div className="update-status-text-wrap">
                  <span className="update-status-title">Pembaruan Berhasil Dipasang</span>
                  <p className="update-status-desc">
                    {updateResult.restarting
                      ? `Versi terbaru v${String(updateResult.currentVersion || '').replace(/^v+/i, '')} telah terpasang. Server sedang memuat ulang otomatis.`
                      : `Versi terbaru v${String(updateResult.currentVersion || '').replace(/^v+/i, '')} telah terpasang. Muat ulang halaman untuk menerapkan perubahan.`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-update-primary"
              >
                <RotateCcw size={13} />
                Muat Ulang
              </button>
            </div>
          ) : isUpdating ? (
            /* CASE B: Currently Updating */
            <div className="update-status-row is-updating">
              <div className="update-status-left">
                <RefreshCw size={16} className="animate-spin update-icon-spin" style={{ animation: 'orionSpin 1s linear infinite' }} />
                <div className="update-status-text-wrap">
                  <span className="update-status-title">Sedang Memasang Pembaruan</span>
                  <p className="update-status-desc">
                    Menarik kode terbaru dari branch {activeBranch} dan mengompilasi bundel aplikasi...
                  </p>
                </div>
              </div>
            </div>
          ) : updateError ? (
            /* CASE C: Update Failed */
            <div className="update-status-row is-error">
              <div className="update-status-left">
                <AlertCircle size={16} className="update-icon-error" />
                <div className="update-status-text-wrap">
                  <span className="update-status-title">Pembaruan Belum Berhasil</span>
                  <p className="update-status-desc">{updateError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onPerformUpdate}
                className="btn-update-primary"
              >
                <RefreshCw size={13} />
                Coba Lagi
              </button>
            </div>
          ) : hasUpdate ? (
            /* CASE D: Update Available */
            <div className="update-status-row is-available">
              <div className="update-status-left">
                <span className="status-indicator-dot is-warning" />
                <div className="update-status-text-wrap">
                  <div className="update-available-title-row">
                    <span className="update-status-title">Pembaruan Tersedia: {latestVersion}</span>
                    {updateInfo?.latestCommit && (
                      <span className="update-commit-pill">#{updateInfo.latestCommit}</span>
                    )}
                  </div>
                  <p className="update-status-desc">
                    {updateInfo?.updateReason || 'Terdapat perbaikan kode dan peningkatan fitur baru di repositori.'}
                  </p>
                </div>
              </div>
              <div className="update-action-group">
                <button
                  type="button"
                  onClick={onPerformUpdate}
                  disabled={isUpdating}
                  className="btn-update-primary"
                >
                  <Download size={13} />
                  Perbarui Sekarang
                </button>
                <a
                  href="https://github.com/CodeCraftersTeam01/ORIONAI"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-update-secondary"
                >
                  GitHub
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>
          ) : (
            /* CASE E: Up to Date (Clean, quiet status row) */
            <div className="update-status-row is-uptodate">
              <div className="update-status-left">
                <span className="status-indicator-dot is-online" />
                <span className="update-uptodate-text">
                  Aplikasi telah menggunakan versi terbaru
                </span>
              </div>
              {updateInfo?.checkedAt && (
                <span className="update-status-timestamp">
                  Diperiksa {new Date(updateInfo.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Changelog Section */}
      <div className="update-changelog-block">
        <div className="update-changelog-header-row">
          <div>
            <h2 className="update-changelog-section-title">
              Catatan Perubahan
            </h2>
            <p className="update-changelog-section-desc">
              Riwayat komit dari branch <code>{activeBranch}</code>
            </p>
          </div>
          <div className="update-changelog-header-actions">
            <button
              type="button"
              onClick={() => onCheckUpdates && onCheckUpdates(true)}
              disabled={isChecking}
              className="changelog-refresh-btn"
              title="Segarkan riwayat commit"
            >
              <RefreshCw
                size={12}
                className={isChecking ? 'animate-spin' : ''}
                style={isChecking ? { animation: 'orionSpin 1s linear infinite' } : {}}
              />
              <span>Segarkan</span>
            </button>
            <a
              href={`https://github.com/CodeCraftersTeam01/ORIONAI/commits/${activeBranch}`}
              target="_blank"
              rel="noopener noreferrer"
              className="update-changelog-repo-link"
            >
              <span>GitHub</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>

        {/* Dynamic Changelog Entries List */}
        <div className="changelog-card-list">
          {changelog.map((entry, idx) => (
            <div key={entry.version || idx} className="changelog-card-item">
              <div className="changelog-card-header">
                <div className="changelog-version-group">
                  <span className="changelog-version-tag">{entry.version}</span>
                  <span className="changelog-release-title">{entry.title}</span>
                </div>
                <span className="changelog-release-date">
                  <Calendar size={11} />
                  {entry.date}
                </span>
              </div>

              <ul className="changelog-entry-list">
                {entry.highlights.map((item, hIdx) => (
                  <li key={hIdx} className="changelog-entry-item">
                    <div className="changelog-entry-meta">
                      {getTagBadge(item.type)}
                      {item.hash && (
                        <a
                          href={item.url || `https://github.com/CodeCraftersTeam01/ORIONAI/commit/${item.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="changelog-hash-link"
                          title="Buka commit di GitHub"
                        >
                          #{item.hash}
                        </a>
                      )}
                    </div>
                    <div className="changelog-entry-content">
                      <span className="changelog-entry-text">{item.text}</span>
                      {item.author && (
                        <span className="changelog-author-tag">
                          {item.author}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
