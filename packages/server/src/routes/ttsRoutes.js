import express from 'express';
import https from 'https';
import { spawn } from 'child_process';

const router = express.Router();
const KOKORO_TTS_BASE_URL = process.env.KOKORO_TTS_API_URL || 'https://arjnln-kokoro-tts-api.hf.space';

// Supported voices cloned from SkillSphare with multi-female as primary
export const SUPPORTED_VOICES = [
  {
    id: 'multi-female',
    name: 'multi-female',
    label: 'Multilingual - Female (Alami & Adaptif)',
    language: 'multilingual',
    gender: 'female',
    description: 'Suara wanita multibahasa dengan intonasi adaptif dan artikulasi natural untuk percakapan.',
  },
  {
    id: 'id-female',
    name: 'id-female',
    label: 'Bahasa Indonesia - Wanita (Gadis)',
    language: 'id-ID',
    gender: 'female',
    description: 'Suara alami wanita Indonesia yang ramah dan jernih.',
  },
  {
    id: 'id-male',
    name: 'id-male',
    label: 'Bahasa Indonesia - Pria (Ardi)',
    language: 'id-ID',
    gender: 'male',
    description: 'Suara pria Indonesia yang tenang dan berwibawa.',
  },
  {
    id: 'en-female',
    name: 'en-female',
    label: 'English - Female (Ava)',
    language: 'en-US',
    gender: 'female',
    description: 'Articulate female voice for English conversation.',
  },
  {
    id: 'en-male',
    name: 'en-male',
    label: 'English - Male (Brian)',
    language: 'en-US',
    gender: 'male',
    description: 'Deep, engaging male voice for technical explanation.',
  },
  {
    id: 'multi-male',
    name: 'multi-male',
    label: 'Multilingual - Male (Andrew)',
    language: 'multilingual',
    gender: 'male',
    description: 'Suara pria multibahasa ekspresif.',
  },
];

/**
 * Clean text for natural speech synthesis (strip markdown, HTML, code tags)
 */
export function cleanTextForSpeech(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  return rawText
    .replace(/<[^>]*>/g, ' ') // Strip HTML tags
    .replace(/```[\s\S]*?```/g, ' [Blok Kode] ') // Strip multi-line code blocks
    .replace(/`([^`]+)`/g, '$1') // Inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Markdown links
    .replace(/[#*_~>]/g, '') // Markdown formatting symbols
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

/**
 * Fallback to local python edge-tts if remote Hugging Face API is unreachable or returns 403
 */
function generateLocalEdgeTts(text, voice = 'multi-female', rate = 0, pitch = 0) {
  return new Promise((resolve, reject) => {
    const pythonCode = `
import asyncio, sys, edge_tts

VOICE_MAP = {
    'multi-female': 'en-US-AvaMultilingualNeural',
    'multi-male': 'en-US-AndrewMultilingualNeural',
    'id-female': 'id-ID-GadisNeural',
    'id-male': 'id-ID-ArdiNeural',
    'en-female': 'en-US-AvaNeural',
    'en-male': 'en-US-BrianNeural',
}

voice = VOICE_MAP.get(sys.argv[1], 'en-US-AvaMultilingualNeural')
text = sys.argv[2]
rate_val = sys.argv[3]
pitch_val = sys.argv[4]

rate_str = f"{rate_val}%" if not rate_val.startswith(('+', '-')) and rate_val != '0' else (f"{rate_val}%" if rate_val != '0' else '+0%')
pitch_str = f"{pitch_val}Hz" if not pitch_val.startswith(('+', '-')) and pitch_val != '0' else (f"{pitch_val}Hz" if pitch_val != '0' else '+0Hz')

async def run():
    communicate = edge_tts.Communicate(text, voice, rate=rate_str, pitch=pitch_str)
    audio = b''
    async for chunk in communicate.stream():
        if chunk['type'] == 'audio':
            audio += chunk['data']
    sys.stdout.buffer.write(audio)

asyncio.run(run())
`;
    const rateArg = Number(rate) > 0 ? `+${rate}` : `${rate}`;
    const pitchArg = Number(pitch) > 0 ? `+${pitch}` : `${pitch}`;

    const proc = spawn('python3', ['-c', pythonCode, voice, text, rateArg, pitchArg]);
    const chunks = [];
    const errChunks = [];

    proc.stdout.on('data', (d) => chunks.push(d));
    proc.stderr.on('data', (d) => errChunks.push(d));

    proc.on('close', (code) => {
      if (code === 0 && chunks.length > 0) {
        resolve({
          statusCode: 200,
          contentType: 'audio/mpeg',
          buffer: Buffer.concat(chunks),
        });
      } else {
        const errMsg = Buffer.concat(errChunks).toString('utf8').trim() || `Local Edge-TTS process exited with code ${code}`;
        reject(new Error(errMsg));
      }
    });

    proc.on('error', (err) => reject(err));
  });
}

/**
 * Call Kokoro / Bilingual Edge-TTS API on Hugging Face with resilient local fallback
 */
function fetchEdgeTtsAudio(payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const targetUrl = new URL(`${KOKORO_TTS_BASE_URL}/v1/audio/speech`);

    const options = {
      method: 'POST',
      hostname: targetUrl.hostname,
      port: 443,
      path: targetUrl.pathname + targetUrl.search,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({
            statusCode: res.statusCode,
            contentType: res.headers['content-type'] || 'audio/mpeg',
            buffer,
          });
        } else {
          let errorText = buffer.toString('utf8');
          try {
            const parsed = JSON.parse(errorText);
            errorText = parsed.detail || parsed.message || errorText;
          } catch (e) {}
          reject(new Error(`Edge-TTS API Error (${res.statusCode}): ${errorText}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('Koneksi ke server Edge-TTS melebihi batas waktu (timeout).'));
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

/**
 * Synthesize speech: Try remote HF endpoint, then fallback seamlessly to local edge-tts
 */
async function synthesizeSpeech(payload) {
  try {
    return await fetchEdgeTtsAudio(payload);
  } catch (remoteError) {
    try {
      return await generateLocalEdgeTts(payload.input, payload.voice, payload.rate, payload.pitch);
    } catch (localError) {
      console.error('❌ [TTS Synthesis Error]:', localError.message);
      throw remoteError;
    }
  }
}

/**
 * GET /api/tts/voices
 * Lists all available voices with multi-female as primary
 */
router.get('/voices', (req, res) => {
  return res.json({
    success: true,
    message: 'Daftar suara TTS berhasil dimuat.',
    data: {
      provider: 'Bilingual Edge-TTS (Hugging Face / Neural)',
      defaultVoice: 'multi-female',
      voices: SUPPORTED_VOICES,
    },
  });
});

/**
 * POST /api/tts/speak
 * Generates and streams MP3 audio buffer
 */
router.post('/speak', async (req, res) => {
  try {
    const { text, input, voice = 'multi-female', speed = 0, pitch = 0 } = req.body;
    const rawContent = input || text;

    if (!rawContent || typeof rawContent !== 'string' || rawContent.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Teks untuk disuarakan tidak boleh kosong.',
      });
    }

    if (rawContent.length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'Panjang teks melebihi batas maksimal 5000 karakter.',
      });
    }

    const cleanedText = cleanTextForSpeech(rawContent);
    const matchedVoice = SUPPORTED_VOICES.find((v) => v.id === voice) || SUPPORTED_VOICES[0];

    const ttsPayload = {
      input: cleanedText,
      voice: matchedVoice.id,
      rate: Number(req.body.rate !== undefined ? req.body.rate : speed) || 0,
      pitch: Number(pitch) || 0,
    };

    const audioResult = await synthesizeSpeech(ttsPayload);

    res.setHeader('Content-Type', audioResult.contentType || 'audio/mpeg');
    res.setHeader('Content-Length', audioResult.buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(audioResult.buffer);
  } catch (error) {
    console.error('❌ [TTS API Error]:', error.message);
    return res.status(502).json({
      success: false,
      message: 'Gagal membuat audio TTS.',
      error: error.message,
    });
  }
});

export default router;
