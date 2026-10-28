import React from 'react';
import { ArrowUpCircle, X, ExternalLink } from 'lucide-react';

/**
 * UpdateNotificationToast
 * Floating bottom-right warning modal toast when GitHub has newer updates/commits.
 * Strictly designed without AI-slop (clean, subtle borders, high contrast, pure Vanilla CSS).
 */
export default function UpdateNotificationToast({ updateInfo, onOpenUpdates, onDismiss }) {
  if (!updateInfo || !updateInfo.hasUpdate) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="update-toast-container"
    >
      <div className="update-toast-inner">
        {/* Warning Icon */}
        <div className="update-toast-icon-wrap">
          <ArrowUpCircle size={20} strokeWidth={2} />
        </div>

        {/* Content */}
        <div className="update-toast-body">
          <div className="update-toast-headline-row">
            <h4 className="update-toast-title">Pembaruan Tersedia</h4>
            <span className="update-toast-badge">Update</span>
          </div>

          <p className="update-toast-message">
            Versi <code>{updateInfo.latestVersion}</code> tersedia di GitHub. Komputer Anda saat ini menggunakan <code>v{updateInfo.currentVersion}</code>.
          </p>

          {/* Action buttons */}
          <div className="update-toast-actions">
            <button
              type="button"
              onClick={onOpenUpdates}
              className="btn-toast-view"
            >
              Lihat Pembaruan
              <ExternalLink size={12} strokeWidth={2} />
            </button>

            <button
              type="button"
              onClick={onDismiss}
              className="btn-toast-dismiss"
            >
              Nanti Saja
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onDismiss}
          className="btn-toast-close-x"
          aria-label="Tutup notifikasi"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
