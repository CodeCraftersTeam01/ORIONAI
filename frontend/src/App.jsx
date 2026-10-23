import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Download,
  RotateCcw,
  Copy,
  Check,
  Trash2,
  Maximize2,
  X,
  FileText,
  FileCode,
  FileSpreadsheet,
  File,
} from 'lucide-react';
import ConstellationCanvas from './components/ConstellationCanvas';
import OrionLogo from './components/OrionLogo';
import Sidebar from './components/Sidebar';
import ChatInput from './components/ChatInput';
import FormattedMessage from './components/FormattedMessage';
import SettingsModal from './components/SettingsModal';
import { soundEffects } from './utils/soundEffects';
import { formatFileSize } from './utils/fileHelpers';
import './App.css';

const QUICK_STARTERS = [
  'Bantu buatkan struktur clean architecture Express.js dengan ES Modules',
  'Jelaskan konsep asynchronous dan event loop di Node.js',
  'Bagaimana tips mendesain UI minimalis yang nyaman dibaca?',
];

export default function App() {
  // Theme state: 'dark' (cozy black) or 'light' (cozy ivory paper)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('orion_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('orion_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Sessions state
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('orion_chat_sessions');
      if (saved) return JSON.parse(saved);
    } catch {
      // storage quota fallback
    }
    return [
      {
        id: 'session-default',
        title: 'Percakapan Perdana',
        createdAt: new Date().toISOString(),
        messages: [],
      },
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState(() => {
    return sessions[0]?.id || 'session-default';
  });

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('orion_sound');
    return saved !== null ? saved === 'true' : false; // quiet by default for cozy simple feel
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [toast, setToast] = useState(null);

  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && previewImage) {
        setPreviewImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImage]);

  useEffect(() => {
    soundEffects.toggle(soundEnabled);
    localStorage.setItem('orion_sound', soundEnabled ? 'true' : 'false');
  }, [soundEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem('orion_chat_sessions', JSON.stringify(sessions));
    } catch {
      // storage quota
    }
  }, [sessions]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [];

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const handleNewSession = () => {
    const newSession = {
      id: `session-${Date.now()}`,
      title: 'Percakapan Baru',
      createdAt: new Date().toISOString(),
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleDeleteSession = (sessionId) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      if (filtered.length === 0) {
        return [
          {
            id: `session-${Date.now()}`,
            title: 'Percakapan Baru',
            createdAt: new Date().toISOString(),
            messages: [],
          },
        ];
      }
      return filtered;
    });

    if (activeSessionId === sessionId) {
      const remaining = sessions.filter((s) => s.id !== sessionId);
      setActiveSessionId(remaining[0]?.id || 'session-default');
    }
  };

  const handleClearAllSessions = () => {
    const fresh = {
      id: `session-${Date.now()}`,
      title: 'Percakapan Baru',
      createdAt: new Date().toISOString(),
      messages: [],
    };
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
    showToast('Riwayat berhasil dibersihkan');
  };

  // Render category icons for file cards
  const renderFileCategoryIcon = (category) => {
    switch (category) {
      case 'code':
        return <FileCode size={16} />;
      case 'spreadsheet':
        return <FileSpreadsheet size={16} />;
      case 'document':
        return <FileText size={16} />;
      default:
        return <File size={16} />;
    }
  };

  // Real-time Token Streaming
  const handleSendMessage = async (textToSend, customAttachments = null) => {
    const activeAttachments = customAttachments !== null ? customAttachments : attachments;
    const userText = (textToSend !== undefined ? textToSend : input).trim();
    if ((!userText && activeAttachments.length === 0) || isGenerating) return;

    soundEffects.playSend();

    const displayPrompt = userText || (activeAttachments.length > 0 ? 'Tolong analisis dan jelaskan lampiran berikut.' : '');

    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: displayPrompt,
      attachments: activeAttachments,
      timestamp: new Date().toISOString(),
    };

    const aiMessageId = `msg-ai-${Date.now()}`;
    const initialAiMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          const isFirstMessage = s.messages.length === 0;
          const displayTitle = userText || (activeAttachments[0] ? `Lampiran: ${activeAttachments[0].name}` : 'Percakapan');
          return {
            ...s,
            title: isFirstMessage
              ? displayTitle.length > 24
                ? `${displayTitle.slice(0, 24)}...`
                : displayTitle
              : s.title,
            messages: [...s.messages, userMessage, initialAiMessage],
          };
        }
        return s;
      })
    );

    setInput('');
    setAttachments([]);
    setIsGenerating(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: displayPrompt,
          history: activeSession ? activeSession.messages : [],
          attachments: activeAttachments,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulated = '';
      let buffer = '';
      let rafId = null;
      let lastCommit = 0;

      const commitUpdate = (text) => {
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === activeSessionId) {
              return {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === aiMessageId ? { ...m, content: text } : m
                ),
              };
            }
            return s;
          })
        );
      };

      const throttleCommit = (text) => {
        const now = performance.now();
        if (now - lastCommit < 24) {
          if (!rafId) {
            rafId = requestAnimationFrame(() => {
              rafId = null;
              lastCommit = performance.now();
              commitUpdate(accumulated);
            });
          }
          return;
        }
        lastCommit = now;
        commitUpdate(text);
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        let hasNewChunk = false;
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.chunk) {
              accumulated += parsed.chunk;
              hasNewChunk = true;
            }
          } catch {
            // ignore non-json
          }
        }

        if (hasNewChunk) {
          throttleCommit(accumulated);
        }
      }

      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      commitUpdate(accumulated);

      // Fallback if stream was empty
      if (!accumulated.trim()) {
        const fallbackRes = await fetch('/api/chat/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userText,
            history: activeSession ? activeSession.messages : [],
          }),
        });
        if (fallbackRes.ok) {
          const json = await fallbackRes.json();
          accumulated = json.data.content;
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id === activeSessionId) {
                return {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === aiMessageId ? { ...m, content: accumulated } : m
                  ),
                };
              }
              return s;
            })
          );
        }
      }

      soundEffects.playReceive();
    } catch (err) {
      console.error('Failed to get response:', err);
      const errorContent = `Koneksi terganggu. Pastikan server backend dan Tailscale aktif.\n\n*Error: ${err.message}*`;

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: s.messages.map((m) =>
                m.id === aiMessageId ? { ...m, content: errorContent } : m
              ),
            };
          }
          return s;
        })
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyMessage = (msgId, text) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    showToast('Tersalin ke papan klip');
    setTimeout(() => setCopiedMsgId(null), 1800);
  };

  const handleRegenerate = () => {
    if (messages.length === 0 || isGenerating) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content, lastUserMsg.attachments || []);
    }
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    const title = activeSession.title || 'orion-chat';
    let md = `# ${title}\n\n`;

    messages.forEach((msg) => {
      const sender = msg.role === 'user' ? 'User' : 'Orion';
      md += `**${sender}:**\n${msg.content}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Obrolan diunduh');
  };

  return (
    <div className="orion-layout">
      {/* Serene Monochrome Background Canvas */}
      <ConstellationCanvas theme={theme} />

      {/* Minimal Toast */}
      {toast && (
        <div className="orion-toast">
          <span>{toast}</span>
        </div>
      )}

      {/* Super Simple Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        theme={theme}
        onToggleTheme={toggleTheme}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* Main Area */}
      <main className="chat-main">
        {/* Minimal Navbar */}
        <header className="chat-navbar">
          <div className="nav-left">
            <button
              type="button"
              className="btn-toggle-sidebar"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Buka riwayat"
            >
              <Menu size={18} />
            </button>

            <span className="session-active-title">
              {activeSession ? activeSession.title : 'Orion'}
            </span>
          </div>

          <div className="nav-right">
            {messages.length > 0 && (
              <button
                type="button"
                className="nav-icon-action"
                onClick={handleExportChat}
                title="Ekspor obrolan (.md)"
                aria-label="Ekspor obrolan"
              >
                <Download size={15} />
              </button>
            )}

            {messages.length > 0 && (
              <button
                type="button"
                className="nav-icon-action"
                onClick={() => {
                  if (confirm('Bersihkan percakapan ini?')) {
                    setSessions((prev) =>
                      prev.map((s) => (s.id === activeSessionId ? { ...s, messages: [] } : s))
                    );
                  }
                }}
                title="Bersihkan"
                aria-label="Bersihkan"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </header>

        {/* Ambient Blue Surface Glow for New Chat (Fades out when chat starts) */}
        <div
          className={`ambient-blue-glow ${messages.length === 0 ? 'active' : ''}`}
          aria-hidden="true"
        >
          <div className="ambient-blob blob-center" />
          <div className="ambient-blob blob-left" />
          <div className="ambient-blob blob-right" />
        </div>

        {/* Message Stream or Super Simple Welcome Hero */}
        <div className="messages-container">
          {messages.length === 0 ? (
            /* Super Simple Welcome */
            <div className="welcome-hero-container">
              <div className="welcome-logo-badge">
                <OrionLogo size="lg" isGenerating={isGenerating} />
              </div>

              <h1 className="welcome-headline">
                Bagaimana saya bisa membantu hari ini?
              </h1>

              {/* Reserved slot for centered desktop input */}
              <div className="welcome-input-slot" aria-hidden="true" />

              {/* 3 Simple Starter Pills */}
              <div className="starters-list">
                {QUICK_STARTERS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="starter-pill"
                    onClick={() => handleSendMessage(prompt)}
                  >
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages Stream */
            <div className="messages-stream">
              {messages.map((msg, index) => {
                const isLast = index === messages.length - 1;
                const isStreamingThis = msg.role === 'assistant' && isLast && isGenerating;
                return (
                  <div
                    key={msg.id}
                    className={`message-bubble-row ${msg.role === 'user' ? 'user-side' : 'ai-side'}`}
                  >
                    <div className="message-content-col">
                      <div className="message-body-card">
                        {msg.role === 'user' ? (
                          <div className="user-message-wrapper">
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="msg-attachments-grid">
                                {msg.attachments.map((att) => (
                                  att.type === 'image' && att.data ? (
                                    <div
                                      key={att.id}
                                      className="msg-image-card"
                                      onClick={() => setPreviewImage(att)}
                                      title="Klik untuk memperbesar"
                                    >
                                      <img src={att.data} alt={att.name} />
                                      <div className="image-zoom-overlay">
                                        <Maximize2 size={16} />
                                      </div>
                                    </div>
                                  ) : (
                                    <div key={att.id} className="msg-file-card">
                                      <div className="msg-file-icon">
                                        {renderFileCategoryIcon(att.category)}
                                      </div>
                                      <div className="msg-file-details">
                                        <span className="msg-file-name" title={att.name}>{att.name}</span>
                                        <span className="msg-file-size">{formatFileSize(att.size)}</span>
                                      </div>
                                      {att.data && (
                                        <a
                                          href={att.data}
                                          download={att.name}
                                          className="msg-file-download-btn"
                                          title="Unduh berkas"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Download size={13} />
                                        </a>
                                      )}
                                    </div>
                                  )
                                ))}
                              </div>
                            )}
                            {msg.content && <div className="user-text-content">{msg.content}</div>}
                          </div>
                        ) : msg.content === '' ? (
                          <div className="thinking-row">
                            <div className="thinking-dots">
                              <span className="dot" />
                              <span className="dot" />
                              <span className="dot" />
                            </div>
                            <span className="thinking-shine-text">Thinking...</span>
                          </div>
                        ) : (
                          <FormattedMessage content={msg.content} isStreaming={isStreamingThis} />
                        )}
                      </div>

                    {/* Action Bar for AI Message */}
                    {msg.role === 'assistant' && msg.content !== '' && (
                      <div className="message-actions-bar">
                        <button
                          type="button"
                          className="msg-action-btn"
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          title="Salin jawaban"
                        >
                          {copiedMsgId === msg.id ? (
                            <>
                              <Check size={12} />
                              <span>Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Salin</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          className="msg-action-btn"
                          onClick={handleRegenerate}
                          title="Buat ulang"
                        >
                          <RotateCcw size={12} />
                          <span>Buat Ulang</span>
                        </button>
                      </div>
                    )}
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} className="messages-bottom-anchor" style={{ height: '3.5rem', flexShrink: 0 }} />
            </div>
          )}
        </div>

        {/* Super Simple Input Dock with Centered Hero State */}
        <ChatInput
          input={input}
          setInput={setInput}
          attachments={attachments}
          setAttachments={setAttachments}
          onSend={() => handleSendMessage()}
          isGenerating={isGenerating}
          isCentered={messages.length === 0}
        />
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onClearAllSessions={handleClearAllSessions}
      />

      {/* Image Lightbox Modal */}
      {previewImage && (
        <div
          className="image-lightbox-backdrop"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="image-lightbox-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lightbox-header">
              <span className="lightbox-filename">{previewImage.name}</span>
              <div className="lightbox-actions">
                {previewImage.data && (
                  <a
                    href={previewImage.data}
                    download={previewImage.name}
                    className="lightbox-action-btn"
                    title="Unduh gambar"
                  >
                    <Download size={16} />
                  </a>
                )}
                <button
                  type="button"
                  className="lightbox-action-btn"
                  onClick={() => setPreviewImage(null)}
                  title="Tutup (Esc)"
                  aria-label="Tutup preview gambar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="lightbox-image-container">
              <img src={previewImage.data} alt={previewImage.name} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
