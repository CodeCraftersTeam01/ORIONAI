import React from 'react';
import {
  HelpCircle,
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
  onChooseOption,
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
      case 'ask_user':
        return 'Pertanyaan Konfirmasi';
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
                {pendingApproval.isChoice || pendingApproval.tool === 'ask_user' || pendingApproval.isConversational || pendingApproval.question ? (
                  <HelpCircle size={20} className="voice-approval-icon" />
                ) : (
                  <ShieldAlert size={20} className="voice-approval-icon" />
                )}
                <span className="voice-approval-title">
                  {pendingApproval.isChoice || pendingApproval.tool === 'ask_user' || pendingApproval.isConversational || pendingApproval.question
                    ? 'Konfirmasi Tindakan'
                    : 'Persetujuan Eksekusi Sistem'}
                </span>
              </div>

              <div className="voice-approval-content">
                <div className="voice-approval-tool-badge">
                  <Terminal size={13} />
                  <span>{getToolDisplayName(pendingApproval.tool)}</span>
                </div>
                {pendingApproval.question ? (
                  <p
                    className="voice-approval-question"
                    style={{
                      color: 'var(--text-primary)',
                      fontSize: '0.94rem',
                      fontWeight: 600,
                      margin: '0.4rem 0 0.2rem',
                      lineHeight: 1.4,
                    }}
                  >
                    {pendingApproval.question}
                  </p>
                ) : pendingApproval.args ? (
                  <div className="voice-approval-code">
                    <code>{getToolTargetInfo(pendingApproval.args)}</code>
                  </div>
                ) : null}
                {pendingApproval.purpose && (
                  <p className="voice-approval-reason" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    Tujuan: {pendingApproval.purpose}
                  </p>
                )}
                {pendingApproval.reason && (
                  <p className="voice-approval-reason">{pendingApproval.reason}</p>
                )}
              </div>

              {/* Dynamic choice options list if provided */}
              {Array.isArray(pendingApproval.options) && pendingApproval.options.length > 0 && (
                <div
                  className="voice-approval-options-list"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    width: '100%',
                    margin: '0.4rem 0',
                  }}
                >
                  {pendingApproval.options.map((opt, idx) => {
                    const optLabel = typeof opt === 'string' ? opt : opt.label || opt.value || `Opsi ${idx + 1}`;
                    return (
                      <button
                        key={idx}
                        type="button"
                        className="voice-btn-choice-opt"
                        onClick={() => {
                          if (onChooseOption) {
                            onChooseOption(pendingApproval.toolCallId, optLabel, idx);
                          } else if (idx === 0) {
                            onApproveTool?.(pendingApproval.toolCallId);
                          } else {
                            onRejectTool?.(pendingApproval.toolCallId);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '8px',
                          padding: '0.5rem 0.75rem',
                          color: 'var(--text-primary)',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.72rem',
                            background: 'rgba(255, 255, 255, 0.12)',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            fontWeight: 600,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span>{optLabel}</span>
                      </button>
                    );
                  })}
                </div>
              )}

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
