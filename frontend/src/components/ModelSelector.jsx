import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  Brain,
  Cpu,
  Bot,
  ChevronDown,
  Check,
} from 'lucide-react';
import { AVAILABLE_MODELS, getModelById } from '../utils/modelConfig';

export default function ModelSelector({ selectedModel, onSelectModel, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const currentModel = getModelById(selectedModel);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleMouseEnter = () => {
    if (disabled) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 220);
  };

  const handleSelect = (modelId) => {
    onSelectModel(modelId);
    setIsOpen(false);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  const renderModelIcon = (id, size = 15) => {
    switch (id) {
      case 'orion-low':
        return <Zap size={size} className="model-ico-zap" />;
      case 'orion-mid':
        return <Sparkles size={size} className="model-ico-sparkles" />;
      case 'orion-high':
        return <Brain size={size} className="model-ico-brain" />;
      case 'nemotron-3':
        return <Cpu size={size} className="model-ico-cpu" />;
      case 'agnes':
        return <Bot size={size} className="model-ico-bot" />;
      default:
        return <Sparkles size={size} />;
    }
  };

  const orionModels = AVAILABLE_MODELS.filter((m) => m.category === 'Orion Engine');
  const otherModels = AVAILABLE_MODELS.filter((m) => m.category !== 'Orion Engine');

  return (
    <div
      ref={containerRef}
      className="model-selector-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className={`model-selector-btn ${isOpen ? 'active' : ''} tier-${currentModel.tier}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        disabled={disabled}
        title="Ganti Model AI (Orion Low, Mid, High, Nemotron 3, Agnes)"
        aria-label="Pilih model kecerdasan buatan"
        aria-expanded={isOpen}
      >
        <span className="model-btn-icon">{renderModelIcon(currentModel.id, 13)}</span>
        <span className="model-btn-label">
          <span className="model-btn-name">{currentModel.name}</span>
          <span className="model-btn-short">{currentModel.shortName}</span>
        </span>
        <ChevronDown size={12} className={`model-btn-chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="model-selector-popover"
          role="dialog"
          aria-label="Daftar Pilihan Model"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="model-popover-header">
            <span className="popover-title">TINGKAT KECERDASAN ORION</span>
            <span className="popover-subtitle">Arahkan kursor atau pilih tingkatan yang diinginkan</span>
          </div>

          <div className="model-list-group">
            {orionModels.map((item) => {
              const isSelected = item.id === currentModel.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`model-option-card ${isSelected ? 'selected' : ''} tier-${item.tier}`}
                  onClick={() => handleSelect(item.id)}
                >
                  <div className="option-icon-box">
                    {renderModelIcon(item.id, 16)}
                  </div>
                  <div className="option-text-box">
                    <div className="option-title-row">
                      <span className="option-name">{item.name}</span>
                      <span className={`option-badge ${item.badgeType}`}>{item.badge}</span>
                    </div>
                    <span className="option-desc">{item.desc}</span>
                  </div>
                  {isSelected && (
                    <div className="option-check-box">
                      <Check size={14} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="model-popover-divider">
            <span>MODEL ALTERNATIF</span>
          </div>

          <div className="model-list-group">
            {otherModels.map((item) => {
              const isSelected = item.id === currentModel.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`model-option-card ${isSelected ? 'selected' : ''} tier-${item.tier}`}
                  onClick={() => handleSelect(item.id)}
                >
                  <div className="option-icon-box">
                    {renderModelIcon(item.id, 16)}
                  </div>
                  <div className="option-text-box">
                    <div className="option-title-row">
                      <span className="option-name">{item.name}</span>
                      <span className={`option-badge ${item.badgeType}`}>{item.badge}</span>
                    </div>
                    <span className="option-desc">{item.desc}</span>
                  </div>
                  {isSelected && (
                    <div className="option-check-box">
                      <Check size={14} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
