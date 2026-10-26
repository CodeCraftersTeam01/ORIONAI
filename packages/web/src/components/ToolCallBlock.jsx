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
} from 'lucide-react';

export default function ToolCallBlock({
  toolCall,
  onApprove,
  onReject,
  isApproving = false,
}) {
  const [isExpanded, setIsExpanded] = useState(
    toolCall.status === 'waiting_approval' || toolCall.status === 'running'
  );

  const getToolMeta = (name) => {
    switch (name) {
      case 'run_command':
        return {
          label: 'Terminal Command',
          icon: <Terminal size={14} />,
          badge: 'BASH',
        };
      case 'read_file':
        return {
          label: 'Baca File',
          icon: <FileText size={14} />,
          badge: 'READ',
        };
      case 'write_file':
        return {
          label: 'Tulis File',
          icon: <FilePlus size={14} />,
          badge: 'WRITE',
        };
      case 'edit_file':
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
        return {
          label: 'Daftar Folder',
          icon: <Folder size={14} />,
          badge: 'DIR',
        };
      case 'find_files':
        return {
          label: 'Cari File',
          icon: <Search size={14} />,
          badge: 'FIND',
        };
      case 'grep_search':
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
        </div>

        <div className="agent-tool-header-right">
          {renderStatusBadge()}
        </div>
      </div>

      {/* Interactive Approval Banner */}
      {status === 'waiting_approval' && (
        <div className="agent-tool-approval-box">
          <div className="agent-approval-desc">
            <ShieldAlert size={16} className="agent-approval-icon" />
            <div className="agent-approval-text">
              <strong>Tindakan ini memerlukan izin Anda:</strong>
              <p>{toolCall.reason || 'Sistem mendeteksi operasi ini berpotensi mengubah file penting atau mengeksekusi perintah terminal.'}</p>
            </div>
          </div>

          <div className="agent-approval-actions">
            <button
              type="button"
              className="agent-btn-approve"
              onClick={(e) => {
                e.stopPropagation();
                onApprove?.(toolCall.id);
              }}
              disabled={isApproving}
            >
              <Check size={13} />
              <span>{isApproving ? 'Memproses...' : 'Setujui & Jalankan'}</span>
            </button>

            <button
              type="button"
              className="agent-btn-reject"
              onClick={(e) => {
                e.stopPropagation();
                onReject?.(toolCall.id);
              }}
              disabled={isApproving}
            >
              <XCircle size={13} />
              <span>Tolak</span>
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
