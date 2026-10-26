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
  Terminal,
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
import LogsView from './components/LogsView';
import ModelsView from './components/ModelsView';
import ThinkingIndicator from './components/ThinkingIndicator';
import { soundEffects } from './utils/soundEffects';
import { formatFileSize } from './utils/fileHelpers';
import { isReasoningSupported } from './utils/modelConfig';
import VoiceCallingOverlay from './components/VoiceCallingOverlay';
import { playCosmicHumSound, playCosmicEndCallSound } from './utils/audioEffects';
import { cleanIndonesianText } from './utils/textCleaner';
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

/**
 * Resolves active provider, model ID, and API keys based on the user's selected model.
 */
function resolveModelAndProvider(targetModel, providersList) {
  const orionProvider = (providersList || []).find(
    (p) => p.id === 'orion' || p.templateId === 'orion' || p.name?.toLowerCase().includes('official')
  );
  const userOrionApiKey =
    orionProvider?.apiKeys?.find((k) => k.active)?.key || orionProvider?.apiKey || '';

  let activeCustomProvider = null;
  let effectiveModel = targetModel || 'orion::orion';

  if (targetModel && targetModel.includes('::')) {
    const [provId, modId] = targetModel.split('::');
    const parentProv = (providersList || []).find((p) => p.id === provId);
    if (parentProv) {
      let activeKey = parentProv.apiKeys?.find((k) => k.active)?.key || parentProv.apiKey || '';
      if (!activeKey && (provId === 'orion' || parentProv.templateId === 'orion' || parentProv.name?.toLowerCase().includes('official'))) {
        activeKey = userOrionApiKey;
      }
      activeCustomProvider = {
        id: parentProv.id,
        baseUrl: parentProv.baseUrl,
        apiKey: activeKey,
        modelId: modId,
        name: parentProv.name,
        requiresApiKey: parentProv.requiresApiKey,
      };
    }
  } else if (targetModel) {
    for (const p of providersList || []) {
      const foundMod = (p.models || []).find((m) => (typeof m === 'string' ? m === targetModel : m.id === targetModel && m.enabled));
      if (foundMod) {
        const modId = typeof foundMod === 'string' ? foundMod : foundMod.id;
        effectiveModel = `${p.id}::${modId}`;
        let activeKey = p.apiKeys?.find((k) => k.active)?.key || p.apiKey || '';
        if (!activeKey && (p.id === 'orion' || p.templateId === 'orion' || p.name?.toLowerCase().includes('official'))) {
          activeKey = userOrionApiKey;
        }
        activeCustomProvider = {
          id: p.id,
          baseUrl: p.baseUrl,
          apiKey: activeKey,
          modelId: modId,
          name: p.name,
          requiresApiKey: p.requiresApiKey,
        };
        break;
      }
    }
  }

  if (!activeCustomProvider && (providersList || []).length > 0) {
    for (const p of providersList) {
      const firstEnabled = (p.models || []).find((m) => m && m.enabled);
      if (firstEnabled) {
        const modId = typeof firstEnabled === 'string' ? firstEnabled : firstEnabled.id;
        effectiveModel = `${p.id}::${modId}`;
        let activeKey = p.apiKeys?.find((k) => k.active)?.key || p.apiKey || '';
        if (!activeKey && (p.id === 'orion' || p.templateId === 'orion' || p.name?.toLowerCase().includes('official'))) {
          activeKey = userOrionApiKey;
        }
        activeCustomProvider = {
          id: p.id,
          baseUrl: p.baseUrl,
          apiKey: activeKey,
          modelId: modId,
          name: p.name,
          requiresApiKey: p.requiresApiKey,
        };
        break;
      }
    }
  }

  return { effectiveModel, activeCustomProvider, userOrionApiKey };
}

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

  // Sessions state (automatically cleans any interrupted empty assistant bubbles)
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('orion_chat_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((s) => ({
            ...s,
            messages: (s.messages || []).filter(
              (m) => !(m.role === 'assistant' && (!m.content || m.content.trim() === ''))
            ),
          }));
        }
      }
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
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Discard any stale legacy official provider containing hardcoded models
        return parsed.filter((p) => {
          if (p.id === 'orion' && p.models?.some((m) => (m.id || m) === 'orion-auto' || (m.name || m) === 'Orion Auto Router')) {
            return false;
          }
          return true;
        });
      }
      return [];
    } catch {
      return [];
    }
  });
  const [isManageProvidersOpen, setIsManageProvidersOpen] = useState(false);

  // Selected AI Model (Dynamic format: providerId::modelId, e.g. orion::orion)
  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem('orion_selected_model');
    if (saved === 'orion') return 'orion::orion';
    if (saved === 'agnes' || saved === 'agnes-2.5-flash') return 'orion::agnes-2.5-flash';
    if (saved === 'nemotron-3') return 'orion::nemotron-3';
    if (saved) return saved;
    return 'orion::orion';
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

  // AI Voice Calling State & Real-time Microphone Audio Analyzer
  const [isVoiceCalling, setIsVoiceCalling] = useState(false);
  const [voiceAudioLevel, setVoiceAudioLevel] = useState(0);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [voiceAgentStatus, setVoiceAgentStatus] = useState('listening'); // 'listening' | 'thinking' | 'speaking'
  const [voiceUserTranscript, setVoiceUserTranscript] = useState('');
  const [voiceAgentResponse, setVoiceAgentResponse] = useState('');
  const [voiceResponseTurn, setVoiceResponseTurn] = useState(0);

  const voiceMediaStreamRef = useRef(null);
  const voiceAudioContextRef = useRef(null);
  const voiceAnalyserRef = useRef(null);
  const voiceRafIdRef = useRef(null);
  const voiceSpeechRecRef = useRef(null);
  const voiceSilenceTimerRef = useRef(null);
  const voiceTranscriptAccumulatorRef = useRef('');
  const voiceIsProcessingQueryRef = useRef(false);
  const voiceAbortControllerRef = useRef(null);
  const voiceTtsAudioRef = useRef(null);
  const voiceTtsBlobUrlRef = useRef(null);
  const voiceTtsAnimIntervalRef = useRef(null);
  const voiceTtsSourceRef = useRef(null);

  const isVoiceCallingRef = useRef(false);
  isVoiceCallingRef.current = isVoiceCalling;

  const isVoiceMutedRef = useRef(false);
  isVoiceMutedRef.current = isVoiceMuted;

  const selectedModelRef = useRef(selectedModel);
  selectedModelRef.current = selectedModel;

  const customProvidersRef = useRef(customProviders);
  customProvidersRef.current = customProviders;

  const voiceSelectedModelRef = useRef(selectedModel);

  // Real-time Speech-to-Text Recognition Setup
  const startVoiceSpeechRecognition = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn('SpeechRecognition API not available in this browser');
      showToast('Browser ini (Zen/Firefox) belum mendukung Web Speech. Silakan buka di Safari atau Chrome untuk transkripsi suara.');
      return;
    }

    try {
      if (voiceSpeechRecRef.current) {
        try { voiceSpeechRecRef.current.stop(); } catch {}
      }

      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'id-ID';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        if (voiceIsProcessingQueryRef.current || isVoiceMutedRef.current) return;

        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const currentSpeech = (final || interim).trim();
        if (currentSpeech) {
          voiceTranscriptAccumulatorRef.current = currentSpeech;
          setVoiceUserTranscript(currentSpeech);

          // Reset silence timer on new utterance
          if (voiceSilenceTimerRef.current) {
            clearTimeout(voiceSilenceTimerRef.current);
          }

          // User stops talking: 1500ms silence threshold triggers agent thinking & response
          voiceSilenceTimerRef.current = setTimeout(() => {
            const query = voiceTranscriptAccumulatorRef.current.trim();
            if (query.length >= 2 && !voiceIsProcessingQueryRef.current && isVoiceCallingRef.current) {
              handleTriggerVoiceAgentResponse(query);
            }
          }, 1500);
        }
      };

      recognition.onerror = (e) => {
        // no-speech is normal during pauses
        if (e.error === 'no-speech' && isVoiceCallingRef.current && !voiceIsProcessingQueryRef.current) {
          // ignore
        }
      };

      recognition.onend = () => {
        // Keep listening alive unless muted or processing agent reply
        if (isVoiceCallingRef.current && !voiceIsProcessingQueryRef.current && !isVoiceMutedRef.current) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognition.start();
      voiceSpeechRecRef.current = recognition;
    } catch (err) {
      console.warn('Speech recognition start error:', err);
    }
  };

  const handleTriggerVoiceAgentResponse = async (queryText) => {
    if (!queryText || voiceIsProcessingQueryRef.current || !isVoiceCallingRef.current) return;
    voiceIsProcessingQueryRef.current = true;
    if (voiceSilenceTimerRef.current) {
      clearTimeout(voiceSilenceTimerRef.current);
      voiceSilenceTimerRef.current = null;
    }

    // 1. Stop any currently playing TTS audio before starting a new turn
    if (voiceTtsAnimIntervalRef.current) {
      clearInterval(voiceTtsAnimIntervalRef.current);
      voiceTtsAnimIntervalRef.current = null;
    }
    if (voiceTtsAudioRef.current) {
      try {
        voiceTtsAudioRef.current.pause();
        voiceTtsAudioRef.current.currentTime = 0;
      } catch {}
      voiceTtsAudioRef.current = null;
    }

    // 2. Temporarily mute user mic so background noise doesn't interfere while agent thinks & speaks
    if (voiceMediaStreamRef.current) {
      voiceMediaStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = false; });
    }
    if (voiceSpeechRecRef.current) {
      try { voiceSpeechRecRef.current.stop(); } catch {}
    }
    setVoiceAudioLevel(0);

    // 3. Set Agent Status to Thinking (keep prior response visible until next answer is ready)
    setVoiceAgentStatus('thinking');
    setVoiceUserTranscript(queryText);

    const controller = new AbortController();
    voiceAbortControllerRef.current = controller;

    let accumulatedReply = '';

    try {
      // Use the model selected before starting the voice call
      const modelToUse = voiceSelectedModelRef.current || selectedModelRef.current || selectedModel;
      const { effectiveModel, activeCustomProvider, userOrionApiKey } = resolveModelAndProvider(
        modelToUse,
        customProvidersRef.current || customProviders
      );

      // Voice prompt: explicit instruction for short, punchy, conversational spoken reply with standard spacing
      const voicePrompt = `${queryText}\n\n[Instruksi Panggilan Suara]: Jawablah secara SINGKAT, PADAT, BERBOBOT, dan natural seperti berbicara di telepon (maksimal 1-2 kalimat saja). Wajib gunakan spasi pemisah antar kata yang benar dan normal (jangan menggabungkan kata). DILARANG menggunakan markdown, bullet points, atau kode.`;

      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: voicePrompt,
          history: activeSession ? activeSession.messages : [],
          attachments: [],
          model: effectiveModel || modelToUse,
          reasoningTier: 'low',
          customProvider: activeCustomProvider,
          orionApiKey: userOrionApiKey,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error('Gagal menghubungi AI');
      }

      // Collect complete LLM response while agent remains in "thinking" state
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '').trim();
          if (dataStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            const token = parsed.chunk || parsed.token || parsed.delta || parsed.content || '';
            if (token) {
              accumulatedReply += token;
            }
          } catch (e) {
            if (e.message && !e.message.includes('JSON') && !e.message.includes('Unexpected')) {
              throw e;
            }
          }
        }
      }

      let finalAnswer = cleanIndonesianText(
        accumulatedReply
          .replace(/<think>[\s\S]*?<\/think>/gi, '')
          .replace(/<think>[\s\S]*$/gi, '')
          .replace(/[*#_`~]/g, '')
      );

      // Fallback if stream was empty
      if (!finalAnswer) {
        try {
          const fallbackRes = await fetch('/api/chat/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: voicePrompt,
              history: activeSession ? activeSession.messages : [],
              model: effectiveModel || modelToUse,
              reasoningTier: 'low',
              customProvider: activeCustomProvider,
              orionApiKey: userOrionApiKey,
            }),
            signal: controller.signal,
          });
          if (fallbackRes.ok) {
            const json = await fallbackRes.json();
            const fallbackContent = json.data?.content || json.reply || '';
            finalAnswer = cleanIndonesianText(
              fallbackContent
                .replace(/<think>[\s\S]*?<\/think>/gi, '')
                .replace(/<think>[\s\S]*$/gi, '')
                .replace(/[*#_`~]/g, '')
            );
          }
        } catch {}
      }

      if (!finalAnswer) {
        finalAnswer = 'Halo, saya mendengar Anda. Ada yang bisa saya bantu?';
      }

      // Record this exchange in active session messages
      const userMsg = {
        id: `msg-v-user-${Date.now()}`,
        role: 'user',
        content: queryText,
        timestamp: new Date().toISOString(),
      };
      const aiMsg = {
        id: `msg-v-ai-${Date.now()}`,
        role: 'assistant',
        content: finalAnswer,
        model: effectiveModel || modelToUse,
        timestamp: new Date().toISOString(),
      };
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, messages: [...s.messages, userMsg, aiMsg] } : s))
      );

      // 4. Synthesize voice audio (multi-female) while still in thinking state ("menyusun suara")
      let audioBlob = null;
      try {
        const ttsRes = await fetch('/api/tts/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: finalAnswer,
            voice: 'multi-female',
          }),
          signal: controller.signal,
        });
        if (ttsRes.ok) {
          audioBlob = await ttsRes.blob();
        }
      } catch (ttsErr) {
        if (ttsErr.name !== 'AbortError') {
          console.warn('TTS fetch notice:', ttsErr.message);
        }
      }

      if (!isVoiceCallingRef.current) return;

      // 5. Munculkan teks dan audionya ketika sudah selesai!
      setVoiceResponseTurn((prev) => prev + 1);
      setVoiceAgentResponse(finalAnswer);
      setVoiceUserTranscript('');
      setVoiceAgentStatus('speaking');

      if (audioBlob && audioBlob.size > 0) {
        let playedViaWebAudio = false;

        // Primary: Web Audio API buffer playback (Safari & Chrome autoplay immune)
        if (voiceAudioContextRef.current && voiceAudioContextRef.current.state !== 'closed') {
          try {
            const audioCtx = voiceAudioContextRef.current;
            if (audioCtx.state === 'suspended') {
              await audioCtx.resume();
            }

            const arrayBuf = await audioBlob.arrayBuffer();
            const decodedBuffer = await new Promise((resolveDecode, rejectDecode) => {
              const res = audioCtx.decodeAudioData(arrayBuf, resolveDecode, rejectDecode);
              if (res && typeof res.then === 'function') {
                res.then(resolveDecode).catch(rejectDecode);
              }
            });

            const source = audioCtx.createBufferSource();
            source.buffer = decodedBuffer;
            voiceTtsSourceRef.current = source;

            // Connect output to speaker
            source.connect(audioCtx.destination);

            // Animate organic aurora waves while Orion speaks
            voiceTtsAnimIntervalRef.current = setInterval(() => {
              const simLevel = 0.28 + 0.32 * Math.sin(Date.now() / 150) + 0.16 * Math.cos(Date.now() / 95);
              setVoiceAudioLevel(Math.max(0.16, Math.min(0.85, simLevel)));
            }, 50);

            await new Promise((resolvePlay) => {
              source.onended = () => {
                if (voiceTtsAnimIntervalRef.current) {
                  clearInterval(voiceTtsAnimIntervalRef.current);
                  voiceTtsAnimIntervalRef.current = null;
                }
                voiceTtsSourceRef.current = null;
                setVoiceAudioLevel(0);
                resolvePlay();
              };
              source.start(0);
            });
            playedViaWebAudio = true;
          } catch (webAudioErr) {
            console.warn('Web Audio decode notice, falling back to HTMLAudio:', webAudioErr);
          }
        }

        // Secondary Fallback: HTML Audio Element
        if (!playedViaWebAudio) {
          if (voiceTtsBlobUrlRef.current) {
            try { URL.revokeObjectURL(voiceTtsBlobUrlRef.current); } catch {}
          }
          const audioUrl = URL.createObjectURL(audioBlob);
          voiceTtsBlobUrlRef.current = audioUrl;

          const audio = new Audio(audioUrl);
          voiceTtsAudioRef.current = audio;

          voiceTtsAnimIntervalRef.current = setInterval(() => {
            if (voiceTtsAudioRef.current && !voiceTtsAudioRef.current.paused) {
              const simLevel = 0.28 + 0.32 * Math.sin(Date.now() / 150) + 0.16 * Math.cos(Date.now() / 95);
              setVoiceAudioLevel(Math.max(0.16, Math.min(0.85, simLevel)));
            }
          }, 50);

          await new Promise((resolve) => {
            audio.onended = () => {
              if (voiceTtsAnimIntervalRef.current) {
                clearInterval(voiceTtsAnimIntervalRef.current);
                voiceTtsAnimIntervalRef.current = null;
              }
              setVoiceAudioLevel(0);
              resolve();
            };
            audio.onerror = (err) => {
              console.warn('Audio playback error:', err);
              if (voiceTtsAnimIntervalRef.current) {
                clearInterval(voiceTtsAnimIntervalRef.current);
                voiceTtsAnimIntervalRef.current = null;
              }
              setVoiceAudioLevel(0);
              resolve();
            };
            audio.play().catch((playErr) => {
              console.warn('Audio playback start notice:', playErr);
              if (voiceTtsAnimIntervalRef.current) {
                clearInterval(voiceTtsAnimIntervalRef.current);
                voiceTtsAnimIntervalRef.current = null;
              }
              setVoiceAudioLevel(0);
              resolve();
            });
          });
        }
      } else {
        // Fallback duration if audio not available
        await new Promise((resolve) => setTimeout(resolve, Math.min(4500, Math.max(1600, finalAnswer.length * 50))));
      }

      // Small natural pause before mic turns back on
      await new Promise((resolve) => setTimeout(resolve, 350));

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Voice processing error:', err);
        setVoiceResponseTurn((prev) => prev + 1);
        setVoiceUserTranscript('');
        setVoiceAgentResponse('Maaf, suara kurang jelas. Bisa tolong diulangi?');
      }
    } finally {
      if (voiceTtsAnimIntervalRef.current) {
        clearInterval(voiceTtsAnimIntervalRef.current);
        voiceTtsAnimIntervalRef.current = null;
      }
      // 6. Selesai bicara: mikrofon dibuka kembali untuk pertanyaan berikutnya, teks tetap terlihat
      if (isVoiceCallingRef.current) {
        voiceIsProcessingQueryRef.current = false;
        voiceTranscriptAccumulatorRef.current = '';
        setVoiceUserTranscript('');
        setVoiceAgentStatus('listening');
        setVoiceAudioLevel(0);

        // Unmute audio tracks if not manually muted by user
        if (voiceMediaStreamRef.current && !isVoiceMutedRef.current) {
          voiceMediaStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = true; });
        }

        // Restart Speech Recognition
        if (!isVoiceMutedRef.current) {
          startVoiceSpeechRecognition();
        }
      }
    }
  };

  const handleStartVoiceCalling = async () => {
    try {
      voiceSelectedModelRef.current = selectedModel;
      playCosmicHumSound();
      setIsVoiceCalling(true);
      setIsVoiceMuted(false);
      setVoiceAgentStatus('listening');
      setVoiceUserTranscript('');
      setVoiceAgentResponse('');
      voiceTranscriptAccumulatorRef.current = '';
      voiceIsProcessingQueryRef.current = false;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Akses mikrofon tidak didukung di browser ini');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      voiceMediaStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      voiceAudioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.65;
      voiceAnalyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const freqData = new Uint8Array(bufferLength);
      const timeData = new Uint8Array(bufferLength);

      let smoothedLevel = 0;

      const analyzeAudio = () => {
        if (!voiceAnalyserRef.current) return;
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);

        // 1. Time-domain RMS and peak deviation (vital for immediate reaction to shouting or loud voice)
        let maxDeviation = 0;
        let sumSquares = 0;
        for (let i = 0; i < bufferLength; i++) {
          const deviation = Math.abs(timeData[i] - 128) / 128;
          if (deviation > maxDeviation) maxDeviation = deviation;
          sumSquares += deviation * deviation;
        }
        const rms = Math.sqrt(sumSquares / bufferLength);

        // 2. Focused vocal frequency range (bins 2 to 36 ~ 150Hz to 3.2kHz)
        let vocalSum = 0;
        const vocalBins = Math.min(36, bufferLength);
        for (let i = 2; i < vocalBins; i++) {
          vocalSum += freqData[i];
        }
        const vocalAvg = vocalSum / (vocalBins - 2) / 255;

        // Balanced audio energy with realistic noise gate (ignores mic background hiss)
        const combinedEnergy = rms * 2.8 + maxDeviation * 0.8 + vocalAvg * 1.6;
        const gatedEnergy = Math.max(0, combinedEnergy - 0.10);
        const instantLevel = Math.min(1.0, gatedEnergy * 1.35);

        // Natural, smooth organic interpolation
        const factor = instantLevel > smoothedLevel ? 0.30 : 0.12;
        smoothedLevel += (instantLevel - smoothedLevel) * factor;

        setVoiceAudioLevel(smoothedLevel);

        voiceRafIdRef.current = requestAnimationFrame(analyzeAudio);
      };

      voiceRafIdRef.current = requestAnimationFrame(analyzeAudio);

      // Start Real-time Speech-to-Text Transcription
      startVoiceSpeechRecognition();
    } catch (err) {
      console.warn('Microphone access error:', err);
      showToast('Gagal mengakses mikrofon: ' + (err.message || 'Izin ditolak'));
      handleEndVoiceCalling();
    }
  };

  const handleEndVoiceCalling = () => {
    playCosmicEndCallSound();
    if (voiceTtsSourceRef.current) {
      try {
        voiceTtsSourceRef.current.stop();
      } catch {}
      voiceTtsSourceRef.current = null;
    }
    if (voiceTtsAnimIntervalRef.current) {
      clearInterval(voiceTtsAnimIntervalRef.current);
      voiceTtsAnimIntervalRef.current = null;
    }
    if (voiceTtsAudioRef.current) {
      try {
        voiceTtsAudioRef.current.pause();
        voiceTtsAudioRef.current.currentTime = 0;
      } catch {}
      voiceTtsAudioRef.current = null;
    }
    if (voiceTtsBlobUrlRef.current) {
      try { URL.revokeObjectURL(voiceTtsBlobUrlRef.current); } catch {}
      voiceTtsBlobUrlRef.current = null;
    }
    setIsVoiceCalling(false);
    setVoiceAudioLevel(0);
    setIsVoiceMuted(false);
    setVoiceAgentStatus('listening');
    setVoiceUserTranscript('');
    setVoiceAgentResponse('');
    setVoiceResponseTurn(0);
    voiceTranscriptAccumulatorRef.current = '';
    voiceIsProcessingQueryRef.current = false;

    if (voiceAbortControllerRef.current) {
      voiceAbortControllerRef.current.abort();
      voiceAbortControllerRef.current = null;
    }

    if (voiceSilenceTimerRef.current) {
      clearTimeout(voiceSilenceTimerRef.current);
      voiceSilenceTimerRef.current = null;
    }

    if (voiceSpeechRecRef.current) {
      try { voiceSpeechRecRef.current.stop(); } catch {}
      voiceSpeechRecRef.current = null;
    }

    if (voiceRafIdRef.current) {
      cancelAnimationFrame(voiceRafIdRef.current);
      voiceRafIdRef.current = null;
    }

    if (voiceMediaStreamRef.current) {
      voiceMediaStreamRef.current.getTracks().forEach((track) => track.stop());
      voiceMediaStreamRef.current = null;
    }

    if (voiceAudioContextRef.current) {
      voiceAudioContextRef.current.close().catch(() => {});
      voiceAudioContextRef.current = null;
    }
    voiceAnalyserRef.current = null;
  };

  const handleToggleVoiceMute = () => {
    const newMuted = !isVoiceMuted;
    setIsVoiceMuted(newMuted);

    if (voiceMediaStreamRef.current) {
      const audioTracks = voiceMediaStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => {
        t.enabled = !newMuted;
      });
    }

    if (newMuted) {
      setVoiceAudioLevel(0);
      if (voiceSpeechRecRef.current) {
        try { voiceSpeechRecRef.current.stop(); } catch {}
      }
    } else {
      if (!voiceIsProcessingQueryRef.current) {
        startVoiceSpeechRecognition();
      }
    }
  };

  // Keyboard shortcut: Escape to close voice calling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isVoiceCalling) {
        handleEndVoiceCalling();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVoiceCalling]);

  // Clean up media streams and audio context on unmount
  useEffect(() => {
    return () => {
      if (voiceRafIdRef.current) cancelAnimationFrame(voiceRafIdRef.current);
      if (voiceMediaStreamRef.current) {
        voiceMediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (voiceAudioContextRef.current) {
        voiceAudioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleNavigateView = (view) => {
    soundEffects.click?.();
    setCurrentView(view);
  };

  const handleSelectSession = (id) => {
    soundEffects.switchSession?.();
    setActiveSessionId(id);
    setCurrentView('chat');
  };

  const syncProvidersToServer = (providersList, model = selectedModel, tier = reasoningTier) => {
    fetch('/api/chat/providers-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providers: providersList,
        selectedModel: model,
        reasoningTier: tier,
      }),
    }).catch(() => {});
  };

  // Sync custom providers, models & API keys with server / filesystem (~/.orion/providers.json)
  const syncConfigFromServer = () => {
    fetch('/api/chat/providers-config')
      .then((res) => res.json())
      .then((data) => {
        if (!data || !data.success) return;
        const serverProviders = Array.isArray(data.providers) ? data.providers : [];
        const hasServerOfficial = serverProviders.some(
          (p) => p.templateId === 'orion' || p.name?.toLowerCase().includes('official') || p.id === 'orion'
        );

        const localSaved = localStorage.getItem('orion_custom_providers');
        let localProviders = [];
        try {
          if (localSaved) localProviders = JSON.parse(localSaved);
        } catch {}

        // Discard stale legacy or duplicate official provider from local storage
        localProviders = (localProviders || []).filter((p) => {
          if (!p || !p.id) return false;
          const isOfficial = p.templateId === 'orion' || p.name?.toLowerCase().includes('official') || p.id === 'orion';
          if (isOfficial && hasServerOfficial) {
            const officialServer = serverProviders.find(
              (sp) => sp.templateId === 'orion' || sp.name?.toLowerCase().includes('official') || sp.id === 'orion'
            );
            return p.id === officialServer?.id;
          }
          return true;
        });

        const providerMap = new Map();
        serverProviders.forEach((p) => {
          if (p && p.id) providerMap.set(p.id, p);
        });

        localProviders.forEach((p) => {
          if (p && p.id) {
            if (providerMap.has(p.id)) {
              const existing = providerMap.get(p.id);
              const existingModelIds = new Set((existing.models || []).map((m) => (typeof m === 'string' ? m : m.id)));
              const mergedModels = [...(existing.models || [])];
              (p.models || []).forEach((m) => {
                const mId = typeof m === 'string' ? m : m.id;
                if (!existingModelIds.has(mId)) {
                  mergedModels.push(m);
                  existingModelIds.add(mId);
                }
              });
              providerMap.set(p.id, { ...existing, ...p, models: mergedModels });
            } else {
              providerMap.set(p.id, p);
            }
          }
        });

        const mergedProviders = Array.from(providerMap.values());
        if (mergedProviders.length > 0) {
          setCustomProviders(mergedProviders);
          localStorage.setItem('orion_custom_providers', JSON.stringify(mergedProviders));
        }

        if (data.selectedModel) {
          let resolved = data.selectedModel;
          if (resolved === 'orion') resolved = 'orion::orion';
          else if (resolved === 'agnes' || resolved === 'agnes-2.5-flash') resolved = 'orion::agnes-2.5-flash';
          else if (resolved === 'nemotron-3') resolved = 'orion::nemotron-3';
          setSelectedModel(resolved);
          localStorage.setItem('orion_selected_model', resolved);
        }
        if (data.reasoningTier) {
          setReasoningTier(data.reasoningTier);
          localStorage.setItem('orion_reasoning_tier', data.reasoningTier);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    syncConfigFromServer();
    window.addEventListener('focus', syncConfigFromServer);
    return () => {
      window.removeEventListener('focus', syncConfigFromServer);
    };
  }, []);

  const handleModelChange = (modelId) => {
    setSelectedModel(modelId);
    try {
      localStorage.setItem('orion_selected_model', modelId);
    } catch {
      // storage quota fallback
    }
    syncProvidersToServer(customProviders, modelId, reasoningTier);
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
      syncProvidersToServer(next);
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
      syncProvidersToServer(next);
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
    syncProvidersToServer(customProviders, selectedModel, tierId);
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

    const { effectiveModel, activeCustomProvider, userOrionApiKey } = resolveModelAndProvider(
      selectedModel,
      customProviders
    );

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
      model: effectiveModel || selectedModel,
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

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: displayPrompt,
          history: activeSession ? activeSession.messages : [],
          attachments: activeAttachments,
          model: effectiveModel || selectedModel,
          reasoningTier: activeReasoningTier,
          customProvider: activeCustomProvider,
          orionApiKey: userOrionApiKey,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || `HTTP ${res.status}`);
      }

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
        isVoiceCalling={isVoiceCalling}
        audioLevel={voiceAudioLevel}
        isThinking={isVoiceCalling && voiceAgentStatus === 'thinking'}
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
      <main className={`chat-main ${isVoiceCalling ? 'is-voice-calling-active' : ''}`}>
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
            {currentView === 'models' && (
              <span className="session-active-title">Models</span>
            )}
            {currentView === 'settings' && (
              <span className="session-active-title">Pengaturan</span>
            )}
            {currentView === 'logs' && (
              <span className="session-active-title">System & Gateway Logs</span>
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
              className={`nav-icon-simple ${currentView === 'logs' ? 'active' : ''}`}
              onClick={() => setCurrentView(currentView === 'logs' ? 'dashboard' : 'logs')}
              title="System & Gateway Logs"
              aria-label="Logs"
            >
              <Terminal size={15} />
            </button>

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
        ) : currentView === 'logs' ? (
          <LogsView onClose={() => setCurrentView('dashboard')} />
        ) : currentView === 'models' ? (
          <ModelsView
            onClose={() => setCurrentView('dashboard')}
            selectedModel={selectedModel}
            onSelectModel={(modId) => {
              handleModelChange(modId);
            }}
            reasoningTier={reasoningTier}
            onSelectReasoningTier={(tierId) => {
              handleReasoningTierChange(tierId);
            }}
            customProviders={customProviders}
            sessions={sessions}
            onNavigate={(view) => {
              if (view === 'chat') {
                handleNewSession();
                setCurrentView('chat');
              } else {
                setCurrentView(view);
              }
            }}
            onOpenProviders={() => setCurrentView('providers')}
            showToast={showToast}
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
                          isGenerating && isStreamingThis ? (
                            <ThinkingIndicator
                              model={msg.model || selectedModel}
                              reasoningTier={msg.reasoningTier || reasoningTier}
                            />
                          ) : null
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
          onStartVoiceCall={handleStartVoiceCalling}
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

        {/* Ambient Voice Calling Overlay with Equalizer Wave Visualizer */}
        <VoiceCallingOverlay
          isActive={isVoiceCalling}
          isMuted={isVoiceMuted}
          agentStatus={voiceAgentStatus}
          userTranscript={voiceUserTranscript}
          agentResponse={voiceAgentResponse}
          responseTurn={voiceResponseTurn}
          onToggleMute={handleToggleVoiceMute}
          onEndCall={handleEndVoiceCalling}
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
