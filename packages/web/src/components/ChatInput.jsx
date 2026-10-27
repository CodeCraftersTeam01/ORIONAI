import React, { useRef, useEffect, useState } from 'react';
import {
  ArrowUp,
  Paperclip,
  X,
  FileText,
  FileCode,
  FileSpreadsheet,
  File,
  Image as ImageIcon,
  Loader2,
  Square,
  AudioWaveform,
  Command,
  Sparkles,
  Terminal,
  Wrench,
  Trash2,
  Plus,
  HelpCircle,
} from 'lucide-react';
import { processFile, formatFileSize } from '../utils/fileHelpers';
import ModelSelector from './ModelSelector';
import ProjectSelector from './ProjectSelector';

const SYSTEM_SLASH_COMMANDS = [
  {
    command: '/agent',
    label: 'agent',
    argsHint: '[on | off]',
    description: 'Aktifkan atau nonaktifkan mode AI Agent otonom (tool calls & terminal)',
    category: 'System',
  },
  {
    command: '/clear',
    label: 'clear',
    argsHint: '',
    description: 'Bersihkan seluruh riwayat percakapan sesi saat ini',
    category: 'System',
  },
  {
    command: '/new',
    label: 'new',
    argsHint: '',
    description: 'Buka sesi percakapan baru yang segar',
    category: 'System',
  },
  {
    command: '/help',
    label: 'help',
    argsHint: '',
    description: 'Tampilkan panduan dan daftar bantuan seluruh perintah',
    category: 'System',
  },
];

export default function ChatInput({
  input,
  setInput,
  attachments = [],
  setAttachments,
  onSend,
  onStop,
  onStartVoiceCall,
  isGenerating,
  isCentered = false,
  isHiddenDashboard = false,
  selectedModel = 'orion',
  setSelectedModel,
  reasoningTier = 'medium',
  setReasoningTier,
  customProviders = [],
  onOpenManageProviders,
  isAgentMode = true,
  setIsAgentMode,
  projectPath = null,
  projectName = null,
  onOpenProjectModal,
  onClearProject,
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const slashMenuRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);

  // Slash commands state
  const [slashCommands, setSlashCommands] = useState(SYSTEM_SLASH_COMMANDS);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [isSlashDismissed, setIsSlashDismissed] = useState(false);

  // Fetch slash commands from backend (system commands + installed skills)
  useEffect(() => {
    let active = true;
    async function fetchCommands() {
      try {
        const res = await fetch('/api/skills/commands');
        if (res.ok) {
          const json = await res.json();
          const items = Array.isArray(json)
            ? json
            : (Array.isArray(json?.commands) ? json.commands : []);
          if (active && items.length > 0) {
            setSlashCommands([...SYSTEM_SLASH_COMMANDS, ...items]);
          }
        }
      } catch (err) {
        console.error('Failed to load slash commands:', err);
      }
    }
    fetchCommands();
    return () => {
      active = false;
    };
  }, []);

  // Dismiss slash menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        slashMenuRef.current &&
        !slashMenuRef.current.contains(e.target) &&
        !textareaRef.current?.contains(e.target)
      ) {
        setIsSlashDismissed(true);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Auto resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  // Reset dismissed state when input changes or starts fresh with /
  useEffect(() => {
    if (input.startsWith('/')) {
      setIsSlashDismissed(false);
      setSlashSelectedIndex(0);
    }
  }, [input]);

  const activeSlashMatches = React.useMemo(() => {
    if (!input.startsWith('/') || input.includes('\n') || isSlashDismissed) return [];
    const query = input.slice(1).trim().toLowerCase();
    if (!query) return slashCommands;
    return slashCommands.filter((c) => {
      const cmd = (c.command || '').toLowerCase().replace(/^\//, '');
      const label = (c.label || '').toLowerCase();
      const skill = (c.skillName || c.skillId || '').toLowerCase();
      const desc = (c.description || '').toLowerCase();
      return (
        cmd.startsWith(query) ||
        label.startsWith(query) ||
        cmd.includes(query) ||
        skill.includes(query) ||
        desc.includes(query)
      );
    });
  }, [input, slashCommands, isSlashDismissed]);

  const showSlashMenu = input.startsWith('/') && !input.includes('\n') && !isSlashDismissed;

  // Auto scroll active item in slash menu without clipping top item
  useEffect(() => {
    if (!showSlashMenu || !slashMenuRef.current) return;
    const listEl = slashMenuRef.current.querySelector('.slash-menu-list');
    if (!listEl) return;
    if (slashSelectedIndex === 0) {
      listEl.scrollTop = 0;
      return;
    }
    const activeEl = listEl.querySelector('.slash-menu-item.is-selected');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [slashSelectedIndex, showSlashMenu]);

  const handleKeyDown = (e) => {
    if (showSlashMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashSelectedIndex((prev) => (prev + 1) % activeSlashMatches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashSelectedIndex((prev) => (prev - 1 + activeSlashMatches.length) % activeSlashMatches.length);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsSlashDismissed(true);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const selected = activeSlashMatches[slashSelectedIndex] || activeSlashMatches[0];
        if (selected) {
          setInput(`${selected.command} `);
        }
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        // If the user hasn't typed arguments yet (i.e. single word like `/ponytail`), autocomplete the command
        const parts = input.trim().split(/\s+/);
        if (parts.length <= 1) {
          e.preventDefault();
          const selected = activeSlashMatches[slashSelectedIndex] || activeSlashMatches[0];
          if (selected) {
            setInput(`${selected.command} `);
          }
          return;
        }
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isGenerating && (input.trim() || attachments.length > 0) && !isProcessingFiles) {
        setIsSlashDismissed(true);
        onSend();
      }
    }
  };

  const handleAddFiles = async (fileList) => {
    if (!fileList || fileList.length === 0 || isGenerating) return;
    setIsProcessingFiles(true);

    try {
      const remainingSlots = 10 - attachments.length;
      const filesToProcess = Array.from(fileList).slice(0, remainingSlots);

      const processed = await Promise.all(
        filesToProcess.map((f) => processFile(f))
      );

      setAttachments((prev) => [...prev, ...processed]);
    } catch (err) {
      console.error('Error processing files:', err);
    } finally {
      setIsProcessingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e) => {
    handleAddFiles(e.target.files);
  };

  const handleRemoveAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isGenerating) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!isGenerating && e.dataTransfer?.files?.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  // Paste handler for images and text files from clipboard
  const handlePaste = (e) => {
    if (isGenerating) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    const filesToUpload = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) filesToUpload.push(file);
      }
    }

    if (filesToUpload.length > 0) {
      handleAddFiles(filesToUpload);
    }
  };

  const renderFileCategoryIcon = (category) => {
    switch (category) {
      case 'code':
        return <FileCode size={16} />;
      case 'spreadsheet':
        return <FileSpreadsheet size={16} />;
      case 'document':
        return <FileText size={16} />;
      default:
        return <File size={16} />;
    }
  };

  const renderCommandIcon = (item) => {
    if (item.category === 'System') {
      if (item.command === '/clear') return <Trash2 size={12} />;
      if (item.command === '/new') return <Plus size={12} />;
      if (item.command === '/help') return <HelpCircle size={12} />;
      return <Terminal size={12} />;
    }
    return <Wrench size={12} />;
  };

  const canSend = (input.trim().length > 0 || attachments.length > 0) && !isGenerating && !isProcessingFiles;

  return (
    <div className={`chat-input-wrapper ${isCentered ? 'is-centered' : 'is-docked'} ${isHiddenDashboard ? 'is-hidden-dashboard' : ''}`}>
      {/* Top Bar: Project Selector */}
      <div className={`chat-input-top-bar ${showSlashMenu ? 'is-dimmed' : ''}`}>
        <ProjectSelector
          projectPath={projectPath}
          projectName={projectName}
          onOpenModal={onOpenProjectModal}
          onClearProject={onClearProject}
          disabled={isGenerating}
        />
      </div>

      <div
        className={`chat-input-box ${isDragging ? 'is-drag-over' : ''} ${showSlashMenu ? 'has-slash-menu' : ''}`}
        onClick={() => textareaRef.current?.focus()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Attachment Previews Area */}
        {attachments.length > 0 && (
          <div className="input-attachments-container">
            {attachments.map((att) => (
              <div
                key={att.id}
                className={`attachment-chip ${att.type === 'image' ? 'chip-image' : 'chip-file'}`}
                onClick={(e) => e.stopPropagation()}
              >
                {att.type === 'image' && att.data ? (
                  <div className="chip-img-preview">
                    <img src={att.data} alt={att.name} />
                  </div>
                ) : (
                  <div className="chip-icon-box">
                    {renderFileCategoryIcon(att.category)}
                  </div>
                )}

                <div className="chip-details">
                  <span className="chip-filename" title={att.name}>{att.name}</span>
                  <span className="chip-filesize">{formatFileSize(att.size)}</span>
                </div>

                <button
                  type="button"
                  className="btn-remove-chip"
                  onClick={() => handleRemoveAttachment(att.id)}
                  title="Hapus lampiran"
                  aria-label={`Hapus ${att.name}`}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Floating Slash Commands Menu (Simple & Clean) */}
        {showSlashMenu && (
          <div className="chat-slash-menu" ref={slashMenuRef} onClick={(e) => e.stopPropagation()}>
            <div className="slash-menu-list">
              {activeSlashMatches.length === 0 ? (
                <div className="slash-empty-state">
                  Tidak ada perintah yang cocok dengan <code>{input.trim()}</code>
                </div>
              ) : (
                activeSlashMatches.map((item, idx) => {
                  const isSelected = idx === slashSelectedIndex;
                  const isSystem = item.category === 'System';
                  const tagText = isSystem ? 'system' : (item.skillName || item.skillId || 'skill');

                  return (
                    <div
                      key={`${item.command}-${idx}`}
                      className={`slash-menu-row ${isSelected ? 'is-selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setInput(`${item.command} `);
                        textareaRef.current?.focus();
                      }}
                      onMouseEnter={() => setSlashSelectedIndex(idx)}
                    >
                      <div className="slash-row-left">
                        <div className="slash-icon-box">
                          {renderCommandIcon(item)}
                        </div>
                        <span className="slash-row-cmd">{item.command}</span>
                        {item.argsHint && (
                          <span className="slash-row-args">{item.argsHint}</span>
                        )}
                        {item.description && (
                          <span className="slash-row-desc">{item.description}</span>
                        )}
                      </div>
                      <span className={`slash-row-badge ${isSystem ? 'is-system' : 'is-skill'}`}>
                        {tagText}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="slash-menu-footer">
              <span className="slash-footer-count">{activeSlashMatches.length} perintah</span>
              <div className="slash-footer-keys">
                <span><kbd>↑↓</kbd> pilih</span>
                <span><kbd>Tab</kbd> gunakan</span>
                <span><kbd>Esc</kbd> batal</span>
              </div>
            </div>
          </div>
        )}

        {/* Input Controls Row (Image 2 style) */}
        <div className="chat-input-controls-row">
          {/* Paperclip Attachment Button (Left) */}
          <button
            type="button"
            className="btn-attach-file"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={isGenerating || attachments.length >= 10}
            title="Lampirkan gambar atau berkas (Maks 10 berkas)"
            aria-label="Lampirkan berkas atau gambar"
          >
            {isProcessingFiles ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Paperclip size={17} />
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
            accept="image/*,.pdf,.txt,.md,.csv,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.sql,.doc,.docx"
          />

          {/* Chat Textarea (Center) */}
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder={
              attachments.length > 0
                ? 'Tambahkan instruksi untuk lampiran ini...'
                : 'Tanyakan sesuatu atau tempel gambar/file...'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => {
              if (input.startsWith('/')) {
                setIsSlashDismissed(false);
              }
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={1}
            disabled={isGenerating}
          />


          {/* Model Selector Pill (Right, before Send Button) */}
          {setSelectedModel && (
            <ModelSelector
              selectedModel={selectedModel}
              reasoningTier={reasoningTier}
              customProviders={customProviders}
              onSelectModel={setSelectedModel}
              onSelectReasoningTier={setReasoningTier}
              onOpenManageProviders={onOpenManageProviders}
              disabled={isGenerating}
            />
          )}

          {/* Send or Stop Button */}
          {isGenerating ? (
            <button
              type="button"
              className="btn-send-message btn-stop-active active"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof onStop === 'function') onStop();
              }}
              title="Hentikan respon (Esc)"
              aria-label="Hentikan respon AI"
            >
              <Square size={12} fill="currentColor" stroke="none" />
            </button>
          ) : canSend ? (
            <button
              type="button"
              className="btn-send-message active"
              onClick={(e) => {
                e.stopPropagation();
                onSend();
              }}
              title="Kirim (Enter)"
              aria-label="Kirim pesan"
            >
              <ArrowUp size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="btn-send-message is-ai-calling active"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof onStartVoiceCall === 'function') {
                  onStartVoiceCall();
                }
              }}
              title="Mulai AI Calling (Panggilan Suara)"
              aria-label="Mulai AI Calling"
            >
              <AudioWaveform size={17} className="ai-calling-waveform-icon" />
            </button>
          )}
        </div>

        {/* Drag and Drop Active Overlay Banner */}
        {isDragging && (
          <div className="drag-drop-overlay">
            <ImageIcon size={24} className="drag-icon-pulse" />
            <span>Lepaskan berkas di sini untuk melampirkan</span>
          </div>
        )}
      </div>

      <div className="input-keyboard-hint">
        <span>Tekan <strong>Enter</strong> untuk mengirim, <strong>Shift + Enter</strong> untuk baris baru. Mendukung tempel (Ctrl+V) & seret berkas.</span>
      </div>
    </div>
  );
}
