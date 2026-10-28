import React from 'react';
import { ArrowUpCircle, X, ExternalLink } from 'lucide-react';

/**
 * UpdateNotificationToast
 * Floating bottom-right warning modal toast when GitHub has newer updates/commits.
 * Strictly designed without AI-slop (clean, subtle borders, high contrast, no glow).
 */
export default function UpdateNotificationToast({ updateInfo, onOpenUpdates, onDismiss }) {
  if (!updateInfo || !updateInfo.hasUpdate) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#141517] border border-[#2b2d31] rounded-xl p-4 shadow-xl text-neutral-200 font-sans transition-all animate-in fade-in slide-in-from-bottom-3 duration-200"
      style={{
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Warning Icon */}
        <div className="flex-shrink-0 mt-0.5 text-amber-400">
          <ArrowUpCircle size={20} strokeWidth={2} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-neutral-100 tracking-tight">
              Pembaruan Tersedia
            </h4>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
              Update
            </span>
          </div>

          <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
            Versi <span className="text-neutral-200 font-mono font-medium">{updateInfo.latestVersion}</span> tersedia di GitHub. Komputer Anda saat ini menggunakan <span className="text-neutral-200 font-mono font-medium">v{updateInfo.currentVersion}</span>.
          </p>

          {/* Action buttons */}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenUpdates}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-900 hover:bg-white active:bg-neutral-200 transition-colors cursor-pointer"
            >
              Lihat Pembaruan
              <ExternalLink size={12} strokeWidth={2} />
            </button>

            <button
              type="button"
              onClick={onDismiss}
              className="text-xs text-neutral-400 hover:text-neutral-200 px-2 py-1.5 rounded-lg hover:bg-[#202226] transition-colors cursor-pointer"
            >
              Nanti Saja
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 text-neutral-500 hover:text-neutral-300 p-1 rounded-md hover:bg-[#202226] transition-colors"
          aria-label="Tutup notifikasi"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
