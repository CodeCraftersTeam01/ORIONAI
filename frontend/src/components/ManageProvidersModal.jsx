import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit3,
  Check,
  Eye,
  EyeOff,
  Zap,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Layers,
} from 'lucide-react';
import { PROVIDER_TEMPLATES, getTemplateById } from '../utils/providerTemplates';

export default function ManageProvidersModal({
  isOpen,
  onClose,
  customProviders = [],
  activeProviderId = null,
  onSaveProvider,
  onDeleteProvider,
  onSelectProvider,
}) {
  const [activeTab, setActiveTab] = useState(customProviders.length === 0 ? 'form' : 'list');
  const [editingId, setEditingId] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('ollama');

  // Form states
  const [name, setName] = useState('Ollama Lokal');
  const [baseUrl, setBaseUrl] = useState('http://localhost:11434/v1');
  const [apiKey, setApiKey] = useState('');
  const [modelId, setModelId] = useState('llama3');
  const [showApiKey, setShowApiKey] = useState(false);

  // Testing connection state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Sync tab if providers empty
  useEffect(() => {
    if (customProviders.length === 0 && activeTab === 'list') {
      setActiveTab('form');
    }
  }, [customProviders.length, activeTab]);

  if (!isOpen) return null;

  const currentTemplate = getTemplateById(selectedTemplateId);

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId);
    const tmpl = getTemplateById(templateId);
    setName(tmpl.name);
    setBaseUrl(tmpl.defaultBaseUrl);
    setModelId(tmpl.defaultModel);
    setApiKey('');
    setTestResult(null);
  };

  const handleStartEdit = (provider) => {
    setEditingId(provider.id);
    setSelectedTemplateId(provider.templateId || 'custom');
    setName(provider.name || '');
    setBaseUrl(provider.baseUrl || '');
    setApiKey(provider.apiKey || '');
    setModelId(provider.modelId || '');
    setTestResult(null);
    setActiveTab('form');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    handleTemplateSelect('ollama');
    if (customProviders.length > 0) {
      setActiveTab('list');
    }
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

    if (!editingId) {
      onSelectProvider(providerData.id);
    }

    setEditingId(null);
    setActiveTab('list');
  };

  return (
    <div className="modal-backdrop" onClick={onClose} aria-modal="true" role="dialog">
      <div
        className="modal-dialog provider-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="provider-modal-title-group">
            <h2 className="modal-title">Kelola Provider AI</h2>
            <p className="provider-modal-desc">
              Hubungkan endpoint OpenAI-compatible lokal (Ollama) atau cloud eksternal
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Tutup jendela"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="provider-tab-bar">
          <button
            type="button"
            className={`provider-tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
            disabled={customProviders.length === 0}
          >
            <span>Tersimpan ({customProviders.length})</span>
          </button>
          <button
            type="button"
            className={`provider-tab-btn ${activeTab === 'form' ? 'active' : ''}`}
            onClick={() => {
              if (activeTab !== 'form') {
                setEditingId(null);
                handleTemplateSelect('ollama');
              }
              setActiveTab('form');
            }}
          >
            <span>{editingId ? 'Edit Provider' : '+ Tambah Provider'}</span>
          </button>
        </div>

        {/* Body */}
        <div className="modal-body provider-modal-body">
          {activeTab === 'list' ? (
            /* Tab: Saved Providers */
            <div className="provider-list-view">
              <div className="provider-items-container">
                {customProviders.map((prov) => {
                  const tmpl = getTemplateById(prov.templateId);
                  const isActive = activeProviderId === prov.id;
                  return (
                    <div
                      key={prov.id}
                      className={`provider-list-card ${isActive ? 'is-active' : ''}`}
                    >
                      <div className="provider-card-details">
                        <div className="provider-card-headline">
                          <span className="provider-name-text">{prov.name}</span>
                          <span className="provider-category-tag">{tmpl.category}</span>
                          {isActive && <span className="provider-status-tag">Aktif</span>}
                        </div>
                        <div className="provider-card-subline">
                          <code className="provider-code-chip">{prov.modelId}</code>
                          <span className="provider-url-text" title={prov.baseUrl}>
                            {prov.baseUrl}
                          </span>
                        </div>
                      </div>

                      <div className="provider-card-buttons">
                        {!isActive ? (
                          <button
                            type="button"
                            className="provider-btn-select"
                            onClick={() => onSelectProvider(prov.id)}
                            title="Gunakan provider ini"
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
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          className="provider-btn-icon is-danger"
                          onClick={() => onDeleteProvider(prov.id)}
                          title="Hapus provider"
                          aria-label="Hapus provider"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="provider-list-footer">
                <button
                  type="button"
                  className="provider-add-trigger"
                  onClick={() => {
                    setEditingId(null);
                    handleTemplateSelect('ollama');
                    setActiveTab('form');
                  }}
                >
                  <Plus size={14} />
                  <span>Tambah Provider Baru</span>
                </button>
              </div>
            </div>
          ) : (
            /* Tab: Form */
            <form onSubmit={handleSubmit} className="provider-edit-form">
              {/* Preset Selector */}
              <div className="provider-form-row">
                <label className="provider-label" htmlFor="provider-preset-select">
                  Template Preset
                </label>
                <select
                  id="provider-preset-select"
                  className="provider-select-input"
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                >
                  {PROVIDER_TEMPLATES.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name} ({tmpl.category})
                    </option>
                  ))}
                </select>
                <span className="provider-field-help">{currentTemplate.description}</span>
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
                  <span className="quicklist-label">Model rujukan:</span>
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
                  Base URL (OpenAI-compatible)
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
                  {editingId && (
                    <button
                      type="button"
                      className="provider-cancel-btn"
                      onClick={handleCancelEdit}
                    >
                      Batal
                    </button>
                  )}
                  <button
                    type="submit"
                    className="provider-save-btn"
                    disabled={!name.trim() || !baseUrl.trim() || !modelId.trim()}
                  >
                    {editingId ? 'Simpan Perubahan' : 'Simpan Provider'}
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
