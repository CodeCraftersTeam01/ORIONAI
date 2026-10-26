import React, { useState, useMemo, useEffect } from 'react';
import {
  RotateCw,
  Star,
  Settings,
  ChevronDown,
  Check,
  Sparkles,
  Layers,
  ArrowRight,
  Sliders,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react';
import { REASONING_TIERS, isReasoningSupported } from '../utils/modelConfig';

export default function ModelsView({
  onClose,
  selectedModel = 'orion::orion',
  onSelectModel,
  reasoningTier = 'medium',
  onSelectReasoningTier,
  customProviders = [],
  sessions = [],
  onNavigate,
  onOpenProviders,
}) {
  const [timeFilter, setTimeFilter] = useState('30D'); // '7D' | '30D' | '90D'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeDropdownModelId, setActiveDropdownModelId] = useState(null);
  const [isAuxModalOpen, setIsAuxModalOpen] = useState(false);
  const [isMoaModalOpen, setIsMoaModalOpen] = useState(false);
  const [isChangeModelModalOpen, setIsChangeModelModalOpen] = useState(false);

  // Auxiliary tasks configuration state
  const [auxTasks, setAuxTasks] = useState([
    { id: 'compression', name: 'Context Compression', desc: 'Auto prune token window', enabled: true },
    { id: 'vision', name: 'Vision & Multimodal', desc: 'Process images & diagram queries', enabled: true },
    { id: 'web_extract', name: 'Web Extractor', desc: 'Realtime page scraping & parsing', enabled: true },
    { id: 'tts_speech', name: 'TTS & Voice Synthesis', desc: 'Multilingual Edge & HF speech', enabled: true },
    { id: 'code_runner', name: 'Code Sandbox & Exec', desc: 'Terminal command inspection', enabled: true },
    { id: 'memory', name: 'Long-term Memory', desc: 'Adaptive session recall', enabled: true },
  ]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.model-action-menu-wrap')) {
        setActiveDropdownModelId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Filter sessions based on time window
  const filteredSessions = useMemo(() => {
    const now = Date.now();
    const days = timeFilter === '7D' ? 7 : timeFilter === '30D' ? 30 : 90;
    const cutoff = now - days * 24 * 60 * 60 * 1000;

    return sessions.filter((s) => {
      const sTime = s.updatedAt || s.createdAt ? new Date(s.updatedAt || s.createdAt).getTime() : now;
      return sTime >= cutoff;
    });
  }, [sessions, timeFilter]);

  // Clean, deduplicated models extraction consistent with ModelSelector
  const modelsList = useMemo(() => {
    const list = [];
    const seenModelKeys = new Set();

    // Check if customProviders contains an official provider with models
    const hasOfficialProvider = (customProviders || []).some(
      (p) => p && (p.templateId === 'orion' || p.id === 'orion' || p.name?.toLowerCase().includes('official'))
    );

    // 1. If no providers or no official provider configured, supply standard official fallback models
    if (!customProviders || customProviders.length === 0 || !hasOfficialProvider) {
      const defaultOfficialModels = [
        {
          id: 'orion::orion',
          modelId: 'orion',
          name: 'ORION',
          displayName: 'Orion Engine',
          providerName: 'Orion AI (Official)',
          providerId: 'orion',
          badge: 'Official',
          endpoint: 'pi.leopard-gila.ts.net',
          supportsReasoning: true,
          baseDaysAgo: 2,
          isOfficial: true,
        },
        {
          id: 'orion::agnes-2.5-flash',
          modelId: 'agnes-2.5-flash',
          name: 'AGNES-2.5-FLASH',
          displayName: 'Agnes 2.5 Flash',
          providerName: 'Orion AI (Official)',
          providerId: 'orion',
          badge: 'Official',
          endpoint: 'pi.leopard-gila.ts.net',
          supportsReasoning: false,
          baseDaysAgo: 9,
          isOfficial: true,
        },
        {
          id: 'orion::nemotron-3',
          modelId: 'nvidia/nemotron-3-ultra-550b-a55b:free',
          name: 'NEMOTRON-3-SUPER',
          displayName: 'Nemotron-3 Super 120B',
          providerName: 'Orion AI (Official)',
          providerId: 'orion',
          badge: 'Official',
          endpoint: 'pi.leopard-gila.ts.net',
          supportsReasoning: true,
          baseDaysAgo: 13,
          isOfficial: true,
        },
      ];
      defaultOfficialModels.forEach((m) => {
        seenModelKeys.add(m.modelId.toLowerCase());
        list.push(m);
      });
    }

    // 2. Iterate custom providers and include their enabled models
    (customProviders || []).forEach((prov) => {
      if (!prov) return;
      const enabledModels = (prov.models || []).filter((m) => Boolean(m && m.enabled));
      if (enabledModels.length === 0) return;

      const rawName = prov.displayName || prov.name || 'Provider';
      const isOfficial =
        prov.templateId === 'orion' || prov.id === 'orion' || rawName.toLowerCase().includes('official');
      const groupName = isOfficial ? 'Orion AI (Official)' : rawName;

      // Format clean badge (strip https://, ports or protocol details)
      let cleanBadge = isOfficial ? 'Official' : 'Custom';
      if (!isOfficial && prov.baseUrl) {
        try {
          const url = new URL(prov.baseUrl);
          cleanBadge = url.host || prov.templateId || 'Custom';
        } catch {
          cleanBadge = prov.templateId || 'Custom';
        }
      }

      enabledModels.forEach((m) => {
        const modId = typeof m === 'string' ? m : m.id;
        const modName = typeof m === 'string' ? m : m.displayName || m.name || modId;
        const cleanModId = (modId || '').toLowerCase().trim();

        // Skip legacy router duplicates
        if (cleanModId === 'orion-auto' || cleanModId === 'orion auto router') return;

        // Deduplicate across list
        const dedupKey = `${prov.id}::${cleanModId}`;
        if (seenModelKeys.has(dedupKey) || seenModelKeys.has(cleanModId)) return;
        seenModelKeys.add(dedupKey);
        seenModelKeys.add(cleanModId);

        const supportsReasoning = isReasoningSupported(modId, modName, m.supportsReasoning);

        let endpointClean = 'pi.leopard-gila.ts.net';
        if (!isOfficial && prov.baseUrl) {
          try {
            endpointClean = prov.baseUrl.replace(/^https?:\/\//i, '').split('/')[0];
          } catch {
            endpointClean = 'custom';
          }
        }

        list.push({
          id: `${prov.id}::${modId}`,
          modelId: modId,
          name: modName.toUpperCase().replace(/\s+/g, '-'),
          displayName: modName,
          providerName: groupName,
          providerId: prov.id,
          badge: cleanBadge,
          endpoint: endpointClean,
          supportsReasoning,
          baseDaysAgo: Math.min(25, 2 + list.length * 3),
          isOfficial,
        });
      });
    });

    return list;
  }, [customProviders]);

  // Calculate session count per model
  const modelStats = useMemo(() => {
    const counts = {};
    modelsList.forEach((m) => {
      const matchCount = filteredSessions.filter((s) => {
        if (s.model === m.id || s.model === m.modelId) return true;
        return (s.messages || []).some(
          (msg) => msg.model === m.id || msg.model === m.modelId
        );
      }).length;
      counts[m.id] = matchCount;
    });
    return counts;
  }, [modelsList, filteredSessions]);

  // Find currently active main model metadata
  const currentMainModel = useMemo(() => {
    const found = modelsList.find((m) => m.id === selectedModel || m.modelId === selectedModel);
    if (found) return found;

    return modelsList[0] || {
      id: 'orion::orion',
      modelId: 'orion',
      displayName: 'Orion',
      endpoint: 'pi.leopard-gila.ts.net',
      badge: 'Official',
    };
  }, [modelsList, selectedModel]);

  // Trigger manual refresh with visual spin
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleSetMainModel = (modelId) => {
    onSelectModel?.(modelId);
    setActiveDropdownModelId(null);
    setIsChangeModelModalOpen(false);
  };

  const handleStartSessionWithModel = (modelId) => {
    onSelectModel?.(modelId);
    setActiveDropdownModelId(null);
    if (onNavigate) {
      onNavigate('chat');
    }
  };

  // Metrics
  const modelsWithActivity = modelsList.filter((m) => (modelStats[m.id] || 0) > 0).length;
  const modelsUsedDisplay = Math.max(1, modelsWithActivity);
  const totalSessionsDisplay = Math.max(filteredSessions.length, 1);

  return (
    <div className="page-view-container models-page-view animate-page-enter">
      <div className="models-page-content is-page-mode">
        {/* ================= HEADER BAR ================= */}
        <div className="page-view-header models-header-bar">
          <div className="provider-header-title-box">
            <h2 className="page-view-title">Models</h2>
            <p className="page-view-subtitle">
              Katalog dan konfigurasi model AI untuk sesi obrolan serta pemrosesan cerdas
            </p>
          </div>

          <div className="models-header-controls">
            <div className="models-time-filters">
              {['7D', '30D', '90D'].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`models-time-btn ${timeFilter === filter ? 'active' : ''}`}
                  onClick={() => setTimeFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button
              type="button"
              className={`models-btn-refresh ${isRefreshing ? 'is-spinning' : ''}`}
              onClick={handleRefresh}
              title="Perbarui status model"
              aria-label="Refresh"
            >
              <RotateCw size={15} />
            </button>
          </div>
        </div>

        {/* ================= TOP TWO CARDS ================= */}
        <div className="models-top-cards-row">
          {/* Left Card: MODEL SETTINGS */}
          <div className="models-card models-settings-card">
            <div className="models-card-header">
              <div className="models-card-header-left">
                <Sliders size={14} className="models-header-icon-symbol" />
                <span className="models-card-title">MODEL SETTINGS</span>
              </div>
              <span className="models-card-subtitle-badge">applies to new sessions</span>
            </div>

            <div className="models-settings-list">
              {/* 1. Main Model */}
              <div className="models-setting-item">
                <div className="models-setting-info">
                  <div className="models-setting-label-row">
                    <Star size={13} className="models-star-icon" />
                    <span className="models-setting-label">MAIN MODEL</span>
                  </div>
                  <div className="models-setting-value" title={currentMainModel.id}>
                    <span className="models-val-badge">{currentMainModel.badge}</span>
                    <span className="models-val-sep">·</span>
                    <span className="models-val-name">{currentMainModel.displayName || currentMainModel.modelId}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="models-btn-action-primary"
                  onClick={() => setIsChangeModelModalOpen(true)}
                >
                  CHANGE
                </button>
              </div>

              {/* 2. Auxiliary Tasks */}
              <div className="models-setting-item">
                <div className="models-setting-info">
                  <div className="models-setting-label-row">
                    <Settings size={13} className="models-cog-icon" />
                    <span className="models-setting-label">AUXILIARY TASKS</span>
                  </div>
                  <div className="models-setting-value">
                    <span className="models-task-count">
                      {auxTasks.filter((t) => t.enabled).length * 2} tasks
                    </span>
                    <span className="models-val-sep">·</span>
                    <span className="models-task-mode">all auto</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="models-btn-action-outline"
                  onClick={() => setIsAuxModalOpen(true)}
                >
                  CONFIGURE
                </button>
              </div>

              {/* 3. Mixture of Agents / Reasoning */}
              <div className="models-setting-item">
                <div className="models-setting-info">
                  <div className="models-setting-label-row">
                    <Layers size={13} className="models-moa-icon" />
                    <span className="models-setting-label">MIXTURE OF AGENTS</span>
                  </div>
                  <div className="models-setting-value">
                    <span className="models-task-count">2 references</span>
                    <span className="models-val-sep">·</span>
                    <span className="models-task-mode">
                      {reasoningTier === 'high'
                        ? 'Deep Reasoning (High)'
                        : reasoningTier === 'low'
                        ? 'Fast Efficient (Low)'
                        : 'Balanced Depth (Medium)'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="models-btn-action-outline"
                  onClick={() => setIsMoaModalOpen(true)}
                >
                  CONFIGURE
                </button>
              </div>
            </div>
          </div>

          {/* Right Card: METRICS & SESSIONS */}
          <div className="models-card models-analytics-card">
            <div className="models-metric-row">
              <span className="models-metric-num">{modelsUsedDisplay}</span>
              <span className="models-dotted-leader" />
              <span className="models-metric-label">MODELS USED</span>
            </div>

            <div className="models-metric-row">
              <span className="models-metric-num">{totalSessionsDisplay}</span>
              <span className="models-dotted-leader" />
              <span className="models-metric-label">TOTAL SESSIONS</span>
            </div>

            <div className="models-analytics-disclaimer">
              Token & cost analytics are hidden because the local counts exclude auxiliary calls
              (compression, vision, web extract, ...) and provider retries, so they diverge from
              your provider bill. Enable dashboard.show_token_analytics in Config to show the local
              debug estimate anyway.
            </div>
          </div>
        </div>

        {/* ================= SECTION LABEL ================= */}
        <div className="provider-section-label" style={{ marginTop: '0.75rem', marginBottom: '0.25rem' }}>
          <span>Daftar Model Tersedia ({modelsList.length})</span>
        </div>

        {/* ================= BOTTOM MODELS GRID ================= */}
        <div className="models-grid">
          {modelsList.map((model, index) => {
            const isCurrentMain =
              selectedModel === model.id ||
              selectedModel === model.modelId ||
              (selectedModel.includes('::') && selectedModel.split('::')[1] === model.modelId);

            const sessionCount = modelStats[model.id] || 0;
            const isDropdownOpen = activeDropdownModelId === model.id;

            return (
              <div
                key={model.id}
                className={`models-card-item ${isCurrentMain ? 'is-active-main' : ''}`}
              >
                {/* Card Top: Number, Model Name & Session Count */}
                <div className="models-card-top">
                  <div className="models-title-wrap">
                    <span className="models-card-index">#{index + 1}</span>
                    <h3 className="models-card-name" title={model.displayName || model.name}>
                      {model.name}
                    </h3>
                  </div>

                  <div className="models-session-stat">
                    <span className="models-session-count-number">{sessionCount}</span>
                    <span className="models-session-count-label">sessions</span>
                  </div>
                </div>

                {/* Card Middle: Badge & Action Dropdown */}
                <div className="models-card-mid">
                  <div className="models-badge-wrap">
                    <span className="models-badge-pill">{model.badge}</span>
                  </div>

                  <div className="model-action-menu-wrap">
                    <button
                      type="button"
                      className={`models-btn-use-as ${isDropdownOpen ? 'menu-open' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdownModelId(isDropdownOpen ? null : model.id);
                      }}
                    >
                      <span>USE AS</span>
                      <ChevronDown size={13} className="models-chevron" />
                    </button>

                    {isDropdownOpen && (
                      <div className="models-dropdown-menu">
                        <button
                          type="button"
                          className="models-dropdown-item"
                          onClick={() => handleSetMainModel(model.id)}
                        >
                          <div className="dropdown-item-left">
                            <Star size={13} className="dropdown-icon" />
                            <span>Set as Main Model</span>
                          </div>
                          {isCurrentMain && <Check size={14} className="dropdown-check-icon" />}
                        </button>

                        <button
                          type="button"
                          className="models-dropdown-item"
                          onClick={() => handleStartSessionWithModel(model.id)}
                        >
                          <div className="dropdown-item-left">
                            <ArrowRight size={13} className="dropdown-icon" />
                            <span>Start New Chat</span>
                          </div>
                        </button>

                        {onOpenProviders && (
                          <button
                            type="button"
                            className="models-dropdown-item"
                            onClick={() => {
                              setActiveDropdownModelId(null);
                              onOpenProviders();
                            }}
                          >
                            <div className="dropdown-item-left">
                              <Settings size={13} className="dropdown-icon" />
                              <span>Manage Provider</span>
                            </div>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Relative Timestamp */}
                <div className="models-card-bottom">
                  <span className="models-time-ago-text">
                    {isCurrentMain ? 'Active now' : `${model.baseDaysAgo}d ago`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= MODAL: CHANGE MAIN MODEL ================= */}
      {isChangeModelModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsChangeModelModalOpen(false)}
        >
          <div
            className="modal-dialog modal-content"
            style={{ maxWidth: '520px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Star size={16} style={{ color: 'var(--text-primary)' }} />
                <h3 className="modal-title">Pilih Model Utama</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsChangeModelModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Model utama akan digunakan secara otomatis saat Anda memulai obrolan baru.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '55vh', overflowY: 'auto' }}>
                {modelsList.map((m) => {
                  const isSelected = selectedModel === m.id || selectedModel === m.modelId;
                  return (
                    <div
                      key={m.id}
                      className={`provider-saved-row ${isSelected ? 'active-model-row' : ''}`}
                      style={{ cursor: 'pointer', padding: '0.75rem 1rem' }}
                      onClick={() => handleSetMainModel(m.id)}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {m.displayName || m.name}
                          </span>
                          <span className="provider-card-pill">{m.badge}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {m.providerName} · {m.endpoint}
                        </span>
                      </div>
                      {isSelected ? (
                        <CheckCircle2 size={18} style={{ color: '#3b82f6' }} />
                      ) : (
                        <button type="button" className="provider-action-btn" style={{ fontSize: '0.75rem' }}>
                          Pilih
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: AUXILIARY TASKS ================= */}
      {isAuxModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsAuxModalOpen(false)}
        >
          <div
            className="modal-dialog modal-content"
            style={{ maxWidth: '520px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={16} style={{ color: 'var(--text-primary)' }} />
                <h3 className="modal-title">Konfigurasi Auxiliary Tasks</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsAuxModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Tugas latar belakang untuk ekstraksi web, kompresi konteks, dan sintesis suara bekerja otomatis.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {auxTasks.map((task) => (
                  <div key={task.id} className="provider-saved-row" style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {task.name}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {task.desc}
                      </span>
                    </div>
                    <label className="hermes-toggle-switch">
                      <input
                        type="checkbox"
                        checked={task.enabled}
                        onChange={() => {
                          setAuxTasks((prev) =>
                            prev.map((t) => (t.id === task.id ? { ...t, enabled: !t.enabled } : t))
                          );
                        }}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.85rem 1.25rem' }}>
              <button
                type="button"
                className="btn-primary-action"
                style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', fontSize: '0.8rem' }}
                onClick={() => setIsAuxModalOpen(false)}
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: MIXTURE OF AGENTS & REASONING ================= */}
      {isMoaModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsMoaModalOpen(false)}
        >
          <div
            className="modal-dialog modal-content"
            style={{ maxWidth: '520px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={16} style={{ color: 'var(--text-primary)' }} />
                <h3 className="modal-title">Mixture of Agents & Reasoning</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsMoaModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Tingkat kedalaman reasoning untuk model yang mendukung proses berpikir.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                {REASONING_TIERS.map((tier) => {
                  const isSelected = reasoningTier === tier.id;
                  return (
                    <div
                      key={tier.id}
                      className={`provider-saved-row ${isSelected ? 'active-model-row' : ''}`}
                      style={{
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '0.75rem',
                        cursor: 'pointer',
                        borderColor: isSelected ? '#3b82f6' : undefined,
                        background: isSelected ? 'rgba(59, 130, 246, 0.05)' : undefined,
                      }}
                      onClick={() => onSelectReasoningTier?.(tier.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {tier.name}
                        </span>
                        {isSelected && <Check size={14} style={{ color: '#3b82f6' }} />}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {tier.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.85rem 1.25rem' }}>
              <button
                type="button"
                className="btn-primary-action"
                style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', fontSize: '0.8rem' }}
                onClick={() => setIsMoaModalOpen(false)}
              >
                Simpan Konfigurasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
