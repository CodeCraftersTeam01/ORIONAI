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
  Key,
  Copy,
  Bot,
  Plus,
  Download,
  HelpCircle,
} from 'lucide-react';
import { PROVIDER_TEMPLATES, getTemplateById } from '../utils/providerTemplates';
import { isReasoningSupported } from '../utils/modelConfig';

function getProviderIcon(templateId) {
  switch (templateId) {
    case 'orion':
      return <Bot size={17} />;
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

function maskApiKey(key) {
  if (!key || !key.trim()) return '(Tidak ada key / Offline)';
  const clean = key.trim();
  if (clean.length <= 8) return '••••••••';
  const prefix = clean.slice(0, 4);
  const suffix = clean.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

export default function ManageProvidersModal({
  isOpen = false,
  onClose,
  customProviders = [],
  activeProviderId = null,
  onSaveProvider,
  onDeleteProvider,
  onSelectProvider,
  isPage = false,
}) {
  // Views: 'catalog' | 'add' | 'manage'
  const [view, setView] = useState('catalog');
  const [selectedTemplateId, setSelectedTemplateId] = useState('ollama');
  const [managingProviderId, setManagingProviderId] = useState(null);

  // Add Provider Form States
  const [addName, setAddName] = useState('');
  const [addBaseUrl, setAddBaseUrl] = useState('');
  const [addApiKey, setAddApiKey] = useState('');
  const [showAddApiKey, setShowAddApiKey] = useState(false);
  const [isTestingAdd, setIsTestingAdd] = useState(false);
  const [addTestResult, setAddTestResult] = useState(null);

  // Manage View Edit States
  const [isEditingBaseDetails, setIsEditingBaseDetails] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBaseUrl, setEditBaseUrl] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Manage View API Key States
  const [isAddingApiKey, setIsAddingApiKey] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState(null);

  // Manage View Model Management States
  const [manualModelId, setManualModelId] = useState('');
  const [manualModelName, setManualModelName] = useState('');
  const [isImportingModels, setIsImportingModels] = useState(false);
  const [importNotice, setImportNotice] = useState(null);
  const [testingModelMap, setTestingModelMap] = useState({}); // { [modelId]: boolean }

  // Backdrop safe mouse click detection
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

  // Close or navigate back on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (view === 'add' || view === 'manage') {
          setView('catalog');
        } else {
          onClose();
        }
      }
    };
    if (isOpen || isPage) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPage, onClose, view]);

  // Reset view to catalog whenever modal re-opens
  useEffect(() => {
    if (isOpen || isPage) {
      setView('catalog');
      setManagingProviderId(null);
      setAddTestResult(null);
      setConnectionTestResult(null);
      setImportNotice(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Active Provider being managed in 'manage' view
  const currentProvider = customProviders.find((p) => p.id === managingProviderId) || null;
  const currentTemplate = getTemplateById(selectedTemplateId);

  // --- Handlers: Flow Transitions ---
  const handleOpenAdd = (template) => {
    setSelectedTemplateId(template.id);
    setAddName(template.name);
    setAddBaseUrl(template.defaultBaseUrl);
    setAddApiKey('');
    setAddTestResult(null);
    setView('add');
  };

  const handleOpenManage = (provider) => {
    setManagingProviderId(provider.id);
    setEditName(provider.name);
    setEditBaseUrl(provider.baseUrl);
    setIsEditingBaseDetails(false);
    setIsAddingApiKey(false);
    setConnectionTestResult(null);
    setImportNotice(null);
    setView('manage');
  };

  // --- Handlers: Add Provider & Base URL ---
  const handleTestAddConnection = async () => {
    if (!addBaseUrl.trim()) {
      setAddTestResult({ success: false, message: 'Base URL wajib diisi.' });
      return;
    }

    setIsTestingAdd(true);
    setAddTestResult(null);

    try {
      const res = await fetch('/api/chat/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: addBaseUrl.trim(),
          apiKey: addApiKey.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAddTestResult({
          success: true,
          message: data.message || 'Koneksi berhasil terhubung!',
        });
      } else {
        setAddTestResult({
          success: false,
          message: data.message || 'Gagal terhubung ke endpoint.',
        });
      }
    } catch (err) {
      setAddTestResult({
        success: false,
        message: `Gagal mengirim permintaan: ${err.message}`,
      });
    } finally {
      setIsTestingAdd(false);
    }
  };

  const handleSaveNewProvider = (e) => {
    e.preventDefault();
    if (!addName.trim() || !addBaseUrl.trim()) return;

    const newId = `custom-${Date.now()}`;
    const initialKeys = addApiKey.trim()
      ? [{ id: `key-${Date.now()}`, name: 'Key 1', key: addApiKey.trim(), active: true }]
      : [];

    const newProvider = {
      id: newId,
      name: addName.trim(),
      displayName: addName.trim(),
      templateId: selectedTemplateId,
      baseUrl: addBaseUrl.trim(),
      apiKeys: initialKeys,
      apiKey: addApiKey.trim(),
      models: [], // Initial models empty, user imports from /models or adds manually
      isCustom: true,
      supportsReasoning: false,
    };

    onSaveProvider(newProvider);
    setManagingProviderId(newId);
    setView('manage');
  };

  // --- Handlers: Manage Provider Details & Base URL ---
  const handleSaveBaseDetails = () => {
    if (!currentProvider || !editName.trim() || !editBaseUrl.trim()) return;
    const updated = {
      ...currentProvider,
      name: editName.trim(),
      displayName: editName.trim(),
      baseUrl: editBaseUrl.trim(),
    };
    onSaveProvider(updated);
    setIsEditingBaseDetails(false);
  };

  const handleCopyUrl = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // --- Handlers: API Keys ---
  const handleAddApiKey = () => {
    if (!currentProvider || !newKeyValue.trim()) return;
    const existingKeys = currentProvider.apiKeys || [];
    const keyLabel = newKeyLabel.trim() || `Key ${existingKeys.length + 1}`;

    const newKeyObj = {
      id: `key-${Date.now()}`,
      name: keyLabel,
      key: newKeyValue.trim(),
      active: true,
    };

    const updatedKeys = [...existingKeys, newKeyObj];
    const updated = {
      ...currentProvider,
      apiKeys: updatedKeys,
      apiKey: updatedKeys[0]?.key || '',
    };

    onSaveProvider(updated);
    setNewKeyLabel('');
    setNewKeyValue('');
    setIsAddingApiKey(false);
  };

  const handleDeleteApiKey = (keyId) => {
    if (!currentProvider) return;
    const existingKeys = currentProvider.apiKeys || [];
    const updatedKeys = existingKeys.filter((k) => k.id !== keyId);
    const updated = {
      ...currentProvider,
      apiKeys: updatedKeys,
      apiKey: updatedKeys[0]?.key || '',
    };
    onSaveProvider(updated);
  };

  const handleTestProviderConnection = async () => {
    if (!currentProvider || !currentProvider.baseUrl) return;
    const activeKey = currentProvider.apiKeys?.find((k) => k.active)?.key || currentProvider.apiKey || '';

    setIsTestingConnection(true);
    setConnectionTestResult(null);

    try {
      const res = await fetch('/api/chat/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: currentProvider.baseUrl,
          apiKey: activeKey,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setConnectionTestResult({
          success: true,
          message: data.message || 'Koneksi berhasil terhubung.',
        });
      } else {
        setConnectionTestResult({
          success: false,
          message: data.message || 'Gagal terhubung ke endpoint.',
        });
      }
    } catch (err) {
      setConnectionTestResult({
        success: false,
        message: `Koneksi error: ${err.message}`,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // --- Handlers: Available Models Management ---
  const handleImportModelsFromEndpoint = async () => {
    if (!currentProvider || !currentProvider.baseUrl) return;
    const activeKey = currentProvider.apiKeys?.find((k) => k.active)?.key || currentProvider.apiKey || '';

    setIsImportingModels(true);
    setImportNotice(null);

    try {
      const res = await fetch('/api/chat/fetch-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: currentProvider.baseUrl,
          apiKey: activeKey,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.models)) {
        const existingModels = currentProvider.models || [];
        const existingIds = new Set(existingModels.map((m) => m.id));

        const newModels = [];
        data.models.forEach((mId) => {
          if (!existingIds.has(mId)) {
            newModels.push({
              id: mId,
              name: mId,
              enabled: false,
              tested: false,
              supportsReasoning: isReasoningSupported(mId),
              lastTestStatus: 'untested',
              lastTestError: null,
            });
          }
        });

        const mergedModels = [...existingModels, ...newModels];
        const updated = {
          ...currentProvider,
          models: mergedModels,
        };
        onSaveProvider(updated);

        setImportNotice({
          success: true,
          message:
            newModels.length > 0
              ? `Berhasil mengimpor ${newModels.length} model baru dari /models.`
              : 'Semua model dari server sudah ada dalam daftar.',
        });
      } else {
        setImportNotice({
          success: false,
          message: data.message || 'Gagal mengambil daftar model dari endpoint.',
        });
      }
    } catch (err) {
      setImportNotice({
        success: false,
        message: `Error saat impor model: ${err.message}`,
      });
    } finally {
      setIsImportingModels(false);
    }
  };

  const handleAddManualModel = (e) => {
    e.preventDefault();
    if (!currentProvider || !manualModelId.trim()) return;

    const id = manualModelId.trim();
    const name = manualModelName.trim() || id;
    const existingModels = currentProvider.models || [];

    if (existingModels.some((m) => m.id === id)) {
      setImportNotice({ success: false, message: `Model "${id}" sudah ada dalam daftar.` });
      return;
    }

    const newModel = {
      id,
      name,
      enabled: false,
      tested: false,
      supportsReasoning: isReasoningSupported(id, name),
      lastTestStatus: 'untested',
      lastTestError: null,
    };

    const updated = {
      ...currentProvider,
      models: [...existingModels, newModel],
    };
    onSaveProvider(updated);
    setManualModelId('');
    setManualModelName('');
    setImportNotice({ success: true, message: `Model "${id}" berhasil ditambahkan ke daftar.` });
  };

  // Test single model functionality before checklist
  const handleTestSpecificModel = async (modelItem) => {
    if (!currentProvider || !currentProvider.baseUrl) return;
    const activeKey = currentProvider.apiKeys?.find((k) => k.active)?.key || currentProvider.apiKey || '';

    // If provider requires API key but none is stored, warn immediately
    if (!activeKey && (currentProvider.requiresApiKey || currentProvider.id === 'orion' || currentProvider.templateId === 'orion')) {
      const errMsg = 'API Key belum dimasukkan. Masukkan API Key pada bagian "Koneksi & API Key" di atas sebelum menguji model.';
      const existingModels = currentProvider.models || [];
      const updatedModels = existingModels.map((m) =>
        m.id === modelItem.id
          ? { ...m, tested: true, lastTestStatus: 'failed', lastTestError: errMsg, enabled: false }
          : m
      );
      onSaveProvider({ ...currentProvider, models: updatedModels });
      setImportNotice({
        success: false,
        message: `⚠️ Gagal menguji "${modelItem.name || modelItem.id}": ${errMsg}`,
      });
      setIsAddingApiKey(true);
      return;
    }

    setTestingModelMap((prev) => ({ ...prev, [modelItem.id]: true }));

    try {
      const res = await fetch('/api/chat/test-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: currentProvider.baseUrl,
          apiKey: activeKey,
          modelId: modelItem.id,
        }),
      });

      const data = await res.json();
      const existingModels = currentProvider.models || [];

      if (res.ok && data.success) {
        // Model passed verification -> Enable & check automatically!
        const updatedModels = existingModels.map((m) =>
          m.id === modelItem.id
            ? { ...m, tested: true, lastTestStatus: 'success', lastTestError: null, enabled: true }
            : m
        );
        onSaveProvider({ ...currentProvider, models: updatedModels });
        setImportNotice({
          success: true,
          message: `✓ Model "${modelItem.name || modelItem.id}" berhasil diverifikasi dan siap digunakan!`,
        });
      } else {
        // Model failed verification -> Cannot be checked
        const errMsg = data.message || 'Verifikasi model gagal.';
        const updatedModels = existingModels.map((m) =>
          m.id === modelItem.id
            ? { ...m, tested: true, lastTestStatus: 'failed', lastTestError: errMsg, enabled: false }
            : m
        );
        onSaveProvider({ ...currentProvider, models: updatedModels });
        setImportNotice({
          success: false,
          message: `⚠️ Gagal menguji "${modelItem.name || modelItem.id}": ${errMsg}`,
        });
      }
    } catch (err) {
      const existingModels = currentProvider.models || [];
      const updatedModels = existingModels.map((m) =>
        m.id === modelItem.id
          ? { ...m, tested: true, lastTestStatus: 'failed', lastTestError: err.message, enabled: false }
          : m
      );
      onSaveProvider({ ...currentProvider, models: updatedModels });
      setImportNotice({
        success: false,
        message: `⚠️ Gagal menguji "${modelItem.name || modelItem.id}": ${err.message}`,
      });
    } finally {
      setTestingModelMap((prev) => ({ ...prev, [modelItem.id]: false }));
    }
  };

  // Checkbox toggle: enforces that model must be tested and working
  const handleToggleModelCheck = (modelItem) => {
    if (!currentProvider) return;
    if (!modelItem.tested || modelItem.lastTestStatus !== 'success') {
      // Prompt user to test first
      handleTestSpecificModel(modelItem);
      return;
    }

    const existingModels = currentProvider.models || [];
    const updatedModels = existingModels.map((m) =>
      m.id === modelItem.id ? { ...m, enabled: !m.enabled } : m
    );
    onSaveProvider({ ...currentProvider, models: updatedModels });
  };

  const handleDeleteModel = (modelId) => {
    if (!currentProvider) return;
    const existingModels = currentProvider.models || [];
    const updatedModels = existingModels.filter((m) => m.id !== modelId);
    onSaveProvider({ ...currentProvider, models: updatedModels });
  };

  const cleanChatCompletionsUrl = (baseUrl) => {
    if (!baseUrl) return '';
    const clean = baseUrl.trim().replace(/\/+$/, '');
    return clean.endsWith('/chat/completions') ? clean : `${clean}/chat/completions`;
  };

  if (!isOpen && !isPage) return null;

  const modalContent = (
    <div
      className={isPage ? "provider-page-view-content" : "modal-dialog provider-modal-dialog provider-modal-large"}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      {isPage ? (
        <div className="models-main-header">
          {view === 'add' ? (
            <div className="models-title-block">
              <button
                type="button"
                className="provider-breadcrumb-back"
                onClick={() => setView('catalog')}
                title="Kembali ke daftar provider"
              >
                <ArrowLeft size={13} />
                <span>Kembali ke Daftar Provider</span>
              </button>
              <h1 className="models-heading">Tambah {currentTemplate.name}</h1>
              <p className="models-subheading">
                Konfigurasi endpoint dan API key untuk provider {currentTemplate.name}
              </p>
            </div>
          ) : view === 'manage' ? (
            <div className="models-title-block">
              <button
                type="button"
                className="provider-breadcrumb-back"
                onClick={() => setView('catalog')}
                title="Kembali ke daftar provider"
              >
                <ArrowLeft size={13} />
                <span>Kembali ke Daftar Provider</span>
              </button>
              <h1 className="models-heading">Pengaturan {currentProvider?.name || 'Provider'}</h1>
              <p className="models-subheading">
                Kelola kredensial dan model aktif untuk koneksi ini
              </p>
            </div>
          ) : (
            <div className="models-title-block">
              <h1 className="models-heading">Kelola Provider AI</h1>
              <p className="models-subheading">
                Pilih atau tambahkan endpoint OpenAI-compatible (Ollama, LM Studio, Cloud LLM)
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="modal-header">
          {view === 'add' ? (
            <div className="provider-header-nav-block">
              <button
                type="button"
                className="provider-breadcrumb-back"
                onClick={() => setView('catalog')}
                title="Kembali ke daftar provider"
              >
                <ArrowLeft size={14} />
                <span>Kembali ke Daftar Provider</span>
              </button>
              <h2 className="modal-title">Tambah {currentTemplate.name}</h2>
            </div>
          ) : view === 'manage' ? (
            <div className="provider-header-nav-block">
              <button
                type="button"
                className="provider-breadcrumb-back"
                onClick={() => setView('catalog')}
                title="Kembali ke daftar provider"
              >
                <ArrowLeft size={14} />
                <span>Kembali ke Daftar Provider</span>
              </button>
              <h2 className="modal-title">Pengaturan Provider</h2>
            </div>
          ) : (
            <div className="provider-header-title-box">
              <h2 className="modal-title">Kelola Provider AI</h2>
              <p className="provider-modal-desc">
                Pilih atau tambahkan endpoint OpenAI-compatible (Ollama, LM Studio, Cloud LLM)
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
      )}

        {/* Modal / Page Body */}
        <div className={isPage ? "provider-page-view-body" : "modal-body provider-modal-body"}>
          {/* =========================================================================
              VIEW 1: CATALOG OF PROVIDERS & TEMPLATES
             ========================================================================= */}
          {view === 'catalog' && (
            <div className="provider-catalog-flow">
              {/* Section 1: Saved Providers */}
              {customProviders.length > 0 && (
                <div className="provider-catalog-section">
                  <div className="provider-section-label">
                    <span>Provider Tersimpan ({customProviders.length})</span>
                  </div>
                  <div className="provider-saved-list">
                    {customProviders.map((prov) => {
                      const tmpl = getTemplateById(prov.templateId);
                      const keyCount = prov.apiKeys?.length || (prov.apiKey ? 1 : 0);
                      const enabledModels = prov.models?.filter((m) => m.enabled)?.length || 0;

                      return (
                        <div key={prov.id} className="provider-saved-row">
                          <div className="provider-saved-main">
                            <div className="provider-saved-title-row">
                              <span className="provider-saved-name">{prov.name}</span>
                              <span className="provider-saved-cat">OpenAI Compatible</span>
                              {enabledModels > 0 && (
                                <span className="provider-saved-active-tag">
                                  {enabledModels} model aktif
                                </span>
                              )}
                            </div>
                            <div className="provider-saved-meta">
                              <code className="provider-code-chip">{keyCount} koneksi</code>
                              <span className="provider-url-truncate" title={prov.hideBaseUrl || prov.templateId === 'orion' ? 'Orion Official Gateway' : prov.baseUrl}>
                                {prov.hideBaseUrl || prov.templateId === 'orion' ? 'Orion Official Gateway' : prov.baseUrl}
                              </span>
                            </div>
                          </div>

                          <div className="provider-saved-actions">
                            <button
                              type="button"
                              className="provider-btn-select"
                              onClick={() => handleOpenManage(prov)}
                              title="Kelola API Key & Model Provider Ini"
                            >
                              Kelola
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
                      onClick={() => handleOpenAdd(tmpl)}
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
                          {tmpl.hideBaseUrl ? (
                            <span>Endpoint Resmi Terintegrasi (Otomatis)</span>
                          ) : (
                            <>Default: <code>{tmpl.defaultBaseUrl}</code></>
                          )}
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
          )}

          {/* =========================================================================
              VIEW 2: ADD PROVIDER BASE FORM
             ========================================================================= */}
          {view === 'add' && (
            <form
              onSubmit={handleSaveNewProvider}
              className="provider-config-form"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                  e.preventDefault();
                }
              }}
            >
              <div className="provider-config-banner">
                <div className="provider-config-icon">{getProviderIcon(currentTemplate.id)}</div>
                <div>
                  <span className="provider-config-title">{currentTemplate.name}</span>
                  <p className="provider-config-sub">
                    Tambahkan base URL provider. Setelah disimpan, Anda dapat mengelola API Key dan mengimpor model secara otomatis dari endpoint <code>/models</code>.
                  </p>
                </div>
              </div>

              {/* Nama Tampilan */}
              <div className="provider-form-row">
                <label className="provider-label" htmlFor="add-name-input">
                  Nama Provider
                </label>
                <input
                  id="add-name-input"
                  type="text"
                  className="provider-text-field"
                  placeholder="Contoh: Ollama Pi, Agnes AI Core, DeepSeek Local"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  required
                />
              </div>

              {/* Base URL (Hidden for official Orion provider) */}
              {!currentTemplate.hideBaseUrl && (
                <div className="provider-form-row">
                  <label className="provider-label" htmlFor="add-url-input">
                    Base URL (Endpoint API)
                  </label>
                  <input
                    id="add-url-input"
                    type="text"
                    className="provider-text-field provider-mono"
                    placeholder="http://100.104.200.89:11434/v1"
                    value={addBaseUrl}
                    onChange={(e) => setAddBaseUrl(e.target.value)}
                    required
                  />
                  <span className="provider-field-help">
                    Endpoint otomatis diarahkan ke <code>/chat/completions</code> untuk pesan dan <code>/models</code> untuk impor model.
                  </span>
                </div>
              )}

              {/* Optional Initial API Key */}
              <div className="provider-form-row">
                <label className="provider-label" htmlFor="add-key-input">
                  API Key Awal {currentTemplate.requiresApiKey ? '(Wajib)' : '(Opsional untuk Ollama)'}
                </label>
                <div className="provider-key-wrapper">
                  <input
                    id="add-key-input"
                    type={showAddApiKey ? 'text' : 'password'}
                    className="provider-text-field provider-mono"
                    placeholder={currentTemplate.placeholderKey}
                    value={addApiKey}
                    onChange={(e) => setAddApiKey(e.target.value)}
                  />
                  <button
                    type="button"
                    className="provider-eye-btn"
                    onClick={() => setShowAddApiKey(!showAddApiKey)}
                    title={showAddApiKey ? 'Sembunyikan' : 'Tampilkan'}
                    tabIndex={-1}
                  >
                    {showAddApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Test status banner */}
              {addTestResult && (
                <div className={`provider-banner ${addTestResult.success ? 'is-success' : 'is-error'}`}>
                  {addTestResult.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                  <span>{addTestResult.message}</span>
                </div>
              )}

              {/* Bottom Buttons */}
              <div className="provider-form-footer">
                <button
                  type="button"
                  className="provider-test-btn"
                  onClick={handleTestAddConnection}
                  disabled={isTestingAdd || !addBaseUrl.trim()}
                >
                  {isTestingAdd ? (
                    <>
                      <Loader2 size={13} className="provider-spinner" />
                      <span>Menguji via /models...</span>
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
                    onClick={() => setView('catalog')}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="provider-save-btn"
                    disabled={!addName.trim() || !addBaseUrl.trim()}
                  >
                    Simpan & Buka Pengaturan Provider
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* =========================================================================
              VIEW 3: MANAGE PROVIDER (CARDS LAYOUT MATCHING USER REFERENCE SCREENSHOTS)
             ========================================================================= */}
          {view === 'manage' && currentProvider && (
            <div className="provider-manage-flow">
              {/* Card 1: Header Provider Card */}
              <div className="provider-panel-card provider-header-card">
                <div className="provider-panel-header-left">
                  <div className="provider-icon-badge">
                    {getProviderIcon(currentProvider.templateId)}
                  </div>
                  <div>
                    <div className="provider-title-tag-row">
                      <h3 className="provider-manage-title">{currentProvider.name}</h3>
                      <span className="provider-badge-pill">OpenAI Compatible</span>
                    </div>
                    <span className="provider-manage-subinfo">
                      {(currentProvider.apiKeys?.length || (currentProvider.apiKey ? 1 : 0))} koneksi aktif • {currentProvider.models?.filter((m) => m.enabled)?.length || 0} model aktif
                    </span>
                  </div>
                </div>

                <div className="provider-panel-header-right">
                  <button
                    type="button"
                    className="provider-btn-outline"
                    onClick={() => setIsAddingApiKey(!isAddingApiKey)}
                  >
                    <Plus size={13} />
                    <span>Tambah API Key</span>
                  </button>
                  <button
                    type="button"
                    className="provider-btn-outline"
                    onClick={() => setIsEditingBaseDetails(!isEditingBaseDetails)}
                  >
                    <Edit3 size={13} />
                    <span>Ubah</span>
                  </button>
                  <button
                    type="button"
                    className="provider-btn-outline is-danger"
                    onClick={() => {
                      onDeleteProvider(currentProvider.id);
                      setView('catalog');
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>

              {/* Inline Edit Base URL Form if active */}
              {isEditingBaseDetails && (
                <div className="provider-panel-card provider-subcard">
                  <div className="provider-subcard-header">
                    <span className="provider-subcard-title">Edit Detail Endpoint</span>
                  </div>
                  <div className="provider-grid-2" style={{ marginTop: '0.5rem' }}>
                    <div className="provider-form-row">
                      <label className="provider-label">Nama Provider</label>
                      <input
                        type="text"
                        className="provider-text-field"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="provider-form-row">
                      <label className="provider-label">Base URL</label>
                      <input
                        type="text"
                        className="provider-text-field provider-mono"
                        value={editBaseUrl}
                        onChange={(e) => setEditBaseUrl(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.6rem' }}>
                    <button
                      type="button"
                      className="provider-cancel-btn"
                      onClick={() => setIsEditingBaseDetails(false)}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      className="provider-save-btn"
                      onClick={handleSaveBaseDetails}
                    >
                      Simpan Perubahan
                    </button>
                  </div>
                </div>
              )}

              {/* Card 2: Detail Endpoint Card */}
              <div className="provider-panel-card">
                <div className="provider-card-topbar">
                  <span className="provider-section-title">Detail Endpoint</span>
                  <span className="provider-topbar-right-label">Chat Endpoint</span>
                </div>
                <div className="provider-detail-content-row">
                  <div className="provider-detail-url-box">
                    <span className="provider-detail-label">Endpoint Chat:</span>
                    <span className="provider-detail-url">
                      {currentProvider.hideBaseUrl || currentProvider.templateId === 'orion'
                        ? 'Orion Official Gateway (Terintegrasi & Terlindungi)'
                        : cleanChatCompletionsUrl(currentProvider.baseUrl)}
                    </span>
                  </div>
                  {!(currentProvider.hideBaseUrl || currentProvider.templateId === 'orion') && (
                    <button
                      type="button"
                      className="provider-copy-btn"
                      onClick={() => handleCopyUrl(cleanChatCompletionsUrl(currentProvider.baseUrl))}
                    >
                      {copiedUrl ? (
                        <>
                          <Check size={13} />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Salin URL</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Card 3: Koneksi API Key */}
              <div className="provider-panel-card">
                <div className="provider-card-topbar">
                  <div className="provider-card-title-group">
                    <Key size={14} />
                    <span className="provider-section-title">Koneksi &amp; API Key</span>
                  </div>
                  <div className="provider-topbar-actions">
                    <span className="provider-round-robin-badge">
                      Round Robin Aktif <Check size={12} />
                    </span>
                    <button
                      type="button"
                      className="provider-btn-test-action"
                      onClick={handleTestProviderConnection}
                      disabled={isTestingConnection}
                    >
                      {isTestingConnection ? (
                        <>
                          <Loader2 size={12} className="provider-spinner" />
                          <span>Menguji...</span>
                        </>
                      ) : (
                        <span>Uji Koneksi</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Connection Test Result */}
                {connectionTestResult && (
                  <div
                    className={`provider-banner ${connectionTestResult.success ? 'is-success' : 'is-error'}`}
                    style={{ margin: '0.4rem 0 0.6rem' }}
                  >
                    {connectionTestResult.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span>{connectionTestResult.message}</span>
                  </div>
                )}

                {/* Add Key Form */}
                {isAddingApiKey && (
                  <div className="provider-add-key-box">
                    <div className="provider-grid-2">
                      <input
                        type="text"
                        className="provider-text-field"
                        placeholder="Label Key (misal: Key 1)"
                        value={newKeyLabel}
                        onChange={(e) => setNewKeyLabel(e.target.value)}
                      />
                      <input
                        type="password"
                        className="provider-text-field provider-mono"
                        placeholder="Masukkan API Key (sk-...)"
                        value={newKeyValue}
                        onChange={(e) => setNewKeyValue(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.4rem' }}>
                      <button
                        type="button"
                        className="provider-cancel-btn"
                        onClick={() => setIsAddingApiKey(false)}
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        className="provider-save-btn"
                        onClick={handleAddApiKey}
                        disabled={!newKeyValue.trim()}
                      >
                        Simpan Key
                      </button>
                    </div>
                  </div>
                )}

                {/* API Keys List */}
                <div className="provider-keys-stack">
                  {(currentProvider.apiKeys && currentProvider.apiKeys.length > 0) ? (
                    currentProvider.apiKeys.map((k, idx) => (
                      <div key={k.id || idx} className="provider-key-item-row">
                        <div className="provider-key-item-left">
                          <Key size={14} className="provider-key-icon" />
                          <span className="provider-key-title">
                            {k.name || `API Key ${idx + 1}`} (Koneksi #{idx + 1})
                          </span>
                          <span className="provider-key-masked">{maskApiKey(k.key)}</span>
                        </div>
                        <div className="provider-key-item-right">
                          <span className="provider-managed-tag">Aktif</span>
                          <button
                            type="button"
                            className="provider-btn-icon is-danger"
                            onClick={() => handleDeleteApiKey(k.id)}
                            title="Hapus Key"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : currentProvider.apiKey ? (
                    <div className="provider-key-item-row">
                      <div className="provider-key-item-left">
                        <Key size={14} className="provider-key-icon" />
                        <span className="provider-key-title">API Key Utama (Koneksi #1)</span>
                        <span className="provider-key-masked">{maskApiKey(currentProvider.apiKey)}</span>
                      </div>
                      <div className="provider-key-item-right">
                        <span className="provider-managed-tag">Aktif</span>
                      </div>
                    </div>
                  ) : (
                    <div className="provider-keys-empty">
                      <span>Belum ada API Key tersimpan (koneksi lokal atau offline tanpa autentikasi). Klik tombol <b>Tambah API Key</b> di atas bila provider memerlukan token.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 4: Model Tersedia */}
              <div className="provider-panel-card">
                <div className="provider-card-topbar">
                  <div className="provider-card-title-group">
                    <Bot size={14} />
                    <span className="provider-section-title">Daftar Model Tersedia</span>
                  </div>
                </div>
                <p className="provider-models-desc">
                  Pilih model yang ingin diaktifkan di obrolan. Impor otomatis dari server atau tambahkan ID model secara manual.
                </p>

                {/* Inputs Row */}
                <form onSubmit={handleAddManualModel} className="provider-models-add-bar">
                  <input
                    type="text"
                    className="provider-text-field provider-mono"
                    placeholder="Model ID (misal: gpt-4o, deepseek-v3, qwen2.5:3b)"
                    value={manualModelId}
                    onChange={(e) => setManualModelId(e.target.value)}
                    style={{ flex: 1.4 }}
                  />
                  <input
                    type="text"
                    className="provider-text-field"
                    placeholder="Nama Tampilan (Opsional)"
                    value={manualModelName}
                    onChange={(e) => setManualModelName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="submit"
                    className="provider-btn-add-action"
                    disabled={!manualModelId.trim()}
                  >
                    Tambah
                  </button>
                  <button
                    type="button"
                    className="provider-btn-import-action"
                    onClick={handleImportModelsFromEndpoint}
                    disabled={isImportingModels}
                  >
                    {isImportingModels ? (
                      <>
                        <Loader2 size={13} className="provider-spinner" />
                        <span>Mengimpor...</span>
                      </>
                    ) : (
                      <>
                        <Download size={13} />
                        <span>Impor dari /models</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Import Notice */}
                {importNotice && (
                  <div
                    className={`provider-banner ${importNotice.success ? 'is-success' : 'is-error'}`}
                    style={{ margin: '0.5rem 0' }}
                  >
                    {importNotice.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span>{importNotice.message}</span>
                  </div>
                )}

                {/* Models List */}
                <div className="provider-models-list-container">
                  {(!currentProvider.models || currentProvider.models.length === 0) ? (
                    /* Empty State */
                    <div className="provider-models-empty-state">
                      <div className="provider-empty-bot-icon">
                        <Bot size={28} />
                      </div>
                      <p className="provider-empty-main-text">
                        Belum ada model yang didaftarkan untuk provider ini.
                      </p>
                      <p className="provider-empty-sub-text">
                        Ketik ID model di atas lalu klik &quot;Tambah&quot;, atau klik &quot;Impor dari /models&quot; untuk deteksi model otomatis dari server.
                      </p>
                    </div>
                  ) : (
                    <div className="provider-models-stack">
                      {currentProvider.models.map((m) => {
                        const isTesting = Boolean(testingModelMap[m.id]);
                        const isVerified = m.tested && m.lastTestStatus === 'success';
                        const isFailed = m.tested && m.lastTestStatus === 'failed';

                        return (
                          <div
                            key={m.id}
                            className={`provider-model-row ${m.enabled ? 'is-enabled' : ''} ${isFailed ? 'is-test-failed' : ''}`}
                          >
                            <div className="provider-model-left">
                              {/* Checkbox with strict verification requirement */}
                              <label
                                className={`provider-custom-checkbox ${!isVerified ? 'is-locked' : ''}`}
                                title={
                                  !isVerified
                                    ? 'Uji model terlebih dahulu sebelum mencentang'
                                    : 'Centang untuk aktifkan di dropdown chat'
                                }
                              >
                                <input
                                  type="checkbox"
                                  checked={Boolean(m.enabled)}
                                  disabled={!isVerified || isTesting}
                                  onChange={() => handleToggleModelCheck(m)}
                                />
                                <span className="provider-checkbox-visual" />
                              </label>

                              <div className="provider-model-info-block">
                                <div className="provider-model-title-row">
                                  <span className="provider-model-name-text">
                                    {m.name || m.id}
                                  </span>
                                  <code className="provider-model-id-pill">{m.id}</code>
                                  {isReasoningSupported(m.id, m.name, m.supportsReasoning) && (
                                    <span
                                      className="provider-thinking-tag"
                                      title="Model ini mendukung penalaran (thinking / deep reasoning)"
                                    >
                                      Thinking
                                    </span>
                                  )}
                                  {isTesting ? (
                                    <Loader2 size={13} className="provider-spinner" title="Menguji respon..." />
                                  ) : isVerified ? (
                                    <Check size={16} className="provider-status-check-only" strokeWidth={2.8} title="Model terverifikasi &amp; siap dipakai" />
                                  ) : isFailed ? (
                                    <>
                                      <X size={16} className="provider-status-fail-only" strokeWidth={2.8} title={m.lastTestError || 'Uji koneksi gagal'} />
                                      {m.lastTestError && (
                                        <span className="provider-model-error-badge" title={m.lastTestError}>
                                          {m.lastTestError}
                                        </span>
                                      )}
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            <div className="provider-model-right-actions">
                              <button
                                type="button"
                                className="provider-btn-test-model"
                                onClick={() => handleTestSpecificModel(m)}
                                disabled={isTesting}
                                title="Uji ketersediaan model pada server AI"
                              >
                                {isTesting ? (
                                  <>
                                    <Loader2 size={12} className="provider-spinner" />
                                    <span>Menguji...</span>
                                  </>
                                ) : (
                                  <>
                                    <Zap size={12} />
                                    <span>Tes Model</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                className="provider-btn-icon is-danger"
                                onClick={() => handleDeleteModel(m.id)}
                                title="Hapus model dari daftar"
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
              </div>
            </div>
          )}
        </div>
      </div>
  );

  if (isPage) {
    return (
      <div className="models-view-wrapper providers-page-view animate-page-enter">
        <div className="models-view-inner providers-page-inner">
          {modalContent}
        </div>
      </div>
    );
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
      aria-modal="true"
      role="dialog"
    >
      {modalContent}
    </div>
  );
}
