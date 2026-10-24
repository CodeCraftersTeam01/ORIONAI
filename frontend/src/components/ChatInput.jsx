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
} from 'lucide-react';
import { processFile, formatFileSize } from '../utils/fileHelpers';
import ModelSelector from './ModelSelector';

export default function ChatInput({
  input,
  setInput,
  attachments = [],
  setAttachments,
  onSend,
  isGenerating,
  isCentered = false,
  selectedModel = 'orion',
  setSelectedModel,
  reasoningTier = 'medium',
  setReasoningTier,
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);

  // Auto resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isGenerating && (input.trim() || attachments.length > 0) && !isProcessingFiles) {
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

  const canSend = (input.trim().length > 0 || attachments.length > 0) && !isGenerating && !isProcessingFiles;

  return (
    <div className={`chat-input-wrapper ${isCentered ? 'is-centered' : 'is-docked'}`}>
      <div
        className={`chat-input-box ${isDragging ? 'is-drag-over' : ''}`}
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
              onSelectModel={setSelectedModel}
              onSelectReasoningTier={setReasoningTier}
              disabled={isGenerating}
            />
          )}

          {/* Send Button */}
          <button
            type="button"
            className={`btn-send-message ${canSend ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (canSend) onSend();
            }}
            disabled={!canSend}
            title="Kirim (Enter)"
            aria-label="Kirim pesan"
          >
            <ArrowUp size={16} />
          </button>
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
