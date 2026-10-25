import React from 'react';
import { Mic, MicOff, PhoneOff, Sparkles } from 'lucide-react';

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
        {/* Dynamic Voice Dialogue Stage */}
        <div className="voice-dialogue-stage">
          {/* Status Pill Badge */}
          <div className="voice-status-pill-wrap">
            {agentStatus === 'thinking' && (
              <div className="voice-status-pill is-thinking">
                <Sparkles size={14} className="pill-sparkle-spin" />
                <span>Orion sedang berpikir...</span>
              </div>
            )}

            {agentStatus === 'speaking' && (
              <div className="voice-status-pill is-speaking">
                <span className="voice-live-dot" />
                <span>Orion</span>
              </div>
            )}

            {agentStatus === 'listening' && (
              <div className={`voice-status-pill is-listening ${isMuted ? 'muted' : ''}`}>
                <span className="voice-pulse-dot" />
                <span>{isMuted ? 'Mikrofon Dibisukan' : 'Mendengarkan...'}</span>
              </div>
            )}
          </div>

          {/* User Live Speech Transcript (During speech & while thinking) */}
          {userTranscript && (agentStatus === 'listening' || agentStatus === 'thinking') && (
            <div className="voice-user-transcript-card">
              <span className="voice-transcript-caption">Anda</span>
              <p className="voice-user-text">“{userTranscript}”</p>
            </div>
          )}

          {/* Agent Response Text (Concise, punchy, high-legibility centered text) */}
          {agentResponse && agentStatus === 'speaking' && (
            <div className="voice-agent-response-card">
              <p className="voice-agent-text">{agentResponse}</p>
            </div>
          )}
        </div>

        {/* Action Controls: Mute & Tutup Panggilan */}
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
