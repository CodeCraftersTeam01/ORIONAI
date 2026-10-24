import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Eye,
  EyeOff,
  Radio,
  ExternalLink,
  RefreshCw,
  Server,
  Zap,
  AlertCircle,
  Sparkles,
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

  if (!isOpen) return null;

  const currentTemplate = getTemplateById(selectedTemplateId);

  // Handle template selection change
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
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    handleTemplateSelect('ollama');
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
      subtitle: `${currentTemplate.icon} ${modelId.trim()}`,
      templateId: selectedTemplateId,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      modelId: modelId.trim(),
      isCustom: true,
      supportsReasoning: false,
    };

    onSaveProvider(providerData);

    // If new provider, automatically activate it
    if (!editingId) {
      onSelectProvider(providerData.id);
    }

    handleCancelEdit();
  };

  return (
    <div className="settings-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="settings-modal-content manage-providers-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="providers-modal-title"
      >
        {/* Header */}
        <div className="settings-modal-header">
          <div className="settings-header-title-row">
            <div className="provider-modal-icon-badge">
              <Server size={18} />
            </div>
            <div>
              <h2 id="providers-modal-title" className="settings-modal-title">
                Kelola Custom Provider
              </h2>
              <p className="settings-modal-subtitle">
                Hubungkan model lokal (Ollama) atau API OpenAI-compatible eksternal
              </p>
            </div>
          </div>
          <button
            type="button"
            className="settings-close-btn"
            onClick={onClose}
            aria-label="Tutup jendela"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="settings-modal-body manage-providers-body">
          {/* Section 1: Daftar Provider Tersimpan */}
          <div className="provider-section">
            <div className="provider-section-title">
              <span>Provider Tersimpan ({customProviders.length})</span>
            </div>

            {customProviders.length === 0 ? (
              <div className="provider-empty-state">
                <Sparkles size={20} className="empty-icon" />
                <p>Belum ada custom provider yang ditambahkan.</p>
                <span>Pilih template di bawah untuk menambahkan Ollama, OpenAI, Gemini, dll.</span>
              </div>
            ) : (
              <div className="provider-cards-grid">
                {customProviders.map((prov) => {
                  const tmpl = getTemplateById(prov.templateId);
                  const isActive = activeProviderId === prov.id;
                  return (
                    <div
                      key={prov.id}
                      className={`provider-card ${isActive ? 'active' : ''}`}
                    >
                      <div className="provider-card-main">
                        <div className="provider-card-header">
                          <span className="provider-card-icon">{tmpl.icon}</span>
                          <div className="provider-card-info">
                            <span className="provider-card-name">{prov.name}</span>
                            <span className="provider-card-model">{prov.modelId}</span>
                          </div>
                          {isActive && (
                            <span className="provider-active-badge">Aktif</span>
                          )}
                        </div>
                        <div className="provider-card-url" title={prov.baseUrl}>
                          {prov.baseUrl}
                        </div>
                      </div>

                      <div className="provider-card-actions">
                        {!isActive ? (
                          <button
                            type="button"
                            className="provider-action-btn select-btn"
                            onClick={() => onSelectProvider(prov.id)}
                            title="Gunakan provider ini"
                          >
                            <Check size={13} />
                            <span>Pilih</span>
                          </button>
                        ) : (
                          <span className="provider-selected-tag">Dipakai</span>
                        )}
                        <button
                          type="button"
                          className="provider-action-btn edit-btn"
                          onClick={() => handleStartEdit(prov)}
                          title="Edit konfigurasi"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="provider-action-btn delete-btn"
                          onClick={() => onDeleteProvider(prov.id)}
                          title="Hapus provider"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="settings-divider" />

          {/* Section 2: Form Tambah / Edit Provider */}
          <form onSubmit={handleSubmit} className="provider-form">
            <div className="provider-section-title">
              <span>{editingId ? 'Edit Konfigurasi Provider' : 'Tambah Provider Baru'}</span>
              {editingId && (
                <button
                  type="button"
                  className="provider-cancel-edit-btn"
                  onClick={handleCancelEdit}
                >
                  Batal Edit
                </button>
              )}
            </div>

            {/* Template Selector Pills */}
            <div className="provider-field-group">
              <label className="provider-field-label">Pilih Template / Preset</label>
              <div className="provider-templates-scroll">
                {PROVIDER_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    className={`provider-template-pill ${selectedTemplateId === tmpl.id ? 'active' : ''}`}
                    onClick={() => handleTemplateSelect(tmpl.id)}
                  >
                    <span className="template-icon">{tmpl.icon}</span>
                    <span className="template-name">{tmpl.name}</span>
                  </button>
                ))}
              </div>
              <p className="provider-template-desc">{currentTemplate.description}</p>
            </div>

            {/* Form Inputs Grid */}
            <div className="provider-inputs-grid">
              <div className="provider-input-item">
                <label className="provider-field-label">Nama Provider</label>
                <input
                  type="text"
                  className="provider-text-input"
                  placeholder="Contoh: Ollama Llama 3"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="provider-input-item">
                <label className="provider-field-label">Model ID</label>
                <input
                  type="text"
                  className="provider-text-input"
                  placeholder="Contoh: llama3, gpt-4o, gemini-1.5-flash"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Model Suggestions Pills if available */}
            {currentTemplate.suggestedModels?.length > 0 && (
              <div className="suggested-models-row">
                <span className="suggested-label">Model cepat:</span>
                {currentTemplate.suggestedModels.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`suggested-chip ${modelId === m ? 'active' : ''}`}
                    onClick={() => setModelId(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}

            <div className="provider-input-item">
              <label className="provider-field-label">Base URL (Endpoint API)</label>
              <input
                type="text"
                className="provider-text-input"
                placeholder="http://localhost:11434/v1"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                required
              />
              <span className="provider-hint-text">
                Otomatis diarahkan ke endpoint <code>/chat/completions</code>
              </span>
            </div>

            <div className="provider-input-item">
              <label className="provider-field-label">
                API Key {currentTemplate.requiresApiKey ? '(Wajib)' : '(Opsional)'}
              </label>
              <div className="provider-key-input-wrapper">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  className="provider-text-input"
                  placeholder={currentTemplate.placeholderKey}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <button
                  type="button"
                  className="key-toggle-btn"
                  onClick={() => setShowApiKey(!showApiKey)}
                  title={showApiKey ? 'Sembunyikan API Key' : 'Tampilkan API Key'}
                >
                  {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Test Connection Feedback */}
            {testResult && (
              <div
                className={`provider-test-banner ${testResult.success ? 'success' : 'error'}`}
              >
                {testResult.success ? <Check size={16} /> : <AlertCircle size={16} />}
                <span>{testResult.message}</span>
              </div>
            )}

            {/* Form Actions */}
            <div className="provider-form-actions">
              <button
                type="button"
                className="provider-btn-secondary"
                onClick={handleTestConnection}
                disabled={isTesting || !baseUrl.trim()}
              >
                {isTesting ? (
                  <>
                    <RefreshCw size={14} className="spin-icon" />
                    <span>Menguji koneksi...</span>
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    <span>Tes Koneksi</span>
                  </>
                )}
              </button>

              <button
                type="submit"
                className="provider-btn-primary"
                disabled={!name.trim() || !baseUrl.trim() || !modelId.trim()}
              >
                <Plus size={15} />
                <span>{editingId ? 'Simpan Perubahan' : 'Tambahkan Provider'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
