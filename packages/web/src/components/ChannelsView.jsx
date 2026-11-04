import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Radio,
  Send,
  MessageSquare,
  MessageCircle,
  Hash,
  Shield,
  Globe,
  Mail,
  Terminal,
  Webhook,
  Sparkles,
  Check,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Settings2,
  ExternalLink,
  QrCode,
  WifiOff,
  Zap,
  X,
  Eye,
  EyeOff,
  Search,
  Copy,
  Info,
} from 'lucide-react';
import QRCode from 'qrcode';

// State to badge styling mapping in Orion design
const STATE_BADGES = {
  connected: {
    label: 'Connected',
    bg: 'rgba(34, 197, 94, 0.12)',
    color: '#4ade80',
    border: 'rgba(34, 197, 94, 0.28)',
  },
  pending_restart: {
    label: 'Restart to apply',
    bg: 'rgba(245, 158, 11, 0.12)',
    color: '#fbbf24',
    border: 'rgba(245, 158, 11, 0.28)',
  },
  startup_failed: {
    label: 'Start failed',
    bg: 'rgba(239, 68, 68, 0.12)',
    color: '#f87171',
    border: 'rgba(239, 68, 68, 0.28)',
  },
  disconnected: {
    label: 'Disconnected',
    bg: 'rgba(245, 158, 11, 0.1)',
    color: '#fbbf24',
    border: 'rgba(245, 158, 11, 0.2)',
  },
  not_configured: {
    label: 'Not configured',
    bg: 'rgba(255, 255, 255, 0.03)',
    color: '#94a3b8',
    border: 'rgba(255, 255, 255, 0.1)',
  },
  disabled: {
    label: 'Disabled',
    bg: 'rgba(255, 255, 255, 0.04)',
    color: '#71717a',
    border: 'rgba(255, 255, 255, 0.08)',
  },
};

// Platform Icon mapping
function getPlatformIcon(id, size = 18) {
  switch (id) {
    case 'telegram':
      return <Send size={size} className="channel-icon-telegram" />;
    case 'whatsapp':
      return <MessageCircle size={size} className="channel-icon-whatsapp" />;
    case 'discord':
      return <Hash size={size} className="channel-icon-discord" />;
    case 'slack':
      return <MessageSquare size={size} className="channel-icon-slack" />;
    case 'mattermost':
      return <Shield size={size} className="channel-icon-mattermost" />;
    case 'matrix':
      return <Globe size={size} className="channel-icon-matrix" />;
    case 'signal':
      return <Radio size={size} className="channel-icon-signal" />;
    case 'email':
      return <Mail size={size} className="channel-icon-email" />;
    case 'api_server':
      return <Terminal size={size} className="channel-icon-api" />;
    case 'webhook':
      return <Webhook size={size} className="channel-icon-webhook" />;
    default:
      return <Radio size={size} className="channel-icon-default" />;
  }
}

// Field validation helper
const TELEGRAM_USER_ID_RE = /^\d+$/;
const TELEGRAM_BOT_TOKEN_RE = /^\d+:[A-Za-z0-9_-]{30,}$/;
const SLACK_MEMBER_ID_RE = /^[UW][A-Z0-9]{2,}$/;

function validateEnvField(key, value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;

  if (key === 'TELEGRAM_BOT_TOKEN' && !TELEGRAM_BOT_TOKEN_RE.test(trimmed)) {
    return 'Format token bot tidak sesuai. Dapatkan dari @BotFather (contoh: 123456789:ABC...).';
  }

  if (key === 'TELEGRAM_ALLOWED_USERS') {
    const invalid = trimmed
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .find((p) => !TELEGRAM_USER_ID_RE.test(p));
    if (invalid) {
      return `"${invalid}" bukan ID pengguna Telegram numerik yang valid.`;
    }
  }

  if (key === 'SLACK_BOT_TOKEN' && !trimmed.startsWith('xoxb-')) {
    return 'Slack Bot Token harus diawali dengan xoxb-';
  }

  if (key === 'SLACK_APP_TOKEN' && !trimmed.startsWith('xapp-')) {
    return 'Slack App Token harus diawali dengan xapp-';
  }

  if (key === 'SLACK_ALLOWED_USERS') {
    const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
    const invalid = parts.find((p) => p !== '*' && !SLACK_MEMBER_ID_RE.test(p));
    if (invalid) {
      return `"${invalid}" bukan ID anggota Slack yang valid (contoh: U01ABC2DEF3).`;
    }
  }

  return null;
}

export default function ChannelsView({ onClose, showToast }) {
  const [channels, setChannels] = useState([]);
  const [summary, setSummary] = useState({ total: 0, configured: 0, enabled: 0 });
  const [envPath, setEnvPath] = useState('~/.env');
  const [gatewayCommand, setGatewayCommand] = useState('npm run start');
  const [gatewayRunning, setGatewayRunning] = useState(true);
  const [restartNeeded, setRestartNeeded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'connected' | 'configured' | 'disabled'

  // Per-action busy states
  const [togglingId, setTogglingId] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const [restarting, setRestarting] = useState(false);

  // Configuration Modal
  const [editingPlatform, setEditingPlatform] = useState(null);
  const [draftEnv, setDraftEnv] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState({});
  const [savingConfig, setSavingConfig] = useState(false);

  // Telegram Quick Setup Modal
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramPairing, setTelegramPairing] = useState(null);
  const [telegramQrUrl, setTelegramQrUrl] = useState('');
  const [telegramManualToken, setTelegramManualToken] = useState('');
  const [telegramAllowedUsers, setTelegramAllowedUsers] = useState('');
  const [telegramLoading, setTelegramLoading] = useState(false);

  // WhatsApp Onboarding Modal
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [whatsappPairing, setWhatsappPairing] = useState(null);
  const [whatsappQrUrl, setWhatsappQrUrl] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappAllowed, setWhatsappAllowed] = useState('');
  const [whatsappLoading, setWhatsappLoading] = useState(false);

  // Load Channels from API
  const loadChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/channels');
      const data = await res.json();
      if (data && data.platforms) {
        setChannels(data.platforms);
        setSummary({
          total: data.total || data.platforms.length,
          configured: data.configured || 0,
          enabled: data.enabled || 0,
        });
        if (data.env_path) setEnvPath(data.env_path);
        if (data.gateway_start_command) setGatewayCommand(data.gateway_start_command);
        setGatewayRunning(data.gateway_running !== false);
        if (typeof data.restart_needed === 'boolean') {
          setRestartNeeded(data.restart_needed);
        }
      }
    } catch (err) {
      console.error('Gagal memuat channels:', err);
      showToast?.('Gagal memuat channels: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Toggle channel enable / disable
  const handleToggle = async (platform) => {
    const nextState = !platform.enabled;
    setTogglingId(platform.id);
    try {
      const res = await fetch(`/api/channels/${platform.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState }),
      });
      const data = await res.json();
      if (data.ok) {
        setChannels((prev) =>
          prev.map((p) =>
            p.id === platform.id
              ? {
                  ...p,
                  enabled: nextState,
                  state: nextState
                    ? p.configured
                      ? 'pending_restart'
                      : 'not_configured'
                    : 'disabled',
                }
              : p
          )
        );
        setRestartNeeded(true);
        showToast?.(
          `${platform.name} ${nextState ? 'diaktifkan' : 'dinonaktifkan'}. Muat ulang gateway untuk menerapkan.`
        );
      } else {
        showToast?.(`Gagal mengubah status ${platform.name}: ${data.error || 'Error'}`);
      }
    } catch (err) {
      showToast?.(`Kesalahan koneksi: ${err.message}`);
    } finally {
      setTogglingId(null);
    }
  };

  // Test channel connection
  const handleTest = async (platform) => {
    setTestingId(platform.id);
    try {
      const res = await fetch(`/api/channels/${platform.id}/test`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.ok) {
        showToast?.(`⚡ ${platform.name}: ${data.message}`);
        setChannels((prev) =>
          prev.map((p) => (p.id === platform.id ? { ...p, state: 'connected' } : p))
        );
      } else {
        showToast?.(`❌ ${platform.name}: ${data.message || 'Koneksi gagal.'}`);
      }
    } catch (err) {
      showToast?.(`Gagal menguji koneksi: ${err.message}`);
    } finally {
      setTestingId(null);
    }
  };

  // Restart Gateway
  const handleRestartGateway = async () => {
    setRestarting(true);
    try {
      const res = await fetch('/api/channels/restart', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        showToast?.('Gateway Orion berhasil dimuat ulang. Semua channel aktif terhubung.');
        setRestartNeeded(false);
        await loadChannels();
      } else {
        showToast?.(`Gagal restart: ${data.detail || 'Error'}`);
      }
    } catch (err) {
      showToast?.(`Gagal restart gateway: ${err.message}`);
    } finally {
      setRestarting(false);
    }
  };

  // Open Configure Modal
  const openConfigModal = (platform) => {
    const initial = {};
    const passMap = {};
    platform.env_vars.forEach((v) => {
      initial[v.key] = v.value || '';
      if (v.is_password) passMap[v.key] = false;
    });
    setDraftEnv(initial);
    setFieldErrors({});
    setShowPassword(passMap);
    setEditingPlatform(platform);
  };

  // Save Configuration Modal
  const handleSaveConfig = async () => {
    if (!editingPlatform) return;

    // Validate fields
    const nextErrors = {};
    const envToSend = {};
    const clearEnv = [];

    editingPlatform.env_vars.forEach((field) => {
      const val = (draftEnv[field.key] || '').trim();
      const err = validateEnvField(field.key, val);
      if (err) {
        nextErrors[field.key] = err;
      }

      if (val) {
        envToSend[field.key] = val;
      } else if (field.is_set && val === '') {
        // If field was previously set and now explicitly empty, clear it
        clearEnv.push(field.key);
      }
    });

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      showToast?.('Harap perbaiki kolom yang diberi tanda merah.');
      return;
    }

    // Check required fields if configuring for the first time
    const missing = editingPlatform.env_vars.filter(
      (v) => v.required && !v.is_set && !envToSend[v.key]
    );
    if (missing.length > 0) {
      showToast?.(`${missing[0].label || missing[0].key} wajib diisi.`);
      return;
    }

    setSavingConfig(true);
    try {
      const res = await fetch(`/api/channels/${editingPlatform.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: true,
          env: envToSend,
          clear_env: clearEnv,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast?.(`Kredensial ${editingPlatform.name} berhasil disimpan.`);
        setEditingPlatform(null);
        setRestartNeeded(true);
        await loadChannels();
      } else {
        showToast?.(`Gagal menyimpan: ${data.detail || data.error || 'Error'}`);
      }
    } catch (err) {
      showToast?.(`Kesalahan simpan: ${err.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  // Telegram Quick Setup trigger
  const handleStartTelegramQr = async () => {
    setTelegramLoading(true);
    setShowTelegramModal(true);
    try {
      const res = await fetch('/api/channels/telegram/onboarding/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_name: 'OrionAgentBot' }),
      });
      const data = await res.json();
      if (data.pairing_url) {
        setTelegramPairing(data);
        const qr = await QRCode.toDataURL(data.pairing_url, {
          width: 240,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        });
        setTelegramQrUrl(qr);
      }
    } catch (err) {
      showToast?.('Gagal menginisialisasi pairing Telegram: ' + err.message);
    } finally {
      setTelegramLoading(false);
    }
  };

  // Submit Telegram Manual Setup
  const handleSaveTelegramManual = async () => {
    if (!telegramManualToken.trim()) {
      showToast?.('Masukkan token bot dari @BotFather.');
      return;
    }
    const tokenErr = validateEnvField('TELEGRAM_BOT_TOKEN', telegramManualToken);
    if (tokenErr) {
      showToast?.(tokenErr);
      return;
    }

    setTelegramLoading(true);
    try {
      const res = await fetch('/api/channels/telegram', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: true,
          env: {
            TELEGRAM_BOT_TOKEN: telegramManualToken.trim(),
            ...(telegramAllowedUsers.trim()
              ? { TELEGRAM_ALLOWED_USERS: telegramAllowedUsers.trim() }
              : {}),
          },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast?.('Telegram Bot berhasil dikonfigurasi & diaktifkan.');
        setShowTelegramModal(false);
        setRestartNeeded(true);
        await loadChannels();
      } else {
        showToast?.('Gagal menyimpan Telegram: ' + (data.detail || data.error));
      }
    } catch (err) {
      showToast?.('Error: ' + err.message);
    } finally {
      setTelegramLoading(false);
    }
  };

  // WhatsApp Quick Setup trigger
  const handleStartWhatsappQr = async () => {
    setWhatsappLoading(true);
    setShowWhatsappModal(true);
    try {
      const res = await fetch('/api/channels/whatsapp/onboarding/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'bot' }),
      });
      const data = await res.json();
      if (data.qr_string) {
        setWhatsappPairing(data);
        const qr = await QRCode.toDataURL(data.qr_string, {
          width: 240,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        });
        setWhatsappQrUrl(qr);
      }
    } catch (err) {
      showToast?.('Gagal inisialisasi QR WhatsApp: ' + err.message);
    } finally {
      setWhatsappLoading(false);
    }
  };

  // Filtered Channels
  const filteredChannels = useMemo(() => {
    return channels.filter((item) => {
      // Search
      const matchesSearch =
        searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Status Filter
      if (statusFilter === 'connected') return item.state === 'connected';
      if (statusFilter === 'configured') return item.configured;
      if (statusFilter === 'disabled') return !item.enabled;
      return true;
    });
  }, [channels, searchQuery, statusFilter]);

  // Separate telegram as featured if present
  const telegramPlatform = channels.find((p) => p.id === 'telegram');
  const otherChannels = filteredChannels.filter((p) => p.id !== 'telegram');

  return (
    <div className="minimal-view-wrapper">
      <div className="minimal-view-container" style={{ maxWidth: '1080px' }}>
        {/* ================= TOP HEADER ================= */}
        <div className="hermes-header-top">
          <div>
            <h1 className="hermes-title">Channels</h1>
            <p
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-secondary, #94a3b8)',
                margin: '0.35rem 0 0',
                lineHeight: 1.45,
              }}
            >
              <span style={{ color: 'var(--text-primary, #ffffff)', fontWeight: 600 }}>
                {summary.configured} dari {summary.total} channel terkonfigurasi.
              </span>{' '}
              Kredensial disimpan aman pada <code className="font-courier" style={{ color: '#e2e8f0' }}>{envPath}</code>. Gateway Orion menyambungkan setiap channel aktif saat dimuat ulang.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              className="hermes-header-btn"
              onClick={handleRestartGateway}
              disabled={restarting}
              title="Muat ulang gateway untuk menerapkan kredensial terbaru"
            >
              {restarting ? (
                <>
                  <RotateCw size={12} className="spin-slow" /> RESTARTING...
                </>
              ) : (
                <>
                  <RotateCw size={12} /> RESTART GATEWAY
                </>
              )}
            </button>

            {onClose && (
              <button
                type="button"
                className="minimal-btn-icon"
                onClick={onClose}
                title="Tutup halaman Channels"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* ================= RESTART NEEDED BANNER ================= */}
        {restartNeeded && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1.15rem',
              marginBottom: '1.5rem',
              borderRadius: '6px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.28)',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <AlertTriangle size={16} style={{ color: '#fbbf24', flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', color: '#fef3c7' }}>
                Perubahan tersimpan. Muat ulang gateway agar channel terbaru mulai aktif tersambung.
              </span>
            </div>

            <button
              type="button"
              className="hermes-header-btn"
              style={{
                fontSize: '0.7rem',
                padding: '0.35rem 0.85rem',
                background: '#fbbf24',
                color: '#000000',
              }}
              onClick={handleRestartGateway}
              disabled={restarting}
            >
              {restarting ? 'MEMUAT...' : 'RESTART SEKARANG'}
            </button>
          </div>
        )}

        {/* ================= SEARCH & STATUS FILTER ================= */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 300px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255, 255, 255, 0.4)',
              }}
            />
            <input
              type="text"
              placeholder="Cari channel perpesanan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="hermes-search-input"
              style={{
                width: '100%',
                padding: '0.55rem 0.85rem 0.55rem 2.3rem',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: '#ffffff',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {[
              { id: 'all', label: `Semua (${summary.total})` },
              { id: 'connected', label: 'Connected' },
              { id: 'configured', label: `Configured (${summary.configured})` },
              { id: 'disabled', label: 'Disabled' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                style={{
                  fontSize: '0.74rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '4px',
                  border:
                    statusFilter === f.id
                      ? '1px solid rgba(255, 255, 255, 0.3)'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                  background:
                    statusFilter === f.id
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(255, 255, 255, 0.02)',
                  color: statusFilter === f.id ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  fontWeight: statusFilter === f.id ? 600 : 400,
                  transition: 'all 0.15s ease',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ================= TELEGRAM FEATURED CARD ================= */}
        {telegramPlatform && (statusFilter === 'all' || (statusFilter === 'connected' && telegramPlatform.state === 'connected') || (statusFilter === 'configured' && telegramPlatform.configured) || (statusFilter === 'disabled' && !telegramPlatform.enabled)) && (
          <div
            className="hermes-card"
            style={{
              padding: '1.4rem 1.6rem',
              marginBottom: '1.25rem',
              background: 'rgba(255, 255, 255, 0.025)',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '6px',
            }}
          >
            {/* Card Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: 'rgba(56, 189, 248, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38bdf8',
                  }}
                >
                  <Send size={16} />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff' }}>
                      Telegram
                    </span>
                    {/* Badge */}
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '3px',
                        background: STATE_BADGES[telegramPlatform.state]?.bg || 'rgba(255, 255, 255, 0.05)',
                        color: STATE_BADGES[telegramPlatform.state]?.color || '#ffffff',
                        border: `1px solid ${STATE_BADGES[telegramPlatform.state]?.border || 'transparent'}`,
                      }}
                    >
                      {STATE_BADGES[telegramPlatform.state]?.label || telegramPlatform.state}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.6)', margin: '0.2rem 0 0' }}>
                    {telegramPlatform.description}
                  </p>
                </div>
              </div>

              {/* Header Right Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Switch Toggle */}
                <label
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '36px',
                    height: '20px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={telegramPlatform.enabled}
                    onChange={() => handleToggle(telegramPlatform)}
                    disabled={togglingId === 'telegram'}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: telegramPlatform.enabled ? '#ffffff' : 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '20px',
                      transition: '0.2s',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        content: "''",
                        height: '14px',
                        width: '14px',
                        left: telegramPlatform.enabled ? '19px' : '3px',
                        bottom: '3px',
                        backgroundColor: telegramPlatform.enabled ? '#000000' : '#ffffff',
                        borderRadius: '50%',
                        transition: '0.2s',
                      }}
                    />
                  </span>
                </label>

                {/* Test Button */}
                <button
                  type="button"
                  onClick={() => handleTest(telegramPlatform)}
                  disabled={testingId === 'telegram' || !telegramPlatform.configured}
                  title="Uji koneksi bot Telegram"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '0.35rem 0.75rem',
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'transparent',
                    color: '#ffffff',
                    cursor: telegramPlatform.configured ? 'pointer' : 'not-allowed',
                    opacity: telegramPlatform.configured ? 1 : 0.45,
                  }}
                >
                  {testingId === 'telegram' ? (
                    <RotateCw size={12} className="spin-slow" />
                  ) : (
                    <Zap size={12} />
                  )}
                  TEST
                </button>
              </div>
            </div>

            {/* Telegram Options Container */}
            <div
              style={{
                marginTop: '1.15rem',
                paddingTop: '1.15rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div style={{ marginBottom: '0.85rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>
                  Choose how to connect your Telegram bot
                </span>
                <p style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.5)', margin: '0.15rem 0 0' }}>
                  Both options connect a bot you control and save its credentials securely to this Orion AI installation.
                </p>
              </div>

              {/* Side-by-side Option Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1rem',
                }}
              >
                {/* QUICK SETUP */}
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', color: '#ffffff' }}>
                        QUICK SETUP
                      </span>
                      <span
                        style={{
                          fontSize: '0.62rem',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '3px',
                          background: 'rgba(34, 197, 94, 0.15)',
                          color: '#4ade80',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          fontWeight: 600,
                        }}
                      >
                        recommended
                      </span>
                    </div>
                    <p style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.45, marginBottom: '1rem' }}>
                      Scan QR code and confirm in Telegram. Orion creates the bot and detects your Telegram user ID automatically.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartTelegramQr}
                    className="hermes-header-btn"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      background: '#ffffff',
                      color: '#000000',
                      padding: '0.45rem',
                      fontSize: '0.72rem',
                    }}
                  >
                    <QrCode size={13} /> CREATE WITH QR
                  </button>
                </div>

                {/* MANUAL SETUP */}
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', color: '#ffffff' }}>
                        USE YOUR OWN BOT
                      </span>
                    </div>
                    <p style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.45, marginBottom: '1rem' }}>
                      Create a bot with @BotFather, or connect one you already have, by entering its token and choosing who can use it.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openConfigModal(telegramPlatform)}
                    style={{
                      width: '100%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      padding: '0.45rem',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
                  >
                    <Settings2 size={13} /> MANUAL SETUP
                  </button>
                </div>
              </div>

              {/* Status Note */}
              {telegramPlatform.configured && (
                <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <CheckCircle2 size={12} style={{ color: '#4ade80' }} />
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Telegram credentials are configured. A new QR setup or bot token will replace the current bot when you save.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= OTHER CHANNELS LIST ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {otherChannels.map((platform) => {
            const badge = STATE_BADGES[platform.state] || STATE_BADGES.not_configured;

            return (
              <div
                key={platform.id}
                className="hermes-card"
                style={{
                  padding: '1.15rem 1.4rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Left: Icon & Meta */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: '1 1 340px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(255, 255, 255, 0.8)',
                    }}
                  >
                    {getPlatformIcon(platform.id, 16)}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#ffffff' }}>
                        {platform.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.66rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '3px',
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: '0.76rem',
                        color: 'rgba(255, 255, 255, 0.55)',
                        margin: '0.18rem 0 0',
                        lineHeight: 1.35,
                      }}
                    >
                      {platform.description}
                    </p>
                  </div>
                </div>

                {/* Right: Toggle Switch & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* WhatsApp Quick QR button */}
                  {platform.id === 'whatsapp' && (
                    <button
                      type="button"
                      onClick={handleStartWhatsappQr}
                      title="Scan QR Code WhatsApp"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '0.38rem 0.75rem',
                        borderRadius: '4px',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        background: 'rgba(255, 255, 255, 0.04)',
                        color: '#ffffff',
                        cursor: 'pointer',
                      }}
                    >
                      <QrCode size={12} /> QR PAIRING
                    </button>
                  )}

                  {/* Switch Toggle */}
                  <label
                    style={{
                      position: 'relative',
                      display: 'inline-block',
                      width: '36px',
                      height: '20px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={platform.enabled}
                      onChange={() => handleToggle(platform)}
                      disabled={togglingId === platform.id}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: platform.enabled ? '#ffffff' : 'rgba(255, 255, 255, 0.15)',
                        borderRadius: '20px',
                        transition: '0.2s',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          content: "''",
                          height: '14px',
                          width: '14px',
                          left: platform.enabled ? '19px' : '3px',
                          bottom: '3px',
                          backgroundColor: platform.enabled ? '#000000' : '#ffffff',
                          borderRadius: '50%',
                          transition: '0.2s',
                        }}
                      />
                    </span>
                  </label>

                  {/* Test Button */}
                  <button
                    type="button"
                    onClick={() => handleTest(platform)}
                    disabled={testingId === platform.id || !platform.configured}
                    title={`Uji koneksi ${platform.name}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '0.38rem 0.75rem',
                      borderRadius: '4px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: 'transparent',
                      color: '#ffffff',
                      cursor: platform.configured ? 'pointer' : 'not-allowed',
                      opacity: platform.configured ? 1 : 0.45,
                    }}
                  >
                    {testingId === platform.id ? (
                      <RotateCw size={12} className="spin-slow" />
                    ) : (
                      <Zap size={12} />
                    )}
                    TEST
                  </button>

                  {/* White CONFIGURE Button (Hermes/Orion Specification) */}
                  <button
                    type="button"
                    onClick={() => openConfigModal(platform)}
                    className="hermes-header-btn"
                    style={{
                      background: '#ffffff',
                      color: '#000000',
                      padding: '0.38rem 0.95rem',
                      fontSize: '0.72rem',
                    }}
                  >
                    CONFIGURE
                  </button>
                </div>
              </div>
            );
          })}

          {filteredChannels.length === 0 && (
            <div
              style={{
                padding: '3rem 1rem',
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.45)',
                fontSize: '0.82rem',
              }}
            >
              Tidak ada channel yang cocok dengan pencarian "{searchQuery}".
            </div>
          )}
        </div>

        {/* ================= MODAL: CONFIGURE PLATFORM ================= */}
        {editingPlatform && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.25rem',
            }}
            onClick={(e) => e.target === e.currentTarget && setEditingPlatform(null)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '560px',
                background: '#0e1118',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '90vh',
                overflow: 'hidden',
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.15rem 1.4rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  {getPlatformIcon(editingPlatform.id, 18)}
                  <div>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>
                      Konfigurasi {editingPlatform.name}
                    </h3>
                    <p style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.5)', margin: '0.15rem 0 0' }}>
                      Kredensial disimpan ke berkas lingkungan (.env)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingPlatform(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.5)',
                    cursor: 'pointer',
                    padding: '0.25rem',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div
                style={{
                  padding: '1.25rem 1.4rem',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.15rem',
                }}
              >
                {editingPlatform.env_vars.map((field) => {
                  const error = fieldErrors[field.key];
                  const isPass = field.is_password;
                  const isVisible = showPassword[field.key];

                  return (
                    <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ffffff' }}>
                          {field.label || field.key}{' '}
                          {field.required && (
                            <span style={{ color: '#f87171', marginLeft: '0.15rem' }}>*</span>
                          )}
                        </label>

                        {field.is_set && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              color: '#4ade80',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                            }}
                          >
                            <Check size={10} /> Tersimpan
                          </span>
                        )}
                      </div>

                      {/* Input Box */}
                      <div style={{ position: 'relative' }}>
                        <input
                          type={isPass && !isVisible ? 'password' : 'text'}
                          value={draftEnv[field.key] ?? ''}
                          onChange={(e) => {
                            setDraftEnv((prev) => ({ ...prev, [field.key]: e.target.value }));
                            if (fieldErrors[field.key]) {
                              setFieldErrors((prev) => {
                                const next = { ...prev };
                                delete next[field.key];
                                return next;
                              });
                            }
                          }}
                          placeholder={
                            field.is_set
                              ? field.redacted_value || '•••••••• (Biarkan kosong untuk mempertahankan)'
                              : field.prompt || field.key
                          }
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.85rem',
                            paddingRight: isPass ? '2.5rem' : '0.85rem',
                            borderRadius: '5px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: error
                              ? '1px solid #f87171'
                              : '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#ffffff',
                            fontSize: '0.8rem',
                            fontFamily: isPass ? 'monospace' : 'inherit',
                            outline: 'none',
                          }}
                        />

                        {isPass && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword((prev) => ({
                                ...prev,
                                [field.key]: !prev[field.key],
                              }))
                            }
                            style={{
                              position: 'absolute',
                              right: '0.65rem',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: 'rgba(255, 255, 255, 0.45)',
                              cursor: 'pointer',
                              padding: '0.2rem',
                            }}
                          >
                            {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        )}
                      </div>

                      {/* Error / Help Hint */}
                      {error ? (
                        <span style={{ fontSize: '0.7rem', color: '#f87171' }}>{error}</span>
                      ) : field.help ? (
                        <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.45)' }}>
                          {field.help}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '1rem 1.4rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.65rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setEditingPlatform(null)}
                  style={{
                    padding: '0.45rem 0.95rem',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    background: 'transparent',
                    color: 'rgba(255, 255, 255, 0.75)',
                    cursor: 'pointer',
                  }}
                >
                  BATAL
                </button>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="hermes-header-btn"
                  style={{
                    padding: '0.45rem 1.15rem',
                    fontSize: '0.74rem',
                    background: '#ffffff',
                    color: '#000000',
                  }}
                >
                  {savingConfig ? 'MENYIMPAN...' : 'SIMPAN KONFIGURASI'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: TELEGRAM QR ONBOARDING ================= */}
        {showTelegramModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              backgroundColor: 'rgba(0, 0, 0, 0.78)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.25rem',
            }}
            onClick={(e) => e.target === e.currentTarget && setShowTelegramModal(false)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '480px',
                background: '#0e1118',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.15rem 1.4rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Send size={18} style={{ color: '#38bdf8' }} />
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>
                    Quick Setup Bot Telegram
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTelegramModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.5)',
                    cursor: 'pointer',
                    padding: '0.25rem',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                {telegramQrUrl ? (
                  <div
                    style={{
                      padding: '0.75rem',
                      background: '#ffffff',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img src={telegramQrUrl} alt="Telegram QR" style={{ width: '180px', height: '180px' }} />
                  </div>
                ) : (
                  <div
                    style={{
                      width: '180px',
                      height: '180px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <RotateCw size={24} className="spin-slow" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                  </div>
                )}

                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 600, margin: '0 0 0.35rem' }}>
                    1. Scan QR Code atau buka @BotFather di Telegram
                  </p>
                  <p style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.55)', margin: 0, lineHeight: 1.4 }}>
                    Buat bot baru melalui perintah <code>/newbot</code>, lalu salin HTTP API Token yang diberikan ke bawah.
                  </p>
                </div>

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Tempel token bot (contoh: 123456789:ABCDef...)"
                    value={telegramManualToken}
                    onChange={(e) => setTelegramManualToken(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '5px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      outline: 'none',
                    }}
                  />

                  <input
                    type="text"
                    placeholder="Allowed User IDs (opsional, pisahkan koma)"
                    value={telegramAllowedUsers}
                    onChange={(e) => setTelegramAllowedUsers(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '5px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  padding: '1rem 1.4rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.65rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowTelegramModal(false)}
                  style={{
                    padding: '0.45rem 0.95rem',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    background: 'transparent',
                    color: 'rgba(255, 255, 255, 0.75)',
                    cursor: 'pointer',
                  }}
                >
                  BATAL
                </button>

                <button
                  type="button"
                  onClick={handleSaveTelegramManual}
                  disabled={telegramLoading}
                  className="hermes-header-btn"
                  style={{
                    padding: '0.45rem 1.15rem',
                    fontSize: '0.74rem',
                    background: '#ffffff',
                    color: '#000000',
                  }}
                >
                  {telegramLoading ? 'MENYAMBUNGKAN...' : 'HUBUNGKAN BOT'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: WHATSAPP QR ONBOARDING ================= */}
        {showWhatsappModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              backgroundColor: 'rgba(0, 0, 0, 0.78)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.25rem',
            }}
            onClick={(e) => e.target === e.currentTarget && setShowWhatsappModal(false)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '480px',
                background: '#0e1118',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.15rem 1.4rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <MessageCircle size={18} style={{ color: '#22c55e' }} />
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>
                    Koneksi WhatsApp Gateway
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setShowWhatsappModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.5)',
                    cursor: 'pointer',
                    padding: '0.25rem',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                {whatsappQrUrl ? (
                  <div
                    style={{
                      padding: '0.75rem',
                      background: '#ffffff',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img src={whatsappQrUrl} alt="WhatsApp QR" style={{ width: '180px', height: '180px' }} />
                  </div>
                ) : (
                  <div
                    style={{
                      width: '180px',
                      height: '180px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <RotateCw size={24} className="spin-slow" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                  </div>
                )}

                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 600, margin: '0 0 0.35rem' }}>
                    Scan QR Code dari WhatsApp di Smartphone Anda
                  </p>
                  <p style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.55)', margin: 0, lineHeight: 1.4 }}>
                    Buka WhatsApp &gt; Perangkat Tertaut &gt; Tautkan Perangkat. Arahkan kamera ke kode QR di atas.
                  </p>
                </div>
              </div>

              <div
                style={{
                  padding: '1rem 1.4rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowWhatsappModal(false)}
                  className="hermes-header-btn"
                  style={{
                    padding: '0.45rem 1.15rem',
                    fontSize: '0.74rem',
                    background: '#ffffff',
                    color: '#000000',
                  }}
                >
                  SELESAI
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
