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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import QRCode from 'qrcode';

// Status badge mapping for Orion design system
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
function getPlatformIcon(id, size = 16) {
  switch (id) {
    case 'telegram':
      return <Send size={size} style={{ color: '#38bdf8' }} />;
    case 'whatsapp':
      return <MessageCircle size={size} style={{ color: '#22c55e' }} />;
    case 'discord':
      return <Hash size={size} style={{ color: '#818cf8' }} />;
    case 'slack':
      return <MessageSquare size={size} style={{ color: '#e879f9' }} />;
    case 'mattermost':
      return <Shield size={size} style={{ color: '#38bdf8' }} />;
    case 'matrix':
      return <Globe size={size} style={{ color: '#2dd4bf' }} />;
    case 'signal':
      return <Radio size={size} style={{ color: '#60a5fa' }} />;
    case 'email':
      return <Mail size={size} style={{ color: '#fb923c' }} />;
    case 'api_server':
      return <Terminal size={size} style={{ color: '#a78bfa' }} />;
    case 'webhook':
      return <Webhook size={size} style={{ color: '#f43f5e' }} />;
    default:
      return <Radio size={size} style={{ color: '#94a3b8' }} />;
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
  const [gatewayRunning, setGatewayRunning] = useState(true);
  const [restartNeeded, setRestartNeeded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'connected' | 'configured' | 'disabled'

  // Telegram card expand/collapse options
  const [telegramExpanded, setTelegramExpanded] = useState(true);

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
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappDisconnecting, setWhatsappDisconnecting] = useState(false);

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
        clearEnv.push(field.key);
      }
    });

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      showToast?.('Harap perbaiki kolom yang diberi tanda merah.');
      return;
    }

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
          width: 220,
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
    setWhatsappQrUrl('');
    try {
      const res = await fetch('/api/channels/whatsapp/onboarding/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'bot' }),
      });
      const data = await res.json();
      setWhatsappPairing(data);
      if (data.connected || data.status === 'connected') {
        setWhatsappConnected(true);
        setWhatsappPhone(data.phone || '');
        await loadChannels();
      } else if (data.qr_string) {
        setWhatsappConnected(false);
        const qr = await QRCode.toDataURL(data.qr_string, {
          width: 220,
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

  // WhatsApp Disconnect
  const handleDisconnectWhatsapp = async () => {
    setWhatsappDisconnecting(true);
    try {
      const res = await fetch('/api/channels/whatsapp/disconnect', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        showToast?.('WhatsApp berhasil diputuskan.');
        setWhatsappConnected(false);
        setWhatsappPhone('');
        setWhatsappQrUrl('');
        setShowWhatsappModal(false);
        await loadChannels();
      } else {
        showToast?.('Gagal memutuskan WhatsApp: ' + (data.detail || data.error));
      }
    } catch (err) {
      showToast?.('Error: ' + err.message);
    } finally {
      setWhatsappDisconnecting(false);
    }
  };

  // Live polling for WhatsApp pairing scan
  useEffect(() => {
    let timer = null;
    let isCancelled = false;

    if (showWhatsappModal && !whatsappConnected) {
      const checkStatus = async () => {
        try {
          const pairingId = whatsappPairing?.pairing_id || 'latest';
          const res = await fetch(`/api/channels/whatsapp/onboarding/${pairingId}`);
          if (!res.ok) return;
          const data = await res.json();
          if (isCancelled) return;

          if (data.connected || data.status === 'connected') {
            setWhatsappConnected(true);
            setWhatsappPhone(data.phone || '');
            setWhatsappQrUrl('');
            showToast?.(`WhatsApp terhubung (+${data.phone || 'Connected'})!`);
            loadChannels();
            return;
          }

          if (data.qr_string && data.qr_string !== whatsappPairing?.qr_string) {
            setWhatsappPairing((prev) => ({ ...(prev || {}), ...data }));
            const qr = await QRCode.toDataURL(data.qr_string, {
              width: 220,
              margin: 1,
              color: { dark: '#000000', light: '#ffffff' },
            });
            if (!isCancelled) {
              setWhatsappQrUrl(qr);
            }
          }
        } catch (e) {
          // ignore transient poll errors
        }
      };

      timer = setInterval(checkStatus, 2000);
    }

    return () => {
      isCancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [showWhatsappModal, whatsappConnected, whatsappPairing?.pairing_id, whatsappPairing?.qr_string, loadChannels, showToast]);

  // Filtered Channels
  const filteredChannels = useMemo(() => {
    return channels.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'connected') return item.state === 'connected';
      if (statusFilter === 'configured') return item.configured;
      if (statusFilter === 'disabled') return !item.enabled;
      return true;
    });
  }, [channels, searchQuery, statusFilter]);

  const telegramPlatform = channels.find((p) => p.id === 'telegram');
  const otherChannels = filteredChannels.filter((p) => p.id !== 'telegram');

  return (
    <div className="channels-view-wrapper">
      <div className="channels-container">
        {/* ================= TOP HEADER ================= */}
        <div className="channels-header">
          <div className="channels-title-wrap">
            <div className="channels-title-row">
              <h1 className="channels-title">Channels</h1>
            </div>
            <p className="channels-subtitle">
              <span style={{ color: 'var(--text-primary, #ffffff)', fontWeight: 600 }}>
                {summary.configured} of {summary.total} channels configured.
              </span>{' '}
              Credentials are saved securely in <code className="font-courier">{envPath}</code>. The gateway connects each enabled channel on restart.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              className="channel-btn-configure"
              onClick={handleRestartGateway}
              disabled={restarting}
              title="Restart gateway to apply pending credentials"
              style={{ padding: '0.42rem 1.05rem' }}
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
          <div className="channels-restart-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <AlertTriangle size={16} style={{ color: '#fbbf24', flexShrink: 0 }} />
              <span style={{ fontSize: '0.8rem', color: '#fef3c7' }}>
                Perubahan tersimpan. Muat ulang gateway agar konfigurasi channel terbaru segera aktif.
              </span>
            </div>

            <button
              type="button"
              className="channel-btn-configure"
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

        {/* ================= FILTER & SEARCH BAR ================= */}
        <div className="channels-filter-bar">
          <div className="channels-search-box">
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: '0.8rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255, 255, 255, 0.4)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Cari channel perpesanan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="channels-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.4)',
                  cursor: 'pointer',
                  padding: '0.2rem',
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="channels-filter-pills">
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
                className={`channels-filter-pill ${statusFilter === f.id ? 'active' : ''}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ================= TELEGRAM SPECIAL CARD (HERMES PARITY) ================= */}
        {telegramPlatform &&
          (statusFilter === 'all' ||
            (statusFilter === 'connected' && telegramPlatform.state === 'connected') ||
            (statusFilter === 'configured' && telegramPlatform.configured) ||
            (statusFilter === 'disabled' && !telegramPlatform.enabled)) && (
            <div className="channel-telegram-card">
              {/* Header row of Telegram card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'nowrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                  <div className="channel-icon-avatar" style={{ background: 'rgba(56, 189, 248, 0.08)', borderColor: 'rgba(56, 189, 248, 0.25)' }}>
                    <Send size={16} style={{ color: '#38bdf8' }} />
                  </div>

                  <div className="channel-meta-col">
                    <div className="channel-name-row">
                      <span className="channel-name">Telegram</span>
                      <span
                        className="channel-status-badge"
                        style={{
                          background: STATE_BADGES[telegramPlatform.state]?.bg,
                          color: STATE_BADGES[telegramPlatform.state]?.color,
                          border: `1px solid ${STATE_BADGES[telegramPlatform.state]?.border}`,
                        }}
                      >
                        {STATE_BADGES[telegramPlatform.state]?.label || telegramPlatform.state}
                      </span>
                    </div>
                    <p className="channel-desc">
                      {telegramPlatform.description}
                    </p>
                  </div>
                </div>

                <div className="channel-card-right">
                  {/* Switch Toggle */}
                  <label className="channel-toggle-switch" title={telegramPlatform.enabled ? 'Nonaktifkan Telegram' : 'Aktifkan Telegram'}>
                    <input
                      type="checkbox"
                      checked={telegramPlatform.enabled}
                      onChange={() => handleToggle(telegramPlatform)}
                      disabled={togglingId === 'telegram'}
                    />
                    <span className="channel-toggle-slider" />
                  </label>

                  {/* Test Button */}
                  <button
                    type="button"
                    onClick={() => handleTest(telegramPlatform)}
                    disabled={testingId === 'telegram' || !telegramPlatform.configured}
                    className="channel-btn-test"
                    title="Uji koneksi bot Telegram"
                  >
                    {testingId === 'telegram' ? (
                      <RotateCw size={11} className="spin-slow" />
                    ) : (
                      <Zap size={11} />
                    )}
                    TEST
                  </button>

                  {/* Toggle Options Button */}
                  <button
                    type="button"
                    onClick={() => setTelegramExpanded((prev) => !prev)}
                    className="channel-btn-qr"
                    title="Tampilkan / Sembunyikan opsi setup Telegram"
                  >
                    <span>Opsi Setup</span>
                    {telegramExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
              </div>

              {/* Collapsible Options Container */}
              {telegramExpanded && (
                <div
                  style={{
                    paddingTop: '0.85rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff' }}>
                      Choose how to connect your Telegram bot
                    </span>
                    <p style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.5)', margin: '0.15rem 0 0' }}>
                      Both options connect a bot you control and save its credentials securely to this Orion AI installation.
                    </p>
                  </div>

                  {/* Side-by-side Options */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                      gap: '0.85rem',
                    }}
                  >
                    {/* QUICK SETUP */}
                    <div
                      style={{
                        padding: '0.95rem 1.15rem',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', color: '#ffffff' }}>
                            QUICK SETUP
                          </span>
                          <span
                            style={{
                              fontSize: '0.62rem',
                              padding: '0.12rem 0.45rem',
                              borderRadius: '3px',
                              background: 'rgba(34, 197, 94, 0.12)',
                              color: '#4ade80',
                              border: '1px solid rgba(34, 197, 94, 0.25)',
                              fontWeight: 600,
                            }}
                          >
                            recommended
                          </span>
                        </div>
                        <p style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.4, margin: 0 }}>
                          Scan a QR code and confirm in Telegram. Orion creates the bot and detects your Telegram user ID automatically.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleStartTelegramQr}
                        className="channel-btn-configure"
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        <QrCode size={13} /> CREATE WITH QR
                      </button>
                    </div>

                    {/* MANUAL SETUP */}
                    <div
                      style={{
                        padding: '0.95rem 1.15rem',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', color: '#ffffff' }}>
                            USE YOUR OWN BOT
                          </span>
                        </div>
                        <p style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.4, margin: 0 }}>
                          Create a bot with @BotFather, or connect one you already have, by entering its token and choosing who can use it.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => openConfigModal(telegramPlatform)}
                        className="channel-btn-test"
                        style={{ width: '100%', justifyContent: 'center', padding: '0.45rem' }}
                      >
                        <Settings2 size={13} /> MANUAL SETUP
                      </button>
                    </div>
                  </div>

                  {telegramPlatform.configured && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <CheckCircle2 size={12} style={{ color: '#4ade80', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                        Telegram credentials are already configured. A new QR setup or bot token will replace the current bot when you save.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        {/* ================= COMPACT CHANNELS LIST (HERMES PARITY) ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {otherChannels.map((platform) => {
            const badge = STATE_BADGES[platform.state] || STATE_BADGES.not_configured;

            return (
              <div key={platform.id} className="channel-row-card">
                {/* Left side: Icon + Name + Badge + Description */}
                <div className="channel-card-left">
                  <div className="channel-icon-avatar">
                    {getPlatformIcon(platform.id, 15)}
                  </div>

                  <div className="channel-meta-col">
                    <div className="channel-name-row">
                      <span className="channel-name">{platform.name}</span>
                      <span
                        className="channel-status-badge"
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="channel-desc" title={platform.description}>
                      {platform.description}
                    </p>
                  </div>
                </div>

                {/* Right side: QR (if WhatsApp) + Toggle + Test + Configure */}
                <div className="channel-card-right">
                  {platform.id === 'whatsapp' && (
                    <button
                      type="button"
                      onClick={handleStartWhatsappQr}
                      className="channel-btn-qr"
                      title={platform.state === 'connected' ? 'Lihat status koneksi WhatsApp' : 'Pairing WhatsApp via QR Code'}
                    >
                      <QrCode size={12} /> {platform.state === 'connected' ? 'QR STATUS' : 'QR PAIRING'}
                    </button>
                  )}

                  {/* Switch Toggle */}
                  <label
                    className="channel-toggle-switch"
                    title={platform.enabled ? `Nonaktifkan ${platform.name}` : `Aktifkan ${platform.name}`}
                  >
                    <input
                      type="checkbox"
                      checked={platform.enabled}
                      onChange={() => handleToggle(platform)}
                      disabled={togglingId === platform.id}
                    />
                    <span className="channel-toggle-slider" />
                  </label>

                  {/* Test Button */}
                  <button
                    type="button"
                    onClick={() => handleTest(platform)}
                    disabled={testingId === platform.id || !platform.configured}
                    className="channel-btn-test"
                    title={`Uji koneksi ${platform.name}`}
                  >
                    {testingId === platform.id ? (
                      <RotateCw size={11} className="spin-slow" />
                    ) : (
                      <Zap size={11} />
                    )}
                    TEST
                  </button>

                  {/* White CONFIGURE Button */}
                  <button
                    type="button"
                    onClick={() => openConfigModal(platform)}
                    className="channel-btn-configure"
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
                borderRadius: '6px',
                border: '1px dashed rgba(255, 255, 255, 0.08)',
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
                            boxSizing: 'border-box',
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
                  className="channel-btn-configure"
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
                maxWidth: '460px',
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
                    <img src={telegramQrUrl} alt="Telegram QR" style={{ width: '160px', height: '160px' }} />
                  </div>
                ) : (
                  <div
                    style={{
                      width: '160px',
                      height: '160px',
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
                    Buat bot baru melalui perintah <code>/newbot</code>, lalu salin HTTP API Token ke form bawah.
                  </p>
                </div>

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
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
                      boxSizing: 'border-box',
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
                      boxSizing: 'border-box',
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
                  className="channel-btn-configure"
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
                maxWidth: '460px',
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

              {whatsappConnected ? (
                /* Connected State */
                <div style={{ padding: '2rem 1.4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'rgba(34, 197, 94, 0.12)',
                      border: '1px solid rgba(34, 197, 94, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircle2 size={36} style={{ color: '#4ade80' }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff', margin: '0 0 0.35rem' }}>
                      WhatsApp Berhasil Terhubung!
                    </h4>
                    {whatsappPhone ? (
                      <p style={{ fontSize: '0.85rem', color: '#4ade80', fontFamily: 'monospace', margin: '0 0 0.5rem' }}>
                        +{whatsappPhone}
                      </p>
                    ) : (
                      <p style={{ fontSize: '0.78rem', color: '#4ade80', margin: '0 0 0.5rem' }}>
                        Gateway Baileys aktif &amp; tersambung
                      </p>
                    )}
                    <p style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.6)', margin: 0, lineHeight: 1.45 }}>
                      Gateway Baileys aktif di Orion AI. Pesan yang masuk akan diproses dan dijawab secara otomatis menggunakan model Orion AI.
                    </p>
                  </div>
                </div>
              ) : (
                /* QR Scan State */
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
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.6rem',
                      }}
                    >
                      <RotateCw size={26} className="spin-slow" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.5)' }}>Menyiapkan QR Baileys...</span>
                    </div>
                  )}

                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.82rem', color: '#ffffff', fontWeight: 600, margin: '0 0 0.35rem' }}>
                      Scan QR Code dari WhatsApp di Smartphone Anda
                    </p>
                    <p style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.55)', margin: 0, lineHeight: 1.45 }}>
                      Buka <b>WhatsApp</b> &gt; <b>Perangkat Tertaut</b> &gt; <b>Tautkan Perangkat</b>.<br />
                      Arahkan kamera ke kode QR di atas untuk menghubungkan Orion AI ke WhatsApp.
                    </p>
                  </div>
                </div>
              )}

              <div
                style={{
                  padding: '1rem 1.4rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.65rem',
                }}
              >
                {whatsappConnected ? (
                  <>
                    <button
                      type="button"
                      onClick={handleDisconnectWhatsapp}
                      disabled={whatsappDisconnecting}
                      style={{
                        padding: '0.45rem 0.95rem',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#f87171',
                        cursor: 'pointer',
                      }}
                    >
                      {whatsappDisconnecting ? 'MEMUTUSKAN...' : 'PUTUSKAN KONEKSI'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowWhatsappModal(false)}
                      className="channel-btn-configure"
                    >
                      SELESAI
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleStartWhatsappQr}
                      disabled={whatsappLoading}
                      style={{
                        padding: '0.45rem 0.95rem',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        background: 'transparent',
                        color: 'rgba(255, 255, 255, 0.75)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <RotateCw size={12} className={whatsappLoading ? 'spin-slow' : ''} />
                      REFRESH QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowWhatsappModal(false)}
                      className="channel-btn-configure"
                    >
                      BATAL
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
