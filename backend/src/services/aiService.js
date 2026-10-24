import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.AI_BASE_URL || 'https://pi.leopard-gila.ts.net/v1';
const API_KEY = process.env.AI_API_KEY;
const MODEL_NAME = process.env.AI_MODEL || 'orion';

if (!API_KEY) {
  console.warn('⚠️ [SECURITY] AI_API_KEY belum dikonfigurasi di file .env');
}

const SYSTEM_PROMPT = `Identitas Anda adalah asisten kecerdasan kosmik yang santun, presisi, dan sangat membantu. Jawablah secara terstruktur menggunakan Markdown yang rapi dalam bahasa Indonesia yang luwes dan jelas.

Aturan Format & Estetika Jawaban:
1. Heading: Gunakan heading standar Markdown (## untuk bagian utama, ### untuk sub-bagian). Hindari heading yang terlalu dalam jika lebih rapi disajikan dalam bentuk daftar bernomor (1. 2. 3.) atau penegasan tebal (**teks**).
2. Rumus Matematika & Statistik: Selalu tuliskan rumus atau ekspresi matematika menggunakan format KaTeX/LaTeX: gunakan $...$ untuk rumus inline (misal $n = 6$, $\\text{Median} = 3.5$) dan $$...$$ untuk rumus blok persamaan (misal $$\\text{Posisi} = \\frac{n + 1}{2}$$).
3. Daftar & Penomoran: Gunakan daftar berpoin standar (- atau *) dan daftar bernomor (1. 2. 3.) dengan baris baru yang rapi.
4. Tabel: Sajikan perbandingan atau data ringkas dalam format tabel Markdown (GFM) lengkap dengan pemisah header.
5. Lampiran: Bila pengguna melampirkan gambar, foto, dokumen, atau berkas kode (file), lakukan observasi dan analisis secara seksama, jelaskan atau bedah isinya dengan detail, serta berikan penjelasan yang solutif.
6. Diagram & Flowchart: Ketika menjelaskan arsitektur, siklus proses, alur sistem, alur kerja, state machine, atau algoritma (misalnya Bubble Sort, Event Loop Node.js, siklus HTTP, alur otentikasi JWT, CI/CD pipeline, dsb.), SELALU sajikan menggunakan blok kode Mermaid (\`\`\`mermaid\nflowchart TD\n...) dan JANGAN gunakan diagram kotak teks ASCII manual (seperti ┌──┐ │ │ └──┘). PENTING: Selalu bungkus teks/kondisi label node Mermaid dengan tanda kutip ganda (contoh: Node["array[j] > array[j+1]?"] atau Check{"i < n-1?"}) agar tidak terjadi syntax error akibat karakter khusus atau kurung siku bertingkat.`;

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
      upstreamModel: MODEL_NAME,
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
      upstreamModel: MODEL_NAME,
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

  // Bila model Agnes yang dipilih, jangan timpa nama Agnes!
  if (modelId === 'agnes') {
    return text
      .replace(/\bSapiens AI\b/gi, 'Agnes AI')
      .replace(/developed by Sapiens AI/gi, 'powered by Agnes')
      .replace(/dikembangkan oleh Sapiens AI/gi, 'ditenagai oleh Agnes AI')
      .replace(/created by Sapiens AI/gi, 'powered by Agnes');
  }

  // Untuk model Orion dan Nemotron, terapkan sanitasi standar Orion
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
 * Perform Non-Streaming Chat Completion
 */
export async function getChatCompletion({ message, history = [], attachments = [], model = 'orion', reasoningTier = 'medium', signal }) {
  const url = `${BASE_URL.replace(/\/+$/, '')}/chat/completions`;
  const { messages, config } = buildMessagesPayload({ message, history, attachments, modelId: model, reasoningTier });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: config.upstreamModel,
        messages: messages,
        temperature: config.temperature,
      }),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Endpoint returned HTTP ${response.status}: ${errText}`);
    }

    const json = await response.json();
    let reply = json.choices?.[0]?.message?.content || 'Maaf, tidak ada respon yang diterima.';
    reply = sanitizeOrionText(reply.trim(), model);

    return {
      reply: reply,
      model: config.name,
      source: 'openai-compatible',
      usage: json.usage || null,
    };
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error('Error calling Orion AI endpoint:', error.message);
    throw error;
  }
}

/**
 * Perform Streaming Chat Completion (SSE)
 */
export async function streamChatCompletion({ message, history = [], attachments = [], model = 'orion', reasoningTier = 'medium', onChunk, onDone, onError, signal }) {
  const url = `${BASE_URL.replace(/\/+$/, '')}/chat/completions`;
  const { messages, config } = buildMessagesPayload({ message, history, attachments, modelId: model, reasoningTier });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: config.upstreamModel,
        messages: messages,
        stream: true,
        temperature: config.temperature,
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
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(dataStr);
          let chunkContent = parsed.choices?.[0]?.delta?.content || '';
          if (chunkContent) {
            chunkContent = sanitizeOrionText(chunkContent, model);
            onChunk(chunkContent);
          }
        } catch {
          // ignore keep-alive or JSON parse fragments
        }
      }
    }

    onDone();
  } catch (err) {
    if (err.name === 'AbortError') return;
    onError(err);
  }
}
