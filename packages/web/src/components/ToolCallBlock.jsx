import React, { useState } from 'react';
import {
  Terminal,
  FileText,
  FilePlus,
  FileEdit,
  Trash2,
  Folder,
  Search,
  Check,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';

export default function ToolCallBlock({
  toolCall,
  onApprove,
  onReject,
  onChooseOption,
  isApproving = false,
}) {
  const [isExpanded, setIsExpanded] = useState(
    toolCall.status === 'waiting_approval' ||
      toolCall.status === 'waiting_choice' ||
      toolCall.status === 'running'
  );

  const getToolMeta = (name) => {
    switch (name) {
      case 'ask_user':
        return {
          label: 'Pertanyaan AI',
          icon: <HelpCircle size={14} />,
          badge: 'TANYA',
        };
      case 'run_command':
      case 'bash':
        return {
          label: 'Terminal Command',
          icon: <Terminal size={14} />,
          badge: 'BASH',
        };
      case 'read_file':
      case 'read':
        return {
          label: 'Baca File',
          icon: <FileText size={14} />,
          badge: 'READ',
        };
      case 'write_file':
      case 'write':
        return {
          label: 'Tulis File',
          icon: <FilePlus size={14} />,
          badge: 'WRITE',
        };
      case 'edit_file':
      case 'edit':
        return {
          label: 'Edit Kode',
          icon: <FileEdit size={14} />,
          badge: 'EDIT',
        };
      case 'delete_file':
        return {
          label: 'Hapus File',
          icon: <Trash2 size={14} />,
          badge: 'DELETE',
        };
      case 'list_dir':
      case 'ls':
        return {
          label: 'Daftar Folder',
          icon: <Folder size={14} />,
          badge: 'DIR',
        };
      case 'find_files':
      case 'find':
        return {
          label: 'Cari File',
          icon: <Search size={14} />,
          badge: 'FIND',
        };
      case 'grep_search':
      case 'grep':
        return {
          label: 'Cari Kode',
          icon: <Search size={14} />,
          badge: 'GREP',
        };
      default:
        return {
          label: name || 'Tool Call',
          icon: <Terminal size={14} />,
          badge: 'TOOL',
        };
    }
  };

  const meta = getToolMeta(toolCall.tool);
  const args = toolCall.args || {};
  const status = toolCall.status || 'running';

  const renderStatusBadge = () => {
    switch (status) {
      case 'waiting_choice':
        return (
          <span className="agent-tool-badge badge-choice">
            <HelpCircle size={11} />
            <span>Pilih Respons</span>
          </span>
        );
      case 'waiting_approval':
        return (
          <span className="agent-tool-badge badge-warning">
            <ShieldAlert size={11} />
            <span>Persetujuan Dibutuhkan</span>
          </span>
        );
      case 'running':
        return (
          <span className="agent-tool-badge badge-running">
            <Loader2 size={11} className="is-spinning" />
            <span>Menjalankan...</span>
          </span>
        );
      case 'completed':
        return (
          <span className="agent-tool-badge badge-success">
            <Check size={11} />
            <span>Selesai</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="agent-tool-badge badge-rejected">
            <XCircle size={11} />
            <span>Ditolak</span>
          </span>
        );
      case 'error':
        return (
          <span className="agent-tool-badge badge-error">
            <AlertTriangle size={11} />
            <span>Gagal</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`agent-tool-card status-${status}`}>
      {/* Header Bar */}
      <div
        className="agent-tool-header"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
      >
        <div className="agent-tool-header-left">
          <span className="agent-tool-chevron">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <span className="agent-tool-icon">{meta.icon}</span>
          <span className="agent-tool-name">{meta.label}</span>
          {args.path && (
            <code className="agent-tool-target-pill">{args.path}</code>
          )}
          {args.command && (
            <code className="agent-tool-target-pill">{args.command.slice(0, 40)}{args.command.length > 40 ? '...' : ''}</code>
          )}
          {(args.question || toolCall.question) && (
            <code className="agent-tool-target-pill">{args.question || toolCall.question}</code>
          )}
        </div>

        <div className="agent-tool-header-right">
          {renderStatusBadge()}
        </div>
      </div>

      {/* Interactive Choice Box for ask_user */}
      {status === 'waiting_choice' && (
        <div className="agent-tool-choice-box">
          <div className="agent-choice-desc">
            <HelpCircle size={16} className="agent-choice-icon" />
            <div className="agent-choice-text">
              <strong>{toolCall.question || args.question || 'AI memerlukan tanggapan Anda:'}</strong>
              <p>Pilih salah satu opsi di bawah untuk melanjutkan eksekusi:</p>
            </div>
          </div>

          <div className="agent-choice-options-list">
            {(toolCall.options || args.options || ['Ya, lanjutkan', 'Tidak, batalkan']).map((opt, idx) => {
              const optLabel = typeof opt === 'string' ? opt : opt.label || opt.value || `Opsi ${idx + 1}`;
              const optDesc = typeof opt === 'object' ? opt.description || opt.detail : null;
              return (
                <button
                  key={idx}
                  type="button"
                  className="agent-btn-choice-opt"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChooseOption?.(toolCall.id, optLabel, idx);
                  }}
                  disabled={isApproving}
                >
                  <span className="agent-choice-opt-badge">{idx + 1}</span>
                  <div className="agent-choice-opt-info">
                    <span className="agent-choice-opt-title">{optLabel}</span>
                    {optDesc && <span className="agent-choice-opt-sub">{optDesc}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Approval Banner (Terminal-style Dynamic Options) */}
      {status === 'waiting_approval' && (
        <div className="agent-tool-approval-box">
          <div className="agent-approval-desc">
            <ShieldAlert size={16} className="agent-approval-icon" />
            <div className="agent-approval-text">
              <strong>Tindakan ini memerlukan persetujuan Anda:</strong>
              <p>{toolCall.reason || 'Sistem mendeteksi operasi ini berpotensi mengubah file atau mengeksekusi perintah penting.'}</p>
            </div>
          </div>

          <div className="agent-choice-options-list">
            <button
              type="button"
              className="agent-btn-choice-opt approve-opt"
              onClick={(e) => {
                e.stopPropagation();
                onApprove?.(toolCall.id);
              }}
              disabled={isApproving}
            >
              <span className="agent-choice-opt-badge approve-badge">1</span>
              <div className="agent-choice-opt-info">
                <span className="agent-choice-opt-title">✓ Setuju (Lanjutkan)</span>
                <span className="agent-choice-opt-sub">Izinkan operasi ini dieksekusi di proyek</span>
              </div>
            </button>

            <button
              type="button"
              className="agent-btn-choice-opt reject-opt"
              onClick={(e) => {
                e.stopPropagation();
                onReject?.(toolCall.id);
              }}
              disabled={isApproving}
            >
              <span className="agent-choice-opt-badge reject-badge">2</span>
              <div className="agent-choice-opt-info">
                <span className="agent-choice-opt-title">✗ Tolak (Batalkan)</span>
                <span className="agent-choice-opt-sub">Batalkan operasi ini</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Expanded Content (Arguments & Output) */}
      {isExpanded && (
        <div className="agent-tool-body">
          {/* Argument Detail */}
          {args.command && (
            <div className="agent-tool-arg-row">
              <span className="agent-tool-arg-label">Perintah:</span>
              <pre className="agent-tool-code-snippet">$ {args.command}</pre>
            </div>
          )}

          {args.content !== undefined && (
            <div className="agent-tool-arg-row">
              <span className="agent-tool-arg-label">Isi Konten:</span>
              <pre className="agent-tool-code-snippet max-h-48">{args.content.slice(0, 500)}{args.content.length > 500 ? '\n... (konten dipotong)' : ''}</pre>
            </div>
          )}

          {args.target_content && (
            <div className="agent-tool-arg-row">
              <span className="agent-tool-arg-label">Target Penggantian:</span>
              <pre className="agent-tool-code-snippet diff-remove">- {args.target_content}</pre>
              <pre className="agent-tool-code-snippet diff-add">+ {args.replacement_content}</pre>
            </div>
          )}

          {/* Result Output */}
          {toolCall.result && (
            <div className="agent-tool-output-box">
              <div className="agent-output-header">
                <span>Output Hasil Eksekusi:</span>
              </div>
              <pre className="agent-output-content">
                {toolCall.result.error && (
                  <span className="text-error">{toolCall.result.error}\n</span>
                )}
                {toolCall.result.selected && (
                  <span className="text-success">✓ Opsi terpilih: {toolCall.result.selected}\n</span>
                )}
                {toolCall.result.stdout && (
                  <span>{toolCall.result.stdout}</span>
                )}
                {toolCall.result.stderr && (
                  <span className="text-warning">{toolCall.result.stderr}</span>
                )}
                {toolCall.result.content && (
                  <span>{toolCall.result.content}</span>
                )}
                {toolCall.result.message && (
                  <span className="text-success">{toolCall.result.message}</span>
                )}
                {toolCall.result.entries && (
                  <span>{toolCall.result.entries.map((e) => `${e.type === 'directory' ? '📁' : '📄'} ${e.name} (${e.size_bytes}B)`).join('\n')}</span>
                )}
                {toolCall.result.matches && (
                  <span>{toolCall.result.matches.join('\n') || 'Tidak ada file yang cocok.'}</span>
                )}
                {toolCall.result.results && (
                  <span>{toolCall.result.results.map((r) => `${r.file}:${r.line} - ${r.text}`).join('\n') || 'Tidak ditemukan kecocokan.'}</span>
                )}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
