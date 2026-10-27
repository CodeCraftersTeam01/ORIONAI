import React from 'react';
import { Folder, ChevronDown, X, ShieldCheck } from 'lucide-react';

export default function ProjectSelector({
  projectPath,
  projectName,
  onOpenModal,
  onClearProject,
  disabled = false,
}) {
  const displayName = projectName || (projectPath ? projectPath.split(/[/\\]/).pop() : null);

  return (
    <div className="project-selector-wrapper">
      <button
        type="button"
        className={`project-selector-pill ${projectPath ? 'has-project' : 'no-project'}`}
        onClick={onOpenModal}
        disabled={disabled}
        title={
          projectPath
            ? `Ruang Kerja Proyek: ${projectPath}\nKlik untuk mengubah direktori kerja.`
            : 'Belum ada proyek yang dipilih (Default: Orion Safe Workspace)\nKlik untuk memilih direktori proyek di komputer Anda.'
        }
        aria-label={projectPath ? `Proyek aktif: ${displayName}` : 'Pilih proyek'}
      >
        <Folder size={14} className="project-pill-icon" />
        <span className="project-pill-label">
          {displayName || 'Select Project'}
        </span>
        <ChevronDown size={13} className="project-pill-chevron" />
      </button>

      {projectPath && typeof onClearProject === 'function' && !disabled && (
        <button
          type="button"
          className="btn-clear-project-pill"
          onClick={(e) => {
            e.stopPropagation();
            onClearProject();
          }}
          title="Lepas proyek (kembali ke Orion Safe Workspace default)"
          aria-label="Lepas proyek saat ini"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
