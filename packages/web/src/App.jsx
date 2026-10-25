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
  Sparkles,
  Plus,
  ExternalLink,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Settings,
  ChevronRight,
  Code2,
  Cpu,
  ArrowUpRight,
  BookOpen,
  PenLine,
  Sprout,
  Compass,
  Lightbulb,
  Palette,
  RefreshCw,
  Square,
  ArrowLeft,
  MessageSquare,
} from 'lucide-react';
import AuroraBackground from './components/AuroraBackground';
import OrionLogo from './components/OrionLogo';

function GithubIcon({ size = 15, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}
import Sidebar from './components/Sidebar';
import ChatInput from './components/ChatInput';
import FormattedMessage from './components/FormattedMessage';
import SettingsModal from './components/SettingsModal';
import ManageProvidersModal from './components/ManageProvidersModal';
import ThinkingIndicator from './components/ThinkingIndicator';
import { soundEffects } from './utils/soundEffects';
import { formatFileSize } from './utils/fileHelpers';
import { isReasoningSupported } from './utils/modelConfig';
import './App.css';

function formatUserFacingError(errMessage) {
  if (!errMessage) {
    return '⚠️ **Gagal Terhubung ke Server AI**\n\nServer AI saat ini sedang tidak dapat dijangkau. Silakan periksa koneksi Anda dan coba lagi.';
  }

  const msg = errMessage.toLowerCase();

  // 1. API Key specific issues
  if (
    msg.includes('api key') ||
    msg.includes('apikey') ||
    msg.includes('unauthorized') ||
    msg.includes('401') ||
    msg.includes('forbidden') ||
    msg.includes('403') ||
    msg.includes('kredensial')
  ) {
    return `⚠️ **API Key Belum Diisi / Tidak Valid**\n\n${
      errMessage.includes('⚠️')
        ? errMessage
        : 'API Key untuk model ini belum dimasukkan atau tidak valid. Silakan buka menu **Provider** dan periksa kembali API Key Anda.'
    }`;
  }

  // 2. Server connectivity / 502 / Offline / Load failed
  if (
    msg.includes('load failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('network') ||
    msg.includes('econnrefused') ||
    msg.includes('offline')
  ) {
    return '⚠️ **Server AI Tidak Dapat Dihubungi**\n\nServer penyedia model AI saat ini sedang offline atau tidak dapat dijangkau. Silakan periksa koneksi internet Anda atau coba beberapa saat lagi.';
  }

  // 3. Rate limiting / Kuota
  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')) {
    return '⚠️ **Batas Permintaan Tercapai (Rate Limit)**\n\nTerlalu banyak permintaan dalam waktu singkat atau kuota habis. Silakan tunggu beberapa saat sebelum mencoba lagi.';
  }

  // 4. Default clean error message
  return `⚠️ **Terjadi Kendala Layanan**\n\n${errMessage}`;
}

const DYNAMIC_RECOMMENDATIONS_POOL = [
  {
    id: 'essay',
    icon: 'book',
    text: 'Help me outline an essay',
    prompt: 'Bantu saya menyusun kerangka esai yang terstruktur, tajam, dan persuasif.',
  },
  {
    id: 'bucket-list',
    icon: 'pen',
    text: 'Build a bucket list based on my dreams',
    prompt: 'Bantu saya menyusun bucket list bermakna berdasarkan impian dan target jangka panjang saya.',
  },
  {
    id: 'plant',
    icon: 'sprout',
    text: 'Tell me what’s wrong with my plant',
    prompt: 'Daun tanaman hias saya mulai menguning di bagian ujungnya, apa kemungkinan penyebabnya dan bagaimana cara merawatnya?',
  },
  {
    id: 'clean-arch',
    icon: 'code',
    text: 'Bantu rancang clean architecture Express.js',
    prompt: 'Bantu buatkan struktur clean architecture Express.js dengan ES Modules, dependency injection, dan repository pattern.',
  },
  {
    id: 'async-loop',
    icon: 'sparkles',
    text: 'Jelaskan konsep asynchronous dan event loop',
    prompt: 'Jelaskan konsep asynchronous, call stack, microtask queue, dan event loop di JavaScript dengan analogi visual.',
  },
  {
    id: 'ui-minimal',
    icon: 'pen',
    text: 'Bagaimana tips mendesain UI minimalis yang nyaman?',
    prompt: 'Bagaimana tips mendesain UI minimalis yang nyaman dibaca dengan prinsip cozy typography dan whitespace?',
  },
  {
    id: 'story',
    icon: 'book',
    text: 'Kembangkan ide cerita fiksi pendek misteri',
    prompt: 'Bantu kembangkan ide premis cerita fiksi pendek misteri dengan twist psikologis yang tak terduga.',
  },
  {
    id: 'morning-routine',
    icon: 'compass',
    text: 'Rancang rutinitas pagi untuk fokus mendalam',
    prompt: 'Rancang rutinitas pagi 45 menit tanpa layar HP untuk mencapai fokus mendalam sebelum jam kerja dimulai.',
  },
  {
    id: 'side-project',
    icon: 'lightbulb',
    text: 'Brainstorm 5 ide proyek sampingan berbasis AI',
    prompt: 'Berikan 5 ide proyek sampingan berbasis AI yang unik, aplikatif, dan realistis untuk diselesaikan dalam 1 bulan.',
  },
  {
    id: 'analogies',
    icon: 'compass',
    text: 'Jelaskan teori relativitas dengan analogi sehari-hari',
    prompt: 'Jelaskan konsep dasar teori relativitas umum Einstein menggunakan analogi visual sederhana sehari-hari.',
  },
  {
    id: 'color-palette',
    icon: 'palette',
    text: 'Inspirasi palet warna modern hangat & minimalis',
    prompt: 'Berikan rekomendasi palet warna modern bertema warm monochrome dan ivory paper untuk website portofolio.',
  },
  {
    id: 'learn-habit',
    icon: 'sprout',
    text: 'Strategi membaca & merangkum buku teknis',
    prompt: 'Bagaimana teknik efektif membaca dan mendokumentasikan intisari buku teknis agar dapat diterapkan langsung?',
  },
];

const getRandomRecommendations = (count = 3, currentIds = []) => {
  const filtered = DYNAMIC_RECOMMENDATIONS_POOL.filter(
    (item) => !currentIds.includes(item.id)
  );
  const poolToUse = filtered.length >= count ? filtered : DYNAMIC_RECOMMENDATIONS_POOL;
  const shuffled = [...poolToUse].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const renderRecommendationIcon = (iconName) => {
  switch (iconName) {
    case 'book':
      return <BookOpen size={15} strokeWidth={1.75} />;
    case 'pen':
      return <PenLine size={15} strokeWidth={1.75} />;
    case 'sprout':
      return <Sprout size={15} strokeWidth={1.75} />;
    case 'code':
      return <Code2 size={15} strokeWidth={1.75} />;
    case 'sparkles':
      return <Sparkles size={15} strokeWidth={1.75} />;
    case 'compass':
      return <Compass size={15} strokeWidth={1.75} />;
    case 'lightbulb':
      return <Lightbulb size={15} strokeWidth={1.75} />;
    case 'palette':
      return <Palette size={15} strokeWidth={1.75} />;
    default:
      return <Sparkles size={15} strokeWidth={1.75} />;
  }
};

export default function App() {
  // Theme mode state: 'system' (auto detect browser/OS), 'light' (default white), 'dark' (optional black)
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('orion_theme_mode') || 'system';
  });

  const getSystemTheme = () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light'; // default putih
  };

  const [theme, setTheme] = useState(() => {
    const savedMode = localStorage.getItem('orion_theme_mode') || 'system';
    if (savedMode === 'dark') return 'dark';
    if (savedMode === 'light') return 'light';
    return getSystemTheme();
  });

  // Apply theme to document attribute & storage
  useEffect(() => {
    const resolvedTheme = themeMode === 'system' ? getSystemTheme() : themeMode;
    setTheme(resolvedTheme);
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    localStorage.setItem('orion_theme_mode', themeMode);
  }, [themeMode]);

  // Dynamically listen to browser/OS system dark mode changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e) => {
      if (themeMode === 'system') {
        const nextTheme = e.matches ? 'dark' : 'light';
        setTheme(nextTheme);
        document.documentElement.setAttribute('data-theme', nextTheme);
      }
    };

    mq.addEventListener?.('change', handleSystemChange);
    return () => mq.removeEventListener?.('change', handleSystemChange);
  }, [themeMode]);

  const handleSelectThemeMode = (mode) => {
    setThemeMode(mode);
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

  // Custom Providers State (OpenAI, Gemini, Claude, Ollama, etc.)
  const [customProviders, setCustomProviders] = useState(() => {
    try {
      const saved = localStorage.getItem('orion_custom_providers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isManageProvidersOpen, setIsManageProvidersOpen] = useState(false);

  // Selected AI Model (Orion, Agnes 2.5 Flash, Nemotron 3, or Custom Provider ID)
  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem('orion_selected_model');
    if (saved) return saved;
    return 'orion';
  });

  const [reasoningTier, setReasoningTier] = useState(() => {
    const saved = localStorage.getItem('orion_reasoning_tier');
    if (saved === 'low' || saved === 'medium' || saved === 'high') return saved;
    return 'medium';
  });

  // Current View: 'dashboard' (Clean Home with Logo & Greeting) | 'chat' (Full Chat Area)
  const [currentView, setCurrentView] = useState('dashboard');

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'good morning';
    if (hour >= 12 && hour < 17) return 'good afternoon';
    if (hour >= 17 && hour < 21) return 'good evening';
    return 'good night';
  };

  // Rotating dynamic subtitles for dashboard to keep it fresh and inspiring
  const [subtitleIndex, setSubtitleIndex] = useState(0);

  const rotatingSubtitles = [
    'Welcome To Orion Agents',
    `What would you like to explore ${new Date().getHours() >= 17 || new Date().getHours() < 5 ? 'tonight' : 'today'}?`,
    'Your cosmic intelligence companion',
    'Siap membantu setiap pertanyaan dan kreativitasmu',
    'Let’s build something extraordinary together',
  ];

  useEffect(() => {
    if (currentView !== 'dashboard') return;
    const interval = setInterval(() => {
      setSubtitleIndex((prev) => (prev + 1) % rotatingSubtitles.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [currentView, rotatingSubtitles.length]);

  const handleNavigateView = (view) => {
    soundEffects.click?.();
    setCurrentView(view);
  };

  const handleSelectSession = (id) => {
    soundEffects.switchSession?.();
    setActiveSessionId(id);
    setCurrentView('chat');
  };

  const handleModelChange = (modelId) => {
    setSelectedModel(modelId);
    try {
      localStorage.setItem('orion_selected_model', modelId);
    } catch {
      // storage quota fallback
    }
  };

  const handleSaveCustomProvider = (providerData) => {
    setCustomProviders((prev) => {
      const exists = prev.some((p) => p.id === providerData.id);
      const next = exists
        ? prev.map((p) => (p.id === providerData.id ? providerData : p))
        : [...prev, providerData];
      try {
        localStorage.setItem('orion_custom_providers', JSON.stringify(next));
      } catch {}
      return next;
    });
    showToast(`Provider "${providerData.name}" berhasil disimpan.`);
  };

  const handleDeleteCustomProvider = (providerId) => {
    setCustomProviders((prev) => {
      const next = prev.filter((p) => p.id !== providerId);
      try {
        localStorage.setItem('orion_custom_providers', JSON.stringify(next));
      } catch {}
      return next;
    });
    if (selectedModel === providerId) {
      handleModelChange('orion');
    }
    showToast('Provider berhasil dihapus.');
  };

  const handleSelectCustomProvider = (providerId) => {
    handleModelChange(providerId);
    showToast('Provider berhasil dipilih.');
  };

  const handleReasoningTierChange = (tierId) => {
    setReasoningTier(tierId);
    try {
      localStorage.setItem('orion_reasoning_tier', tierId);
    } catch {
      // storage quota fallback
    }
  };

  // Dynamic recommendations: automatically randomized on each page reload / new session
  const [recommendations, setRecommendations] = useState(() =>
    getRandomRecommendations(3)
  );

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

  // Debounce localStorage persistence and avoid synchronous disk I/O while streaming
  useEffect(() => {
    if (isGenerating) return;
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('orion_chat_sessions', JSON.stringify(sessions));
      } catch {
        // storage quota
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [sessions, isGenerating]);

  const isScrollingRef = useRef(false);
  const scrollToBottom = (instant = false) => {
    if (!messagesEndRef.current) return;
    if (instant || isGenerating) {
      if (isScrollingRef.current) return;
      isScrollingRef.current = true;
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        isScrollingRef.current = false;
      });
    } else {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [];

  useEffect(() => {
    scrollToBottom(isGenerating);
  }, [messages, isGenerating]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const handleNewSession = () => {
    soundEffects.newChat?.();
    const newSession = {
      id: `session-${Date.now()}`,
      title: 'Percakapan Baru',
      createdAt: new Date().toISOString(),
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setRecommendations(getRandomRecommendations(3));
    setCurrentView('chat');
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

    let activeCustomProvider = null;
    if (selectedModel && selectedModel.includes('::')) {
      const [provId, modId] = selectedModel.split('::');
      const parentProv = customProviders.find((p) => p.id === provId);
      if (parentProv) {
        const activeKey = parentProv.apiKeys?.find((k) => k.active)?.key || parentProv.apiKey || '';
        activeCustomProvider = {
          baseUrl: parentProv.baseUrl,
          apiKey: activeKey,
          modelId: modId,
          name: parentProv.name,
        };
      }
    } else {
      activeCustomProvider = customProviders.find((p) => p.id === selectedModel) || null;
    }

    const modelSupportsReasoning = isReasoningSupported(
      selectedModel,
      activeCustomProvider?.modelId || activeCustomProvider?.name || ''
    );
    const activeReasoningTier = modelSupportsReasoning ? reasoningTier : null;

    const aiMessageId = `msg-ai-${Date.now()}`;
    const initialAiMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      model: selectedModel,
      reasoningTier: activeReasoningTier,
      customProvider: activeCustomProvider,
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

    let accumulated = '';
    let rafId = null;

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

    const orionProvider = (customProviders || []).find((p) => p.templateId === 'orion');
    const userOrionApiKey =
      orionProvider?.apiKeys?.find((k) => k.active)?.key || orionProvider?.apiKey || '';

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: displayPrompt,
          history: activeSession ? activeSession.messages : [],
          attachments: activeAttachments,
          model: selectedModel,
          reasoningTier: activeReasoningTier,
          customProvider: activeCustomProvider,
          orionApiKey: userOrionApiKey,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let lastCommit = 0;

      const throttleCommit = (text) => {
        const now = performance.now();
        if (now - lastCommit < 32) {
          if (!rafId) {
            rafId = requestAnimationFrame(() => {
              rafId = null;
              lastCommit = performance.now();
              commitUpdate(accumulated);
            });
          }
          return;
        }
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
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
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.chunk) {
              accumulated += parsed.chunk;
              hasNewChunk = true;
            }
          } catch (e) {
            if (e.message && !e.message.includes('JSON') && !e.message.includes('Unexpected')) {
              throw e;
            }
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
            model: selectedModel,
            reasoningTier: activeReasoningTier,
            customProvider: activeCustomProvider,
            orionApiKey: userOrionApiKey,
          }),
          signal: controller.signal,
        });
        if (fallbackRes.ok) {
          const json = await fallbackRes.json();
          accumulated = json.data.content;
          commitUpdate(accumulated);
        } else {
          const errJson = await fallbackRes.json().catch(() => ({}));
          throw new Error(errJson.message || `Layanan AI mengembalikan HTTP ${fallbackRes.status}`);
        }
      }

      if (!accumulated.trim()) {
        throw new Error('Tidak ada respon yang diterima dari server AI.');
      }

      soundEffects.playReceive();
    } catch (err) {
      console.error('Failed to get response:', err);
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      const isAbort = err.name === 'AbortError' || err.message?.includes('aborted');
      if (isAbort) {
        if (!accumulated.trim()) {
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id === activeSessionId) {
                return {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === aiMessageId ? { ...m, content: 'Respon dihentikan oleh pengguna.' } : m
                  ),
                };
              }
              return s;
            })
          );
        } else {
          commitUpdate(accumulated);
        }
        return;
      }

      const errorContent = formatUserFacingError(err.message);

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
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  // Keyboard shortcut: Press Escape to stop generation
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape' && isGenerating) {
        e.preventDefault();
        handleStopGeneration();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isGenerating]);

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
      {/* Dynamic WebGL Aurora Mesh Background (Only in Chat & Dashboard, completely inactive in Settings & Providers) */}
      <AuroraBackground
        active={currentView === 'chat' || currentView === 'dashboard'}
        inChat={currentView === 'chat' && messages.length > 0}
        theme={theme}
      />

      {/* Minimal Toast */}
      {toast && (
        <div className="orion-toast">
          <span>{toast}</span>
        </div>
      )}

      {/* Super Simple Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigateView}
        onOpenProviders={() => setIsManageProvidersOpen(true)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* Main Area */}
      <main className="chat-main">
        {/* Simple Transparent Header (No Background) */}
        <header className="chat-header-simple">
          <div className="header-simple-left">
            <button
              type="button"
              className="btn-toggle-sidebar"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Buka navigasi"
              title="Menu Navigasi"
            >
              <Menu size={18} />
            </button>
            {currentView !== 'dashboard' && (
              <button
                type="button"
                className="btn-header-back-home"
                onClick={() => setCurrentView('dashboard')}
                title="Kembali ke Dashboard Utama"
              >
                <ArrowLeft size={13} />
                <span>Dashboard</span>
              </button>
            )}
          </div>

          <div className="header-simple-center">
            {currentView === 'chat' && messages.length > 0 && (
              <span className="session-active-title">
                {activeSession ? activeSession.title : 'Orion'}
              </span>
            )}
            {currentView === 'providers' && (
              <span className="session-active-title">Kelola Provider AI</span>
            )}
            {currentView === 'settings' && (
              <span className="session-active-title">Pengaturan</span>
            )}
          </div>

          <div className="header-simple-right">
            <button
              type="button"
              className="btn-simple-new-chat"
              onClick={() => {
                handleNewSession();
                setCurrentView('chat');
              }}
              title="Mulai Obrolan Baru"
            >
              <Plus size={14} />
              <span>Chat Baru</span>
            </button>

            {currentView === 'chat' && messages.length > 0 && (
              <>
                <button
                  type="button"
                  className="nav-icon-simple"
                  onClick={handleExportChat}
                  title="Ekspor obrolan (.md)"
                  aria-label="Ekspor obrolan"
                >
                  <Download size={15} />
                </button>

                <button
                  type="button"
                  className="nav-icon-simple"
                  onClick={() => {
                    if (confirm('Bersihkan percakapan ini?')) {
                      setSessions((prev) =>
                        prev.map((s) => (s.id === activeSessionId ? { ...s, messages: [] } : s))
                      );
                    }
                  }}
                  title="Bersihkan obrolan"
                  aria-label="Bersihkan obrolan"
                >
                  <Trash2 size={15} />
                </button>
              </>
            )}

            <button
              type="button"
              className={`nav-icon-simple ${currentView === 'settings' ? 'active' : ''}`}
              onClick={() => setCurrentView(currentView === 'settings' ? 'dashboard' : 'settings')}
              title="Pengaturan"
              aria-label="Pengaturan"
            >
              <Settings size={15} />
            </button>
          </div>
        </header>

        {/* Dynamic Page Views: Providers, Settings, or Chat/Dashboard */}
        {currentView === 'providers' ? (
          <ManageProvidersModal
            isOpen={true}
            isPage={true}
            onClose={() => setCurrentView('dashboard')}
            customProviders={customProviders}
            activeProviderId={selectedModel}
            onSaveProvider={handleSaveCustomProvider}
            onDeleteProvider={handleDeleteCustomProvider}
            onSelectProvider={(provId) => {
              handleModelChange(provId);
              setCurrentView('chat');
            }}
          />
        ) : currentView === 'settings' ? (
          <SettingsModal
            isOpen={true}
            isPage={true}
            onClose={() => setCurrentView('dashboard')}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled((prev) => !prev)}
            themeMode={themeMode}
            theme={theme}
            onSelectThemeMode={handleSelectThemeMode}
            onClearAllSessions={handleClearAllSessions}
          />
        ) : (
          <>
            {/* Message Stream or Unified Spatial Hero (Seamless shared elements) */}
            <div className={`messages-container ${(messages.length === 0 || currentView === 'dashboard') ? 'is-empty' : ''}`}>
              {(messages.length === 0 || currentView === 'dashboard') ? (
                /* Unified Hero Container (Persists seamlessly across Dashboard & Chat) */
                <div className={`welcome-hero-container ${currentView === 'dashboard' ? 'is-dashboard-mode' : 'is-chat-mode'}`}>
                  <div className="welcome-logo-badge">
                    <OrionLogo size="lg" isGenerating={isGenerating} />
                  </div>

              {/* Seamless Text Morph */}
              <div className="welcome-titles-wrapper">
                {currentView === 'dashboard' ? (
                  <div key="dashboard-titles" className="welcome-text-fader animate-title-fade">
                    <h1 className="welcome-headline compact-gap">
                      {`Hi Arjuna, ${getTimeGreeting()}`.split('').map((char, index) => (
                        <span
                          key={`greet-${char}-${index}`}
                          className="blur-char"
                          style={{ animationDelay: `${0.06 + index * 0.024}s` }}
                        >
                          {char === ' ' ? '\u00A0' : char}
                        </span>
                      ))}
                    </h1>

                    <div className="dashboard-rotating-subtitle" key={subtitleIndex}>
                      {rotatingSubtitles[subtitleIndex].split('').map((char, index) => (
                        <span
                          key={`sub-${subtitleIndex}-${char}-${index}`}
                          className="blur-subtitle-char"
                          style={{ animationDelay: `${0.04 + index * 0.02}s` }}
                        >
                          {char === ' ' ? '\u00A0' : char}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div key="chat-titles" className="welcome-text-fader animate-title-fade">
                    <h1 className="welcome-headline compact-gap">
                      {'Hi Arjuna, what’s on your mind?'.split('').map((char, index) => (
                        <span
                          key={`chat-${char}-${index}`}
                          className="blur-char"
                          style={{ animationDelay: `${0.05 + index * 0.022}s` }}
                        >
                          {char === ' ' ? '\u00A0' : char}
                        </span>
                      ))}
                    </h1>
                  </div>
                )}
              </div>

              {/* Reserved spatial slot for floating centered input (Smooth collapse/expand) */}
              <div
                className={`welcome-input-slot ${currentView === 'dashboard' ? 'is-collapsed' : 'is-expanded'}`}
                aria-hidden="true"
              />

              {/* Minimalist Dynamic Recommendations (Smooth slide-up entrance) */}
              <div className={`dynamic-recs-wrapper ${currentView === 'dashboard' ? 'is-hidden-recs' : 'is-visible-recs'}`}>
                <div className="dynamic-recs-header">
                  <span className="dynamic-recs-caption">Rekomendasi</span>
                </div>

                <div className="dynamic-recs-list">
                  {recommendations.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="dynamic-rec-row"
                      onClick={() => {
                        handleSendMessage(item.prompt);
                        setCurrentView('chat');
                      }}
                    >
                      <span className="dynamic-rec-icon">
                        {renderRecommendationIcon(item.icon)}
                      </span>
                      <span className="dynamic-rec-text">{item.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Messages Stream (Active conversation in Chat view) */
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
                          <ThinkingIndicator
                            model={msg.model || selectedModel}
                            reasoningTier={msg.reasoningTier || reasoningTier}
                          />
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

                          {isLast && !isGenerating && (
                            <button
                              type="button"
                              className="msg-action-btn"
                              onClick={handleRegenerate}
                              title="Buat ulang"
                            >
                              <RotateCcw size={12} />
                              <span>Buat Ulang</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} className="messages-bottom-anchor" style={{ height: '7.5rem', flexShrink: 0 }} />
            </div>
          )}
        </div>

        {/* Persistent Chat Input with Seamless Glide Animation from Bottom */}
        <ChatInput
          input={input}
          setInput={setInput}
          attachments={attachments}
          setAttachments={setAttachments}
          onSend={() => handleSendMessage()}
          onStop={handleStopGeneration}
          isGenerating={isGenerating}
          isCentered={messages.length === 0 || currentView === 'dashboard'}
          isHiddenDashboard={currentView === 'dashboard'}
          selectedModel={selectedModel}
          setSelectedModel={handleModelChange}
          reasoningTier={reasoningTier}
          setReasoningTier={handleReasoningTierChange}
          customProviders={customProviders}
          onOpenManageProviders={() => setCurrentView('providers')}
        />
          </>
        )}
      </main>

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
