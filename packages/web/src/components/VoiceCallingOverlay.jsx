import React from 'react';
import { Mic, MicOff, PhoneOff } from 'lucide-react';

export default function VoiceCallingOverlay({
  isActive = false,
  isMuted = false,
  agentStatus = 'listening', // 'listening' | 'thinking' | 'speaking'
  userTranscript = '',
  agentResponse = '',
  onToggleMute,
  onEndCall,
}) {
  if (!isActive) return null;

  return (
    <div className="voice-calling-overlay" aria-live="polite">
      <div className="voice-calling-container">
        {/* Typographic Voice Dialogue Stage */}
        <div className="voice-dialogue-stage">
          {/* Status Indicator (Subtle, purposeful, non-slop) */}
          {agentStatus === 'thinking' && (
            <div className="voice-thinking-status">
              <span className="voice-thinking-pulse" />
              <span>Memproses jawaban...</span>
            </div>
          )}

          {agentStatus === 'listening' && !userTranscript && (
            <div className={`voice-listening-hint ${isMuted ? 'is-muted' : ''}`}>
              <span className="voice-listening-dot" />
              <span>{isMuted ? 'Mikrofon dibisukan' : 'Silakan berbicara...'}</span>
            </div>
          )}

          {/* User Spoken Transcript (Clean, understated typography) */}
          {userTranscript && (agentStatus === 'listening' || agentStatus === 'thinking') && (
            <div className="voice-user-transcript">
              <p className="voice-user-text">“{userTranscript}”</p>
            </div>
          )}

          {/* Spoken AI Response (Frameless, high-legibility clean typography) */}
          {agentResponse && agentStatus === 'speaking' && (
            <div className="voice-agent-speech">
              <p className="voice-agent-text">{agentResponse}</p>
            </div>
          )}
        </div>

        {/* Action Controls: Mute & Tutup Panggilan (Docked cleanly at bottom) */}
        <div className="voice-calling-actions">
          {/* Toggle Mute Button */}
          <button
            type="button"
            className={`voice-action-btn ${isMuted ? 'is-muted' : ''}`}
            onClick={onToggleMute}
            title={isMuted ? 'Aktifkan Mikrofon' : 'Bisukan Mikrofon'}
            aria-label={isMuted ? 'Aktifkan Mikrofon' : 'Bisukan Mikrofon'}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
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
            <PhoneOff size={18} />
            <span>Tutup Panggilan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
