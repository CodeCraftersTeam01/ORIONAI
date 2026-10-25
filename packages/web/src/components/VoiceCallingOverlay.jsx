import React from 'react';
import { Mic, MicOff, PhoneOff } from 'lucide-react';

export default function VoiceCallingOverlay({
  isActive = false,
  isMuted = false,
  onToggleMute,
  onEndCall,
}) {
  if (!isActive) return null;

  return (
    <div className="voice-calling-overlay" aria-live="polite">
      <div className="voice-calling-container">
        {/* Action Controls Only: Mute & Tutup Panggilan */}
        <div className="voice-calling-actions">
          {/* Toggle Mute Button */}
          <button
            type="button"
            className={`voice-action-btn ${isMuted ? 'muted' : ''}`}
            onClick={onToggleMute}
            title={isMuted ? 'Aktifkan Mikrofon' : 'Bisukan Mikrofon'}
            aria-label={isMuted ? 'Aktifkan Mikrofon' : 'Bisukan Mikrofon'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
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
            <PhoneOff size={20} />
            <span>Tutup Panggilan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
