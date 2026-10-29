import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Eye,
  HelpCircle,
} from 'lucide-react';
import AuroraBackground from './components/AuroraBackground';
import OrionLogo from './components/OrionLogo';
import LoginPage from './components/LoginPage';

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
import ProjectDirectoryModal from './components/ProjectDirectoryModal';
import LogsView from './components/LogsView';
import ModelsView from './components/ModelsView';
import SkillsView from './components/SkillsView';
import UpdateCheckView from './components/UpdateCheckView';
import UpdateNotificationToast from './components/UpdateNotificationToast';
import ThinkingIndicator from './components/ThinkingIndicator';
import ToolCallBlock from './components/ToolCallBlock';
import { soundEffects } from './utils/soundEffects';
import { formatFileSize } from './utils/fileHelpers';
import { isReasoningSupported } from './utils/modelConfig';
import VoiceCallingOverlay from './components/VoiceCallingOverlay';
import { playCosmicHumSound, playCosmicEndCallSound } from './utils/audioEffects';
import { cleanIndonesianText, formatVoiceForSpeechAndDisplay } from './utils/textCleaner';
import { detectLanguage } from './utils/languageDetector';
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

function detectConfirmationQuestion(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();
  const lines = t.split('\n').map((l) => l.trim()).filter(Boolean);
  const lastLine = lines[lines.length - 1] || '';

  // Match questions asking for user approval, confirmation, permission, or execution choice
  const pattern = /(?:apakah\s+(?:anda|kamu)|yakin\s+ingin|mengizinkan|mengonfirmasi|meng\u786e\u8ba4|setuju|mau\s+melanjutkan|apakah\s+ingin|bolehkah\s+saya|ingin\s+saya\s+lanjutkan|apakah\s+anda\s+setuju|konfirmasi|apakah\s+sudah\s+sesuai|do\s+you\s+want\s+to\s+proceed|should\s+i\s+proceed)[^.!?\n]*\?\s*$/i;

  return pattern.test(lastLine) || pattern.test(t);
}

function extractNumberedOptions(text) {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split('\n');
  const options = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|')) continue;
    const m = trimmed.match(/^(?:\[?(\d+)\]?|\(?(\d+)\)?)\s*[\.\):-]?\s+(.+)$/);
    if (m) {
      const num = parseInt(m[1] || m[2], 10);
      const optText = m[3].trim().replace(/^\*\*|\*\*$/g, '');
      if (optText.length > 0 && optText.length < 80) {
        options.push({ num, text: optText, raw: trimmed });
      }
    }
  }
  if (options.length >= 2 && options.length <= 5) {
    return options;
  }
  return [];
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
  const [activeSkill, setActiveSkill] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('orion_sound');
    return saved !== null ? saved === 'true' : false; // quiet by default for cozy simple feel
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [toast, setToast] = useState(null);

  // Authentication State (Local Gateway Login & First-time Setup)
  const [authStatus, setAuthStatus] = useState({
    isLoading: true,
    isAuthenticated: false,
    isInitialized: true,
    user: localStorage.getItem('orion_auth_user') || null,
  });

  // Agent Mode State (Autonomous Tool Calling like Pi Agent)
  const [isAgentMode, setIsAgentMode] = useState(() => {
    const saved = localStorage.getItem('orion_agent_mode');
    return saved !== null ? saved === 'true' : true;
  });

  const handleToggleAgentMode = (newVal) => {
    setIsAgentMode(newVal);
    localStorage.setItem('orion_agent_mode', String(newVal));
  };

  const handleApproveTool = async (toolCallId) => {
    try {
      await fetch('/api/agent/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('orion_auth_token')
            ? { Authorization: `Bearer ${localStorage.getItem('orion_auth_token')}` }
            : {}),
        },
        body: JSON.stringify({ toolCallId, approved: true }),
      });
      soundEffects.playSend();
    } catch (err) {
      console.error('Gagal menyetujui tool:', err);
    }
  };

  const handleRejectTool = async (toolCallId) => {
    try {
      await fetch('/api/agent/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('orion_auth_token')
            ? { Authorization: `Bearer ${localStorage.getItem('orion_auth_token')}` }
            : {}),
        },
        body: JSON.stringify({ toolCallId, approved: false }),
      });
    } catch (err) {
      console.error('Gagal menolak tool:', err);
    }
  };

  const handleChooseOption = async (toolCallId, option, index) => {
    try {
      const selectedText = typeof option === 'string' ? option : option.label || option.value;
      await fetch('/api/agent/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('orion_auth_token')
            ? { Authorization: `Bearer ${localStorage.getItem('orion_auth_token')}` }
            : {}),
        },
        body: JSON.stringify({
          toolCallId,
          selected: selectedText,
          index: index ?? 0,
          approved: true,
        }),
      });
      soundEffects.playSend();

      // Immediately reflect selected option in local state
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? {
                ...s,
                messages: s.messages.map((m) => ({
                  ...m,
                  toolCalls: (m.toolCalls || []).map((tc) =>
                    tc.id === toolCallId
                      ? { ...tc, status: 'completed', result: { selected: selectedText } }
                      : tc
                  ),
                })),
              }
            : s
        )
      );
    } catch (err) {
      console.error('Gagal memilih opsi tool:', err);
      showToast('Gagal mengirim opsi: ' + err.message);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('orion_auth_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch('/api/auth/status', { headers });
        if (res.ok) {
          const json = await res.json();
          if (isMounted) {
            setAuthStatus({
              isLoading: false,
              isAuthenticated: Boolean(json.data?.authenticated),
              isInitialized: Boolean(json.data?.initialized),
              user: json.data?.username || json.data?.configuredUsername || localStorage.getItem('orion_auth_user'),
            });
          }
          return;
        }
      } catch (err) {
        console.warn('Gagal memverifikasi status autentikasi:', err);
      }
      if (isMounted) {
        setAuthStatus((prev) => ({ ...prev, isLoading: false }));
      }
    };
    checkAuthStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLoginSuccess = (username, token) => {
    setAuthStatus({
      isLoading: false,
      isAuthenticated: true,
      isInitialized: true,
      user: username,
    });
    showToast(`Selamat datang kembali, ${username}!`);
  };

  const handleLogout = () => {
    localStorage.removeItem('orion_auth_token');
    localStorage.removeItem('orion_auth_user');
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setAuthStatus((prev) => ({
      ...prev,
      isAuthenticated: false,
    }));
    showToast('Sesi telah diakhiri.');
  };

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

  // Selected AI Model (Dynamic format: providerId::modelId, e.g. orion::orion or combo::id)
  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem('orion_selected_model');
    if (saved === 'orion') return 'orion::orion';
    if (saved === 'agnes' || saved === 'agnes-2.5-flash') return 'orion::agnes-2.5-flash';
    if (saved === 'nemotron-3') return 'orion::nemotron-3';
    if (saved) return saved;
    return 'orion::orion';
  });

  // Configured AI Model Combos & Router
  const [combos, setCombos] = useState([]);

  const [reasoningTier, setReasoningTier] = useState(() => {
    const saved = localStorage.getItem('orion_reasoning_tier');
    if (saved === 'low' || saved === 'medium' || saved === 'high') return saved;
    return 'medium';
  });

  // Current View: 'dashboard' (Clean Home with Logo & Greeting) | 'chat' (Full Chat Area) | 'updates'
  const [currentView, setCurrentView] = useState(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const viewParam = searchParams.get('view');
      if (viewParam) return viewParam;
      if (window.location.hash) {
        return window.location.hash.replace('#', '');
      }
    } catch {
      // ignore
    }
    return 'dashboard';
  });

  // System Update Checker State
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);
  const [updateError, setUpdateError] = useState(null);
  const [isUpdateToastDismissed, setIsUpdateToastDismissed] = useState(false);

  const handlePerformUpdate = async () => {
    setIsUpdating(true);
    setUpdateError(null);
    setUpdateResult(null);
    try {
      const res = await fetch('/api/system/perform-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal memperbarui aplikasi.');
      }
      setUpdateResult(data);

      if (data.restarting) {
        // Service is restarting in background; poll for reboot and automatically refresh
        let attempts = 0;
        const rebootPoll = setInterval(async () => {
          attempts++;
          try {
            const probe = await fetch('/api/system/update-check?force=true', {
              signal: AbortSignal.timeout(1200),
            });
            if (probe.ok) {
              clearInterval(rebootPoll);
              setTimeout(() => {
                window.location.reload();
              }, 600);
            }
          } catch {
            if (attempts > 25) {
              clearInterval(rebootPoll);
            }
          }
        }, 1500);
      } else {
        await handleCheckUpdates(true);
      }
    } catch (err) {
      setUpdateError(err.message || 'Terjadi kesalahan saat memperbarui aplikasi.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCheckUpdates = useCallback(async (force = false) => {
    setIsCheckingUpdate(true);
    try {
      const res = await fetch(`/api/system/update-check?force=${force ? 'true' : 'false'}`);
      if (res.ok) {
        const data = await res.json();
        setUpdateInfo(data);
        if (data.hasUpdate && force) {
          setIsUpdateToastDismissed(false);
        }
      }
    } catch (err) {
      console.warn('Gagal memeriksa pembaruan:', err);
    } finally {
      setIsCheckingUpdate(false);
    }
  }, []);

  // Background check once on app mount
  useEffect(() => {
    handleCheckUpdates(false);
  }, [handleCheckUpdates]);

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
  const [voiceActiveToolCalls, setVoiceActiveToolCalls] = useState([]);
  const [voicePendingApproval, setVoicePendingApproval] = useState(null);
  const voicePendingApprovalRef = useRef(null);
  voicePendingApprovalRef.current = voicePendingApproval;

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
  const voiceIsSpeakingRef = useRef(false);

  const isVoiceCallingRef = useRef(false);
  isVoiceCallingRef.current = isVoiceCalling;

  const isVoiceMutedRef = useRef(false);
  isVoiceMutedRef.current = isVoiceMuted;

  const selectedModelRef = useRef(selectedModel);
  selectedModelRef.current = selectedModel;

  const customProvidersRef = useRef(customProviders);
  customProvidersRef.current = customProviders;

  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  const activeSessionIdRef = useRef(activeSessionId);
  activeSessionIdRef.current = activeSessionId;

  const isAgentModeRef = useRef(isAgentMode);
  isAgentModeRef.current = isAgentMode;

  const authUserRef = useRef(authStatus?.user);
  authUserRef.current = authStatus?.user;

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
        // Ignore mic while AI is actively speaking (avoids echo) or when user manually muted
        if (voiceIsSpeakingRef.current || isVoiceMutedRef.current) return;
        // Ignore background query processing unless currently waiting for approval
        if (voiceIsProcessingQueryRef.current && !voicePendingApprovalRef.current) return;

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

          // Voice-Controlled Approval / Rejection for System Tools (JARVIS Mode)
          if (voicePendingApprovalRef.current) {
            const lower = currentSpeech.toLowerCase();
            const isApprove = /\b(approve|setuju|setujui|izinkan|boleh|lanjut|lanjutkan|oke|yes|ya|eksekusi|jalankan|acc|aprove|gas)\b/i.test(lower);
            const isReject = /\b(reject|tolak|batal|batalkan|jangan|no|tidak|cancel|stop)\b/i.test(lower);

            if (isApprove || isReject) {
              if (voiceSilenceTimerRef.current) {
                clearTimeout(voiceSilenceTimerRef.current);
                voiceSilenceTimerRef.current = null;
              }
              const pending = voicePendingApprovalRef.current;
              setVoicePendingApproval(null);
              voicePendingApprovalRef.current = null;
              setVoiceUserTranscript('');

              if (pending.isConversational) {
                soundEffects.playSend?.();
                handleTriggerVoiceAgentResponse(isApprove ? 'Ya, saya setuju.' : 'Tidak, batalkan.');
                return;
              }

              if (isApprove) {
                soundEffects.playSend?.();
                if (pending.isChoice || pending.tool === 'ask_user') {
                  const selectedText = pending.options?.[0] || 'Ya, lanjutkan';
                  handleChooseOption(pending.toolCallId, selectedText, 0);
                } else {
                  handleApproveTool(pending.toolCallId);
                }
              } else {
                handleRejectTool(pending.toolCallId);
              }
              return;
            }
          }

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
        if (
          e.error === 'no-speech' &&
          isVoiceCallingRef.current &&
          (!voiceIsProcessingQueryRef.current || voicePendingApprovalRef.current)
        ) {
          // ignore
        }
      };

      recognition.onend = () => {
        // Keep listening alive unless muted or actively speaking or processing (unless waiting for approval)
        if (
          isVoiceCallingRef.current &&
          !isVoiceMutedRef.current &&
          (!voiceIsProcessingQueryRef.current || voicePendingApprovalRef.current) &&
          !voiceIsSpeakingRef.current
        ) {
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

  // Helper to construct clear, natural conversational approval question
  const buildApprovalSpeech = (parsed) => {
    if (parsed.tool === 'ask_user' || parsed.type === 'tool_call_waiting_choice') {
      const q = (parsed.question || parsed.args?.question || 'AI memerlukan konfirmasi atau tanggapan Anda.').replace(/[.,?!]+$/, '');
      return `${q}? Apakah Anda menyetujuinya, Approve atau Reject?`;
    }

    const tool = parsed.tool || '';
    const args = parsed.args || {};
    const cmd = (args.command || args.cmd || '').trim();
    const path = args.path || (args.paths ? args.paths.join(', ') : '');

    // 1. Identify base command name (e.g. 'curl', 'pkill', 'rm', 'git', 'npm')
    let baseCmd = 'perintah';
    if (cmd) {
      const firstWord = cmd.split(/\s+/)[0] || '';
      baseCmd = firstWord.replace(/^[./\\]+/, '').toLowerCase();
    } else if (tool === 'delete_file') {
      baseCmd = 'delete_file';
    } else if (tool === 'write' || tool === 'edit') {
      baseCmd = tool;
    } else {
      baseCmd = tool || 'perintah';
    }

    // 2. Extract or infer the reason/purpose from the AI
    let purpose = (parsed.purpose || args.purpose || args.reason || '').trim();

    // If no explicit purpose provided in args, check if there was thought text
    if (!purpose && parsed.thought) {
      const cleanedThought = parsed.thought
        .replace(/^saya\s+(akan|hendak|perlu|ingin)\s+/i, '')
        .replace(/[.,?!]+$/, '')
        .trim();
      if (cleanedThought.length > 5 && cleanedThought.length < 90) {
        purpose = cleanedThought;
      }
    }

    // Heuristic fallbacks if purpose is still empty
    if (!purpose) {
      if (baseCmd === 'curl' || baseCmd === 'wget') {
        const urlMatch = cmd.match(/https?:\/\/([^\s"'/?#]+)/i);
        if (urlMatch && urlMatch[1]) {
          const host = urlMatch[1].replace(/^www\./i, '');
          purpose = `mengambil data dari ${host}`;
        } else {
          purpose = 'mengakses data dari internet';
        }
      } else if (baseCmd === 'pkill' || baseCmd === 'kill') {
        const targetMatch = cmd.match(/['"]([^'"]+)['"]/);
        const target = targetMatch ? targetMatch[1] : cmd.replace(/^(pkill|kill)\s+(-\w+\s+)?/i, '').trim();
        purpose = target ? `menghentikan proses ${target}` : 'menghentikan proses sistem';
      } else if (baseCmd === 'rm') {
        purpose = path ? `menghapus berkas ${path}` : 'menghapus berkas target';
      } else if (baseCmd === 'npm' || baseCmd === 'yarn' || baseCmd === 'pnpm') {
        if (/\b(install|add|i)\b/i.test(cmd)) {
          purpose = 'menginstal dependensi proyek';
        } else {
          purpose = 'menjalankan skrip paket';
        }
      } else if (baseCmd === 'git') {
        purpose = 'menjalankan operasi git';
      } else if (tool === 'delete_file') {
        purpose = `menghapus ${path || 'file yang dipilih'}`;
      } else if (path) {
        purpose = `mengubah isi file ${path}`;
      } else {
        purpose = 'menjalankan operasi sistem';
      }
    }

    // Clean purpose so it connects smoothly with "untuk ..."
    purpose = purpose.replace(/^untuk\s+/i, '').replace(/[.,?!]+$/, '').trim();

    return `Saya memerlukan persetujuan Anda untuk menggunakan command ${baseCmd} untuk ${purpose}. Apakah Anda menyetujuinya, Approve atau Reject?`;
  };

  const handleTriggerVoiceAgentResponse = async (queryText) => {
    if (!queryText || voiceIsProcessingQueryRef.current || !isVoiceCallingRef.current) return;
    voiceIsProcessingQueryRef.current = true;
    setIsGenerating(true);

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

    // ================= SYNC IMMEDIATELY WITH ACTIVE CHAT SESSION =================
    const currentSessionId = activeSessionIdRef.current;
    const currentSessions = sessionsRef.current || [];
    let targetSession = currentSessions.find((s) => s.id === currentSessionId);
    let targetSessionId = targetSession ? targetSession.id : currentSessionId;
    if (!targetSession) {
      targetSessionId = targetSessionId || `session-${Date.now()}`;
      targetSession = {
        id: targetSessionId,
        title: 'Percakapan Baru',
        createdAt: new Date().toISOString(),
        messages: [],
        projectPath: activeProjectPath || null,
        projectName: activeProjectName || null,
      };
    }

    const isFirstMsg = (targetSession.messages || []).length === 0;
    const updatedTitle = isFirstMsg
      ? (queryText.length > 24 ? `${queryText.slice(0, 24)}...` : queryText)
      : targetSession.title;

    const userMsg = {
      id: `msg-v-user-${Date.now()}`,
      role: 'user',
      content: queryText,
      timestamp: new Date().toISOString(),
    };

    let modelToUse = voiceSelectedModelRef.current || selectedModelRef.current || selectedModel;
    try {
      const savedAux = localStorage.getItem('orion_aux_assignments');
      const auxAssignments = savedAux ? JSON.parse(savedAux) : {};
      if (auxAssignments.voice_chat) {
        modelToUse = auxAssignments.voice_chat;
      }
    } catch {}

    const { effectiveModel, activeCustomProvider, userOrionApiKey } = resolveModelAndProvider(
      modelToUse,
      customProvidersRef.current || customProviders
    );

    const aiMsgId = `msg-v-ai-${Date.now()}`;
    const initialAiMsg = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      model: effectiveModel || modelToUse,
      toolCalls: [],
      timestamp: new Date().toISOString(),
    };

    // Helper to sync sessions to server
    const syncSessionsToServer = (sessionsToSync) => {
      isSyncingSessionsRef.current = true;
      fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessions: sessionsToSync, activeSessionId: targetSessionId }),
      })
        .then(async (r) => {
          if (r.ok) {
            const data = await r.json();
            if (data.updatedAt) lastServerUpdatedAtRef.current = data.updatedAt;
          }
        })
        .catch(() => {})
        .finally(() => {
          isSyncingSessionsRef.current = false;
        });
    };

    // Add user message & initial assistant bubble immediately to React state and persistent storage
    let currentFinalSessions = [];
    setSessions((prev) => {
      const exists = prev.some((s) => s.id === targetSessionId);
      if (exists) {
        currentFinalSessions = prev.map((s) => {
          if (s.id === targetSessionId) {
            return {
              ...s,
              title: updatedTitle,
              messages: [...(s.messages || []), userMsg, initialAiMsg],
            };
          }
          return s;
        });
      } else {
        currentFinalSessions = [
          {
            ...targetSession,
            title: updatedTitle,
            messages: [userMsg, initialAiMsg],
          },
          ...prev,
        ];
      }
      try {
        localStorage.setItem('orion_chat_sessions', JSON.stringify(currentFinalSessions));
      } catch {}
      return currentFinalSessions;
    });

    syncSessionsToServer(currentFinalSessions);

    // Helper to update the AI message content and/or toolCalls in the active session
    const updateAiMessageInSessions = (finalContent, toolCalls = null) => {
      setSessions((prev) => {
        const next = prev.map((s) => {
          if (s.id === targetSessionId) {
            return {
              ...s,
              messages: (s.messages || []).map((m) => {
                if (m.id === aiMsgId) {
                  return {
                    ...m,
                    content: finalContent !== null ? finalContent : m.content,
                    toolCalls: toolCalls !== null ? toolCalls : m.toolCalls,
                  };
                }
                return m;
              }),
            };
          }
          return s;
        });
        try {
          localStorage.setItem('orion_chat_sessions', JSON.stringify(next));
        } catch {}
        syncSessionsToServer(next);
        return next;
      });
    };

    // Helper function to synthesize and play spoken audio via Web Audio or Audio element
    const playVoiceAudio = async (textToPlay, signal, onReadyToPlay) => {
      if (!textToPlay || !isVoiceCallingRef.current) return;
      const cleanText = formatVoiceForSpeechAndDisplay(textToPlay);
      if (!cleanText) return;

      let readyFired = false;
      const fireReady = () => {
        if (!readyFired) {
          readyFired = true;
          onReadyToPlay?.();
        }
      };

      voiceIsSpeakingRef.current = true;

      try {
        const ttsRes = await fetch('/api/tts/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleanText,
            voice: 'multi-female',
          }),
          signal,
        });
        if (!ttsRes.ok) {
          fireReady();
          return;
        }
        const audioBlob = await ttsRes.blob();
        if (!audioBlob || audioBlob.size === 0 || !isVoiceCallingRef.current) {
          fireReady();
          return;
        }

        let playedViaWebAudio = false;
        if (voiceAudioContextRef.current && voiceAudioContextRef.current.state !== 'closed') {
          try {
            const audioCtx = voiceAudioContextRef.current;
            if (audioCtx.state === 'suspended') await audioCtx.resume();
            const arrayBuf = await audioBlob.arrayBuffer();
            const decodedBuffer = await new Promise((resolveDecode, rejectDecode) => {
              const res = audioCtx.decodeAudioData(arrayBuf, resolveDecode, rejectDecode);
              if (res && typeof res.then === 'function') {
                res.then(resolveDecode).catch(rejectDecode);
              }
            });

            if (!isVoiceCallingRef.current) return;

            const source = audioCtx.createBufferSource();
            source.buffer = decodedBuffer;
            voiceTtsSourceRef.current = source;
            source.connect(audioCtx.destination);

            fireReady();

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
          } catch {}
        }

        if (!playedViaWebAudio) {
          if (!isVoiceCallingRef.current) return;
          if (voiceTtsBlobUrlRef.current) {
            try { URL.revokeObjectURL(voiceTtsBlobUrlRef.current); } catch {}
          }
          const audioUrl = URL.createObjectURL(audioBlob);
          voiceTtsBlobUrlRef.current = audioUrl;
          const audio = new Audio(audioUrl);
          voiceTtsAudioRef.current = audio;

          fireReady();

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
            audio.onerror = () => {
              if (voiceTtsAnimIntervalRef.current) {
                clearInterval(voiceTtsAnimIntervalRef.current);
                voiceTtsAnimIntervalRef.current = null;
              }
              setVoiceAudioLevel(0);
              resolve();
            };
            audio.play().catch(resolve);
          });
        }
      } catch (ttsErr) {
        fireReady();
        if (ttsErr.name !== 'AbortError') {
          console.warn('TTS playback error:', ttsErr.message);
        }
      } finally {
        voiceIsSpeakingRef.current = false;
      }
    };

    try {
      // Natural intent detection: Greetings or casual talk vs actionable tools
      const trimmedClean = queryText.trim().replace(/[.,?!]+$/, '').toLowerCase();
      const isGreetingOrCasual = /^(hello|halo|hai|hi|hey|p|pagi|siang|sore|malam|apa kabar|kamu siapa|tes|test|yo|woi|bro|orion)\b/i.test(trimmedClean);
      const hasAgentActionKeywords = /\b(install|pasang|setup|buatkan|bikin|create|write|tulis|jalankan|run|hapus|delete|remove|edit|ubah|ganti|perbaiki|fix|cek|check|periksa|baca|lihat|tampilkan|list|buka|cari|search|react|vue|vite|npm|yarn|pnpm|git|docker|terminal|bash|ask|tanya|konfirmasi|setuju|setujui|approve|reject)\b/i.test(queryText);

      // If user is simply greeting or casual chat, route conversationally so Orion greets warmly and swiftly
      const isActionableAgentTask = (isAgentModeRef.current || hasAgentActionKeywords) && !isGreetingOrCasual;
      const historyForAi = targetSession.messages || [];

      if (isActionableAgentTask) {
        // Transition to thinking while agent performs conversational approach or tool evaluation
        setVoiceAgentResponse('');
        setVoiceAgentStatus('thinking');
        setVoiceActiveToolCalls([]);

        const agentRes = await fetch('/api/agent/run', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('orion_auth_token')
              ? { Authorization: `Bearer ${localStorage.getItem('orion_auth_token')}` }
              : {}),
          },
          body: JSON.stringify({
            message: queryText,
            history: historyForAi,
            attachments: [],
            model: effectiveModel || modelToUse,
            reasoningTier: 'medium',
            customProvider: activeCustomProvider,
            orionApiKey: userOrionApiKey,
            workspaceRoot: activeProjectPath || undefined,
            isVoiceMode: true,
          }),
          signal: controller.signal,
        });

        if (!agentRes.ok) {
          throw new Error('Gagal menjalankan operasi agen otonom.');
        }

        const reader = agentRes.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let toolCallsList = [];
        let agentFinalAnswer = '';

        while (true) {
          const { done, value } = await reader.read();
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
              if (parsed.type === 'tool_call_start') {
                toolCallsList = [
                  ...toolCallsList.filter((tc) => tc.id !== parsed.toolCallId),
                  {
                    id: parsed.toolCallId,
                    tool: parsed.tool,
                    args: parsed.args,
                    status: parsed.needsApproval ? 'waiting_approval' : 'running',
                    reason: parsed.reason,
                  },
                ];
                setVoiceActiveToolCalls([...toolCallsList]);
                updateAiMessageInSessions(null, toolCallsList);
              } else if (parsed.type === 'tool_call_waiting_approval' || parsed.type === 'tool_call_waiting_choice') {
                const isChoice = parsed.type === 'tool_call_waiting_choice';
                const approvalSpeech = buildApprovalSpeech(parsed);
                const pending = {
                  toolCallId: parsed.toolCallId,
                  tool: parsed.tool,
                  args: parsed.args,
                  reason: parsed.reason,
                  purpose: parsed.purpose || parsed.args?.purpose || '',
                  question: parsed.question || parsed.args?.question || '',
                  options: parsed.options || parsed.args?.options || [],
                  isChoice,
                };

                toolCallsList = toolCallsList.map((tc) =>
                  tc.id === parsed.toolCallId
                    ? {
                        ...tc,
                        status: isChoice ? 'waiting_choice' : 'waiting_approval',
                        reason: parsed.reason,
                        question: parsed.question,
                        options: parsed.options,
                      }
                    : tc
                );
                setVoiceActiveToolCalls([...toolCallsList]);
                updateAiMessageInSessions(null, toolCallsList);

                setVoicePendingApproval(pending);
                voicePendingApprovalRef.current = pending;
                setVoiceResponseTurn((prev) => prev + 1);
                setVoiceAgentResponse(approvalSpeech);

                setIsVoiceMuted(false);
                isVoiceMutedRef.current = false;
                if (voiceMediaStreamRef.current) {
                  voiceMediaStreamRef.current.getAudioTracks().forEach((t) => {
                    t.enabled = true;
                  });
                }

                setVoiceAgentStatus('speaking');
                await playVoiceAudio(approvalSpeech, controller.signal, () => {
                  setVoiceAgentStatus('speaking');
                });
                setVoiceAgentStatus('listening');

                if (voiceMediaStreamRef.current) {
                  voiceMediaStreamRef.current.getAudioTracks().forEach((t) => {
                    t.enabled = true;
                  });
                }
                if (voiceSpeechRecRef.current) {
                  try {
                    voiceSpeechRecRef.current.start();
                  } catch {}
                }
              } else if (parsed.type === 'tool_call_running') {
                toolCallsList = toolCallsList.map((tc) =>
                  tc.id === parsed.toolCallId ? { ...tc, status: 'running' } : tc
                );
                setVoiceActiveToolCalls([...toolCallsList]);
                updateAiMessageInSessions(null, toolCallsList);
              } else if (parsed.type === 'tool_call_complete') {
                toolCallsList = toolCallsList.map((tc) =>
                  tc.id === parsed.toolCallId
                    ? { ...tc, status: parsed.isError ? 'error' : 'completed', result: parsed.result }
                    : tc
                );
                setVoiceActiveToolCalls([...toolCallsList]);
                updateAiMessageInSessions(null, toolCallsList);
              } else if (parsed.type === 'agent_done') {
                agentFinalAnswer = parsed.finalAnswer;
              }
            } catch {}
          }
        }

        const spokenFinal = formatVoiceForSpeechAndDisplay(agentFinalAnswer);

        setVoiceUserTranscript('');
        await playVoiceAudio(spokenFinal, controller.signal, () => {
          setVoiceResponseTurn((prev) => prev + 1);
          setVoiceAgentResponse(spokenFinal);
          setVoiceAgentStatus('speaking');
        });

        // Persist final agent answer into synchronized session
        updateAiMessageInSessions(agentFinalAnswer || spokenFinal, toolCallsList);

        setVoiceActiveToolCalls([]);
        setVoicePendingApproval(null);
        voicePendingApprovalRef.current = null;
      } else {
        // ================= REGULAR CONVERSATION STREAM (ORION VOICE) =================
        const currentUserName = authUserRef.current || authStatus?.user || 'Arjuna';
        const isEnglish = detectLanguage(queryText) === 'en';
        const voicePrompt = isEnglish
          ? `${queryText}\n\n[CRITICAL VOICE INSTRUCTION - SPEAK IN ENGLISH]:
You are ORION: close friend, tech partner, and intelligent collaborator for ${currentUserName}.
VOICE CALL COMMUNICATION GUIDELINES:
1. STRICT LANGUAGE ENFORCEMENT:
   - The user is speaking/asking in English ("${queryText}").
   - You MUST respond 100% completely in natural, fluent, spoken English.
   - NEVER reply in Indonesian when addressed in English!
2. WARM & NATURAL GREETING:
   - If the user greets ("Hello", "Hi", "Good morning", "Hey Orion", etc.), greet back warmly as a close friend (e.g. "Hello ${currentUserName}! How can I help you today?").
3. CONCISE & SPOKEN:
   - Natural spoken tone, like a quick phone call between close tech colleagues.
   - Keep it to 1-2 punchy sentences.
   - Absolutely NO markdown, lists, asterisks, hashtags, or code blocks in voice calls.
   - Always ensure words are properly spaced.`
          : `${queryText}\n\n[Instruksi Panggilan Suara & Persona Orion]:
Anda adalah ORION: sahabat karib, mitra teknologi, dan rekan kolaborasi cerdas bagi ${currentUserName}.
PANDUAN KOMUNIKASI LISAN (VOICE CALL):
1. ADAPTASI BAHASA (LANGUAGE MATCHING):
   - WAJIB selalu sesuaikan bahasa jawaban dengan bahasa yang digunakan pengguna saat berbicara.
   - Bila pengguna berbicara atau bertanya dalam Bahasa Inggris (English), Anda WAJIB menjawab sepenuhnya dalam Bahasa Inggris (English) yang fasih dan alami.
   - Bila pengguna berbicara dalam Bahasa Indonesia, jawablah dalam Bahasa Indonesia.
2. SAPAAN RAMAH & ALAMI:
   - Bila pengguna menyapa ("Halo", "Hello", "Hai", "Orion", "Good morning", "Hey", dsb.), balaslah dengan hangat dan ramah sesuai bahasa yang dipakai (contoh ID: "Halo ${currentUserName}! Ada yang bisa saya bantu hari ini?", contoh EN: "Hello ${currentUserName}! How can I help you today?").
3. SINGKAT, HIDUP & ON-POINT:
   - Gunakan gaya bahasa lisan yang natural, santai, cerdas, dan to-the-point seperti berbicara di telepon antar rekan akrab.
   - Jangan bertele-tele atau membuat esai panjang. Jawab 1-2 kalimat efektif.
   - Dilarang menggunakan format markdown, tabel, tanda pagar (#), asteris (*), atau blok kode dalam ucapan lisan.
   - Wajib gunakan spasi pemisah normal antar kata.`;

        const res = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: voicePrompt,
            history: historyForAi,
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
              const token = parsed.chunk || parsed.token || parsed.delta || parsed.content || '';
              if (token) accumulatedReply += token;
            } catch {}
          }
        }

        let stripped = accumulatedReply
          .replace(/<think>[\s\S]*?<\/think>/gi, '')
          .replace(/<think>[\s\S]*$/gi, '');
        let finalAnswer = formatVoiceForSpeechAndDisplay(stripped);

        if (!finalAnswer) {
          finalAnswer = `Halo ${currentUserName}, saya di sini. Ada yang bisa saya bantu?`;
        }

        // Persist final assistant answer into synchronized session
        updateAiMessageInSessions(finalAnswer);

        setVoiceUserTranscript('');
        await playVoiceAudio(finalAnswer, controller.signal, () => {
          setVoiceResponseTurn((prev) => prev + 1);
          setVoiceAgentResponse(finalAnswer);
          setVoiceAgentStatus('speaking');
        });

        const isAskingConfirmation = /(?:apakah anda (?:yakin|setuju)|silakan (?:jawab|pilih|konfirmasi).*?(?:ya|tidak|approve|reject)|(?:approve|setujui).*?(?:atau|atow).*?(?:reject|tolak)|(?:approve\s+atau\s+reject|setujui\s+atau\s+tolak))\b/i.test(finalAnswer);
        if (isAskingConfirmation) {
          const conversationalPending = {
            isConversational: true,
            question: finalAnswer,
            tool: 'ask_user',
          };
          setVoicePendingApproval(conversationalPending);
          voicePendingApprovalRef.current = conversationalPending;
        }
      }

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Voice processing error:', err);
        setVoiceResponseTurn((prev) => prev + 1);
        setVoiceUserTranscript('');
        setVoiceAgentResponse('Maaf, suara kurang jelas. Bisa tolong diulangi?');
      }
    } finally {
      setIsGenerating(false);
      if (voiceTtsAnimIntervalRef.current) {
        clearInterval(voiceTtsAnimIntervalRef.current);
        voiceTtsAnimIntervalRef.current = null;
      }
      // Selesai bicara: mikrofon dibuka kembali untuk pertanyaan berikutnya
      if (isVoiceCallingRef.current) {
        voiceIsProcessingQueryRef.current = false;
        voiceTranscriptAccumulatorRef.current = '';
        setVoiceUserTranscript('');
        setVoiceAgentStatus('listening');
        setVoiceAudioLevel(0);

        if (voiceMediaStreamRef.current && !isVoiceMutedRef.current) {
          voiceMediaStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = true; });
        }

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
    setActiveSkill(null);
    setCurrentView('chat');
    fetch('/api/chat/sessions/active', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: id }),
    }).catch(() => {});
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

  const fetchCombos = useCallback(async () => {
    try {
      const res = await fetch('/api/combos');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.combos)) {
          setCombos(data.combos);
        }
      }
    } catch (err) {
      console.warn('Gagal memuat daftar combos:', err);
    }
  }, []);

  useEffect(() => {
    syncConfigFromServer();
    fetchCombos();
    const handleFocus = () => {
      syncConfigFromServer();
      fetchCombos();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchCombos]);

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

  // Bidirectional session synchronization with server & CLI (~/.orion/sessions.json)
  const lastServerUpdatedAtRef = useRef(0);
  const isSyncingSessionsRef = useRef(false);

  const fetchServerSessions = useCallback(async (isInitial = false) => {
    if (isGenerating) return;
    try {
      const res = await fetch('/api/chat/sessions');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;

      const serverSessions = data.sessions || [];
      const serverActiveId = data.activeSessionId;
      const serverUpdated = data.updatedAt || 0;

      if (isInitial) {
        let localSessions = [];
        try {
          const saved = localStorage.getItem('orion_chat_sessions');
          if (saved) localSessions = JSON.parse(saved) || [];
        } catch {}

        if (serverSessions.length === 0 && localSessions.length > 0) {
          // Migrate localStorage sessions to server
          const pushRes = await fetch('/api/chat/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessions: localSessions, activeSessionId }),
          });
          if (pushRes.ok) {
            const pushData = await pushRes.json();
            lastServerUpdatedAtRef.current = pushData.updatedAt || Date.now();
          }
          return;
        }

        if (serverSessions.length > 0) {
          lastServerUpdatedAtRef.current = serverUpdated;
          let localSessions = [];
          try {
            const saved = localStorage.getItem('orion_chat_sessions');
            if (saved) localSessions = JSON.parse(saved) || [];
          } catch {}
          const localMap = new Map((localSessions || []).map((s) => [s.id, s]));
          const safeMerged = serverSessions.map((srv) => {
            const loc = localMap.get(srv.id);
            if (loc && (loc.messages || []).length > (srv.messages || []).length) {
              return { ...srv, messages: loc.messages, title: loc.title || srv.title };
            }
            return srv;
          });
          setSessions(safeMerged);
          if (serverActiveId) {
            setActiveSessionId(serverActiveId);
          }
          try {
            localStorage.setItem('orion_chat_sessions', JSON.stringify(safeMerged));
          } catch {}
        }
        return;
      }

      // Subsequent syncs (focus / visibility / poll):
      // Only apply if server has newer data, and NEVER wipe local sessions that have more messages!
      const hasNewerData = serverUpdated > lastServerUpdatedAtRef.current;
      if (hasNewerData && !isGenerating && !isSyncingSessionsRef.current) {
        lastServerUpdatedAtRef.current = serverUpdated;
        setSessions((prevSessions) => {
          const prevMap = new Map((prevSessions || []).map((s) => [s.id, s]));
          const merged = serverSessions.map((srv) => {
            const local = prevMap.get(srv.id);
            if (!local) return srv;
            const localMsgs = local.messages || [];
            const srvMsgs = srv.messages || [];
            if (localMsgs.length > srvMsgs.length) {
              return {
                ...srv,
                title: local.title || srv.title,
                messages: localMsgs,
              };
            }
            return srv;
          });
          for (const local of prevSessions) {
            if (!merged.some((s) => s.id === local.id)) {
              merged.push(local);
            }
          }
          try {
            localStorage.setItem('orion_chat_sessions', JSON.stringify(merged));
          } catch {}
          return merged;
        });

        if (serverActiveId && serverActiveId !== activeSessionId) {
          setActiveSessionId(serverActiveId);
        }
      }
    } catch {
      // offline / network error
    }
  }, [isGenerating, activeSessionId]);

  // Debounce localStorage persistence and sync to ~/.orion/sessions.json
  useEffect(() => {
    if (isGenerating || sessions.length === 0) return;
    const timeoutId = setTimeout(async () => {
      try {
        localStorage.setItem('orion_chat_sessions', JSON.stringify(sessions));
      } catch {}

      try {
        isSyncingSessionsRef.current = true;
        const res = await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessions, activeSessionId }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.updatedAt) {
            lastServerUpdatedAtRef.current = data.updatedAt;
          }
        }
      } catch {} finally {
        isSyncingSessionsRef.current = false;
      }
    }, 600);
    return () => clearTimeout(timeoutId);
  }, [sessions, activeSessionId, isGenerating]);

  // Listen for window focus, visibilitychange, and gentle poll to catch CLI messages
  useEffect(() => {
    fetchServerSessions(true);

    const onFocus = () => fetchServerSessions(false);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchServerSessions(false);
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchServerSessions(false);
      }
    }, 2000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(intervalId);
    };
  }, [fetchServerSessions]);

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
  const activeProjectPath = activeSession?.projectPath || null;
  const activeProjectName = activeSession?.projectName || null;

  const handleSelectProject = async (projectPath, projectName) => {
    soundEffects.playClick?.();
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, projectPath, projectName }
          : s
      )
    );
    showToast(`Proyek dipilih: ${projectName}`);

    // Persist to recent workspaces on server
    try {
      const token = localStorage.getItem('orion_auth_token');
      await fetch('/api/workspace/recent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ path: projectPath, name: projectName }),
      });
    } catch {}
  };

  const handleClearProject = () => {
    soundEffects.playClick?.();
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, projectPath: null, projectName: null }
          : s
      )
    );
    showToast('Proyek dilepas (Kembali ke default Orion Safe Workspace)');
  };

  useEffect(() => {
    scrollToBottom(isGenerating);
  }, [messages, isGenerating]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const handleNewSession = async () => {
    soundEffects.newChat?.();
    try {
      const res = await fetch('/api/chat/sessions/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Percakapan Baru' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setSessions((prev) => [data.session, ...prev.filter((s) => s.id !== data.session.id)]);
          setActiveSessionId(data.session.id);
          lastServerUpdatedAtRef.current = data.updatedAt || Date.now();
          setRecommendations(getRandomRecommendations(3));
          setCurrentView('chat');
          return;
        }
      }
    } catch {}

    const newSession = {
      id: `session-${Date.now()}`,
      title: 'Percakapan Baru',
      createdAt: new Date().toISOString(),
      messages: [],
      projectPath: null,
      projectName: null,
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setRecommendations(getRandomRecommendations(3));
    setCurrentView('chat');
  };

  const handleDeleteSession = (sessionId) => {
    fetch(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' }).catch(() => {});
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      if (filtered.length === 0) {
        return [
          {
            id: `session-${Date.now()}`,
            title: 'Percakapan Baru',
            createdAt: new Date().toISOString(),
            messages: [],
            projectPath: null,
            projectName: null,
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
      projectPath: null,
      projectName: null,
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
    const rawUserText = (textToSend !== undefined ? textToSend : input).trim();
    if ((!rawUserText && activeAttachments.length === 0 && !activeSkill) || isGenerating) return;

    // Immediately switch view to chat mode so user never bounces to dashboard
    setCurrentView('chat');

    // Handle direct client-side slash commands
    if (rawUserText.toLowerCase() === '/clear') {
      setInput('');
      setActiveSkill(null);
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, messages: [] } : s))
      );
      showToast('Riwayat percakapan sesi telah dibersihkan');
      return;
    }
    if (rawUserText.toLowerCase() === '/new') {
      setInput('');
      setActiveSkill(null);
      handleNewSession();
      showToast('Sesi percakapan baru dimulai');
      return;
    }
    if (rawUserText.toLowerCase() === '/agent' || rawUserText.toLowerCase().startsWith('/agent ')) {
      const parts = rawUserText.split(/\s+/);
      const arg = parts[1]?.toLowerCase();
      const nextMode = arg === 'on' ? true : arg === 'off' ? false : !isAgentMode;
      setIsAgentMode(nextMode);
      setInput('');
      setActiveSkill(null);
      showToast(`Mode AI Agent: ${nextMode ? 'AKTIF (Eksekusi Tools & Terminal)' : 'NONAKTIF (Mode Chat Standar)'}`);
      return;
    }

    // Determine active skill context
    const skillName = activeSkill?.name || activeSkill?.label || null;
    let promptToSend = rawUserText;
    if (skillName) {
      if (!promptToSend) {
        promptToSend = `/${skillName}`;
      } else if (!promptToSend.toLowerCase().startsWith(`/${skillName.toLowerCase()}`)) {
        promptToSend = `/${skillName} ${promptToSend}`;
      }
    }

    soundEffects.playSend();

    const displayPrompt = promptToSend || (activeAttachments.length > 0 ? 'Tolong analisis dan jelaskan lampiran berikut.' : '');

    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: rawUserText || (skillName ? `/${skillName}` : displayPrompt),
      prompt: displayPrompt,
      skill: skillName,
      attachments: activeAttachments,
      timestamp: new Date().toISOString(),
    };

    // Check if attachments contain any images for Vision routing
    const hasImages = (activeAttachments || []).some(
      (a) => a && (
        a.type === 'image' ||
        a.type?.startsWith('image/') ||
        a.category === 'image' ||
        a.isImage ||
        /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(a.name || '') ||
        (typeof a.data === 'string' && a.data.startsWith('data:image/'))
      )
    );

    let modelToUseForMessage = selectedModel;
    let isVisionRouted = false;

    if (hasImages) {
      try {
        const savedAux = localStorage.getItem('orion_aux_assignments');
        const auxAssignments = savedAux ? JSON.parse(savedAux) : {};
        if (auxAssignments.vision) {
          modelToUseForMessage = auxAssignments.vision;
          isVisionRouted = true;
        }
      } catch (e) {
        console.warn('Gagal membaca penugasan vision:', e);
      }
    }

    const { effectiveModel, activeCustomProvider, userOrionApiKey } = resolveModelAndProvider(
      modelToUseForMessage,
      customProviders
    );

    const modelSupportsReasoning = isReasoningSupported(
      modelToUseForMessage,
      activeCustomProvider?.modelId || activeCustomProvider?.name || ''
    );
    const activeReasoningTier = modelSupportsReasoning ? reasoningTier : null;

    const aiMessageId = `msg-ai-${Date.now()}`;
    const initialAiMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      model: effectiveModel || modelToUseForMessage,
      isVisionTask: isVisionRouted,
      reasoningTier: activeReasoningTier,
      customProvider: activeCustomProvider,
      timestamp: new Date().toISOString(),
    };

    // Determine target session ID and safely ensure session exists
    let targetSessionId = activeSessionId;
    let finalSessions = [];

    setSessions((prev) => {
      const exists = prev.some((s) => s.id === targetSessionId);
      if (exists) {
        finalSessions = prev.map((s) => {
          if (s.id === targetSessionId) {
            const isFirstMessage = (s.messages || []).length === 0;
            const displayTitle = rawUserText || (skillName ? `/${skillName}` : (activeAttachments[0] ? `Lampiran: ${activeAttachments[0].name}` : 'Percakapan'));
            return {
              ...s,
              title: isFirstMessage
                ? displayTitle.length > 24
                  ? `${displayTitle.slice(0, 24)}...`
                  : displayTitle
                : s.title,
              messages: [...(s.messages || []), userMessage, initialAiMessage],
            };
          }
          return s;
        });
      } else {
        targetSessionId = targetSessionId || `session-${Date.now()}`;
        setActiveSessionId(targetSessionId);
        const displayTitle = rawUserText || (skillName ? `/${skillName}` : 'Percakapan Baru');
        const newSess = {
          id: targetSessionId,
          title: displayTitle.length > 24 ? `${displayTitle.slice(0, 24)}...` : displayTitle,
          createdAt: new Date().toISOString(),
          messages: [userMessage, initialAiMessage],
          projectPath: null,
          projectName: null,
        };
        finalSessions = [newSess, ...prev];
      }
      try {
        localStorage.setItem('orion_chat_sessions', JSON.stringify(finalSessions));
      } catch {}
      return finalSessions;
    });

    // Immediate sync to server so ~/.orion/sessions.json has the user message and initial bubble
    isSyncingSessionsRef.current = true;
    fetch('/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessions: finalSessions, activeSessionId: targetSessionId }),
    }).then(async (r) => {
      if (r.ok) {
        const data = await r.json();
        if (data.updatedAt) {
          lastServerUpdatedAtRef.current = data.updatedAt;
        }
      }
    }).catch(() => {}).finally(() => {
      isSyncingSessionsRef.current = false;
    });

    setInput('');
    setActiveSkill(null);
    setAttachments([]);
    setIsGenerating(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulated = '';
    let toolCallsList = [];
    let rafId = null;

    const commitUpdate = (text, toolCalls = null) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === targetSessionId) {
            return {
              ...s,
              messages: (s.messages || []).map((m) =>
                m.id === aiMessageId
                  ? {
                      ...m,
                      content: text,
                      ...(toolCalls !== null ? { toolCalls } : {}),
                    }
                  : m
              ),
            };
          }
          return s;
        })
      );
    };

    try {
      const endpoint = isAgentMode ? '/api/agent/run' : '/api/chat/stream';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('orion_auth_token')
            ? { Authorization: `Bearer ${localStorage.getItem('orion_auth_token')}` }
            : {}),
        },
        body: JSON.stringify({
          message: displayPrompt,
          history: activeSession ? activeSession.messages : [],
          attachments: activeAttachments,
          model: effectiveModel || modelToUseForMessage,
          reasoningTier: activeReasoningTier,
          customProvider: activeCustomProvider,
          orionApiKey: userOrionApiKey,
          workspaceRoot: activeProjectPath || undefined,
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
              commitUpdate(accumulated, toolCallsList);
            });
          }
          return;
        }
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        lastCommit = now;
        commitUpdate(text, toolCallsList);
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
            if (parsed.error || parsed.message && parsed.type === 'agent_error') {
              throw new Error(parsed.error || parsed.message);
            }

            if (isAgentMode) {
              if (parsed.type === 'tool_call_start') {
                toolCallsList = [
                  ...toolCallsList.filter((tc) => tc.id !== parsed.toolCallId),
                  {
                    id: parsed.toolCallId,
                    tool: parsed.tool,
                    args: parsed.args,
                    status: parsed.needsApproval ? 'waiting_approval' : 'running',
                    reason: parsed.reason,
                  },
                ];
                commitUpdate(accumulated, toolCallsList);
              } else if (parsed.type === 'tool_call_waiting_approval') {
                toolCallsList = toolCallsList.map((tc) =>
                  tc.id === parsed.toolCallId
                    ? { ...tc, status: 'waiting_approval', reason: parsed.reason }
                    : tc
                );
                commitUpdate(accumulated, toolCallsList);
              } else if (parsed.type === 'tool_call_waiting_choice') {
                toolCallsList = toolCallsList.map((tc) =>
                  tc.id === parsed.toolCallId
                    ? {
                        ...tc,
                        status: 'waiting_choice',
                        question: parsed.question,
                        options: parsed.options,
                      }
                    : tc
                );
                commitUpdate(accumulated, toolCallsList);
              } else if (parsed.type === 'tool_call_running') {
                toolCallsList = toolCallsList.map((tc) =>
                  tc.id === parsed.toolCallId ? { ...tc, status: 'running' } : tc
                );
                commitUpdate(accumulated, toolCallsList);
              } else if (parsed.type === 'tool_call_complete') {
                toolCallsList = toolCallsList.map((tc) =>
                  tc.id === parsed.toolCallId
                    ? { ...tc, status: parsed.isError ? 'error' : 'completed', result: parsed.result }
                    : tc
                );
                commitUpdate(accumulated, toolCallsList);
              } else if (parsed.type === 'tool_call_rejected') {
                toolCallsList = toolCallsList.map((tc) =>
                  tc.id === parsed.toolCallId ? { ...tc, status: 'rejected' } : tc
                );
                commitUpdate(accumulated, toolCallsList);
              } else if (parsed.type === 'agent_thought') {
                // If message is still empty, show progress
              } else if (parsed.type === 'agent_done') {
                accumulated = parsed.finalAnswer;
                commitUpdate(accumulated, toolCallsList);
              } else if (parsed.type === 'stream_end') {
                break;
              }
            } else {
              if (parsed.chunk) {
                accumulated += parsed.chunk;
                hasNewChunk = true;
              }
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
      commitUpdate(accumulated, toolCallsList);

      // Fallback if stream was empty
      if (!accumulated.trim() && toolCallsList.length === 0) {
        const fallbackRes = await fetch('/api/chat/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('orion_auth_token')
              ? { Authorization: `Bearer ${localStorage.getItem('orion_auth_token')}` }
              : {}),
          },
          body: JSON.stringify({
            message: displayPrompt,
            history: activeSession ? activeSession.messages : [],
            model: effectiveModel || modelToUseForMessage,
            reasoningTier: activeReasoningTier,
            customProvider: activeCustomProvider,
            orionApiKey: userOrionApiKey,
          }),
          signal: controller.signal,
        });
        if (fallbackRes.ok) {
          const json = await fallbackRes.json();
          accumulated = json.data.content;
          commitUpdate(accumulated, toolCallsList);
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
              if (s.id === targetSessionId) {
                return {
                  ...s,
                  messages: (s.messages || []).map((m) =>
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
          if (s.id === targetSessionId) {
            return {
              ...s,
              messages: (s.messages || []).map((m) =>
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

      // Persist latest sessions state to disk and server
      setSessions((latest) => {
        try {
          localStorage.setItem('orion_chat_sessions', JSON.stringify(latest));
        } catch {}
        fetch('/api/chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessions: latest, activeSessionId: targetSessionId }),
        }).then(async (r) => {
          if (r.ok) {
            const data = await r.json();
            if (data.updatedAt) lastServerUpdatedAtRef.current = data.updatedAt;
          }
        }).catch(() => {});
        return latest;
      });
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

  // Authentication Guard: Login or Initial Setup Screen
  if (authStatus.isLoading) {
    return (
      <div className="login-screen-wrapper">
        <div className="login-btn-spinner" style={{ width: 28, height: 28, color: 'var(--text-primary)' }} />
      </div>
    );
  }

  if (!authStatus.isAuthenticated) {
    return (
      <LoginPage
        isInitialized={authStatus.isInitialized}
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
        onToggleTheme={() => handleSelectThemeMode(theme === 'dark' ? 'light' : 'dark')}
      />
    );
  }

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
        hasUpdate={Boolean(updateInfo?.hasUpdate)}
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
        authUser={authStatus.user}
        onLogout={handleLogout}
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
            {currentView === 'skills' && (
              <span className="session-active-title">Skills Hub</span>
            )}
            {currentView === 'updates' && (
              <span className="session-active-title">Pembaruan Sistem</span>
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
            onOpenUpdates={() => setCurrentView('updates')}
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
            combos={combos}
            onCombosUpdated={fetchCombos}
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
        ) : currentView === 'skills' ? (
          <SkillsView onClose={() => setCurrentView('dashboard')} showToast={showToast} />
        ) : currentView === 'updates' ? (
          <div className="page-view-container animate-page-enter">
            <UpdateCheckView
              updateInfo={updateInfo}
              isChecking={isCheckingUpdate}
              isUpdating={isUpdating}
              updateResult={updateResult}
              updateError={updateError}
              onCheckUpdates={() => handleCheckUpdates(true)}
              onPerformUpdate={handlePerformUpdate}
            />
          </div>
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
                            {/* If message has active skill or starts with skill slash command, render [<>] skill pill */}
                            {(() => {
                              const skillName = msg.skill || (
                                typeof msg.content === 'string' &&
                                msg.content.startsWith('/') &&
                                !['/clear', '/new', '/agent', '/help'].some((c) => msg.content.startsWith(c))
                                  ? msg.content.split(/\s+/)[0].replace(/^\//, '')
                                  : null
                              );
                              if (!skillName) return null;
                              return (
                                <div className="msg-skill-badge-row">
                                  <div className="active-command-pill in-message">
                                    <span className="command-pill-icon-box" title="Skill">
                                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect x="1" y="1.5" width="14" height="13" rx="3.5" stroke="currentColor" strokeWidth="1.2" opacity="0.75" />
                                        <path d="M5.5 5.5L3.5 8L5.5 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M10.5 5.5L12.5 8L10.5 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    </span>
                                    <span className="command-pill-label">{skillName}</span>
                                  </div>
                                </div>
                              );
                            })()}
                            {(() => {
                              let textToRender = msg.content;
                              if (msg.skill && textToRender.startsWith(`/${msg.skill}`)) {
                                textToRender = textToRender.slice(msg.skill.length + 1).trim();
                              } else if (!msg.skill && textToRender?.startsWith('/') && !['/clear', '/new', '/agent', '/help'].some((c) => textToRender.startsWith(c))) {
                                const parts = textToRender.split(/\s+/);
                                textToRender = parts.slice(1).join(' ').trim();
                              }
                              return textToRender ? (
                                <div className="user-text-content">{textToRender}</div>
                              ) : null;
                            })()}
                          </div>
                        ) : (
                          <div className="ai-message-wrapper">
                            {Array.isArray(msg.toolCalls) && msg.toolCalls.length > 0 && (
                              <div className="agent-tool-calls-container">
                                {msg.toolCalls.map((tc) => (
                                  <ToolCallBlock
                                    key={tc.id}
                                    toolCall={tc}
                                    onApprove={handleApproveTool}
                                    onReject={handleRejectTool}
                                    onChooseOption={handleChooseOption}
                                  />
                                ))}
                              </div>
                            )}
                            {msg.content === '' ? (
                              isGenerating && isStreamingThis && (!msg.toolCalls || msg.toolCalls.length === 0) ? (
                                <ThinkingIndicator
                                  model={msg.model || selectedModel}
                                  reasoningTier={msg.reasoningTier || reasoningTier}
                                />
                              ) : null
                            ) : (
                              <>
                                <FormattedMessage content={msg.content} isStreaming={isStreamingThis} />
                                {msg.role === 'assistant' &&
                                  index === messages.length - 1 &&
                                  !isGenerating &&
                                  !(Array.isArray(msg.toolCalls) && msg.toolCalls.some((tc) => tc.status === 'waiting_approval' || tc.status === 'waiting_choice')) && (
                                    (() => {
                                      const numberedOpts = extractNumberedOptions(msg.content);
                                      if (numberedOpts.length > 0) {
                                        return (
                                          <div className="agent-text-confirmation-box">
                                            <div className="agent-confirmation-desc">
                                              <Terminal size={13} />
                                              <span>Pilihan Respons (Klik opsi atau ketik angka):</span>
                                            </div>
                                            <div className="agent-confirmation-actions">
                                              {numberedOpts.map((opt) => (
                                                <button
                                                  key={opt.num}
                                                  type="button"
                                                  className="agent-confirmation-btn"
                                                  onClick={() => handleSendMessage(`${opt.num}. ${opt.text}`)}
                                                >
                                                  <span className="agent-opt-badge">[{opt.num}]</span>
                                                  <span className="agent-confirmation-text">{opt.text}</span>
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      }
                                      if (detectConfirmationQuestion(msg.content)) {
                                        return (
                                          <div className="agent-text-confirmation-box">
                                            <div className="agent-confirmation-desc">
                                              <HelpCircle size={13} />
                                              <span>Konfirmasi Tindakan Diperlukan:</span>
                                            </div>
                                            <div className="agent-confirmation-actions">
                                              <button
                                                type="button"
                                                className="agent-confirmation-btn approve-opt"
                                                onClick={() => handleSendMessage('Ya, saya setuju dan mengizinkan. Silakan lanjutkan.')}
                                              >
                                                <span className="agent-opt-badge approve-badge">[1]</span>
                                                <span className="agent-confirmation-text">✓ Setuju (Lanjutkan)</span>
                                              </button>
                                              <button
                                                type="button"
                                                className="agent-confirmation-btn reject-opt"
                                                onClick={() => handleSendMessage('Tidak, batalkan tindakan ini.')}
                                              >
                                                <span className="agent-opt-badge reject-badge">[2]</span>
                                                <span className="agent-confirmation-text">✗ Tolak (Batalkan)</span>
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()
                                  )}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Bar for AI Message */}
                      {msg.role === 'assistant' && msg.content !== '' && (
                        <div className="message-actions-bar">
                          {msg.isVisionTask && (
                            <span
                              className="msg-vision-indicator-pill"
                              title={`Diproses oleh model vision: ${msg.model}`}
                            >
                              <Eye size={11} />
                              <span>Vision · {msg.model?.includes('::') ? msg.model.split('::')[1] : msg.model}</span>
                            </span>
                          )}
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
          activeSkill={activeSkill}
          setActiveSkill={setActiveSkill}
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
          combos={combos}
          onOpenManageProviders={() => setCurrentView('providers')}
          isAgentMode={isAgentMode}
          setIsAgentMode={handleToggleAgentMode}
          projectPath={activeProjectPath}
          projectName={activeProjectName}
          onOpenProjectModal={() => setIsProjectModalOpen(true)}
          onClearProject={handleClearProject}
        />

        {/* Ambient Voice Calling Overlay with Equalizer Wave Visualizer */}
        <VoiceCallingOverlay
          isActive={isVoiceCalling}
          isMuted={isVoiceMuted}
          agentStatus={voiceAgentStatus}
          userTranscript={voiceUserTranscript}
          agentResponse={voiceAgentResponse}
          responseTurn={voiceResponseTurn}
          activeToolCalls={voiceActiveToolCalls}
          pendingApproval={voicePendingApproval}
          sessionTitle={activeSession?.title || 'Percakapan Baru'}
          onApproveTool={async (toolCallId) => {
            const currentPending = voicePendingApprovalRef.current;
            setVoicePendingApproval(null);
            voicePendingApprovalRef.current = null;
            if (currentPending?.isConversational) {
              soundEffects.playSend?.();
              handleTriggerVoiceAgentResponse('Ya, saya setuju.');
            } else if (currentPending?.isChoice || currentPending?.tool === 'ask_user') {
              const selectedText = currentPending.options?.[0] || 'Ya, lanjutkan';
              await handleChooseOption(toolCallId, selectedText, 0);
            } else {
              await handleApproveTool(toolCallId);
            }
          }}
          onRejectTool={async (toolCallId) => {
            const currentPending = voicePendingApprovalRef.current;
            setVoicePendingApproval(null);
            voicePendingApprovalRef.current = null;
            if (currentPending?.isConversational) {
              handleTriggerVoiceAgentResponse('Tidak, batalkan.');
            } else {
              await handleRejectTool(toolCallId);
            }
          }}
          onChooseOption={async (toolCallId, option, index) => {
            setVoicePendingApproval(null);
            voicePendingApprovalRef.current = null;
            await handleChooseOption(toolCallId, option, index);
          }}
          onToggleMute={handleToggleVoiceMute}
          onEndCall={handleEndVoiceCalling}
        />
          </>
        )}
      </main>

      {/* Project Directory Picker Modal */}
      <ProjectDirectoryModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSelectProject={handleSelectProject}
        currentProjectPath={activeProjectPath}
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

      {/* Floating Bottom-Right Update Warning Toast Modal */}
      {updateInfo?.hasUpdate && !isUpdateToastDismissed && currentView !== 'updates' && (
        <UpdateNotificationToast
          updateInfo={updateInfo}
          isUpdating={isUpdating}
          onPerformUpdate={() => {
            setCurrentView('updates');
            handlePerformUpdate();
          }}
          onOpenUpdates={() => {
            setIsUpdateToastDismissed(true);
            setCurrentView('updates');
          }}
          onDismiss={() => setIsUpdateToastDismissed(true)}
        />
      )}
    </div>
  );
}
