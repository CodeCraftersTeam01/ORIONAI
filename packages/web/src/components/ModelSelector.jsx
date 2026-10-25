import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Check, SlidersHorizontal, Cpu } from 'lucide-react';
import {
  DEFAULT_OFFICIAL_MODELS,
  REASONING_TIERS,
  getModelById,
  getReasoningTierById,
  isReasoningSupported,
} from '../utils/modelConfig';

export default function ModelSelector({
  selectedModel = 'orion::orion',
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

  // 1. Extract Official Provider Models
  const { officialModelItems, officialProviderName } = useMemo(() => {
    const prov = (customProviders || []).find(
      (p) => p.id === 'orion' || p.templateId === 'orion' || p?.name?.toLowerCase().includes('official')
    );
    const provName = prov?.name || 'Orion AI (Official)';

    const sourceModels =
      prov && Array.isArray(prov.models) && prov.models.length > 0
        ? prov.models.filter((m) => m.enabled !== false)
        : DEFAULT_OFFICIAL_MODELS;

    const items = sourceModels.map((m) => {
      const modId = m.id;
      const modName = m.name || m.displayName || modId;
      const defaultMeta = DEFAULT_OFFICIAL_MODELS.find((dm) => dm.id === modId);
      const subtitle = defaultMeta?.subtitle || provName;
      const supportsReasoning = isReasoningSupported(modId, modName, m.supportsReasoning);
      return {
        id: `orion::${modId}`,
        name: modName,
        displayName: modName,
        subtitle,
        providerName: provName,
        providerId: 'orion',
        modelId: modId,
        isOfficial: true,
        hasModel: true,
        supportsReasoning,
      };
    });

    return { officialModelItems: items, officialProviderName: provName };
  }, [customProviders]);

  // 2. Extract Custom Providers Sections
  const customProviderSections = useMemo(() => {
    const sections = [];
    (customProviders || []).forEach((prov) => {
      // Skip the official provider as it is rendered in its own official section
      if (prov.id === 'orion' || prov.templateId === 'orion' || prov?.name?.toLowerCase().includes('official')) {
        return;
      }

      const enabledModels = (prov.models || []).filter((m) => m.enabled);
      const provName = prov.name || prov.displayName || 'Custom Provider';

      if (enabledModels.length > 0) {
        const items = enabledModels.map((m) => {
          const supportsReasoning = isReasoningSupported(m.id, m.name, m.supportsReasoning);
          return {
            id: `${prov.id}::${m.id}`,
            name: m.name || m.id,
            displayName: m.name || m.id,
            subtitle: provName,
            providerName: provName,
            providerId: prov.id,
            modelId: m.id,
            hasModel: true,
            supportsReasoning,
          };
        });
        sections.push({
          providerId: prov.id,
          providerName: provName,
          items,
        });
      } else if (prov.modelId) {
        const supportsReasoning = isReasoningSupported(prov.modelId, prov.displayName || provName);
        sections.push({
          providerId: prov.id,
          providerName: provName,
          items: [
            {
              id: `${prov.id}::${prov.modelId}`,
              name: prov.displayName || provName,
              displayName: prov.displayName || provName,
              subtitle: provName,
              providerName: provName,
              providerId: prov.id,
              modelId: prov.modelId,
              hasModel: true,
              supportsReasoning,
            },
          ],
        });
      } else {
        sections.push({
          providerId: prov.id,
          providerName: provName,
          items: [
            {
              id: prov.id,
              name: provName,
              displayName: provName,
              subtitle: 'Belum ada model aktif (klik untuk kelola)',
              providerName: provName,
              providerId: prov.id,
              modelId: null,
              hasModel: false,
              supportsReasoning: false,
            },
          ],
        });
      }
    });
    return sections;
  }, [customProviders]);

  // 3. Combined flattened model list for fast lookup
  const allModels = useMemo(() => {
    const list = [...officialModelItems];
    customProviderSections.forEach((sec) => {
      sec.items.forEach((item) => {
        if (item.hasModel) {
          list.push(item);
        }
      });
    });
    return list;
  }, [officialModelItems, customProviderSections]);

  // 4. Resolve currently active model
  const currentModel = useMemo(() => {
    let normalizedSelected = selectedModel;
    if (normalizedSelected === 'orion') normalizedSelected = 'orion::orion';
    else if (normalizedSelected === 'agnes' || normalizedSelected === 'agnes-2.5-flash') normalizedSelected = 'orion::agnes-2.5-flash';
    else if (normalizedSelected === 'nemotron-3') normalizedSelected = 'orion::nemotron-3';

    if (normalizedSelected && normalizedSelected.includes('::')) {
      const [provId, modId] = normalizedSelected.split('::');
      const found = allModels.find(
        (m) => m.id === normalizedSelected || (m.providerId === provId && m.modelId === modId)
      );
      if (found) return found;
      return getModelById(normalizedSelected, customProviders);
    }

    const found = allModels.find((m) => m.id === normalizedSelected || m.modelId === normalizedSelected);
    if (found) return found;

    return allModels[0] || getModelById('orion::orion', customProviders);
  }, [allModels, selectedModel, customProviders]);

  const currentTier = getReasoningTierById(reasoningTier);
  const canUseReasoning = Boolean(currentModel.supportsReasoning);

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
    onSelectModel(modelId);
    const targetModel = allModels.find((m) => m.id === modelId) || getModelById(modelId, customProviders);
    if (!targetModel.supportsReasoning) {
      setIsReasoningFlyoutOpen(false);
      setIsOpen(false);
    }
  };

  const handleReasoningSelect = (tierId) => {
    onSelectReasoningTier(tierId);
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
          {currentModel.displayName || currentModel.name}
          {currentModel.supportsReasoning && (
            <span className="gemini-pill-tier-tag"> • {currentTier.name}</span>
          )}
        </span>
        <ChevronDown size={13} className={`gemini-pill-chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      {/* Main Model Dropdown Menu */}
      {isOpen && (
        <div className="gemini-dropdown-menu" onClick={(e) => e.stopPropagation()}>
          {/* Scrollable Model List Area */}
          <div className="gemini-models-scroll-container">
            {/* Official Provider Models */}
            {officialModelItems.length > 0 && (
              <div className="gemini-provider-section">
                <div className="gemini-section-tag">{officialProviderName}</div>
                <div className="gemini-menu-list">
                  {officialModelItems.map((item) => {
                    const isSelected =
                      item.id === currentModel.id ||
                      (currentModel.providerId === item.providerId && currentModel.modelId === item.modelId);
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
            )}

            {/* Custom Providers Sections */}
            {customProviderSections.map((sec) => (
              <div key={sec.providerId} className="gemini-provider-section">
                <div className="gemini-menu-divider" />
                <div className="gemini-section-tag">{sec.providerName}</div>
                <div className="gemini-menu-list">
                  {sec.items.map((item) => {
                    const isSelected =
                      item.id === currentModel.id ||
                      (currentModel.providerId === item.providerId && currentModel.modelId === item.modelId);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`gemini-menu-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          if (item.hasModel) {
                            handleModelClick(item.id);
                          } else {
                            setIsOpen(false);
                            if (typeof onOpenManageProviders === 'function') {
                              onOpenManageProviders();
                            }
                          }
                        }}
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
            ))}
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
                  ? `Ubah tingkat penalaran (${currentModel.displayName || currentModel.name})`
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
                {/* Pointer Arrow on right edge */}
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
