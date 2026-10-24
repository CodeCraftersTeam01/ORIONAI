import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ArrowLeft,
  ChevronRight,
  Trash2,
  Edit3,
  Check,
  Eye,
  EyeOff,
  Zap,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Server,
  Sparkles,
  Terminal,
  Globe,
  Layers,
  Cpu,
} from 'lucide-react';
import { PROVIDER_TEMPLATES, getTemplateById } from '../utils/providerTemplates';

function getProviderIcon(templateId) {
  switch (templateId) {
    case 'ollama':
      return <Terminal size={17} />;
    case 'openai':
      return <Sparkles size={17} />;
    case 'gemini':
      return <Zap size={17} />;
    case 'claude':
      return <Layers size={17} />;
    case 'groq':
      return <Cpu size={17} />;
    case 'openrouter':
      return <Globe size={17} />;
    default:
      return <Server size={17} />;
  }
}

export default function ManageProvidersModal({
  isOpen,
  onClose,
  customProviders = [],
  activeProviderId = null,
  onSaveProvider,
  onDeleteProvider,
  onSelectProvider,
}) {
  // Views: 'catalog' (list of cards to choose from) | 'config' (form for selected provider)
  const [view, setView] = useState('catalog');
  const [editingId, setEditingId] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('ollama');

  // Form states
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [modelId, setModelId] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Connection testing state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Track mousedown target to prevent accidental modal close when dragging text selection outside dialog
  const backdropMouseDownRef = useRef(false);

  const handleBackdropMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      backdropMouseDownRef.current = true;
    }
  };

  const handleBackdropMouseUp = (e) => {
    if (backdropMouseDownRef.current && e.target === e.currentTarget) {
      onClose();
    }
    backdropMouseDownRef.current = false;
  };

  // Close or go back on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (view === 'config') {
          handleBackToCatalog();
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, view]);

  // Reset view to catalog whenever modal re-opens
  useEffect(() => {
    if (isOpen) {
      setView('catalog');
      setEditingId(null);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentTemplate = getTemplateById(selectedTemplateId);

  // When user clicks a provider card from the catalog
  const handlePickTemplate = (template) => {
    setSelectedTemplateId(template.id);
    setName(template.name);
    setBaseUrl(template.defaultBaseUrl);
    setModelId(template.defaultModel);
    setApiKey('');
    setEditingId(null);
    setTestResult(null);
    setView('config');
  };

  // When user edits an existing saved provider
  const handleStartEdit = (provider) => {
    setEditingId(provider.id);
    setSelectedTemplateId(provider.templateId || 'custom');
    setName(provider.name || '');
    setBaseUrl(provider.baseUrl || '');
    setApiKey(provider.apiKey || '');
    setModelId(provider.modelId || '');
    setTestResult(null);
    setView('config');
  };

  const handleBackToCatalog = () => {
    setEditingId(null);
    setTestResult(null);
    setView('catalog');
  };

  const handleTestConnection = async () => {
    if (!baseUrl.trim()) {
      setTestResult({ success: false, message: 'Base URL wajib diisi.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/chat/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: baseUrl.trim(),
          apiKey: apiKey.trim(),
          modelId: modelId.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || 'Koneksi berhasil terhubung!',
        });
      } else {
        setTestResult({
          success: false,
          message: data.message || 'Gagal terhubung ke provider.',
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: `Gagal mengirim permintaan: ${err.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !baseUrl.trim() || !modelId.trim()) return;

    const providerData = {
      id: editingId || `custom-${Date.now()}`,
      name: name.trim(),
      displayName: name.trim(),
      subtitle: `${currentTemplate.category} • ${modelId.trim()}`,
      templateId: selectedTemplateId,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      modelId: modelId.trim(),
      isCustom: true,
      supportsReasoning: false,
    };

    onSaveProvider(providerData);

    // Automatically select the provider
    onSelectProvider(providerData.id);

    // Return to catalog
    handleBackToCatalog();
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="modal-dialog provider-modal-dialog"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          {view === 'config' ? (
            <div className="provider-header-nav">
              <button
                type="button"
                className="provider-back-btn"
                onClick={handleBackToCatalog}
                title="Kembali ke daftar provider"
              >
                <ArrowLeft size={16} />
                <span>Daftar Provider</span>
              </button>
              <h2 className="modal-title">
                {editingId ? `Edit ${name || 'Provider'}` : `Konfigurasi ${currentTemplate.name}`}
              </h2>
            </div>
          ) : (
            <div className="provider-header-title-box">
              <h2 className="modal-title">Kelola Provider AI</h2>
              <p className="provider-modal-desc">
                Pilih provider untuk menghubungkan model lokal atau API eksternal
              </p>
            </div>
          )}
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Tutup jendela"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body provider-modal-body">
          {view === 'catalog' ? (
            /* ================= VIEW 1: CATALOG OF PROVIDER CARDS ================= */
            <div className="provider-catalog-flow">
              {/* Section 1: Saved & Active Providers */}
              {customProviders.length > 0 && (
                <div className="provider-catalog-section">
                  <div className="provider-section-label">
                    <span>Provider Tersimpan ({customProviders.length})</span>
                  </div>
                  <div className="provider-saved-list">
                    {customProviders.map((prov) => {
                      const tmpl = getTemplateById(prov.templateId);
                      const isActive = activeProviderId === prov.id;
                      return (
                        <div
                          key={prov.id}
                          className={`provider-saved-row ${isActive ? 'is-active' : ''}`}
                        >
                          <div className="provider-saved-main">
                            <div className="provider-saved-title-row">
                              <span className="provider-saved-name">{prov.name}</span>
                              <span className="provider-saved-cat">{tmpl.category}</span>
                              {isActive && <span className="provider-saved-active-tag">Aktif</span>}
                            </div>
                            <div className="provider-saved-meta">
                              <code className="provider-code-chip">{prov.modelId}</code>
                              <span className="provider-url-truncate" title={prov.baseUrl}>
                                {prov.baseUrl}
                              </span>
                            </div>
                          </div>

                          <div className="provider-saved-actions">
                            {!isActive ? (
                              <button
                                type="button"
                                className="provider-btn-select"
                                onClick={() => onSelectProvider(prov.id)}
                                title="Pilih sebagai model aktif"
                              >
                                Pilih
                              </button>
                            ) : (
                              <span className="provider-btn-active">Terpilih</span>
                            )}
                            <button
                              type="button"
                              className="provider-btn-icon"
                              onClick={() => handleStartEdit(prov)}
                              title="Edit konfigurasi"
                              aria-label="Edit provider"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              className="provider-btn-icon is-danger"
                              onClick={() => onDeleteProvider(prov.id)}
                              title="Hapus provider"
                              aria-label="Hapus provider"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section 2: List of Provider Template Cards Downward */}
              <div className="provider-catalog-section">
                <div className="provider-section-label">
                  <span>{customProviders.length > 0 ? 'Tambah Provider Baru' : 'Pilih Provider AI'}</span>
                </div>
                <div className="provider-cards-stack">
                  {PROVIDER_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      className="provider-template-card"
                      onClick={() => handlePickTemplate(tmpl)}
                    >
                      <div className="provider-card-left-icon">
                        {getProviderIcon(tmpl.id)}
                      </div>
                      <div className="provider-card-center-text">
                        <div className="provider-card-name-row">
                          <span className="provider-card-title">{tmpl.name}</span>
                          <span className="provider-card-pill">{tmpl.category}</span>
                        </div>
                        <p className="provider-card-desc">{tmpl.description}</p>
                        <span className="provider-card-url-hint">
                          Default: <code>{tmpl.defaultBaseUrl}</code>
                        </span>
                      </div>
                      <div className="provider-card-right-arrow">
                        <ChevronRight size={16} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ================= VIEW 2: PROVIDER CONFIGURATION FORM ================= */
            <form
              onSubmit={handleSubmit}
              className="provider-config-form"
              onKeyDown={(e) => {
                // Prevent premature form submit when user presses Enter inside an input field
                if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                  e.preventDefault();
                }
              }}
            >
              <div className="provider-config-banner">
                <div className="provider-config-icon">{getProviderIcon(currentTemplate.id)}</div>
                <div>
                  <span className="provider-config-title">{currentTemplate.name}</span>
                  <p className="provider-config-sub">{currentTemplate.description}</p>
                </div>
              </div>

              {/* Grid: Name & Model ID */}
              <div className="provider-grid-2">
                <div className="provider-form-row">
                  <label className="provider-label" htmlFor="provider-name-input">
                    Nama Tampilan
                  </label>
                  <input
                    id="provider-name-input"
                    type="text"
                    className="provider-text-field"
                    placeholder="Contoh: Ollama Llama 3"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="provider-form-row">
                  <label className="provider-label" htmlFor="provider-model-input">
                    Model ID
                  </label>
                  <input
                    id="provider-model-input"
                    type="text"
                    className="provider-text-field provider-mono"
                    placeholder="Contoh: llama3, gpt-4o, gemini-1.5-flash"
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Suggested models if available */}
              {currentTemplate.suggestedModels?.length > 0 && (
                <div className="provider-models-quicklist">
                  <span className="quicklist-label">Pilihan model:</span>
                  <div className="quicklist-chips">
                    {currentTemplate.suggestedModels.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`quicklist-chip ${modelId === m ? 'selected' : ''}`}
                        onClick={() => setModelId(m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Base URL */}
              <div className="provider-form-row">
                <label className="provider-label" htmlFor="provider-url-input">
                  Base URL (Endpoint API)
                </label>
                <input
                  id="provider-url-input"
                  type="text"
                  className="provider-text-field provider-mono"
                  placeholder="http://localhost:11434/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  required
                />
                <span className="provider-field-help">
                  Endpoint otomatis diarahkan ke <code>/chat/completions</code>
                </span>
              </div>

              {/* API Key */}
              <div className="provider-form-row">
                <label className="provider-label" htmlFor="provider-key-input">
                  API Key {currentTemplate.requiresApiKey ? '(Wajib)' : '(Opsional untuk Ollama lokal)'}
                </label>
                <div className="provider-key-wrapper">
                  <input
                    id="provider-key-input"
                    type={showApiKey ? 'text' : 'password'}
                    className="provider-text-field provider-mono"
                    placeholder={currentTemplate.placeholderKey}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <button
                    type="button"
                    className="provider-eye-btn"
                    onClick={() => setShowApiKey(!showApiKey)}
                    title={showApiKey ? 'Sembunyikan' : 'Tampilkan'}
                    tabIndex={-1}
                  >
                    {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Test status banner */}
              {testResult && (
                <div className={`provider-banner ${testResult.success ? 'is-success' : 'is-error'}`}>
                  {testResult.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                  <span>{testResult.message}</span>
                </div>
              )}

              {/* Form Bottom Actions */}
              <div className="provider-form-footer">
                <button
                  type="button"
                  className="provider-test-btn"
                  onClick={handleTestConnection}
                  disabled={isTesting || !baseUrl.trim()}
                >
                  {isTesting ? (
                    <>
                      <Loader2 size={13} className="provider-spinner" />
                      <span>Menguji koneksi...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={13} />
                      <span>Tes Koneksi</span>
                    </>
                  )}
                </button>

                <div className="provider-footer-right">
                  <button
                    type="button"
                    className="provider-cancel-btn"
                    onClick={handleBackToCatalog}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="provider-save-btn"
                    disabled={!name.trim() || !baseUrl.trim() || !modelId.trim()}
                  >
                    {editingId ? 'Simpan Perubahan' : 'Simpan & Gunakan'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
