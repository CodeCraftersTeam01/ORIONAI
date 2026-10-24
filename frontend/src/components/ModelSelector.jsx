import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Check, SlidersHorizontal, Cpu } from 'lucide-react';
import {
  AVAILABLE_MODELS,
  REASONING_TIERS,
  getModelById,
  getReasoningTierById,
  isReasoningSupported,
} from '../utils/modelConfig';

export default function ModelSelector({
  selectedModel = 'orion',
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

  // Extract enabled models from custom providers
  const customModelItems = useMemo(() => {
    const items = [];
    (customProviders || []).forEach((prov) => {
      const enabledModels = (prov.models || []).filter((m) => m.enabled);
      if (enabledModels.length > 0) {
        enabledModels.forEach((m) => {
          const supportsReasoning = isReasoningSupported(m.id, m.name, m.supportsReasoning);
          items.push({
            id: `${prov.id}::${m.id}`,
            name: m.name || m.id,
            displayName: m.name || m.id,
            subtitle: `${prov.name} • ${m.id}`,
            providerName: prov.name,
            providerId: prov.id,
            modelId: m.id,
            hasModel: true,
            supportsReasoning,
          });
        });
      } else if (prov.modelId) {
        // Legacy fallback
        const supportsReasoning = isReasoningSupported(prov.modelId, prov.displayName || prov.name);
        items.push({
          id: `${prov.id}::${prov.modelId}`,
          name: prov.displayName || prov.name,
          displayName: prov.displayName || prov.name,
          subtitle: `${prov.name} • ${prov.modelId}`,
          providerName: prov.name,
          providerId: prov.id,
          modelId: prov.modelId,
          hasModel: true,
          supportsReasoning,
        });
      } else {
        // Provider exists but hasn't enabled any models yet
        items.push({
          id: prov.id,
          name: prov.name,
          displayName: prov.name,
          subtitle: 'Belum ada model aktif (klik untuk kelola)',
          providerName: prov.name,
          providerId: prov.id,
          modelId: null,
          hasModel: false,
          supportsReasoning: false,
        });
      }
    });
    return items;
  }, [customProviders]);

  // Combine standard models with enabled custom provider models
  const allModels = useMemo(() => {
    const list = [...AVAILABLE_MODELS];
    customModelItems.forEach((item) => {
      if (item.hasModel) {
        list.push({
          id: item.id,
          name: item.name,
          displayName: item.displayName,
          subtitle: item.subtitle,
          isCustom: true,
          providerId: item.providerId,
          modelId: item.modelId,
          supportsReasoning: Boolean(item.supportsReasoning),
        });
      }
    });
    return list;
  }, [customModelItems]);

  const currentModel = useMemo(() => {
    if (selectedModel && selectedModel.includes('::')) {
      const [provId, modId] = selectedModel.split('::');
      const found = allModels.find((m) => m.id === selectedModel);
      if (found) return found;
      const prov = (customProviders || []).find((p) => p.id === provId);
      const customModelObj = (prov?.models || []).find((m) => m.id === modId);
      const supportsReasoning = isReasoningSupported(
        modId,
        customModelObj?.name || modId,
        customModelObj?.supportsReasoning
      );
      return {
        id: selectedModel,
        name: modId,
        displayName: modId,
        subtitle: prov ? `${prov.name} • ${modId}` : modId,
        isCustom: true,
        providerId: provId,
        modelId: modId,
        supportsReasoning,
      };
    }
    return allModels.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];
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
    const targetModel = allModels.find((m) => m.id === modelId) || getModelById(modelId);
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
            {/* Built-in Models List */}
            <div className="gemini-menu-list">
              {AVAILABLE_MODELS.map((item) => {
                const isSelected = item.id === currentModel.id;
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
                      <span className="gemini-item-title">{item.displayName}</span>
                      <span className="gemini-item-subtitle">{item.subtitle}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Providers List if available */}
            {customModelItems.length > 0 && (
              <>
                <div className="gemini-menu-divider" />
                <div className="gemini-section-tag">Model Kustom</div>
                <div className="gemini-menu-list">
                  {customModelItems.map((item) => {
                    const isSelected = item.id === currentModel.id;
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
              </>
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
                  ? `Ubah tingkat penalaran (${currentModel.displayName || currentModel.name})`
                  : 'Model ini tidak mendukung fitur penalaran'
              }
            >
              <div className="gemini-item-check-col" />
              <div className="gemini-item-text-col">
                <span className="gemini-item-title">Tingkat penalaran</span>
                {!canUseReasoning ? (
                  <span className="gemini-item-subtitle disabled-text">
                    Model tidak mendukung penalaran
                  </span>
                ) : (
                  <span className="gemini-item-subtitle active-tier-text">
                    {currentTier.name} • {currentTier.desc}
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
              <span className="gemini-item-subtitle">Kustom OpenAI, Gemini, Claude, Ollama</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
