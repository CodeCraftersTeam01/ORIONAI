import React from 'react';

export default function OrionLogo({ size = 'md', isGenerating = false, showRings = true, className = '' }) {
  const sizeMap = {
    xs: 22,
    sm: 30,
    md: 38,
    lg: 72,
    xl: 96,
  };

  const px = sizeMap[size] || 38;

  return (
    <div
      className={`orion-logo-wrapper ${isGenerating ? 'generating' : ''} ${className}`}
      style={{
        width: px,
        height: px,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {/* Outer Rotating Astrolabe Ring (Minimal Monochrome) */}
      {showRings && px >= 38 && (
        <svg
          viewBox="0 0 100 100"
          style={{
            position: 'absolute',
            width: '124%',
            height: '124%',
            pointerEvents: 'none',
            animation: isGenerating ? 'orionSpin 8s linear infinite' : 'orionSpin 26s linear infinite',
          }}
        >
          <circle
            cx="50"
            cy="50"
            r="47"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeWidth="0.8"
            strokeDasharray="4 6"
          />
          <circle cx="50" cy="3" r="1.5" fill="currentColor" fillOpacity="0.5" />
          <circle cx="97" cy="50" r="1.5" fill="currentColor" fillOpacity="0.5" />
          <circle cx="50" cy="97" r="1.5" fill="currentColor" fillOpacity="0.5" />
          <circle cx="3" cy="50" r="1.5" fill="currentColor" fillOpacity="0.5" />
        </svg>
      )}

      {/* Main Logo Container */}
      <div
        className="orion-logo-circle"
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 2,
          border: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          transition: 'transform 0.25s ease, border-color 0.25s ease',
        }}
      >
        <img
          src="/orion-logo.svg"
          alt="Orion AI"
          className="orion-logo-img"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scale(1.05)',
          }}
        />
      </div>
    </div>
  );
}
