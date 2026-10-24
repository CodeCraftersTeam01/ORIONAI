import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Check, SlidersHorizontal, Cpu } from 'lucide-react';
import {
  AVAILABLE_MODELS,
  REASONING_TIERS,
  getModelById,
  getReasoningTierById,
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

  // Combine standard models with custom providers
  const allModels = useMemo(() => {
    return [...AVAILABLE_MODELS, ...customProviders];
  }, [customProviders]);

  const currentModel = useMemo(() => {
    return allModels.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];
  }, [allModels, selectedModel]);

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
          {customProviders.length > 0 && (
            <>
              <div className="gemini-menu-divider" />
              <div className="gemini-section-tag">Custom Provider</div>
              <div className="gemini-menu-list">
                {customProviders.map((prov) => {
                  const isSelected = prov.id === currentModel.id;
                  return (
                    <button
                      key={prov.id}
                      type="button"
                      className={`gemini-menu-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleModelClick(prov.id)}
                    >
                      <div className="gemini-item-check-col">
                        {isSelected ? <Check size={14} className="gemini-check-icon" /> : null}
                      </div>
                      <div className="gemini-item-text-col">
                        <span className="gemini-item-title">{prov.name}</span>
                        <span className="gemini-item-subtitle">{prov.modelId}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

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
              title={canUseReasoning ? 'Ubah tingkat penalaran Orion' : 'Penalaran hanya tersedia untuk Orion'}
            >
              <div className="gemini-item-check-col" />
              <div className="gemini-item-text-col">
                <span className="gemini-item-title">Tingkat penalaran</span>
                {!canUseReasoning && (
                  <span className="gemini-item-subtitle disabled-text">Hanya untuk model Orion</span>
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
