import React, { useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  ArrowUpCircle,
  AlertCircle,
  RotateCcw,
  GitCommit,
  Calendar,
  Layers,
  Wrench,
  ShieldCheck,
  ExternalLink,
  Download
} from 'lucide-react';

/**
 * UpdateCheckView
 * Crafted according to /antislop-ui guidelines:
 * 1. Actionable "Perbarui Sekarang" button with honest progress and success states (no terminal copy commands).
 * 2. Restrained monochrome palette matching Orion system tokens.
 * 3. Zero AI slop: no decorative emoji, no generic sparkles, no em dashes, no glowing pill badges.
 * 4. Changelog section placed cleanly outside and below the main card.
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
  const changelog = updateInfo?.changelog || [];

  const getTagBadge = (type) => {
    switch (type) {
      case 'feature':
        return (
          <span className="changelog-type-pill feature">
            <Layers size={11} strokeWidth={2.2} />
            Fitur
          </span>
        );
      case 'improvement':
        return (
          <span className="changelog-type-pill improvement">
            <Wrench size={11} strokeWidth={2.2} />
            Peningkatan
          </span>
        );
      case 'fix':
        return (
          <span className="changelog-type-pill fix">
            <ShieldCheck size={11} strokeWidth={2.2} />
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
        <h1 className="update-page-title">Pembaruan Sistem</h1>
        <p className="update-page-subtitle">
          Periksa sinkronisasi versi lokal dengan repositori GitHub dan perbarui aplikasi secara langsung.
        </p>
      </div>

      {/* 2. MAIN CARD: App Name, Current Version & Direct Action */}
      <div className="update-main-card">
        <div className="update-card-top-row">
          {/* Identity & Current Version */}
          <div className="update-brand-info">
            <div className="update-brand-tags">
              <span className="update-brand-name">Orion AI</span>
              <span className="update-version-badge">v{currentVersion}</span>
              {currentCommit && currentCommit !== 'unknown' && (
                <span className="update-commit-badge" title="Git commit aktif">
                  <GitCommit size={13} strokeWidth={2} />
                  {currentCommit}
                </span>
              )}
            </div>
            <p className="update-brand-tagline">
              Asisten rekayasa perangkat lunak dan kecerdasan komputasi otonom
            </p>
          </div>

          {/* Action Button: Check for Updates */}
          <div>
            <button
              type="button"
              disabled={isChecking || isUpdating}
              onClick={onCheckUpdates}
              className="btn-check-action"
              aria-label="Periksa ketersediaan pembaruan"
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
          {/* CASE A: Update Just Succeeded */}
          {updateResult ? (
            <div className="update-alert-box is-success">
              <CheckCircle2 className="update-alert-icon" size={20} />
              <div className="update-alert-content">
                <div className="update-alert-title-row">
                  <span className="update-alert-title">
                    Pembaruan Berhasil Dipasang
                  </span>
                </div>
                <p className="update-alert-desc">
                  Versi terbaru <code>v{updateResult.currentVersion}</code> telah berhasil diunduh dan dikompilasi. Muat ulang halaman untuk menerapkan seluruh antarmuka baru.
                </p>
                <div className="update-action-row">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="btn-update-primary"
                  >
                    <RotateCcw size={14} />
                    Muat Ulang Halaman
                  </button>
                </div>
              </div>
            </div>
          ) : isUpdating ? (
            /* CASE B: Currently Updating (In Progress) */
            <div className="update-alert-box is-updating">
              <RefreshCw className="update-alert-icon animate-spin" size={20} style={{ animation: 'orionSpin 1s linear infinite' }} />
              <div className="update-alert-content">
                <div className="update-alert-title-row">
                  <span className="update-alert-title">
                    Sedang Memasang Pembaruan
                  </span>
                </div>
                <p className="update-alert-desc">
                  Sistem sedang menarik kode terbaru dari repositori dan mengompilasi ulang bundle antarmuka web. Mohon tunggu sebentar.
                </p>
              </div>
            </div>
          ) : updateError ? (
            /* CASE C: Update Failed */
            <div className="update-alert-box is-error">
              <AlertCircle className="update-alert-icon" size={20} />
              <div className="update-alert-content">
                <div className="update-alert-title-row">
                  <span className="update-alert-title">
                    Pembaruan Belum Berhasil
                  </span>
                </div>
                <p className="update-alert-desc">
                  {updateError}
                </p>
                <div className="update-action-row">
                  <button
                    type="button"
                    onClick={onPerformUpdate}
                    className="btn-update-primary"
                  >
                    <RefreshCw size={14} />
                    Coba Perbarui Lagi
                  </button>
                </div>
              </div>
            </div>
          ) : hasUpdate ? (
            /* CASE D: Update Available */
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

                {/* Direct Action Button (NO terminal command needed!) */}
                <div className="update-action-row">
                  <button
                    type="button"
                    onClick={onPerformUpdate}
                    disabled={isUpdating}
                    className="btn-update-primary"
                  >
                    <Download size={15} />
                    Perbarui Sekarang
                  </button>

                  <a
                    href="https://github.com/CodeCraftersTeam01/ORIONAI"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-update-secondary"
                  >
                    Lihat di GitHub
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            /* CASE E: Up to Date */
            <div className="update-alert-box is-success">
              <CheckCircle2 className="update-alert-icon" size={20} />
              <div className="update-alert-content">
                <div className="update-alert-title-row">
                  <span className="update-alert-title">
                    Orion AI Sudah Menggunakan Versi Terbaru
                  </span>
                </div>
                <p className="update-alert-desc">
                  Aplikasi di komputer Anda telah selaras dengan branch repositori GitHub.
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
