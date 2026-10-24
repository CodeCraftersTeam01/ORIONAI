import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import {
  AVAILABLE_MODELS,
  REASONING_TIERS,
  getModelById,
  getReasoningTierById,
} from '../utils/modelConfig';

export default function ModelSelector({
  selectedModel = 'orion',
  reasoningTier = 'medium',
  onSelectModel,
  onSelectReasoningTier,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReasoningFlyoutOpen, setIsReasoningFlyoutOpen] = useState(false);
  const containerRef = useRef(null);
  const flyoutTimeoutRef = useRef(null);

  const currentModel = getModelById(selectedModel);
  const currentTier = getReasoningTierById(reasoningTier);
  const canUseReasoning = currentModel.supportsReasoning;

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
    // If selected model does not support reasoning, close immediately
    const targetModel = getModelById(modelId);
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
      {/* Pill Button inside Input Bar (Image 2) */}
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
          {currentModel.displayName}
          {currentModel.supportsReasoning && (
            <span className="gemini-pill-tier-tag"> • {currentTier.name}</span>
          )}
        </span>
        <ChevronDown size={14} className={`gemini-pill-chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      {/* Main Model Dropdown Menu (Image 3) */}
      {isOpen && (
        <div className="gemini-dropdown-menu" onClick={(e) => e.stopPropagation()}>
          {/* Models List */}
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
                    {isSelected ? <Check size={16} className="gemini-check-icon" /> : null}
                  </div>
                  <div className="gemini-item-text-col">
                    <span className="gemini-item-title">{item.displayName}</span>
                    <span className="gemini-item-subtitle">{item.subtitle}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="gemini-menu-divider" />

          {/* Reasoning Level Trigger Row (Image 3) */}
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
              <ChevronRight size={15} className="gemini-reasoning-arrow" />
            </button>

            {/* Submenu Popover Flyout (Image 1) */}
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
                          {isTierSelected ? <Check size={16} className="gemini-check-icon" /> : null}
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
        </div>
      )}
    </div>
  );
}
