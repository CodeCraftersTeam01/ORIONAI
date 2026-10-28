import React, { useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  ArrowUpCircle,
  Copy,
  Check,
  GitCommit,
  Calendar,
  Sparkles,
  Wrench,
  Bug,
  Terminal,
  ExternalLink
} from 'lucide-react';

/**
 * UpdateCheckView
 * Check for updates page featuring:
 * 1. Main clean card displaying app name, current version, latest GitHub version & check action.
 * 2. Changelog section outside/below the card detailing changes across releases.
 * Powered by pure Vanilla CSS defined in App.css.
 */
export default function UpdateCheckView({
  updateInfo,
  isChecking,
  onCheckUpdates,
}) {
  const [copied, setCopied] = useState(false);

  const copyUpdateCommand = (cmd) => {
    if (!cmd) return;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasUpdate = updateInfo?.hasUpdate ?? false;
  const currentVersion = updateInfo?.currentVersion || '1.0.0';
  const latestVersion = updateInfo?.latestVersion || `v${currentVersion}`;
  const changelog = updateInfo?.changelog || [];

  const getTagBadge = (type) => {
    switch (type) {
      case 'feature':
        return (
          <span className="changelog-type-pill feature">
            <Sparkles size={11} />
            Fitur Baru
          </span>
        );
      case 'improvement':
        return (
          <span className="changelog-type-pill improvement">
            <Wrench size={11} />
            Peningkatan
          </span>
        );
      case 'fix':
        return (
          <span className="changelog-type-pill fix">
            <Bug size={11} />
            Perbaikan
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="update-view-wrapper">
      {/* 1. Page Header */}
      <div className="update-page-header">
        <h1 className="update-page-title">Pembaruan Aplikasi</h1>
        <p className="update-page-subtitle">
          Periksa sinkronisasi kode dengan repositori GitHub dan lihat riwayat versi terbaru Orion AI.
        </p>
      </div>

      {/* 2. MAIN CARD: App Name, Current Version & Status */}
      <div className="update-main-card">
        <div className="update-card-top-row">
          {/* Identity & Current Version */}
          <div className="update-brand-info">
            <div className="update-brand-tags">
              <span className="update-brand-name">Orion AI</span>
              <span className="update-version-badge">v{currentVersion}</span>
              {updateInfo?.currentCommit && updateInfo.currentCommit !== 'unknown' && (
                <span className="update-commit-badge" title="Git commit saat ini">
                  <GitCommit size={13} />
                  {updateInfo.currentCommit}
                </span>
              )}
            </div>
            <p className="update-brand-tagline">
              Personal Autonomous AI Engine for Terminal, Web, and Voice
            </p>
          </div>

          {/* Action Button: Check for Updates */}
          <div>
            <button
              type="button"
              disabled={isChecking}
              onClick={onCheckUpdates}
              className="btn-check-action"
            >
              <RefreshCw
                size={14}
                className={isChecking ? 'animate-spin' : ''}
                style={isChecking ? { animation: 'orionSpin 1s linear infinite' } : {}}
              />
              {isChecking ? 'Memeriksa...' : 'Periksa Pembaruan'}
            </button>
          </div>
        </div>

        {/* Status Panel inside Card */}
        <div className="update-status-panel">
          {hasUpdate ? (
            <div className="update-alert-box is-warning">
              <ArrowUpCircle className="update-alert-icon" size={20} />
              <div className="update-alert-content">
                <div className="update-alert-title-row">
                  <span className="update-alert-title">
                    Pembaruan Tersedia: {latestVersion}
                  </span>
                  {updateInfo?.latestCommit && (
                    <span className="update-alert-commit">
                      (komit {updateInfo.latestCommit})
                    </span>
                  )}
                </div>
                <p className="update-alert-desc">
                  {updateInfo?.updateReason || 'Terdapat perbaikan kode atau rilis baru di repositori GitHub.'}
                </p>

                {/* Terminal Update Command Snippet */}
                <div className="update-terminal-section">
                  <span className="update-terminal-label">
                    <Terminal size={12} />
                    Cara Memperbarui Melalui Terminal:
                  </span>
                  <div className="update-terminal-bar">
                    <span className="update-terminal-text">
                      {updateInfo?.updateCommand || 'git pull origin main && npm install && npm run build'}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyUpdateCommand(updateInfo?.updateCommand || 'git pull origin main && npm install && npm run build')}
                      className="btn-copy-command"
                    >
                      {copied ? (
                        <>
                          <Check size={12} style={{ color: '#10b981' }} />
                          <span style={{ color: '#10b981' }}>Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="update-alert-box is-success">
              <CheckCircle2 className="update-alert-icon" size={20} />
              <div className="update-alert-content">
                <div className="update-alert-title-row">
                  <span className="update-alert-title">
                    Orion AI Sudah Menggunakan Versi Terbaru
                  </span>
                </div>
                <p className="update-alert-desc">
                  Aplikasi di komputer Anda telah selaras dengan branch <code>main</code> repositori GitHub.
                </p>
                {updateInfo?.checkedAt && (
                  <div className="update-alert-timestamp">
                    Terakhir diperiksa: {new Date(updateInfo.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. OUTSIDE THE CARD (BELOW): CHANGELOG SECTION */}
      <div className="update-changelog-block">
        <div className="update-changelog-header-row">
          <div>
            <h2 className="update-changelog-section-title">
              Catatan Rilis & Riwayat Perubahan
            </h2>
            <p className="update-changelog-section-desc">
              Daftar pembaruan fitur, perbaikan bug, dan optimasi performa Orion AI.
            </p>
          </div>
          <a
            href="https://github.com/CodeCraftersTeam01/ORIONAI"
            target="_blank"
            rel="noopener noreferrer"
            className="update-changelog-repo-link"
          >
            Repositori GitHub
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Changelog Entries List */}
        <div className="changelog-card-list">
          {changelog.map((entry) => (
            <div key={entry.version} className="changelog-card-item">
              {/* Header: Version & Date */}
              <div className="changelog-card-header">
                <div className="changelog-version-group">
                  <span className="changelog-version-tag">{entry.version}</span>
                  <h3 className="changelog-release-title">{entry.title}</h3>
                </div>
                <span className="changelog-release-date">
                  <Calendar size={12} />
                  {entry.date}
                </span>
              </div>

              {/* Highlights List */}
              <ul className="changelog-entry-list">
                {entry.highlights.map((item, idx) => (
                  <li key={idx} className="changelog-entry-item">
                    {getTagBadge(item.type)}
                    <span>{item.text}</span>
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
