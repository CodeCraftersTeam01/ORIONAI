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
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
            <Sparkles size={11} />
            Fitur Baru
          </span>
        );
      case 'improvement':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-400 bg-blue-950/40 border border-blue-800/40 px-2 py-0.5 rounded">
            <Wrench size={11} />
            Peningkatan
          </span>
        );
      case 'fix':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
            <Bug size={11} />
            Perbaikan
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 text-neutral-200">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-100 tracking-tight">
          Pembaruan Aplikasi
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Periksa sinkronisasi kode dengan repositori GitHub dan lihat riwayat versi terbaru Orion AI.
        </p>
      </div>

      {/* 1. MAIN CARD: App Name, Current Version & Status */}
      <div className="bg-[#151619] border border-[#27292e] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#23252a]">
          {/* App identity & Current Version */}
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold tracking-tight text-white">
                Orion AI
              </span>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300">
                v{currentVersion}
              </span>
              {updateInfo?.currentCommit && updateInfo.currentCommit !== 'unknown' && (
                <span className="text-xs font-mono text-neutral-400 flex items-center gap-1">
                  <GitCommit size={12} />
                  {updateInfo.currentCommit}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-neutral-400">
              Personal Autonomous AI Engine for Terminal, Web, and Voice
            </p>
          </div>

          {/* Action: Check for Updates */}
          <div>
            <button
              type="button"
              disabled={isChecking}
              onClick={onCheckUpdates}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-neutral-100 text-neutral-900 hover:bg-white active:bg-neutral-200 disabled:opacity-60 transition-colors cursor-pointer"
            >
              <RefreshCw
                size={14}
                className={isChecking ? 'animate-spin' : ''}
              />
              {isChecking ? 'Memeriksa...' : 'Periksa Pembaruan'}
            </button>
          </div>
        </div>

        {/* Status Row */}
        <div className="pt-6">
          {hasUpdate ? (
            <div className="rounded-lg bg-amber-950/20 border border-amber-800/40 p-4">
              <div className="flex items-start gap-3">
                <ArrowUpCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-amber-300">
                      Pembaruan Tersedia: {latestVersion}
                    </span>
                    {updateInfo?.latestCommit && (
                      <span className="text-xs font-mono text-amber-400/80">
                        (komit {updateInfo.latestCommit})
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-neutral-300 leading-relaxed">
                    {updateInfo?.updateReason || 'Terdapat versi atau perbaikan kode baru di repositori GitHub.'}
                  </p>

                  {/* Terminal update instruction */}
                  <div className="mt-3">
                    <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                      <Terminal size={12} />
                      Cara Memperbarui Melalui Terminal:
                    </span>
                    <div className="flex items-center justify-between gap-2 bg-[#0d0e10] border border-[#23252a] rounded-md px-3 py-2 font-mono text-xs text-neutral-200">
                      <span className="truncate selection:bg-neutral-700">
                        {updateInfo?.updateCommand || 'git pull origin main && npm install && npm run build'}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyUpdateCommand(updateInfo?.updateCommand || 'git pull origin main && npm install && npm run build')}
                        className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-[#1c1d22] hover:bg-[#25272e] text-neutral-300 border border-neutral-700/60 transition-colors cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check size={12} className="text-emerald-400" />
                            <span className="text-emerald-400">Tersalin</span>
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
            </div>
          ) : (
            <div className="rounded-lg bg-[#111215] border border-[#23252a] p-4 flex items-center gap-3">
              <CheckCircle2 className="text-emerald-400 flex-shrink-0" size={18} />
              <div className="flex-1">
                <span className="text-sm font-medium text-neutral-200">
                  Orion AI Sudah Menggunakan Versi Terbaru
                </span>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Aplikasi di komputer Anda telah selaras dengan branch <span className="font-mono text-neutral-300">main</span> repositori GitHub.
                </p>
              </div>
              {updateInfo?.checkedAt && (
                <span className="text-[11px] text-neutral-400 font-mono hidden sm:inline">
                  Dicek: {new Date(updateInfo.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. OUTSIDE THE CARD (BELOW): CHANGELOG SECTION */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#23252a]">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100 tracking-tight">
              Catatan Rilis & Riwayat Perubahan
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Daftar pembaruan fitur, perbaikan bug, dan optimasi performa Orion AI.
            </p>
          </div>
          <a
            href="https://github.com/CodeCraftersTeam01/ORIONAI"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-neutral-400 hover:text-neutral-200 inline-flex items-center gap-1 transition-colors"
          >
            Repositori GitHub
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Changelog Entries */}
        <div className="space-y-6">
          {changelog.map((entry) => (
            <div
              key={entry.version}
              className="bg-[#151619] border border-[#27292e] rounded-xl p-5"
            >
              {/* Release Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#23252a]">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-mono font-bold text-neutral-100 px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700">
                    {entry.version}
                  </span>
                  <h3 className="text-sm font-semibold text-neutral-200">
                    {entry.title}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
                  <Calendar size={12} />
                  <span>{entry.date}</span>
                </div>
              </div>

              {/* Highlights List */}
              <ul className="mt-3.5 space-y-2.5">
                {entry.highlights.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-neutral-300 leading-relaxed">
                    <span className="flex-shrink-0 mt-0.5">
                      {getTagBadge(item.type)}
                    </span>
                    <span className="flex-1">{item.text}</span>
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
