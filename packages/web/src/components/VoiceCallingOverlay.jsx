import React from 'react';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import { cleanIndonesianText } from '../utils/textCleaner';

export default function VoiceCallingOverlay({
  isActive = false,
  isMuted = false,
  agentStatus = 'listening', // 'listening' | 'thinking' | 'speaking'
  userTranscript = '',
  agentResponse = '',
  responseTurn = 0,
  onToggleMute,
  onEndCall,
}) {
  if (!isActive) return null;

  const formattedAgentResponse = cleanIndonesianText(agentResponse);

  return (
    <div className="voice-calling-overlay" aria-live="polite">
      <div className="voice-calling-container">
        {/* Typographic Voice Dialogue Stage */}
        <div className="voice-dialogue-stage">
          {/* User Spoken Transcript (During speech & while agent thinks) */}
          {userTranscript && (agentStatus === 'listening' || agentStatus === 'thinking') && (
            <div className="voice-user-transcript">
              <p className="voice-user-text">“{cleanIndonesianText(userTranscript)}”</p>
            </div>
          )}

          {/* Anti-Slop Typographic Thinking Indicator (Dignified, frameless, breathing text) */}
          {agentStatus === 'thinking' && (
            <div className="voice-thinking-stage" aria-live="assertive">
              <p className="voice-thinking-text">Memikirkan respons...</p>
            </div>
          )}

          {/* Listening State Hint when user is silent and no previous response exists */}
          {agentStatus === 'listening' && !userTranscript && !formattedAgentResponse && (
            <div className={`voice-listening-hint ${isMuted ? 'is-muted' : ''}`}>
              <span className="voice-listening-dot" />
              <span>{isMuted ? 'Mikrofon dibisukan' : 'Silakan berbicara...'}</span>
            </div>
          )}

          {/* Spoken AI Response: Stays visible until replaced by the next response */}
          {formattedAgentResponse && (
            <div
              key={responseTurn}
              className={`voice-agent-speech cozy-blur-reveal ${agentStatus === 'thinking' ? 'is-thinking-prior' : ''}`}
            >
              <p className="voice-agent-text">{formattedAgentResponse}</p>
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
