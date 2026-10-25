import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Check, SlidersHorizontal } from 'lucide-react';
import {
  REASONING_TIERS,
  getModelById,
  getReasoningTierById,
  isReasoningSupported,
} from '../utils/modelConfig';

export default function ModelSelector({
  selectedModel = null,
  reasoningTier = 'medium',
  customProviders = [],
  onSelectModel,
  onSelectReasoningTier,
  onOpenManageProviders,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReasoningFlyoutOpen, setIsReasoningFlyoutOpen] = useState(false);
  const containerRef = useRef(null);
  const flyoutTimeoutRef = useRef(null);

  // 1. Extract ONLY scanned & checked (enabled) models across all providers, deduplicating duplicate groups/models
  const providerGroups = useMemo(() => {
    const groupsMap = new Map();
    const seenModelKeys = new Set();

    (customProviders || []).forEach((prov) => {
      const enabledModels = (prov.models || []).filter((m) => Boolean(m && m.enabled));
      if (enabledModels.length === 0) return;

      const rawName = prov.displayName || prov.name || 'Provider';
      const isOfficial = prov.templateId === 'orion' || prov.id === 'orion' || rawName.toLowerCase().includes('official');
      const groupKey = isOfficial ? 'Orion AI (Official)' : rawName;

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          providerId: prov.id,
          providerName: groupKey,
          items: [],
        });
      }

      const currentGroup = groupsMap.get(groupKey);

      enabledModels.forEach((m) => {
        const modId = typeof m === 'string' ? m : m.id;
        const modName = typeof m === 'string' ? m : m.displayName || m.name || modId;
        const cleanModId = (modId || '').toLowerCase().trim();

        // Discard legacy duplicate or hardcoded orion-auto
        if (cleanModId === 'orion-auto' || cleanModId === 'orion auto router') {
          return;
        }

        // Prevent duplicate model entries within the same provider group (e.g. "orion" vs "Orion")
        const dedupKey = `${groupKey}::${cleanModId}`;
        if (seenModelKeys.has(dedupKey)) return;
        seenModelKeys.add(dedupKey);

        const supportsReasoning = isReasoningSupported(modId, modName, m.supportsReasoning);

        currentGroup.items.push({
          id: `${prov.id}::${modId}`,
          name: modName,
          displayName: modName,
          subtitle: groupKey,
          providerName: groupKey,
          providerId: prov.id,
          modelId: modId,
          supportsReasoning,
          hasModel: true,
        });
      });
    });

    return Array.from(groupsMap.values()).filter((g) => g.items.length > 0);
  }, [customProviders]);

  // 2. Flattened list of strictly active models
  const allModels = useMemo(() => {
    return providerGroups.flatMap((g) => g.items);
  }, [providerGroups]);

  // 3. Resolve currently active model
  const currentModel = useMemo(() => {
    if (allModels.length === 0) return null;

    if (selectedModel) {
      // Direct ID match (e.g. 'custom-123::orion')
      const exact = allModels.find((m) => m.id === selectedModel);
      if (exact) return exact;

      // Model ID match (e.g. 'orion' or 'orion::orion' maps to active provider's 'orion')
      const targetModId = selectedModel.includes('::') ? selectedModel.split('::')[1] : selectedModel;
      const modMatch = allModels.find((m) => m.modelId === targetModId);
      if (modMatch) return modMatch;
    }

    // Default to the first enabled model
    return allModels[0];
  }, [allModels, selectedModel]);

  const currentTier = getReasoningTierById(reasoningTier);
  const canUseReasoning = Boolean(currentModel && currentModel.supportsReasoning);

  // Auto-sync selected model if previous model is no longer enabled
  useEffect(() => {
    if (allModels.length > 0) {
      const hasActive = allModels.some((m) => m.id === selectedModel);
      if (!hasActive && typeof onSelectModel === 'function') {
        const fallback = currentModel || allModels[0];
        if (fallback) {
          onSelectModel(fallback.id);
        }
      }
    }
  }, [allModels, selectedModel, currentModel, onSelectModel]);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsReasoningFlyoutOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleModelClick = (modelId) => {
    if (typeof onSelectModel === 'function') {
      onSelectModel(modelId);
    }
    const targetModel = allModels.find((m) => m.id === modelId) || getModelById(modelId, customProviders);
    if (!targetModel || !targetModel.supportsReasoning) {
      setIsReasoningFlyoutOpen(false);
      setIsOpen(false);
    }
  };

  const handleReasoningSelect = (tierId) => {
    if (typeof onSelectReasoningTier === 'function') {
      onSelectReasoningTier(tierId);
    }
    setIsReasoningFlyoutOpen(false);
    setIsOpen(false);
  };

  const handleFlyoutMouseEnter = () => {
    if (!canUseReasoning) return;
    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current);
    setIsReasoningFlyoutOpen(true);
  };

  const handleFlyoutMouseLeave = () => {
    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current);
    flyoutTimeoutRef.current = setTimeout(() => {
      setIsReasoningFlyoutOpen(false);
    }, 220);
  };

  return (
    <div ref={containerRef} className="gemini-model-selector-wrapper">
      {/* Pill Button inside Input Bar */}
      <button
        type="button"
        className={`gemini-model-pill ${isOpen ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) {
            setIsOpen((prev) => !prev);
            setIsReasoningFlyoutOpen(false);
          }
        }}
        disabled={disabled}
        title="Pilih Model dan Tingkat Penalaran"
        aria-label="Pilih model AI"
        aria-expanded={isOpen}
      >
        <span className="gemini-pill-text">
          {currentModel ? (
            <>
              {currentModel.displayName || currentModel.name}
              {currentModel.supportsReasoning && (
                <span className="gemini-pill-tier-tag"> • {currentTier.name}</span>
              )}
            </>
          ) : (
            'Pilih Model'
          )}
        </span>
        <ChevronDown size={13} className={`gemini-pill-chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      {/* Main Model Dropdown Menu */}
      {isOpen && (
        <div className="gemini-dropdown-menu" onClick={(e) => e.stopPropagation()}>
          {/* Scrollable Model List Area */}
          <div className="gemini-models-scroll-container">
            {providerGroups.length === 0 ? (
              <div
                style={{
                  padding: '1rem 0.9rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: '0.3rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  Belum ada model aktif
                </div>
                <div style={{ lineHeight: 1.4 }}>
                  Buka menu Provider untuk memindai dan mencentang model yang ingin digunakan.
                </div>
              </div>
            ) : (
              providerGroups.map((group, idx) => (
                <div key={group.providerId} className="gemini-provider-section">
                  {idx > 0 && <div className="gemini-menu-divider" />}
                  <div className="gemini-section-tag">{group.providerName}</div>
                  <div className="gemini-menu-list">
                    {group.items.map((item) => {
                      const isSelected =
                        currentModel &&
                        (item.id === currentModel.id ||
                          item.modelId?.toLowerCase() === currentModel.modelId?.toLowerCase());
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`gemini-menu-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleModelClick(item.id)}
                        >
                          <div className="gemini-item-check-col">
                            {isSelected ? <Check size={14} className="gemini-check-icon" /> : null}
                          </div>
                          <div className="gemini-item-text-col">
                            <span className="gemini-item-title">
                              {item.displayName}
                              {item.supportsReasoning && (
                                <span className="gemini-thinking-badge">Thinking</span>
                              )}
                            </span>
                            <span className="gemini-item-subtitle">{item.subtitle}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="gemini-menu-divider" />

          {/* Reasoning Level Trigger Row */}
          <div
            className={`gemini-reasoning-row-wrapper ${!canUseReasoning ? 'disabled' : ''}`}
            onMouseEnter={handleFlyoutMouseEnter}
            onMouseLeave={handleFlyoutMouseLeave}
          >
            <button
              type="button"
              className={`gemini-menu-item gemini-reasoning-trigger ${isReasoningFlyoutOpen ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (canUseReasoning) {
                  setIsReasoningFlyoutOpen((prev) => !prev);
                }
              }}
              disabled={!canUseReasoning}
              title={
                canUseReasoning
                  ? `Ubah tingkat penalaran (${currentModel?.displayName || currentModel?.name})`
                  : 'Model ini tidak mendukung fitur penalaran'
              }
            >
              <div className="gemini-item-check-col" />
              <div className="gemini-item-text-col">
                <span className="gemini-item-title">Tingkat penalaran</span>
                {!canUseReasoning ? (
                  <span className="gemini-item-subtitle disabled-text">
                    Tidak didukung
                  </span>
                ) : (
                  <span className="gemini-item-subtitle active-tier-text">
                    {currentTier.name}
                  </span>
                )}
              </div>
              <ChevronRight size={13} className="gemini-reasoning-arrow" />
            </button>

            {/* Submenu Popover Flyout */}
            {canUseReasoning && isReasoningFlyoutOpen && (
              <div
                className="gemini-reasoning-flyout"
                onMouseEnter={handleFlyoutMouseEnter}
                onMouseLeave={handleFlyoutMouseLeave}
              >
                <div className="gemini-flyout-pointer" />
                <div className="gemini-flyout-content">
                  {REASONING_TIERS.map((tier) => {
                    const isTierSelected = tier.id === currentTier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        className={`gemini-flyout-item ${isTierSelected ? 'selected' : ''}`}
                        onClick={() => handleReasoningSelect(tier.id)}
                      >
                        <div className="gemini-flyout-check-col">
                          {isTierSelected ? <Check size={14} className="gemini-check-icon" /> : null}
                        </div>
                        <div className="gemini-flyout-text-col">
                          <span className="gemini-flyout-title">{tier.name}</span>
                          <span className="gemini-flyout-desc">{tier.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="gemini-menu-divider" />

          {/* Manage Provider Button at the bottom */}
          <button
            type="button"
            className="gemini-menu-item gemini-manage-provider-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              setIsReasoningFlyoutOpen(false);
              if (typeof onOpenManageProviders === 'function') {
                onOpenManageProviders();
              }
            }}
          >
            <div className="gemini-item-check-col">
              <SlidersHorizontal size={13} className="gemini-provider-icon" />
            </div>
            <div className="gemini-item-text-col">
              <span className="gemini-item-title">Kelola Provider...</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
