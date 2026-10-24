import { Router } from 'express';
import {
  getChatCompletion,
  streamChatCompletion,
  testCustomProviderConnection,
  fetchProviderModels,
  testSpecificModel,
} from '../services/aiService.js';
import { chatRateLimiter, validateChatInput } from '../middleware/security.js';

const router = Router();

// Available Models List matching Gemini-style Model Selector
const AVAILABLE_MODELS = [
  {
    id: 'orion',
    name: 'Orion Agent',
    displayName: 'Orion Agent',
    subtitle: 'Tugas kompleks & penalaran',
    supportsReasoning: true,
    status: 'active',
  },
  {
    id: 'agnes',
    name: 'Agnes 2.5 Flash',
    displayName: 'Agnes 2.5 Flash',
    subtitle: 'Bantuan serbaguna & kreatif',
    supportsReasoning: false,
    status: 'active',
  },
  {
    id: 'nemotron-3',
    name: 'Nemotron 3',
    displayName: 'Nemotron 3',
    subtitle: 'Jawaban tercepat bebas biaya',
    supportsReasoning: false,
    status: 'active',
  },
];

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
    const { message, history, attachments, model, reasoningTier, customProvider } = req.body;

    const result = await getChatCompletion({
      message,
      history: history || [],
      attachments: attachments || [],
      model: model || 'orion',
      reasoningTier: reasoningTier || 'medium',
      customProvider: customProvider || null,
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
    console.error('Error in /api/chat/message:', error.message);
    res.status(502).json({
      success: false,
      message: error.message || 'Layanan AI sementara tidak dapat dihubungi. Silakan coba lagi beberapa saat lagi.',
    });
  }
});

// POST /api/chat/stream (Real-time SSE Streaming with Rate Limiting & Input Validation)
router.post('/stream', chatRateLimiter, validateChatInput, (req, res) => {
  const { message, history, attachments, model, reasoningTier, customProvider } = req.body;
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

  streamChatCompletion({
    message,
    history: history || [],
    attachments: attachments || [],
    model: model || 'orion',
    reasoningTier: reasoningTier || 'medium',
    customProvider: customProvider || null,
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
      console.error('SSE Stream Error:', err.message);
      res.write(`data: ${JSON.stringify({ error: err.message || 'Koneksi ke AI server terputus.' })}\n\n`);
      res.end();
    },
  });
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
    res.status(400).json({
      success: false,
      message: err.message || `Gagal memverifikasi model "${req.body.modelId}".`,
    });
  }
});

// GET /api/chat/models (Sanitized public model info)
router.get('/models', (req, res) => {
  res.json({
    success: true,
    models: AVAILABLE_MODELS,
    reasoningTiers: REASONING_TIERS,
    status: 'online',
  });
});

// GET /api/chat/suggestions
router.get('/suggestions', (req, res) => {
  res.json({
    success: true,
    data: SUGGESTIONS,
  });
});

export default router;
