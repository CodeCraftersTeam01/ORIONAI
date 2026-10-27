import { Router } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  getChatCompletion,
  streamChatCompletion,
  testCustomProviderConnection,
  fetchProviderModels,
  testSpecificModel,
} from '../services/aiService.js';
import {
  getAllSessions,
  getSessionById,
  setActiveSessionId,
  createSession,
  deleteSession,
  appendMessageToSession,
  clearSessionMessages,
  syncAllSessions,
  renameSession,
} from '../services/sessionService.js';
import { chatRateLimiter, validateChatInput } from '../middleware/security.js';
import { logger } from '../services/loggerService.js';
import { getCombos } from '../services/comboService.js';

const orionConfigDir = path.join(os.homedir(), '.orion');
const providersConfigFile = path.join(orionConfigDir, 'providers.json');
const credentialsFile = path.join(orionConfigDir, 'credentials.json');

function ensureConfigDir() {
  if (!fs.existsSync(orionConfigDir)) {
    fs.mkdirSync(orionConfigDir, { recursive: true });
  }
}

const router = Router();

const REASONING_TIERS = [
  { id: 'low', name: 'Low', desc: 'Quick and efficient' },
  { id: 'medium', name: 'Medium', desc: 'Balanced depth' },
  { id: 'high', name: 'High', desc: 'Extra thorough' },
];

// Inspirational prompt suggestions
const SUGGESTIONS = [
  {
    icon: '✦',
    category: 'Eksplorasi Konseptual',
    prompt: 'Bagaimana analogi rasi bintang diterapkan dalam arsitektur software terdistribusi?',
    description: 'Menghubungkan pola kosmik dengan desain sistem modern',
  },
  {
    icon: '⚡',
    category: 'Pemrograman Modern',
    prompt: 'Buatkan struktur clean architecture Express.js dengan ES Modules dan async handler.',
    description: 'Implementasi backend rapi dan terukur',
  },
  {
    icon: '🌌',
    category: 'Desain & Antarmuka',
    prompt: 'Berikan tips mendesain UI minimalis dengan animasi halus dan palet warna monokrom.',
    description: 'Prinsip estetika elegan tanpa visual berlebih',
  },
  {
    icon: '✨',
    category: 'Filosofi & Logika',
    prompt: 'Jelaskan perbedaan mendasar antara penalaran deduktif, induktif, dan abduktif dalam AI.',
    description: 'Pondasi logika dalam pengambilan keputusan cerdas',
  },
];

// POST /api/chat/message (Standard JSON Response with Rate Limiting & Input Validation)
router.post('/message', chatRateLimiter, validateChatInput, async (req, res, next) => {
  try {
    const { message, history, attachments, model, reasoningTier, customProvider, orionApiKey } = req.body;

    const result = await getChatCompletion({
      message,
      history: history || [],
      attachments: attachments || [],
      model: model || 'orion::orion',
      reasoningTier: reasoningTier || 'medium',
      customProvider: customProvider || null,
      orionApiKey: orionApiKey || null,
    });

    res.json({
      success: true,
      data: {
        role: 'assistant',
        content: result.reply,
        model: result.model,
        source: customProvider ? 'custom-provider' : 'orion-engine',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const isApiKeyError = /api\s*key|kredensial|unauthorized/i.test(error.message);
    res.status(isApiKeyError ? 401 : 502).json({
      success: false,
      message: error.message || 'Layanan AI sementara tidak dapat dihubungi. Silakan coba lagi beberapa saat lagi.',
    });
  }
});

// POST /api/chat/stream (Real-time SSE Streaming with Rate Limiting & Input Validation)
router.post('/stream', chatRateLimiter, validateChatInput, (req, res) => {
  const { message, history, attachments, model, reasoningTier, customProvider, orionApiKey } = req.body;
  const abortController = new AbortController();

  req.on('close', () => {
    abortController.abort();
  });

  // Set Security & SSE Headers with anti-buffering for immediate streaming
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'X-Content-Type-Options': 'nosniff',
  });

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  try {
    streamChatCompletion({
      message,
      history: history || [],
      attachments: attachments || [],
      model: model || 'orion::orion',
      reasoningTier: reasoningTier || 'medium',
      customProvider: customProvider || null,
      orionApiKey: orionApiKey || null,
      signal: abortController.signal,
      onChunk: (chunk) => {
        if (res.writableEnded) return;
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        if (typeof res.flush === 'function') {
          res.flush();
        }
      },
      onDone: () => {
        if (res.writableEnded) return;
        res.write('data: [DONE]\n\n');
        res.end();
      },
      onError: (err) => {
        if (res.writableEnded) return;
        logger.warn(`SSE Stream Error: ${err.message}`, { error: err.message }, 'AGENT', 'errors');
        res.write(`data: ${JSON.stringify({ error: err.message || 'Koneksi ke AI server terputus.' })}\n\n`);
        res.end();
      },
    }).catch((err) => {
      if (res.writableEnded) return;
      logger.error(`SSE Async Rejection: ${err.message}`, { error: err.message }, 'AGENT', 'errors');
      res.write(`data: ${JSON.stringify({ error: err.message || 'Koneksi ke AI server terputus.' })}\n\n`);
      res.end();
    });
  } catch (err) {
    if (res.writableEnded) return;
    logger.error(`SSE Synchronous Exception: ${err.message}`, { error: err.message }, 'AGENT', 'errors');
    res.write(`data: ${JSON.stringify({ error: err.message || 'Koneksi ke AI server terputus.' })}\n\n`);
    res.end();
  }
});

// POST /api/chat/test-provider (Dynamic connection ping using /models without hardcoded model)
router.post('/test-provider', chatRateLimiter, async (req, res) => {
  try {
    const { baseUrl, apiKey } = req.body;
    const result = await testCustomProviderConnection({ baseUrl, apiKey });
    res.json(result);
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || 'Gagal terhubung ke custom provider.',
    });
  }
});

// POST /api/chat/fetch-models (Fetch available models from /models or /api/tags)
router.post('/fetch-models', chatRateLimiter, async (req, res) => {
  try {
    const { baseUrl, apiKey } = req.body;
    const result = await fetchProviderModels({ baseUrl, apiKey });
    res.json(result);
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || 'Gagal mengambil daftar model dari endpoint /models.',
    });
  }
});

// POST /api/chat/test-model (Verify specific model completion before allowing checklist)
router.post('/test-model', chatRateLimiter, async (req, res) => {
  try {
    const { baseUrl, apiKey, modelId } = req.body;
    const result = await testSpecificModel({ baseUrl, apiKey, modelId });
    res.json(result);
  } catch (err) {
    const isApiKeyError = /api\s*key|kredensial|unauthorized/i.test(err.message);
    res.status(isApiKeyError ? 401 : 400).json({
      success: false,
      message: err.message || `Gagal memverifikasi model "${req.body.modelId}".`,
    });
  }
});

// GET /api/chat/models (Dynamic enabled models from active provider configuration)
router.get('/models', (req, res) => {
  try {
    ensureConfigDir();
    let providers = [];
    if (fs.existsSync(providersConfigFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(providersConfigFile, 'utf8'));
        providers = data.providers || [];
      } catch {}
    }
    const enabledModels = [];
    providers.forEach((prov) => {
      (prov.models || []).forEach((m) => {
        if (m && m.enabled) {
          enabledModels.push({
            id: `${prov.id}::${m.id}`,
            name: m.name || m.id,
            displayName: m.name || m.id,
            providerName: prov.name,
            supportsReasoning: Boolean(m.supportsReasoning),
            status: 'active',
          });
        }
      });
    });

    // Append Combo Router models
    try {
      const combos = getCombos();
      combos.forEach((c) => {
        enabledModels.push({
          id: `combo::${c.id}`,
          name: c.name,
          displayName: `${c.name} [${c.strategy.toUpperCase()}]`,
          providerName: `Combo Router (${c.strategy})`,
          supportsReasoning: false,
          isCombo: true,
          comboDetails: c,
          status: 'active',
        });
      });
    } catch (err) {
      logger.warn(`Failed to append combos to /models: ${err.message}`, {}, 'COMBO');
    }

    res.json({
      success: true,
      models: enabledModels,
      reasoningTiers: REASONING_TIERS,
      status: 'online',
    });
  } catch (err) {
    res.json({ success: true, models: [], reasoningTiers: REASONING_TIERS, status: 'online' });
  }
});

// GET /api/chat/providers-config (Sync providers from ~/.orion/providers.json)
router.get('/providers-config', (req, res) => {
  try {
    ensureConfigDir();
    let savedApiKey = process.env.AI_API_KEY || '';
    if (fs.existsSync(credentialsFile)) {
      try {
        const creds = JSON.parse(fs.readFileSync(credentialsFile, 'utf8'));
        if (creds.apiKey) savedApiKey = creds.apiKey;
      } catch {}
    }

    if (fs.existsSync(providersConfigFile)) {
      const raw = fs.readFileSync(providersConfigFile, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.providers) && data.providers.length > 0) {
        let activeKeyFound = savedApiKey;
        const syncedProviders = data.providers.map((p) => {
          if (p.id === 'orion' || p.templateId === 'orion') {
            const hasActiveKey = p.apiKeys?.find((k) => k.active && k.key?.trim())?.key || p.apiKey?.trim();
            if (hasActiveKey) {
              activeKeyFound = hasActiveKey;
            } else if (savedApiKey) {
              const keys = Array.isArray(p.apiKeys) && p.apiKeys.length > 0
                ? p.apiKeys.map((k, idx) => (idx === 0 ? { ...k, key: savedApiKey, active: true } : k))
                : [{ id: 'key-default', name: 'Primary Key', key: savedApiKey, active: true }];
              return { ...p, apiKey: savedApiKey, apiKeys: keys };
            }
          }
          return p;
        });

        return res.json({
          success: true,
          providers: syncedProviders,
          selectedModel: data.selectedModel || null,
          reasoningTier: data.reasoningTier || null,
          apiKey: activeKeyFound,
        });
      }
    }

    // Default fallback provider configuration (polosan awal tanpa model sebelum di-scan / diimpor)
    const defaultProviders = [
      {
        id: 'orion',
        name: 'Orion AI (Official)',
        category: 'Rekomendasi',
        baseUrl: process.env.AI_BASE_URL || 'https://pi.leopard-gila.ts.net/v1',
        apiKey: savedApiKey,
        requiresApiKey: true,
        hideBaseUrl: true,
        models: [],
      },
    ];

    // Persist default providers to disk so ~/.orion/providers.json is never an empty array
    try {
      fs.writeFileSync(
        providersConfigFile,
        JSON.stringify(
          {
            providers: defaultProviders,
            selectedModel: 'orion::orion',
            reasoningTier: 'medium',
            updatedAt: Date.now(),
          },
          null,
          2
        ),
        'utf8'
      );
    } catch {}

    return res.json({
      success: true,
      providers: defaultProviders,
      selectedModel: 'orion::orion',
      reasoningTier: 'medium',
    });
  } catch (err) {
    console.error('Error reading providers-config:', err.message);
    res.json({
      success: true,
      providers: [],
      selectedModel: null,
      reasoningTier: null,
    });
  }
});

// POST /api/chat/providers-config (Save & sync providers to ~/.orion/providers.json)
router.post('/providers-config', (req, res) => {
  try {
    ensureConfigDir();
    const { providers = [], selectedModel = null, reasoningTier = null } = req.body;
    const configData = {
      providers,
      selectedModel,
      reasoningTier,
      updatedAt: Date.now(),
    };
    fs.writeFileSync(providersConfigFile, JSON.stringify(configData, null, 2), 'utf8');

    // Extract any active API key from providers and sync to credentials.json & process.env
    for (const p of providers) {
      const activeKey = p.apiKeys?.find((k) => k.active)?.key || p.apiKey;
      if (activeKey && activeKey.trim()) {
        fs.writeFileSync(
          credentialsFile,
          JSON.stringify({ apiKey: activeKey.trim(), updatedAt: Date.now() }, null, 2),
          'utf8'
        );
        process.env.AI_API_KEY = activeKey.trim();
        break;
      }
    }

    res.json({ success: true, message: 'Provider config tersinkronisasi ke sistem.' });
  } catch (err) {
    console.error('Error saving providers-config:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Gagal menyimpan konfigurasi provider.' });
  }
});

// GET /api/chat/suggestions
router.get('/suggestions', (req, res) => {
  res.json({
    success: true,
    data: SUGGESTIONS,
  });
});

// ==========================================
// SESSION MANAGEMENT & SYNCHRONIZATION ROUTES
// ==========================================

// GET /api/chat/sessions (Retrieve all sessions & active session ID)
router.get('/sessions', (req, res) => {
  try {
    const data = getAllSessions();
    res.json({
      success: true,
      sessions: data.sessions || [],
      activeSessionId: data.activeSessionId || null,
      updatedAt: data.updatedAt || Date.now(),
    });
  } catch (err) {
    logger.error(`Error getting sessions: ${err.message}`, { error: err.message }, 'API', 'errors');
    res.status(500).json({ success: false, message: 'Gagal memuat sesi obrolan.' });
  }
});

// POST /api/chat/sessions (Sync all sessions from View)
router.post('/sessions', (req, res) => {
  try {
    const { sessions = [], activeSessionId = null } = req.body;
    const synced = syncAllSessions({ sessions, activeSessionId });
    res.json({
      success: true,
      sessions: synced.sessions,
      activeSessionId: synced.activeSessionId,
      updatedAt: synced.updatedAt,
      message: 'Sesi berhasil disinkronkan.',
    });
  } catch (err) {
    logger.error(`Error syncing sessions: ${err.message}`, { error: err.message }, 'API', 'errors');
    res.status(500).json({ success: false, message: 'Gagal menyinkronkan sesi.' });
  }
});

// POST /api/chat/sessions/new (Create a new session)
router.post('/sessions/new', (req, res) => {
  try {
    const { title, projectPath, projectName } = req.body;
    const session = createSession({ title, projectPath, projectName });
    res.json({
      success: true,
      session,
      activeSessionId: session.id,
      message: 'Sesi baru berhasil dibuat.',
    });
  } catch (err) {
    logger.error(`Error creating session: ${err.message}`, { error: err.message }, 'API', 'errors');
    res.status(500).json({ success: false, message: 'Gagal membuat sesi baru.' });
  }
});

// PUT /api/chat/sessions/active (Set active session)
router.put('/sessions/active', (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'sessionId wajib diisi.' });
    }
    const ok = setActiveSessionId(sessionId);
    if (!ok) {
      return res.status(404).json({ success: false, message: 'Sesi tidak ditemukan.' });
    }
    res.json({ success: true, activeSessionId: sessionId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/chat/sessions/:id (Get single session by ID)
router.get('/sessions/:id', (req, res) => {
  try {
    const session = getSessionById(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Sesi tidak ditemukan.' });
    }
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/chat/sessions/:id (Rename session)
router.put('/sessions/:id', (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Judul tidak boleh kosong.' });
    }
    const ok = renameSession(req.params.id, title);
    if (!ok) {
      return res.status(404).json({ success: false, message: 'Sesi tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Judul sesi berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/chat/sessions/:id (Delete session)
router.delete('/sessions/:id', (req, res) => {
  try {
    const result = deleteSession(req.params.id);
    res.json({
      success: true,
      activeSessionId: result.activeSessionId,
      message: 'Sesi berhasil dihapus.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/chat/sessions/:id/messages (Append message to session)
router.post('/sessions/:id/messages', (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.content) {
      return res.status(400).json({ success: false, message: 'Pesan tidak valid.' });
    }
    const result = appendMessageToSession(req.params.id, message);
    res.json({
      success: true,
      session: result.session,
      message: result.message,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/chat/sessions/:id/messages (Clear messages in session)
router.delete('/sessions/:id/messages', (req, res) => {
  try {
    const ok = clearSessionMessages(req.params.id);
    if (!ok) {
      return res.status(404).json({ success: false, message: 'Sesi tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Pesan dalam sesi berhasil dibersihkan.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
