import React, { useState, useMemo } from 'react';
import {
  RotateCw,
  Sparkles,
  Zap,
  Cpu,
  Layers,
  Bot,
  Settings,
  Check,
  CheckCircle2,
  X,
  Sliders,
  ArrowRight,
} from 'lucide-react';
import { REASONING_TIERS, isReasoningSupported } from '../utils/modelConfig';

function getModelIcon(model) {
  const id = (model.modelId || model.id || '').toLowerCase();
  const name = (model.name || '').toLowerCase();

  if (id.includes('orion') || name.includes('orion')) return <Sparkles size={17} />;
  if (id.includes('agnes') || name.includes('agnes') || id.includes('flash')) return <Zap size={17} />;
  if (id.includes('nemotron') || id.includes('gemma') || id.includes('llama')) return <Cpu size={17} />;
  if (id.includes('claude')) return <Layers size={17} />;
  return <Bot size={17} />;
}

function getModelDescription(model) {
  const id = (model.modelId || model.id || '').toLowerCase();
  const name = (model.name || '').toLowerCase();

  if (id === 'orion' || name.includes('orion engine')) {
    return 'Model flagship untuk analisis mendalam, reasoning cerdas, dan coding.';
  }
  if (id.includes('agnes') || name.includes('agnes')) {
    return 'Respon ultra cepat dan ekspresif untuk percakapan harian serta asisten.';
  }
  if (id.includes('nemotron')) {
    return 'Penalaran terstruktur dan instruksi kompleks bertenaga GPU cluster.';
  }
  if (id.includes('gemma')) {
    return 'Model ringan dan efisien dari keluarga Google open weights.';
  }
  return `Model AI terintegrasi dari ${model.providerName || 'Provider Aktif'}.`;
}

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
  const [timeFilter, setTimeFilter] = useState('30D');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMoaModalOpen, setIsMoaModalOpen] = useState(false);

  // Filter sessions based on time window
  const filteredSessions = useMemo(() => {
    const now = Date.now();
    const days = timeFilter === '7D' ? 7 : timeFilter === '30D' ? 30 : 90;
    const cutoff = now - days * 24 * 60 * 60 * 1000;

    return (sessions || []).filter((s) => {
      const sTime = s.updatedAt || s.createdAt ? new Date(s.updatedAt || s.createdAt).getTime() : now;
      return sTime >= cutoff;
    });
  }, [sessions, timeFilter]);

  // Clean, strictly unique models list (consistent with ModelSelector & Provider page)
  const modelsList = useMemo(() => {
    const list = [];
    const seenModelKeys = new Set();

    // Check if official provider exists in customProviders
    const hasOfficial = (customProviders || []).some(
      (p) => p && (p.templateId === 'orion' || p.id === 'orion' || p.name?.toLowerCase().includes('official'))
    );

    // 1. Fallback official defaults if not present
    if (!customProviders || customProviders.length === 0 || !hasOfficial) {
      const defaultOfficial = [
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
          isOfficial: true,
        },
        {
          id: 'orion::nemotron-3',
          modelId: 'nvidia/nemotron-3-ultra-550b-a55b:free',
          name: 'NEMOTRON-3',
          displayName: 'Nemotron-3 Super',
          providerName: 'Orion AI (Official)',
          providerId: 'orion',
          badge: 'Official',
          endpoint: 'pi.leopard-gila.ts.net',
          supportsReasoning: true,
          isOfficial: true,
        },
      ];

      defaultOfficial.forEach((m) => {
        seenModelKeys.add(m.modelId.toLowerCase());
        list.push(m);
      });
    }

    // 2. Extract enabled models from all configured providers
    (customProviders || []).forEach((prov) => {
      if (!prov) return;
      const enabledModels = (prov.models || []).filter((m) => Boolean(m && m.enabled));
      if (enabledModels.length === 0) return;

      const rawName = prov.displayName || prov.name || 'Provider';
      const isOfficial =
        prov.templateId === 'orion' || prov.id === 'orion' || rawName.toLowerCase().includes('official');
      const groupName = isOfficial ? 'Orion AI (Official)' : rawName;

      // Clean badge
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

        if (cleanModId === 'orion-auto' || cleanModId === 'orion auto router') return;

        const dedupKey = `${prov.id}::${cleanModId}`;
        if (seenModelKeys.has(dedupKey) || seenModelKeys.has(cleanModId)) return;
        seenModelKeys.add(dedupKey);
        seenModelKeys.add(cleanModId);

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
          supportsReasoning: isReasoningSupported(modId, modName, m.supportsReasoning),
          isOfficial,
        });
      });
    });

    return list;
  }, [customProviders]);

  // Session count per model
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

  // Current active main model
  const currentMainModel = useMemo(() => {
    const found = modelsList.find((m) => m.id === selectedModel || m.modelId === selectedModel);
    if (found) return found;

    return modelsList[0] || {
      id: 'orion::orion',
      modelId: 'orion',
      displayName: 'Orion Engine',
      endpoint: 'pi.leopard-gila.ts.net',
      badge: 'Official',
    };
  }, [modelsList, selectedModel]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const handleSetMainModel = (modelId) => {
    onSelectModel?.(modelId);
  };

  const handleStartSession = (modelId) => {
    onSelectModel?.(modelId);
    if (onNavigate) onNavigate('chat');
  };

  return (
    <div className="page-view-container models-page-view animate-page-enter">
      <div className="provider-page-content is-page-mode">
        {/* ================= HEADER BAR ================= */}
        <div className="page-view-header modal-header">
          <div className="provider-header-title-box">
            <h2 className="page-view-title">Models</h2>
            <p className="page-view-subtitle">
              Pilih model AI aktif untuk interaksi obrolan serta atur tingkat reasoning
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
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
              className={`provider-btn-icon ${isRefreshing ? 'is-spinning' : ''}`}
              onClick={handleRefresh}
              title="Perbarui status model"
              aria-label="Refresh"
            >
              <RotateCw size={13} />
            </button>
          </div>
        </div>

        {/* ================= SECTION 1: MODEL UTAMA AKTIF (Heroic & Simple) ================= */}
        <div className="provider-catalog-section">
          <div className="provider-section-label">
            <span>Model Utama Aktif</span>
          </div>

          <div className="provider-saved-row" style={{ padding: '0.95rem 1.15rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.95rem', minWidth: 0 }}>
              <div
                className="provider-card-left-icon"
                style={{
                  color: '#3b82f6',
                  background: 'rgba(59, 130, 246, 0.08)',
                  borderColor: 'rgba(59, 130, 246, 0.25)',
                }}
              >
                {getModelIcon(currentMainModel)}
              </div>

              <div className="provider-saved-main">
                <div className="provider-saved-title-row">
                  <span className="provider-saved-name" style={{ fontSize: '0.96rem' }}>
                    {currentMainModel.displayName || currentMainModel.name}
                  </span>
                  <span className="provider-saved-active-tag">Sedang Digunakan</span>
                  <span className="provider-card-pill">{currentMainModel.badge}</span>
                </div>
                <div className="provider-saved-meta">
                  <code className="provider-code-chip">{currentMainModel.endpoint}</code>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Reasoning: <strong>{reasoningTier.toUpperCase()}</strong> ·{' '}
                    {modelStats[currentMainModel.id] || 0} sesi aktif
                  </span>
                </div>
              </div>
            </div>

            <div className="provider-saved-actions" style={{ gap: '0.5rem' }}>
              <button
                type="button"
                className="provider-btn-select"
                onClick={() => setIsMoaModalOpen(true)}
                title="Atur reasoning tier & konfigurasi"
              >
                Konfigurasi
              </button>
            </div>
          </div>
        </div>

        {/* ================= SECTION 2: DAFTAR SEMUA MODEL TERSEDIA ================= */}
        <div className="provider-catalog-section" style={{ marginTop: '0.5rem' }}>
          <div
            className="provider-section-label"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span>Daftar Model Tersedia ({modelsList.length})</span>
            <span style={{ textTransform: 'none', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
              Klik kartu untuk memilih model
            </span>
          </div>

          <div className="provider-cards-stack">
            {modelsList.map((model) => {
              const isCurrentMain =
                selectedModel === model.id ||
                selectedModel === model.modelId ||
                (selectedModel.includes('::') && selectedModel.split('::')[1] === model.modelId);

              const sessionCount = modelStats[model.id] || 0;

              return (
                <div
                  key={model.id}
                  className="provider-template-card"
                  style={{
                    borderColor: isCurrentMain ? 'rgba(59, 130, 246, 0.65)' : undefined,
                    background: isCurrentMain ? 'rgba(59, 130, 246, 0.04)' : undefined,
                    boxShadow: isCurrentMain ? '0 4px 16px rgba(59, 130, 246, 0.08)' : undefined,
                  }}
                  onClick={() => handleSetMainModel(model.id)}
                >
                  <div
                    className="provider-card-left-icon"
                    style={{
                      color: isCurrentMain ? '#3b82f6' : undefined,
                      borderColor: isCurrentMain ? 'rgba(59, 130, 246, 0.35)' : undefined,
                      background: isCurrentMain ? 'rgba(59, 130, 246, 0.1)' : undefined,
                    }}
                  >
                    {getModelIcon(model)}
                  </div>

                  <div className="provider-card-center-text">
                    <div className="provider-card-name-row">
                      <span className="provider-card-title">{model.displayName || model.name}</span>
                      <span className="provider-card-pill">{model.badge}</span>
                      {isCurrentMain && (
                        <span className="provider-saved-active-tag" style={{ marginLeft: 'auto' }}>
                          ✓ Aktif
                        </span>
                      )}
                    </div>

                    <p className="provider-card-desc">{getModelDescription(model)}</p>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '0.25rem',
                      }}
                    >
                      <span className="provider-card-url-hint">
                        Endpoint: <code>{model.endpoint}</code>
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {sessionCount} sesi
                        </span>
                        {!isCurrentMain && (
                          <button
                            type="button"
                            className="provider-btn-select"
                            style={{ padding: '0.2rem 0.65rem', fontSize: '0.72rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartSession(model.id);
                            }}
                          >
                            Chat <ArrowRight size={11} style={{ marginLeft: '2px' }} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= MODAL: REASONING & KONFIGURASI ================= */}
      {isMoaModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsMoaModalOpen(false)}>
          <div
            className="modal-dialog modal-content"
            style={{ maxWidth: '520px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={16} style={{ color: 'var(--text-primary)' }} />
                <h3 className="modal-title">Konfigurasi Reasoning Model</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsMoaModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Pilih tingkat kedalaman proses berpikir (reasoning / thinking) untuk model AI yang mendukung.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                {REASONING_TIERS.map((tier) => {
                  const isSelected = reasoningTier === tier.id;
                  return (
                    <div
                      key={tier.id}
                      className="provider-saved-row"
                      style={{
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '0.85rem',
                        cursor: 'pointer',
                        borderColor: isSelected ? '#3b82f6' : undefined,
                        background: isSelected ? 'rgba(59, 130, 246, 0.05)' : undefined,
                      }}
                      onClick={() => onSelectReasoningTier?.(tier.id)}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          marginBottom: '0.25rem',
                        }}
                      >
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {tier.name}
                        </span>
                        {isSelected && <Check size={14} style={{ color: '#3b82f6' }} />}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{tier.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className="modal-footer"
              style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.85rem 1.25rem' }}
            >
              <button
                type="button"
                className="btn-primary-action"
                style={{ padding: '0.45rem 1.15rem', borderRadius: '8px', fontSize: '0.8rem' }}
                onClick={() => setIsMoaModalOpen(false)}
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
