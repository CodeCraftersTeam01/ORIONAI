import { Router } from 'express';
import { getChatCompletion, streamChatCompletion } from '../services/aiService.js';
import { chatRateLimiter, validateChatInput } from '../middleware/security.js';

const router = Router();

// Single Model: Orion (OpenAI compatible)
const SINGLE_MODEL = {
  id: 'orion',
  name: 'Orion (OpenAI Compatible)',
  description: 'Model utama berarsitektur konstelasi kosmik.',
  status: 'active',
};

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
    const { message, history, attachments } = req.body;

    const result = await getChatCompletion({
      message,
      history: history || [],
      attachments: attachments || [],
    });

    res.json({
      success: true,
      data: {
        role: 'assistant',
        content: result.reply,
        model: result.model,
        source: 'orion-engine',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in /api/chat/message:', error.message);
    res.status(502).json({
      success: false,
      message: 'Layanan AI sementara tidak dapat dihubungi. Silakan coba lagi beberapa saat lagi.',
    });
  }
});

// POST /api/chat/stream (Real-time SSE Streaming with Rate Limiting & Input Validation)
router.post('/stream', chatRateLimiter, validateChatInput, (req, res) => {
  const { message, history, attachments } = req.body;
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
      res.write(`data: ${JSON.stringify({ error: 'Koneksi ke AI server terputus.' })}\n\n`);
      res.end();
    },
  });
});

// GET /api/chat/models (Sanitized public model info)
router.get('/models', (req, res) => {
  res.json({
    success: true,
    model: SINGLE_MODEL,
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
