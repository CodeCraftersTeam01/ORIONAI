import React from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  ShieldAlert,
  Check,
  X,
  Terminal,
  FileCode,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Cpu,
} from 'lucide-react';
import { cleanIndonesianText, formatVoiceForSpeechAndDisplay } from '../utils/textCleaner';

export default function VoiceCallingOverlay({
  isActive = false,
  isMuted = false,
  agentStatus = 'listening', // 'listening' | 'thinking' | 'speaking'
  userTranscript = '',
  agentResponse = '',
  responseTurn = 0,
  activeToolCalls = [],
  pendingApproval = null,
  onApproveTool,
  onRejectTool,
  onToggleMute,
  onEndCall,
}) {
  if (!isActive) return null;

  const formattedAgentResponse = formatVoiceForSpeechAndDisplay(agentResponse);

  // Latest running or completed tool call
  const latestTool = activeToolCalls.length > 0 ? activeToolCalls[activeToolCalls.length - 1] : null;

  const getToolDisplayName = (tool) => {
    switch (tool) {
      case 'bash':
        return 'Terminal / Bash';
      case 'write':
        return 'Tulis Berkas';
      case 'edit':
        return 'Edit Berkas';
      case 'read':
        return 'Baca Berkas';
      case 'use_skill':
        return 'Akses Keahlian (Skill)';
      case 'delete_file':
        return 'Hapus Berkas';
      case 'ls':
      case 'find':
      case 'grep':
        return 'Pencarian Berkas';
      default:
        return tool || 'Tool Call';
    }
  };

  const getToolTargetInfo = (args) => {
    if (!args) return '';
    if (typeof args === 'string') return args;
    if (args.command) return args.command;
    if (args.path) return args.path;
    if (args.paths) return args.paths.join(', ');
    if (args.pattern) return args.pattern;
    return JSON.stringify(args);
  };

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

          {/* Spoken AI Response: Stays visible until replaced by next turn */}
          {formattedAgentResponse && (
            <div
              key={responseTurn}
              className={`voice-agent-speech cozy-blur-reveal ${
                agentStatus === 'thinking' && !latestTool ? 'is-thinking-prior' : ''
              }`}
            >
              <p className="voice-agent-text">{formattedAgentResponse}</p>
            </div>
          )}

          {/* ================= CENTERED JARVIS APPROVAL CARD ================= */}
          {pendingApproval ? (
            <div className="voice-approval-card animate-approval-fade">
              <div className="voice-approval-header">
                <ShieldAlert size={20} className="voice-approval-icon" />
                <span className="voice-approval-title">Persetujuan Eksekusi Sistem</span>
              </div>

              <div className="voice-approval-content">
                <div className="voice-approval-tool-badge">
                  <Terminal size={13} />
                  <span>{getToolDisplayName(pendingApproval.tool)}</span>
                </div>
                <div className="voice-approval-code">
                  <code>{getToolTargetInfo(pendingApproval.args)}</code>
                </div>
                {pendingApproval.purpose && (
                  <p className="voice-approval-reason" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    Tujuan: {pendingApproval.purpose}
                  </p>
                )}
                {pendingApproval.reason && (
                  <p className="voice-approval-reason">{pendingApproval.reason}</p>
                )}
              </div>

              <div className="voice-approval-voice-hint">
                <Mic size={14} className="animate-pulse" />
                <span>Katakan <strong>"Approve"</strong> atau <strong>"Reject"</strong></span>
              </div>

              <div className="voice-approval-buttons">
                <button
                  type="button"
                  className="voice-btn-approve"
                  onClick={() => onApproveTool?.(pendingApproval.toolCallId)}
                >
                  <Check size={15} /> Setujui (Approve)
                </button>
                <button
                  type="button"
                  className="voice-btn-reject"
                  onClick={() => onRejectTool?.(pendingApproval.toolCallId)}
                >
                  <X size={15} /> Tolak (Reject)
                </button>
              </div>
            </div>
          ) : latestTool ? (
            /* ================= CENTERED ACTIVE TOOL CALL TRACKER ================= */
            <div className="voice-tool-tracker animate-tool-fade">
              <div className="voice-tool-tracker-header">
                <span className="voice-tool-indicator">
                  {latestTool.status === 'running' || latestTool.status === 'waiting_approval' ? (
                    <RotateCw size={13} className="animate-spin text-accent" />
                  ) : latestTool.status === 'completed' ? (
                    <CheckCircle2 size={13} className="text-success" />
                  ) : (
                    <Cpu size={13} />
                  )}
                </span>
                <span className="voice-tool-name">{getToolDisplayName(latestTool.tool)}</span>
                <span className="voice-tool-status-badge">
                  {latestTool.status === 'running' ? 'Eksekusi Latar Belakang' : 'Selesai'}
                </span>
              </div>
              <div className="voice-tool-code-preview">
                <code>{getToolTargetInfo(latestTool.args)}</code>
              </div>
            </div>
          ) : agentStatus === 'thinking' ? (
            /* Anti-Slop Typographic Thinking Indicator (When no active tool) */
            <div className="voice-thinking-stage" aria-live="assertive">
              <p className="voice-thinking-text">Memikirkan respons...</p>
            </div>
          ) : null}

          {/* Listening State Hint when user is silent and no previous response exists */}
          {agentStatus === 'listening' && !userTranscript && !formattedAgentResponse && !latestTool && (
            <div className={`voice-listening-hint ${isMuted ? 'is-muted' : ''}`}>
              <span className="voice-listening-dot" />
              <span>
                {isMuted
                  ? 'Mikrofon dibisukan'
                  : (typeof window !== 'undefined' && !window.SpeechRecognition && !window.webkitSpeechRecognition)
                  ? 'Browser Zen/Firefox belum mendukung Web Speech bawaan. Silakan gunakan Safari atau Chrome.'
                  : 'Silakan berbicara...'}
              </span>
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
