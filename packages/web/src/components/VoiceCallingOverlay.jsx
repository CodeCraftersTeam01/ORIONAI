import React, { useMemo } from 'react';
import { Mic, MicOff, PhoneOff, Sparkles } from 'lucide-react';

export default function VoiceCallingOverlay({
  isActive = false,
  audioLevel = 0,
  isMuted = false,
  onToggleMute,
  onEndCall,
}) {
  if (!isActive) return null;

  // Generate 7 organic equalizer bars modulated by real-time audioLevel
  const barHeights = useMemo(() => {
    const base = [10, 16, 24, 32, 24, 16, 10];
    return base.map((b, i) => {
      if (isMuted) return 6;
      const factor = Math.sin(i * 1.1 + performance.now() * 0.005) * 0.35 + 0.65;
      const dynamicBoost = audioLevel * 50 * factor;
      return Math.min(68, Math.max(8, b + dynamicBoost));
    });
  }, [audioLevel, isMuted]);

  // Dynamic scale of central glowing orb
  const orbScale = isMuted ? 1.0 : 1.0 + Math.min(audioLevel * 0.22, 0.22);
  const ringOpacity = isMuted ? 0.2 : 0.35 + Math.min(audioLevel * 0.45, 0.45);

  return (
    <div className="voice-calling-overlay" aria-live="polite">
      <div className="voice-calling-container">
        {/* Animated Cosmic Voice Orb */}
        <div
          className="voice-calling-orb-stage"
          style={{ transform: `scale(${orbScale})` }}
        >
          {/* Concentric Audio Pulse Rings */}
          <div
            className="voice-pulse-ring ring-outer"
            style={{
              opacity: ringOpacity * 0.6,
              transform: `scale(${1 + audioLevel * 0.35})`,
            }}
          />
          <div
            className="voice-pulse-ring ring-mid"
            style={{
              opacity: ringOpacity * 0.8,
              transform: `scale(${1 + audioLevel * 0.22})`,
            }}
          />
          <div
            className="voice-pulse-ring ring-inner"
            style={{ opacity: ringOpacity }}
          />

          {/* Central Glowing Core */}
          <div className="voice-calling-core">
            <div className="voice-core-glow" />
            <Sparkles size={32} className="voice-core-icon" />
          </div>
        </div>

        {/* Real-time Equalizer Waveform Bars */}
        <div className="voice-equalizer-bars" aria-hidden="true">
          {barHeights.map((h, idx) => (
            <span
              key={idx}
              className={`voice-eq-bar ${audioLevel > 0.08 ? 'active' : ''}`}
              style={{
                height: `${h}px`,
                opacity: isMuted ? 0.3 : Math.min(1.0, 0.5 + audioLevel * 0.6),
              }}
            />
          ))}
        </div>

        {/* Action Controls */}
        <div className="voice-calling-actions">
          {/* Toggle Mute Button */}
          <button
            type="button"
            className={`voice-action-btn ${isMuted ? 'muted' : ''}`}
            onClick={onToggleMute}
            title={isMuted ? 'Aktifkan Mikrofon' : 'Bisukan Mikrofon'}
            aria-label={isMuted ? 'Aktifkan Mikrofon' : 'Bisukan Mikrofon'}
          >
            {isMuted ? <MicOff size={19} /> : <Mic size={19} />}
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {/* End Call Button */}
          <button
            type="button"
            className="voice-action-btn btn-end-call"
            onClick={onEndCall}
            title="Tutup Panggilan Suara (Esc)"
            aria-label="Tutup Panggilan Suara"
          >
            <PhoneOff size={19} />
            <span>Tutup Panggilan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
