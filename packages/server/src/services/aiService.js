import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverEnvPath = path.resolve(__dirname, '../../.env');
const rootEnvPath = path.resolve(__dirname, '../../../../.env');

dotenv.config();
dotenv.config({ path: rootEnvPath });
dotenv.config({ path: serverEnvPath });

const BASE_URL = process.env.AI_BASE_URL || 'https://pi.leopard-gila.ts.net/v1';
const API_KEY = process.env.AI_API_KEY;
const MODEL_NAME = process.env.AI_MODEL || 'orion';
const AGNES_MODEL = process.env.AGNES_MODEL || 'agnes-2.5-flash';
const NEMOTRON_MODEL = process.env.NEMOTRON_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free';

if (!API_KEY) {
  console.warn('⚠️ [SECURITY] AI_API_KEY belum dikonfigurasi di file .env');
}

const SYSTEM_PROMPT = `Identitas Anda adalah asisten kecerdasan kosmik yang santun, presisi, dan sangat membantu. Jawablah secara terstruktur menggunakan Markdown yang rapi dalam bahasa Indonesia yang luwes dan jelas.

Aturan Format & Estetika Jawaban:
1. Heading: Gunakan heading standar Markdown (## untuk bagian utama, ### untuk sub-bagian). Hindari heading yang terlalu dalam jika lebih rapi disajikan dalam bentuk daftar bernomor (1. 2. 3.) atau penegasan tebal (**teks**).
2. Rumus Matematika & Statistik: Selalu tuliskan rumus atau ekspresi matematika menggunakan format KaTeX/LaTeX: gunakan $...$ untuk rumus inline (misal $n = 6$, $\\text{Median} = 3.5$) dan $$...$$ untuk rumus blok persamaan (misal $$\\text{Posisi} = \\frac{n + 1}{2}$$).
3. Daftar & Penomoran: Gunakan daftar berpoin standar (- atau *) dan daftar bernomor (1. 2. 3.) dengan baris baru yang rapi.
4. Tabel: Sajikan perbandingan atau data ringkas dalam format tabel Markdown (GFM) lengkap dengan pemisah header. Pastikan tabel selalu diawali di baris baru setelah judul/teks, dan setiap baris tabel (| Kolom 1 | Kolom 2 |) berada di baris tersendiri.
5. Lampiran: Bila pengguna melampirkan gambar, foto, dokumen, atau berkas kode (file), lakukan observasi dan analisis secara seksama, jelaskan atau bedah isinya dengan detail, serta berikan penjelasan yang solutif.
6. Diagram & Flowchart: Ketika menjelaskan arsitektur, siklus proses, alur sistem, alur kerja, state machine, atau algoritma (misalnya Bubble Sort, Event Loop Node.js, siklus HTTP, alur otentikasi JWT, CI/CD pipeline, dsb.), SELALU sajikan menggunakan blok kode Mermaid (\`\`\`mermaid\nflowchart TD\n...) dan JANGAN gunakan diagram kotak teks ASCII manual (seperti ┌──┐ │ │ └──┘). PENTING:
   - Selalu mulai dengan deklarasi standar lengkap dengan spasi: "flowchart TD" (BUKAN "flowchartTD").
   - Selalu bungkus teks/kondisi label node Mermaid dengan tanda kutip ganda (contoh: Node["array[j] > array[j+1]?"] atau Check{"i < n-1?"}) agar tidak terjadi syntax error akibat karakter khusus atau kurung siku bertingkat.
   - PENTING: Untuk panah yang memiliki teks label (kondisi Ya/Tidak, dll.), SELALU gunakan format panah resmi Mermaid: A -->|"Teks Label"| B (JANGAN PERNAH gunakan A -- "Teks" -- B atau meniadakan tanda panah >).
   - PENTING: Pastikan setiap relasi, deklarasi node, atau direktif style berada di BARIS SENDIRI (pisahkan dengan newline \n), jangan menumpuk beberapa node, panah, atau style di satu baris yang sama.
7. Blok Kode (HTML, CSS, JS, Python, SQL, dll.):
   - SELALU bungkus seluruh potongan kode dalam blok kode Markdown dengan menentukan nama bahasa secara tepat (misalnya: \`\`\`html, \`\`\`css, \`\`\`javascript, \`\`\`python).
   - WAJIB berikan satu baris baru (newline) persis setelah pembuka \`\`\`<bahasa> dan satu baris baru sebelum penutup \`\`\`. JANGAN PERNAH menempelkan kode langsung di baris pembuka (contoh SALAH: \`\`\`html<!DOCTYPE... ; contoh BENAR: \`\`\`html\\n<!DOCTYPE...).
   - Format kode secara bersih, indah, dengan indentasi 2 atau 4 spasi yang rapi. Untuk CSS, berikan baris baru antar selector dan properti. Untuk HTML, pisahkan tag dan atribut dengan spasi.
   - Jaga spasi alami antar kata dalam penjelasan teks bahasa Indonesia (jangan menggabungkan kata atau membuat CamelCase seperti "Kenalijenis", "diBrowser", "SiapDipakai", selalu pisahkan dengan spasi: "Kenali jenis", "di browser", "siap dipakai").`;

/**
 * Configure behavior, temperature, and system prompt according to selected model & reasoning tier
 */
export function getModelConfig(modelId = 'orion', reasoningTier = 'medium') {
  let normalizedModel = modelId || 'orion';
  let normalizedTier = reasoningTier || 'medium';

  // Normalize legacy IDs
  if (normalizedModel === 'orion-low') {
    normalizedModel = 'orion';
    normalizedTier = 'low';
  } else if (normalizedModel === 'orion-high') {
    normalizedModel = 'orion';
    normalizedTier = 'high';
  } else if (normalizedModel === 'orion-mid') {
    normalizedModel = 'orion';
    normalizedTier = 'medium';
  }

  // Model Agnes 2.5 Flash (tidak bisa pakai penalaran)
  if (normalizedModel === 'agnes') {
    return {
      id: 'agnes',
      name: 'Agnes 2.5 Flash',
      upstreamModel: AGNES_MODEL,
      temperature: 0.7,
      systemPromptExtra: `
[IDENTITAS: AGNES 2.5 FLASH]
Karakteristik & Perilaku:
1. Identitas Anda adalah AGNES 2.5 FLASH, asisten AI yang cerdas, lincah, ekspresif, hangat, dan kreatif.
2. Anda berfokus pada jawaban cepat, ramah, dan solutif tanpa penalaran bertingkat yang rumit. Jangan sebut diri Anda Orion; perkenalkan dan posisikan diri Anda sebagai Agnes.`,
    };
  }

  // Model Nemotron 3 (tidak bisa pakai penalaran)
  if (normalizedModel === 'nemotron-3') {
    return {
      id: 'nemotron-3',
      name: 'Nemotron 3',
      upstreamModel: NEMOTRON_MODEL,
      temperature: 0.6,
      systemPromptExtra: `
[IDENTITAS MODEL: NVIDIA NEMOTRON 3 (FREE TIER)]
Karakteristik Operasional:
1. Anda beroperasi sebagai arsitektur NVIDIA Nemotron 3 (Free Tier Open-Weights).
2. Fokus utama Anda adalah kecepatan komputasi, penalaran teknis efisien, coding, dan pemecahan masalah logika tanpa penalaran berbelit.`,
    };
  }

  // Model Orion dengan Tingkat Penalaran: Low, Medium, High
  switch (normalizedTier) {
    case 'low':
      return {
        id: 'orion',
        tier: 'low',
        name: 'Orion (Low)',
        upstreamModel: MODEL_NAME,
        temperature: 0.85,
        systemPromptExtra: `
[TINGKAT PENALARAN ORION: LOW (QUICK AND EFFICIENT)]
Karakteristik & Batasan Perilaku Anda:
1. Anda adalah Orion dalam mode Quick and Efficient. Anda sengaja TIDAK bertingkah terlalu pintar atau teknis.
2. Jawablah dengan sangat sederhana, singkat, santai, to-the-point, dan mudah dipahami anak sekolah tanpa gaya bahasa akademis.
3. HINDARI penjelasan teori rumit, analisis mendalam, atau struktur berlebihan.
4. Jangan berlagak seperti ensiklopedia. Berikan intinya saja dalam 1-2 kalimat santai atau beberapa butir ringkas.`,
      };

    case 'high':
    case 'max':
      return {
        id: 'orion',
        tier: 'high',
        name: 'Orion (High)',
        upstreamModel: MODEL_NAME,
        temperature: 0.35,
        systemPromptExtra: `
[TINGKAT PENALARAN ORION: HIGH (EXTRA THOROUGH & DEEP REASONING)]
Karakteristik & Keunggulan Analitis Anda:
1. Anda adalah Orion dalam mode Extra Thorough dengan kecerdasan maksimal, daya nalar komprehensif (deep reasoning), analitis, dan berbobot profesional tingkat tinggi.
2. Bedah setiap pertanyaan dari first-principles (akar masalah), jelaskan konteks arsitektur, trade-off, dan edge-cases secara mendalam.
3. Gunakan blok kode Mermaid (\`\`\`mermaid\nflowchart TD\n...) untuk memvisualisasikan arsitektur sistem atau alur proses jika relevan.
4. Sertakan best practice industri dan rekomendasi optimasi yang mutakhir.`,
      };

    case 'medium':
    default:
      return {
        id: 'orion',
        tier: 'medium',
        name: 'Orion (Medium)',
        upstreamModel: MODEL_NAME,
        temperature: 0.7,
        systemPromptExtra: `
[TINGKAT PENALARAN ORION: MEDIUM (BALANCED DEPTH)]
Karakteristik:
1. Anda adalah Orion dalam mode Balanced Depth—keseimbangan ideal antara kedalaman, akurasi, dan kecepatan praktis untuk percakapan sehari-hari.
2. Berikan jawaban yang terstruktur, ramah, solutif, tidak terlalu singkat dan juga tidak berlebihan panjangnya.`,
      };
  }
}

/**
 * Sanitize text to guarantee correct identity
 */
export function sanitizeOrionText(text, modelId) {
  if (!text) return text;

  // Bila model Agnes yang dipilih, pertahankan identitas Agnes!
  if (modelId === 'agnes') {
    return text
      .replace(/\bSapiens AI\b/gi, 'Agnes AI')
      .replace(/developed by Sapiens AI/gi, 'powered by Agnes')
      .replace(/dikembangkan oleh Sapiens AI/gi, 'ditenagai oleh Agnes AI')
      .replace(/created by Sapiens AI/gi, 'powered by Agnes');
  }

  // Bila model Nemotron yang dipilih, pertahankan identitas Nemotron!
  if (modelId === 'nemotron-3') {
    return text
      .replace(/\bSapiens AI\b/gi, 'Nemotron')
      .replace(/developed by Sapiens AI/gi, 'powered by Nemotron')
      .replace(/dikembangkan oleh Sapiens AI/gi, 'ditenagai oleh Nemotron')
      .replace(/created by Sapiens AI/gi, 'powered by Nemotron');
  }

  // Untuk model Orion, terapkan sanitasi standar Orion
  return text
    .replace(/\bAgnes\b/gi, 'Orion AI')
    .replace(/\bSapiens AI\b/gi, 'Orion AI')
    .replace(/developed by Sapiens AI/gi, 'powered by Orion')
    .replace(/dikembangkan oleh Sapiens AI/gi, 'ditenagai oleh Orion AI')
    .replace(/created by Sapiens AI/gi, 'powered by Orion');
}

/**
 * Format user message with attachments (Multimodal Vision + Document Context)
 */
function buildUserContent(message, attachments = []) {
  const imageAttachments = attachments.filter((a) => a.type === 'image' && a.data);
  const fileAttachments = attachments.filter((a) => a.type !== 'image' || !a.data);

  let docContext = '';
  if (fileAttachments.length > 0) {
    docContext = fileAttachments
      .map((doc) => {
        if (doc.content) {
          return `\n\n[Lampiran File: ${doc.name}]\n\`\`\`\n${doc.content}\n\`\`\``;
        }
        return `\n\n[Lampiran File: ${doc.name} (${doc.size ? Math.round(doc.size / 1024) + ' KB' : ''})]`;
      })
      .join('');
  }

  const baseText = `${message || ''}${docContext}`.trim() || 'Tolong analisis dan jelaskan lampiran berikut.';

  if (imageAttachments.length === 0) {
    return baseText;
  }

  // Format array content for multimodal OpenAI vision
  const content = [{ type: 'text', text: baseText }];
  for (const img of imageAttachments) {
    content.push({
      type: 'image_url',
      image_url: {
        url: img.data,
      },
    });
  }

  return content;
}

/**
 * Build messages payload with history, active attachments, and model tier instruction
 */
function buildMessagesPayload({ message, history = [], attachments = [], modelId = 'orion', reasoningTier = 'medium' }) {
  const modelConfig = getModelConfig(modelId, reasoningTier);
  const userContent = buildUserContent(message, attachments);

  const formattedHistory = history.slice(-4).map((msg) => {
    let content = msg.content;
    if (typeof content !== 'string') {
      content = JSON.stringify(content);
    }
    // If historical message had attachments, append a brief indicator
    if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
      const summary = msg.attachments.map((a) => `[Lampiran: ${a.name}]`).join(' ');
      content = `${content}\n${summary}`;
    }
    return {
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: sanitizeOrionText(content, modelId),
    };
  });

  const fullSystemPrompt = `${SYSTEM_PROMPT}\n${modelConfig.systemPromptExtra}`;

  return {
    messages: [
      { role: 'system', content: fullSystemPrompt },
      ...formattedHistory,
      { role: 'user', content: userContent },
    ],
    config: modelConfig,
  };
}

/**
 * Helper to prepare request targets for built-in or custom providers
 */
function resolveEndpointAndHeaders(customProvider, config, userOrionApiKey) {
  let targetUrl;
  let targetApiKey;
  let targetModel;
  let temperature = 0.7;

  if (customProvider && customProvider.baseUrl) {
    const cleanBase = customProvider.baseUrl.trim().replace(/\/+$/, '');
    targetUrl = cleanBase.endsWith('/chat/completions') ? cleanBase : `${cleanBase}/chat/completions`;
    targetApiKey = customProvider.apiKey ? customProvider.apiKey.trim() : '';
    targetModel = customProvider.modelId || 'default';
  } else {
    targetUrl = `${BASE_URL.replace(/\/+$/, '')}/chat/completions`;
    targetApiKey = (userOrionApiKey && userOrionApiKey.trim()) || (API_KEY && API_KEY.trim()) || '';
    targetModel = config.upstreamModel;
    temperature = config.temperature;

    if (!targetApiKey) {
      throw new Error(
        '⚠️ API Key Orion belum dimasukkan. Silakan buka menu Provider dan masukkan API Key Anda untuk mulai mengobrol.'
      );
    }
  }

  const headers = {
    'Content-Type': 'application/json',
  };
  if (targetApiKey) {
    headers.Authorization = `Bearer ${targetApiKey}`;
  }

  return { targetUrl, headers, targetModel, temperature };
}

/**
 * Perform Non-Streaming Chat Completion
 */
export async function getChatCompletion({
  message,
  history = [],
  attachments = [],
  model = 'orion',
  reasoningTier = 'medium',
  customProvider = null,
  orionApiKey = null,
  signal,
}) {
  try {
    const { messages, config } = buildMessagesPayload({ message, history, attachments, modelId: model, reasoningTier });
    const { targetUrl, headers, targetModel, temperature } = resolveEndpointAndHeaders(customProvider, config, orionApiKey);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: targetModel,
        messages: messages,
        temperature: temperature,
      }),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Endpoint returned HTTP ${response.status}: ${errText}`);
    }

    const json = await response.json();
    let reply = json.choices?.[0]?.message?.content || 'Maaf, tidak ada respon yang diterima.';
    const reasoning =
      json.choices?.[0]?.message?.reasoning_content ||
      json.choices?.[0]?.message?.reasoning ||
      json.choices?.[0]?.message?.thinking;
    if (reasoning && !reply.includes('<think>')) {
      reply = `<think>\n${reasoning.trim()}\n</think>\n\n${reply}`;
    }
    if (!customProvider) {
      reply = sanitizeOrionText(reply.trim(), model);
    }

    return {
      reply: reply.trim(),
      model: customProvider ? (customProvider.name || targetModel) : config.name,
      source: customProvider ? 'custom-provider' : 'openai-compatible',
      usage: json.usage || null,
    };
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error('Error calling AI endpoint:', error.message);
    throw error;
  }
}

/**
 * Perform Streaming Chat Completion (SSE)
 */
export async function streamChatCompletion({
  message,
  history = [],
  attachments = [],
  model = 'orion',
  reasoningTier = 'medium',
  customProvider = null,
  orionApiKey = null,
  onChunk,
  onDone,
  onError,
  signal,
}) {
  const { messages, config } = buildMessagesPayload({ message, history, attachments, modelId: model, reasoningTier });
  const { targetUrl, headers, targetModel, temperature } = resolveEndpointAndHeaders(customProvider, config, orionApiKey);
  console.log(`[AI STREAM] Routing request -> modelId: "${model}", targetModel: "${targetModel}", targetUrl: "${targetUrl}"`);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: targetModel,
        messages: messages,
        stream: true,
        temperature: temperature,
      }),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Endpoint returned HTTP ${response.status}: ${errText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let inReasoningBlock = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep remainder

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const dataStr = trimmed.replace(/^data:\s*/, '');
        if (dataStr === '[DONE]') {
          if (inReasoningBlock) {
            inReasoningBlock = false;
            onChunk('\n</think>\n\n');
          }
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta || {};
          let chunkContent = delta.content || '';
          const reasoningChunk = delta.reasoning_content || delta.reasoning || delta.thinking || '';

          if (reasoningChunk) {
            if (!inReasoningBlock) {
              inReasoningBlock = true;
              onChunk('<think>\n');
            }
            onChunk(reasoningChunk);
          } else {
            if (inReasoningBlock && chunkContent) {
              inReasoningBlock = false;
              onChunk('\n</think>\n\n');
            }
            if (chunkContent) {
              if (!customProvider) {
                chunkContent = sanitizeOrionText(chunkContent, model);
              }
              onChunk(chunkContent);
            }
          }
        } catch {
          // ignore keep-alive or JSON parse fragments
        }
      }
    }

    if (inReasoningBlock) {
      inReasoningBlock = false;
      onChunk('\n</think>\n\n');
    }

    onDone();
  } catch (err) {
    if (err.name === 'AbortError') return;
    onError(err);
  }
}

/**
 * Fetch available models dynamically from provider endpoint (/models or Ollama /api/tags)
 */
export async function fetchProviderModels({ baseUrl, apiKey }) {
  if (!baseUrl) {
    throw new Error('Base URL wajib diisi.');
  }

  let cleanBase = baseUrl.trim().replace(/\/+$/, '');
  if (cleanBase.endsWith('/chat/completions')) {
    cleanBase = cleanBase.replace(/\/chat\/completions$/, '');
  }

  const headers = {
    'Content-Type': 'application/json',
  };
  if (apiKey && apiKey.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  const endpointsToTry = [];
  if (cleanBase.endsWith('/v1')) {
    endpointsToTry.push(`${cleanBase}/models`);
    endpointsToTry.push(`${cleanBase.slice(0, -3)}/api/tags`);
  } else {
    endpointsToTry.push(`${cleanBase}/models`);
    endpointsToTry.push(`${cleanBase}/v1/models`);
    endpointsToTry.push(`${cleanBase}/api/tags`);
  }

  let lastError = null;
  for (const url of endpointsToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        let models = [];

        if (Array.isArray(data.data)) {
          models = data.data.map((m) => (typeof m === 'string' ? m : m.id || m.name)).filter(Boolean);
        } else if (Array.isArray(data.models)) {
          models = data.models.map((m) => (typeof m === 'string' ? m : m.name || m.model || m.id)).filter(Boolean);
        } else if (Array.isArray(data)) {
          models = data.map((m) => (typeof m === 'string' ? m : m.id || m.name)).filter(Boolean);
        }

        if (models.length > 0) {
          const uniqueModels = Array.from(new Set(models));
          return {
            success: true,
            endpoint: url,
            models: uniqueModels,
            message: `Berhasil mendeteksi ${uniqueModels.length} model dari ${url}.`,
          };
        }
      } else {
        const errText = await res.text();
        lastError = new Error(`HTTP ${res.status}: ${errText.slice(0, 100)}`);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
    }
  }

  throw lastError || new Error('Tidak dapat mengambil daftar model dari endpoint /models. Pastikan server AI aktif.');
}

/**
 * Test Custom Provider Connection (without needing a manual modelId)
 * Dynamically pings /models
 */
export async function testCustomProviderConnection({ baseUrl, apiKey }) {
  if (!baseUrl) {
    throw new Error('Base URL wajib diisi.');
  }

  try {
    const result = await fetchProviderModels({ baseUrl, apiKey });
    return {
      success: true,
      message: `Koneksi berhasil! Terhubung ke server (${result.models.length} model terdeteksi).`,
      models: result.models,
    };
  } catch (err) {
    return {
      success: false,
      message: err.message || 'Gagal terhubung ke endpoint provider.',
    };
  }
}

/**
 * Test Specific Model Completion before allowing checklist
 */
export async function testSpecificModel({ baseUrl, apiKey, modelId }) {
  if (!baseUrl || !modelId) {
    throw new Error('Base URL dan Model ID wajib diisi.');
  }

  let cleanBase = baseUrl.trim().replace(/\/+$/, '');
  if (cleanBase.endsWith('/chat/completions')) {
    cleanBase = cleanBase.replace(/\/chat\/completions$/, '');
  }
  const targetUrl = `${cleanBase}/chat/completions`;

  const headers = {
    'Content-Type': 'application/json',
  };
  if (apiKey && apiKey.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  const payload = {
    model: modelId.trim(),
    messages: [{ role: 'user', content: 'hi' }],
    max_tokens: 5,
    temperature: 0.1,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      let parsedMsg = errText;
      try {
        const parsed = JSON.parse(errText);
        parsedMsg = parsed.error?.message || parsed.message || errText;
      } catch {}
      throw new Error(`HTTP ${res.status}: ${parsedMsg}`);
    }

    const data = await res.json();
    return {
      success: true,
      message: `Model "${modelId}" berfungsi normal dan siap dipakai.`,
      sampleReply: data.choices?.[0]?.message?.content || 'OK',
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Timeout: Model tidak merespons dalam 15 detik.');
    }
    throw err;
  }
}
