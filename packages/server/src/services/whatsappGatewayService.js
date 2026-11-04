import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import pino from 'pino';
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
} from '@whiskeysockets/baileys';
import { getChatCompletion } from './aiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const SESSION_DIR = path.join(DATA_DIR, 'whatsapp_session');

class WhatsappGatewayService {
  constructor() {
    this.socket = null;
    this.status = 'disconnected'; // 'disconnected' | 'connecting_qr' | 'connected' | 'reconnecting'
    this.currentQr = null;
    this.user = null;
    this.pairingId = null;
    this.pairingExpiresAt = null;
    this.isInitializing = false;
    this.reconnectTimeout = null;
  }

  ensureSessionDir() {
    if (!fs.existsSync(SESSION_DIR)) {
      fs.mkdirSync(SESSION_DIR, { recursive: true });
    }
  }

  hasExistingSession() {
    if (!fs.existsSync(SESSION_DIR)) return false;
    const files = fs.readdirSync(SESSION_DIR);
    return files.some((f) => f.startsWith('creds.json'));
  }

  async initSocket(forceNew = false) {
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
      this.ensureSessionDir();

      if (forceNew) {
        // Clear old credentials if forcing fresh pairing
        try {
          const files = fs.readdirSync(SESSION_DIR);
          for (const file of files) {
            fs.unlinkSync(path.join(SESSION_DIR, file));
          }
        } catch (e) {
          console.warn('[WhatsAppGateway] Failed to purge session dir:', e.message);
        }
      }

      const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
      let version = [2, 3000, 1015901307];
      try {
        const fetched = await fetchLatestBaileysVersion();
        version = fetched.version;
      } catch (e) {
        // fallback to default version
      }

      const logger = pino({ level: 'silent' });

      this.socket = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: state,
        browser: ['Orion Agent', 'Desktop', '1.0.0'],
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        markOnlineOnConnect: true,
      });

      this.socket.ev.on('creds.update', saveCreds);

      this.socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.currentQr = qr;
          this.status = 'waiting_scan';
          console.log('[WhatsAppGateway] 📱 New Baileys QR Code emitted for pairing.');
        }

        if (connection === 'open') {
          this.status = 'connected';
          this.currentQr = null;
          this.user = this.socket?.user;
          const phone = this.getPhoneNumber();
          console.log(`[WhatsAppGateway] 🟢 Terhubung sukses ke WhatsApp! Nomor: +${phone}`);

          // Update channelService persistent state
          try {
            const { channelService } = await import('./channelService.js');
            channelService.updateChannel('whatsapp', {
              enabled: true,
              env: {
                WHATSAPP_PHONE_NUMBER: phone,
                WHATSAPP_MODE: 'bot',
              },
            });
          } catch (err) {
            console.error('[WhatsAppGateway] Failed to sync channel state:', err.message);
          }
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;
          console.log(`[WhatsAppGateway] 🔴 Koneksi terputus. Status Code: ${statusCode}, LoggedOut: ${isLoggedOut}`);

          if (isLoggedOut) {
            this.status = 'disconnected';
            this.user = null;
            this.currentQr = null;
            // Purge credentials on logout
            try {
              if (fs.existsSync(SESSION_DIR)) {
                fs.rmSync(SESSION_DIR, { recursive: true, force: true });
              }
            } catch (err) {
              console.warn('[WhatsAppGateway] Error removing session directory:', err);
            }
          } else {
            this.status = 'reconnecting';
            // Auto reconnect after brief backoff
            if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = setTimeout(() => {
              this.initSocket(false).catch((err) =>
                console.error('[WhatsAppGateway] Reconnect error:', err.message)
              );
            }, 3000);
          }
        }
      });

      // Handle inbound messages & execute AI response
      this.socket.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
          if (!msg.message || msg.key.fromMe) continue;

          // Extract text from diverse message types
          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            '';

          if (!text || typeof text !== 'string' || text.trim().length === 0) continue;

          const remoteJid = msg.key.remoteJid;
          const senderPhone = remoteJid.split('@')[0].replace(/\D/g, '');

          // Check Allowed Users if configured
          try {
            const { channelService } = await import('./channelService.js');
            const channelsData = channelService.getChannels();
            const waPlatform = channelsData.platforms.find((p) => p.id === 'whatsapp');
            const allowedUsersField = waPlatform?.env_vars.find((v) => v.key === 'WHATSAPP_ALLOWED_USERS');
            const allowedUsersStr = allowedUsersField?.value || '';

            if (allowedUsersStr && allowedUsersStr.trim()) {
              const allowedList = allowedUsersStr
                .split(',')
                .map((u) => u.trim().replace(/\D/g, ''))
                .filter(Boolean);

              if (allowedList.length > 0 && !allowedList.includes(senderPhone) && !allowedList.includes('*')) {
                console.log(`[WhatsAppGateway] Ignored message from unauthorized sender: +${senderPhone}`);
                continue;
              }
            }
          } catch (e) {
            // Proceed without strict allowlist on parse error
          }

          console.log(`[WhatsAppGateway] 📩 Pesan diterima dari +${senderPhone}: "${text.slice(0, 50)}..."`);

          // Send typing indicator
          try {
            await this.socket.sendPresenceUpdate('composing', remoteJid);
          } catch (e) {}

          // Generate AI completion via Orion
          try {
            const aiRes = await getChatCompletion({
              message: text,
              history: [],
              model: 'orion',
            });

            const replyText = aiRes.text || 'Maaf, saya tidak dapat merespons saat ini.';

            // Send reply
            await this.socket.sendMessage(remoteJid, { text: replyText }, { quoted: msg });
            console.log(`[WhatsAppGateway] 📤 Respons terkirim ke +${senderPhone}`);
          } catch (err) {
            console.error('[WhatsAppGateway] Error generating AI response for WhatsApp:', err);
            await this.socket.sendMessage(remoteJid, {
              text: 'Maaf, terjadi kesalahan saat memproses permintaan Anda melalui Orion AI.',
            });
          } finally {
            try {
              await this.socket.sendPresenceUpdate('paused', remoteJid);
            } catch (e) {}
          }
        }
      });
    } catch (err) {
      console.error('[WhatsAppGateway] Failed to initialize socket:', err);
      this.status = 'disconnected';
    } finally {
      this.isInitializing = false;
    }
  }

  getPhoneNumber() {
    if (!this.socket?.user) return '';
    const jid = this.socket.user.id || '';
    const norm = jidNormalizedUser(jid);
    return norm.split('@')[0].replace(/\D/g, '');
  }

  async startPairing() {
    this.pairingId = crypto.randomUUID();
    this.pairingExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    this.currentQr = null;

    // Launch or reset socket to obtain fresh QR code
    await this.initSocket(true);

    // Wait up to 6 seconds for first QR event
    const startTime = Date.now();
    while (!this.currentQr && this.status !== 'connected' && Date.now() - startTime < 6000) {
      await new Promise((r) => setTimeout(r, 400));
    }

    return {
      pairing_id: this.pairingId,
      status: this.status,
      qr_string: this.currentQr,
      phone: this.getPhoneNumber(),
      expires_at: this.pairingExpiresAt,
    };
  }

  getStatus(pairingId) {
    return {
      pairing_id: pairingId || this.pairingId,
      status: this.status,
      connected: this.status === 'connected',
      qr_string: this.currentQr,
      phone: this.getPhoneNumber(),
      user: this.user ? { name: this.user.name, id: this.getPhoneNumber() } : null,
      expires_at: this.pairingExpiresAt,
    };
  }

  async disconnect() {
    if (this.socket) {
      try {
        await this.socket.logout();
      } catch (e) {}
      try {
        this.socket.end();
      } catch (e) {}
      this.socket = null;
    }
    this.status = 'disconnected';
    this.currentQr = null;
    this.user = null;
    try {
      if (fs.existsSync(SESSION_DIR)) {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
      }
    } catch (e) {
      console.warn('[WhatsAppGateway] Failed to purge session dir on disconnect:', e.message);
    }
    return { ok: true, message: 'WhatsApp Baileys gateway berhasil dinonaktifkan.' };
  }
}

export const whatsappGatewayService = new WhatsappGatewayService();
export default whatsappGatewayService;
