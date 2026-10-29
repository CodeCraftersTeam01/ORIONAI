import React from 'react';
import { ArrowUpCircle, X, Download, RefreshCw } from 'lucide-react';

/**
 * UpdateNotificationToast
 * Floating bottom-right notification card following /antislop-ui:
 * 1. Actionable direct update trigger ("Perbarui Sekarang").
 * 2. Matte surface, no glowing orbs or endless pulsing.
 * 3. Restrained typography and WCAG AA contrast.
 */
export default function UpdateNotificationToast({
  updateInfo,
  isUpdating,
  onPerformUpdate,
  onOpenUpdates,
  onDismiss,
}) {
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
            <span className="update-toast-badge">v{updateInfo.latestVersion}</span>
          </div>

          <p className="update-toast-message">
            Versi baru tersedia di repositori. Versi komputer saat ini: <code>v{updateInfo.currentVersion}</code>.
          </p>

          {/* Action buttons */}
          <div className="update-toast-actions">
            <button
              type="button"
              disabled={isUpdating}
              onClick={onPerformUpdate}
              className="btn-toast-primary"
            >
              {isUpdating ? (
                <>
                  <RefreshCw size={12} className="animate-spin" style={{ animation: 'orionSpin 1s linear infinite' }} />
                  Memperbarui...
                </>
              ) : (
                <>
                  <Download size={13} strokeWidth={2.2} />
                  Perbarui
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenUpdates}
              className="btn-toast-secondary"
            >
              Lihat Detail
            </button>

            <button
              type="button"
              onClick={onDismiss}
              className="btn-toast-dismiss"
            >
              Nanti
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
