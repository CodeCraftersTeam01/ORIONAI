import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  FolderPlus,
  FolderGit2,
  ChevronRight,
  CornerLeftUp,
  Search,
  X,
  Check,
  Clock,
  HardDrive,
  Home,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function ProjectDirectoryModal({
  isOpen,
  onClose,
  onSelectProject,
  currentProjectPath,
}) {
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [directories, setDirectories] = useState([]);
  const [quickAccess, setQuickAccess] = useState([]);
  const [recentWorkspaces, setRecentWorkspaces] = useState([]);
  const [isCurrentProject, setIsCurrentProject] = useState(false);
  const [currentProjectType, setCurrentProjectType] = useState('folder');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isSubmittingFolder, setIsSubmittingFolder] = useState(false);

  const searchInputRef = useRef(null);
  const newFolderInputRef = useRef(null);

  // Load directory contents
  const loadDirectory = async (targetPath = '') => {
    setIsLoading(true);
    setError('');
    setSelectedFolder(null);

    try {
      const token = localStorage.getItem('orion_auth_token');
      const url = targetPath
        ? `/api/workspace/browse?path=${encodeURIComponent(targetPath)}`
        : '/api/workspace/browse';
      const res = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal memuat direktori.');
      }

      setCurrentPath(data.currentPath);
      setParentPath(data.parentPath);
      setBreadcrumbs(data.breadcrumbs || []);
      setDirectories(data.directories || []);
      setQuickAccess(data.quickAccess || []);
      setRecentWorkspaces(data.recentWorkspaces || []);
      setIsCurrentProject(Boolean(data.isCurrentProject));
      setCurrentProjectType(data.currentProjectType || 'folder');
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat memuat direktori.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDirectory(currentProjectPath || '');
      setIsCreatingFolder(false);
      setNewFolderName('');
      setSearchQuery('');
    }
  }, [isOpen, currentProjectPath]);

  // Focus input when creating folder
  useEffect(() => {
    if (isCreatingFolder) {
      setTimeout(() => newFolderInputRef.current?.focus(), 50);
    }
  }, [isCreatingFolder]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (isCreatingFolder) {
          setIsCreatingFolder(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isCreatingFolder, onClose]);

  if (!isOpen) return null;

  // Filter directories by search query
  const filteredDirectories = directories.filter((dir) =>
    dir.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleSelectFolderCandidate = (dir) => {
    if (selectedFolder?.path === dir.path) {
      // Double click or second click: navigate inside
      loadDirectory(dir.path);
    } else {
      setSelectedFolder(dir);
    }
  };

  const handleConfirmProject = (targetPath, targetName) => {
    const finalPath = targetPath || selectedFolder?.path || currentPath;
    const finalName = targetName || selectedFolder?.name || (currentPath ? currentPath.split(/[/\\]/).pop() : 'Project');
    onSelectProject(finalPath, finalName);
    onClose();
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsSubmittingFolder(true);
    try {
      const token = localStorage.getItem('orion_auth_token');
      const res = await fetch('/api/workspace/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          parentPath: currentPath,
          folderName: newFolderName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal membuat folder.');
      }

      setIsCreatingFolder(false);
      setNewFolderName('');
      await loadDirectory(currentPath);
      // Highlight the newly created folder
      setSelectedFolder({ name: data.name, path: data.path });
    } catch (err) {
      alert(err.message || 'Gagal membuat folder.');
    } finally {
      setIsSubmittingFolder(false);
    }
  };

  const renderProjectTypeBadge = (type) => {
    switch (type) {
      case 'node':
        return <span className="proj-badge badge-node">Node.js</span>;
      case 'python':
        return <span className="proj-badge badge-python">Python</span>;
      case 'go':
        return <span className="proj-badge badge-go">Go</span>;
      case 'rust':
        return <span className="proj-badge badge-rust">Rust</span>;
      case 'git':
        return <span className="proj-badge badge-git">Git Repo</span>;
      default:
        return null;
    }
  };

  return (
    <div className="project-modal-backdrop" onClick={onClose}>
      <div
        className="project-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-modal-title"
      >
        {/* Header */}
        <div className="project-modal-header">
          <div className="header-title-group">
            <div className="header-icon-badge">
              <FolderGit2 size={20} className="text-cyan-400" />
            </div>
            <div>
              <h2 id="project-modal-title" className="project-modal-title">
                Pilih Direktori Proyek
              </h2>
              <p className="project-modal-subtitle">
                Tentukan folder lokal di komputer Anda sebagai ruang kerja Orion Agent.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-close-modal"
            onClick={onClose}
            title="Tutup (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Access Bar */}
        <div className="project-quick-access-bar">
          <span className="quick-access-label">Akses Cepat:</span>
          <div className="quick-access-chips">
            {quickAccess.map((qa) => {
              const isActive = currentPath === qa.path;
              return (
                <button
                  key={qa.name}
                  type="button"
                  className={`qa-chip ${isActive ? 'active' : ''} ${qa.isDefault ? 'qa-default' : ''}`}
                  onClick={() => loadDirectory(qa.path)}
                  title={qa.path}
                >
                  {qa.isDefault ? (
                    <ShieldCheck size={13} className="text-emerald-400" />
                  ) : qa.name.includes('Home') ? (
                    <Home size={13} />
                  ) : (
                    <Folder size={13} />
                  )}
                  <span>{qa.name}</span>
                  {qa.badge && <span className="qa-badge">{qa.badge}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Breadcrumb Navigation & Controls */}
        <div className="project-navigation-toolbar">
          <button
            type="button"
            className="nav-btn-parent"
            onClick={() => parentPath && loadDirectory(parentPath)}
            disabled={!parentPath || isLoading}
            title={parentPath ? `Naik ke: ${parentPath}` : 'Sudah di tingkat teratas'}
          >
            <CornerLeftUp size={16} />
            <span>Naik</span>
          </button>

          <div className="breadcrumbs-scroll-wrapper">
            <div className="breadcrumbs-track">
              {breadcrumbs.map((bc, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={bc.path}>
                    <button
                      type="button"
                      className={`bc-item ${isLast ? 'bc-active' : ''}`}
                      onClick={() => !isLast && loadDirectory(bc.path)}
                      title={bc.path}
                    >
                      {bc.name === 'Root' ? <HardDrive size={13} /> : bc.name}
                    </button>
                    {!isLast && <ChevronRight size={13} className="bc-separator" />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className="nav-btn-refresh"
            onClick={() => loadDirectory(currentPath)}
            disabled={isLoading}
            title="Muat Ulang Direktori"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Search & New Folder Toolbar */}
        <div className="project-search-toolbar">
          <div className="search-input-wrapper">
            <Search size={15} className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Cari folder di direktori ini..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="folder-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => setSearchQuery('')}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {!isCreatingFolder ? (
            <button
              type="button"
              className="btn-new-folder"
              onClick={() => setIsCreatingFolder(true)}
              title="Buat folder baru di direktori ini"
            >
              <FolderPlus size={15} />
              <span>Folder Baru</span>
            </button>
          ) : (
            <form onSubmit={handleCreateFolder} className="inline-new-folder-form">
              <input
                ref={newFolderInputRef}
                type="text"
                placeholder="Nama folder..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="new-folder-name-input"
                disabled={isSubmittingFolder}
              />
              <button
                type="submit"
                className="btn-save-new-folder"
                disabled={!newFolderName.trim() || isSubmittingFolder}
              >
                {isSubmittingFolder ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              </button>
              <button
                type="button"
                className="btn-cancel-new-folder"
                onClick={() => {
                  setIsCreatingFolder(false);
                  setNewFolderName('');
                }}
              >
                <X size={13} />
              </button>
            </form>
          )}
        </div>

        {/* Directory Contents List */}
        <div className="project-folders-view">
          {isLoading ? (
            <div className="folders-loading-state">
              <Loader2 size={24} className="animate-spin text-cyan-400" />
              <span>Memindai direktori komputer...</span>
            </div>
          ) : error ? (
            <div className="folders-error-state">
              <span>⚠️ {error}</span>
              <button
                type="button"
                className="btn-retry"
                onClick={() => loadDirectory('')}
              >
                Kembali ke Beranda
              </button>
            </div>
          ) : filteredDirectories.length === 0 ? (
            <div className="folders-empty-state">
              <Folder size={32} className="empty-icon" />
              <p>
                {searchQuery
                  ? `Tidak ada folder yang cocok dengan "${searchQuery}".`
                  : 'Tidak ada subfolder di dalam direktori ini.'}
              </p>
              <p className="empty-subtext">
                Anda dapat memilih folder ini sekarang sebagai ruang kerja proyek.
              </p>
            </div>
          ) : (
            <div className="folders-grid">
              {filteredDirectories.map((dir) => {
                const isSelected = selectedFolder?.path === dir.path;
                return (
                  <div
                    key={dir.path}
                    className={`folder-item-card ${isSelected ? 'is-selected' : ''} ${dir.isProject ? 'is-project-card' : ''}`}
                    onClick={() => handleSelectFolderCandidate(dir)}
                    onDoubleClick={() => loadDirectory(dir.path)}
                    title={`Klik untuk memilih, klik ganda untuk masuk ke folder.\nPath: ${dir.path}`}
                  >
                    <div className="folder-icon-wrapper">
                      {dir.isProject ? (
                        <FolderGit2 size={20} className="text-cyan-400" />
                      ) : (
                        <Folder size={20} className="text-zinc-400" />
                      )}
                    </div>
                    <div className="folder-info">
                      <span className="folder-name">{dir.name}</span>
                      {dir.isProject && renderProjectTypeBadge(dir.projectType)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Projects Footer if available */}
        {recentWorkspaces.length > 0 && (
          <div className="recent-workspaces-section">
            <div className="recent-header">
              <Clock size={13} className="text-zinc-400" />
              <span>Proyek Terakhir:</span>
            </div>
            <div className="recent-chips-list">
              {recentWorkspaces.slice(0, 5).map((rw) => (
                <button
                  key={rw.path}
                  type="button"
                  className="recent-chip"
                  onClick={() => handleConfirmProject(rw.path, rw.name)}
                  title={`Gunakan langsung:\n${rw.path}`}
                >
                  <FolderGit2 size={12} className="text-cyan-400" />
                  <span>{rw.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Modal Action Footer */}
        <div className="project-modal-footer">
          <div className="footer-current-path" title={selectedFolder?.path || currentPath}>
            <span className="path-caption">Target Proyek:</span>
            <span className="path-text">
              {selectedFolder ? (
                <>
                  <span className="font-semibold text-cyan-300">{selectedFolder.name}</span>
                  <span className="text-zinc-400 text-xs ml-2 font-mono">({selectedFolder.path})</span>
                </>
              ) : (
                <>
                  <span className="font-semibold text-zinc-200">
                    {currentPath.split(/[/\\]/).pop() || currentPath}
                  </span>
                  <span className="text-zinc-400 text-xs ml-2 font-mono">({currentPath})</span>
                </>
              )}
            </span>
          </div>

          <div className="footer-actions">
            <button
              type="button"
              className="btn-cancel-modal"
              onClick={onClose}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn-confirm-project"
              onClick={() => handleConfirmProject()}
            >
              <Check size={16} />
              <span>Gunakan Folder Ini</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
