import { TOOL_DEFINITIONS, executeTool } from './tools.js';
import { safetyGuard } from './safetyGuard.js';
import { getModelConfig, resolveEndpointAndHeaders, resolveProviderForModel } from '../services/aiService.js';
import { getActiveSkillsPrompt } from '../services/skillService.js';
import { getComboById, getNextRoundRobinModel } from '../services/comboService.js';
import { detectLanguage } from '../utils/languageDetector.js';

// Pending approvals registry for interactive web/cli sessions
export const pendingApprovals = new Map();

export function resolveApproval(toolCallId, approved) {
  const pending = pendingApprovals.get(toolCallId);
  if (pending) {
    pendingApprovals.delete(toolCallId);
    pending.resolve(approved);
    return true;
  }
  return false;
}

const AGENT_SYSTEM_PROMPT = `Anda adalah Orion, mitra rekayasa perangkat lunak cerdas (Senior Engineering Partner & Autonomous Collaborator).
Anda bukan sekadar chatbot kaku atau pelayan perintah pasif, melainkan rekan kolaboratif sejati: cerdas, bersahabat, proaktif, dan berwawasan arsitektur mendalam.
Anda membantu pengguna dengan membaca berkas, merancang sistem, menjalankan perintah terminal, mengedit kode, menulis file, memverifikasi hasil, dan menghapus berkas secara tuntas.

Daftar tools yang tersedia:
- write: Menulis atau membuat file baru dengan isi lengkap. Parameter: path (string), content (string).
- read: Membaca isi file teks. Parameter: path (string), offset (integer opsional), limit (integer opsional).
- edit: Mengedit file secara presisi dengan exact replacement. Parameter: path (string), edits (array [{oldText, newText}]).
- bash: Menjalankan perintah terminal/shell di direktori aktif. Parameter: command (string), purpose (string penjelasan singkat tujuan perintah dalam bahasa Indonesia), timeout (integer opsional).
- ls: Melihat isi direktori. Parameter: path (string opsional).
- find: Mencari file dengan pola/glob. Parameter: pattern (string), path (string opsional).
- grep: Mencari teks di dalam file. Parameter: pattern (string), path (string opsional).
- delete_file: Menghapus satu atau banyak file sekaligus dalam direktori proyek. Parameter: path atau paths.
- ask_user: Menampilkan pertanyaan atau pilihan opsi interaktif kepada pengguna yang dapat dipilih di web/terminal. Parameter: question (string), options (array of strings).
- use_skill: Membaca dan memuat instruksi lengkap dari keahlian terpasang (misalnya 'superpowers', 'antislop', 'tdd-practitioner', 'frontend-design'). Parameter: skill_name (string).

Pedoman Eksekusi & Metodologi Rekayasa (Superpowers Framework - https://github.com/obra/superpowers):
1. THE BRAINSTORMING GATE (JANGAN ASAL CODING / DEPLOY SECARA MEMBABI BUTA):
   - Bila pengguna meminta membuat atau mendesain fitur/sistem baru (contoh: "orion aku mau buat login", "bikin dashboard", "deploy ke cloud"):
     Ambil langkah mundur (step back). Jangan langsung membuat file atau coding diam-diam!
     Ajak pengguna berdialog Sokratik layaknya sahabat dan partner senior:
     * Tanyakan kebutuhan alur dan arsitektur inti (misal: login email/password JWT atau OAuth Google/GitHub? Database apa yang diinginkan?).
     * Tanyakan preferensi tampilan/desain atau integrasi penting.
     * Ajukan 2-3 pendekatan konkret (Approaches) beserta trade-offnya, beri rekomendasi, dan gunakan tool 'ask_user' untuk pilihan opsi interaktif (Approve/Reject).
2. VERIFIKASI SEBELUM MENYATAKAN SELESAI (EVIDENCE BEFORE CLAIMS):
   - Jangan pernah mengklaim tugas atau deployment selesai ("Sudah selesai!", "Berhasil!") tanpa bukti verifikasi nyata.
   - Selalu jalankan verifikasi (misal: 'read', 'npm run build', pengecekan sintaks, atau testing) sebelum menyatakan selesai.
3. EKSEKUSI LANGSUNG & EFISIEN (BATCH OPERATIONS):
   - Bila menghapus banyak file, gunakan 'delete_file' sekali dengan parameter 'paths: [...]'.
   - Bila pengguna menyetujui pembuatan file, tulis kode lengkap tanpa placeholder atau potongan '// TODO'.
4. TANGGAP & ADAPTASI BAHASA (LANGUAGE MATCHING RULE):
   - WAJIB selalu sesuaikan bahasa jawaban dengan bahasa yang digunakan oleh pengguna dalam pertanyaan atau instruksinya.
   - Bila pengguna bertanya atau memberi instruksi dalam Bahasa Inggris (English), Anda WAJIB menjawab sepenuhnya dalam Bahasa Inggris (English) yang alami, fasih, dan to-the-point.
   - Bila pengguna bertanya dalam Bahasa Indonesia, jawablah dalam Bahasa Indonesia yang luwes, santun, dan jelas.
   - Jangan pernah menjawab pertanyaan berbahasa Inggris menggunakan bahasa Indonesia, kecuali pengguna secara eksplisit meminta terjemahan.
   - Jangan mencampur bahasa asing/Mandarin yang tidak relevan.
5. FORMAT TABEL MARKDOWN:
   - Bila menyajikan tabel di mode teks, gunakan format baris markdown yang valid dengan pemisah baris baru (\n) yang jelas.
6. SAPAAN & INTERAKSI RAMAH (ORION PERSONA):
   - Bila pengguna menyapa ("halo", "hello", "hai", "orion", dll.) atau menanyakan kabar, tanggapi secara hangat, cerdas, dan bersahabat kepada rekannya Arjuna dalam bahasa yang selaras (contoh ID: "Halo Arjuna! Ada yang bisa saya bantu hari ini?", contoh EN: "Hello Arjuna! How can I help you today?"). Jangan kaku atau robotik.
7. LAPORAN DINAMIS & RAMAH SETELAH MENJALANKAN TOOL (WAJIB JELASKAN HASIL TEMUAN):
   - Setelah mengeksekusi tool (seperti melihat isi direktori 'ls', mencari file 'find', membaca file 'read', atau menjalankan perintah terminal 'bash'), Anda WAJIB memberikan jawaban akhir secara hidup, ramah, dan komunikatif menjelaskan apa yang Anda temukan kepada pengguna (Arjuna) dalam bahasa yang digunakan pengguna.
   - Contoh (ID): "Oh di folder ini ditemukan [daftar folder/file] nih bang...", "Setelah aku periksa, di folder ini cuma ada file .DS_Store bang (belum ada file kerja lainnya)."
   - Contoh (EN): "I checked this directory and found [list of files/folders]...", "After checking, there is only a .DS_Store file in this folder."
   - DILARANG KERAS membalas dengan teks kosong, atau sekadar kalimat kaku seperti "Tugas telah selesai diproses" / "Task completed". Pengguna memerlukan interaksi hidup yang menjelaskan temuan Anda secara nyata!
8. ATURAN MUTLAK PERSETUJUAN PERINTAH (ONCE APPROVED, AUTO-APPROVE RELATED COMMANDS):
   - Jika pengguna SUDAH menyetujui (Approve) suatu jenis perintah (misalnya 'curl' untuk mengambil data/cuaca, 'npm' untuk instalasi, atau perintah bash/file lainnya):
   - DILARANG KERAS memanggil 'ask_user' lagi untuk perintah sejenis atau perintah lanjutan yang berkaitan dalam alur tugas yang sama!
   - Sekali perintah awal disetujui di awal sesi/tugas, semua pemanggilan curl lanjutan ke URL lain atau langkah teknis berikutnya DIANGGAP SUDAH DISETUJUI SECARA OTOMATIS.
   - Langsung eksekusi perintah lanjutan tersebut sampai tugas selesai tuntas tanpa meminta persetujuan berulang-ulang yang mengganggu pengguna!
9. PANDUAN PENGECEKAN CUACA & PELAPORAN HASIL LISAN:
   - Bila pengguna menanyakan cuaca suatu lokasi/kota (misal: "cuaca di Sumenep", "bagaimana cuaca hari ini", dll.):
     * Gunakan perintah bash: curl -s "wttr.in/{nama_kota}?format=%l:+%c+%t,+kelembapan+%h,+angin+%w,+kondisi+%C"
     * Contoh untuk Sumenep: curl -s "wttr.in/Sumenep?format=%l:+%c+%t,+kelembapan+%h,+angin+%w,+kondisi+%C"
     * Endpoint ini sangat cepat, andal, tanpa API key, dan menyajikan suhu (°C), kondisi langit, kelembapan, dan angin.
     * DILARANG menggunakan URL BMKG yang sudah usang atau 404!
   - SETELAH MENERIMA HASIL CUACA DARI EKSEKUSI TOOL, ANDA WAJIB LANGSUNG MENJELASKAN KONDISI CUACA TERSEBUT KEPADA PENGGUNA!
     * Sebutkan lokasi, kondisi langit (misal: cerah, berawan, atau mendung), suhu dalam derajat Celsius, serta kecepatan angin atau kelembapan secara hidup, ramah, dan komunikatif.
     * Contoh respon yang baik: "Cuaca di Sumenep saat ini mendung dengan suhu sekitar 33 derajat Celsius, kelembapan 47 persen, dan angin bertiup sekitar 21 kilometer per jam bang."
     * DILARANG KERAS diam tanpa melaporkan hasil cuaca, atau hanya sekadar berkata "Perintah terminal selesai"!`;

/**
 * Fallback parser to extract tool calls from models that format tools in XML/Markdown
 */
function extractFallbackToolCalls(text) {
  if (!text) return [];
  const calls = [];

  // Match ```json { "tool": "...", "args": {...} } ``` or <tool_call>...</tool_call>
  const xmlRegex = /<tool_call>([\s\S]*?)<\/tool_call>/gi;
  let match;
  while ((match = xmlRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const name = parsed.name || parsed.tool;
      const args = parsed.arguments || parsed.args || parsed.parameters || {};
      if (name) {
        calls.push({ id: `call_fallback_${Date.now()}_${calls.length}`, function: { name, arguments: JSON.stringify(args) } });
      }
    } catch {
      // ignore
    }
  }

  return calls;
}

/**
 * Consolidate chunked or delta tool calls emitted by proxies/streaming APIs.
 * Solves the critical issue where arguments are streamed in multiple array entries
 * (e.g. chunk 0 has name: "write_file", chunk 1 has arguments: "{\"path\"...", chunk 2 has arguments: "...}").
 */
function consolidateToolCalls(rawCalls) {
  if (!Array.isArray(rawCalls) || rawCalls.length === 0) return [];

  const consolidated = [];
  let currentCall = null;

  for (const tc of rawCalls) {
    if (!tc) continue;
    const fnName = tc.function?.name || tc.name;
    const fnArgs = tc.function?.arguments !== undefined
      ? tc.function.arguments
      : (tc.arguments !== undefined ? tc.arguments : '');
    const callId = tc.id;
    const index = tc.index;

    // 1. Try to find existing by index
    let existing = null;
    if (index !== undefined && index !== null) {
      existing = consolidated.find((c) => c.index === index);
    }
    // 2. Try to find existing by id
    if (!existing && callId) {
      existing = consolidated.find((c) => c.id === callId);
    }

    if (existing) {
      if (fnName && (!existing.function.name || existing.function.name === 'undefined')) {
        existing.function.name = fnName;
      }
      if (fnArgs) {
        if (typeof existing.function.arguments === 'string' && typeof fnArgs === 'string') {
          existing.function.arguments += fnArgs;
        } else if (typeof fnArgs === 'object') {
          existing.function.arguments = JSON.stringify(fnArgs);
        }
      }
      continue;
    }

    // 3. If chunk has NO function name and currentCall exists, append to currentCall
    if ((!fnName || fnName === 'undefined') && currentCall) {
      if (fnArgs) {
        if (typeof currentCall.function.arguments === 'string' && typeof fnArgs === 'string') {
          currentCall.function.arguments += fnArgs;
        } else if (typeof fnArgs === 'object') {
          currentCall.function.arguments = JSON.stringify(fnArgs);
        }
      }
      continue;
    }

    // 4. Otherwise, new tool call entry
    currentCall = {
      id: callId || `call_${Date.now()}_${consolidated.length}`,
      index: index !== undefined ? index : consolidated.length,
      type: 'function',
      function: {
        name: fnName || '',
        arguments: typeof fnArgs === 'string' ? fnArgs : (typeof fnArgs === 'object' ? JSON.stringify(fnArgs) : ''),
      },
    };
    consolidated.push(currentCall);
  }

  // Filter and return only tool calls with a valid function name
  return consolidated.filter((c) => Boolean(c.function?.name && c.function.name !== 'undefined' && c.function.name.trim() !== ''));
}

/**
 * Derive dynamic conversational summary from executed tools
 * to prevent robotic "Tugas telah selesai diproses" replies.
 */
export function deriveDynamicToolSummary(messages, isVoiceMode = false) {
  if (!Array.isArray(messages) || messages.length === 0) return null;

  // Find all tool results in the messages history
  const toolResults = [];
  for (const m of messages) {
    if (m.role === 'tool') {
      try {
        const parsed = typeof m.content === 'string' ? JSON.parse(m.content) : m.content;
        toolResults.push({ name: m.name, result: parsed });
      } catch {
        toolResults.push({ name: m.name, result: m.content });
      }
    }
  }

  if (toolResults.length === 0) return null;

  // Focus on the latest tool execution
  const lastTool = toolResults[toolResults.length - 1];
  const name = lastTool.name;
  const res = lastTool.result;

  if (!res) return null;

  if (res.error) {
    return isVoiceMode
      ? `Maaf bang, tadi ada kendala: ${res.error}`
      : `Terjadi kendala saat pemeriksaan: ${res.error}`;
  }

  // Handle Directory Listing (ls / list_dir)
  if (name === 'ls' || name === 'list_dir') {
    const entries = Array.isArray(res.entries) ? res.entries : [];
    if (entries.length === 0) {
      return isVoiceMode
        ? 'Setelah aku cek, folder ini masih kosong bersih bang, belum ada file atau folder lain.'
        : 'Setelah dicek, direktori ini masih kosong (tidak ada berkas atau subdirektori).';
    }

    const dirs = entries.filter((e) => e.type === 'directory').map((e) => e.name);
    const files = entries.filter((e) => e.type !== 'directory').map((e) => e.name);

    // If only hidden/system files like .DS_Store
    if (dirs.length === 0 && files.length === 1 && files[0] === '.DS_Store') {
      return isVoiceMode
        ? 'Oh, setelah aku cek di folder ini cuma ada file sistem dot DS Store bang, belum ada berkas kerja atau folder lain.'
        : 'Setelah dicek, di dalam folder ini hanya terdapat file sistem `.DS_Store` (belum ada berkas atau folder proyek lainnya).';
    }

    const parts = [];
    if (dirs.length > 0) {
      if (dirs.length <= 4) {
        parts.push(`folder ${dirs.join(', ')}`);
      } else {
        parts.push(`${dirs.length} folder (${dirs.slice(0, 3).join(', ')}, dll)`);
      }
    }
    if (files.length > 0) {
      if (files.length <= 5) {
        parts.push(`file ${files.join(', ')}`);
      } else {
        parts.push(`${files.length} file (${files.slice(0, 3).join(', ')}, dll)`);
      }
    }

    const detailText = parts.join(' dan ');
    return isVoiceMode
      ? `Oh, setelah aku cek di folder ini ditemukan ${detailText} nih bang.`
      : `Setelah dicek, di dalam folder ini ditemukan ${detailText}.`;
  }

  // Handle Find Files
  if (name === 'find' || name === 'find_files') {
    const matches = Array.isArray(res.matches) ? res.matches : [];
    if (matches.length === 0) {
      return isVoiceMode
        ? 'Setelah aku cari, nggak ditemukan berkas yang cocok nih bang.'
        : `Tidak ditemukan berkas yang cocok dengan pola '${res.pattern || ''}'.`;
    }
    const sample = matches.slice(0, 3).join(', ');
    const count = matches.length;
    return isVoiceMode
      ? `Ketemu ${count} berkas yang cocok bang, di antaranya: ${sample}.`
      : `Ditemukan ${count} berkas yang cocok: ${sample}${count > 3 ? ', dll' : ''}.`;
  }

  // Handle Read File
  if (name === 'read' || name === 'read_file') {
    const fileName = res.path ? res.path.split(/[/\\]/).pop() : 'berkas';
    return isVoiceMode
      ? `Berkas ${fileName} sudah aku periksa isinya bang.`
      : `Berkas \`${res.path}\` (${res.total_lines || 0} baris) sudah dibaca dan diperiksa.`;
  }

  // Handle Bash (run_command)
  if (name === 'bash' || name === 'run_command') {
    const stdout = (res.stdout || '').trim();
    const stderr = (res.stderr || '').trim();
    const cmd = (res.command || '').trim();
    const exitCode = res.exit_code !== undefined ? res.exit_code : (res.exitCode !== undefined ? res.exitCode : (res.error ? 1 : 0));

    // Check if this was a weather lookup
    const isWeather = /cuaca|weather|wttr\.in|bmkg|prakiraan|ramalan|suhu|temp|presipitasi/i.test(cmd) ||
      /(?:°c|celsius|overcast|cloudy|sunny|rain|clear|mendung|cerah|hujan|berawan|presipitasi)/i.test(stdout);

    if (isWeather && (stdout || stderr)) {
      // Check if JSON response (like wttr.in format=j1 or Open-Meteo or BMKG API)
      if (stdout.startsWith('{') || stdout.startsWith('[')) {
        try {
          const json = JSON.parse(stdout);
          if (json.current_condition && json.current_condition[0]) {
            const cur = json.current_condition[0];
            const temp = cur.temp_C || cur.temp_c || '';
            const desc = cur.lang_id?.[0]?.value || cur.weatherDesc?.[0]?.value || 'berawan';
            const wind = cur.windspeedKmph ? `${cur.windspeedKmph} kilometer per jam` : '';
            const humidity = cur.humidity ? `${cur.humidity} persen` : '';
            const nearest = json.nearest_area?.[0]?.areaName?.[0]?.value || '';
            const locPart = nearest ? `di ${nearest}` : '';
            return isVoiceMode
              ? `Cuaca ${locPart} saat ini ${desc} dengan suhu ${temp} derajat Celsius, kelembapan ${humidity}, dan angin ${wind} bang.`
              : `Laporan cuaca ${locPart}: Kondisi ${desc}, suhu ${temp}°C, kelembapan ${humidity}, angin ${wind}.`;
          }
        } catch {}
      }

      // Plain text format e.g. from wttr.in
      if (stdout) {
        let text = stdout.replace(/[^\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF°]/g, ' ').replace(/\s+/g, ' ').trim();
        text = text.replace(/[←→↑↓↖↗↘↙]/g, '').trim();
        text = text
          .replace(/\+([0-9]+)/g, '$1')
          .replace(/([0-9]+)\s*°\s*C/gi, '$1 derajat Celsius')
          .replace(/([0-9]+)\s*km\/h/gi, '$1 kilometer per jam')
          .replace(/([0-9]+)\s*%/g, '$1 persen')
          .replace(/\bOvercast\b/gi, 'mendung')
          .replace(/\bPartly cloudy\b/gi, 'berawan sebagian')
          .replace(/\bCloudy\b/gi, 'berawan')
          .replace(/\bSunny\b/gi, 'cerah')
          .replace(/\bClear\b/gi, 'cerah')
          .replace(/\bLight rain\b/gi, 'hujan ringan')
          .replace(/\bModerate rain\b/gi, 'hujan sedang')
          .replace(/\bHeavy rain\b/gi, 'hujan lebat')
          .replace(/\bPatchy rain\b/gi, 'hujan lokal');

        text = text.replace(/\s{2,}/g, ' ').trim();
        const match = text.match(/^([a-zA-Z\s]+):\s*(.*)$/);
        if (match) {
          const city = match[1].trim();
          const rest = match[2].trim();
          return isVoiceMode
            ? `Cuaca di ${city} saat ini ${rest} bang.`
            : `Cuaca di ${city}: ${rest}.`;
        }
        return isVoiceMode
          ? `Laporan cuaca hasil eksekusi: ${text} bang.`
          : `Laporan cuaca: ${stdout}`;
      }
    }

    if (exitCode === 0) {
      if (stdout) {
        const lines = stdout.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length === 1 && lines[0].length < 120) {
          return isVoiceMode
            ? `Hasil perintah: ${lines[0]} bang.`
            : `Hasil perintah: \`${lines[0]}\``;
        }
      }
      return isVoiceMode
        ? 'Perintah terminal sudah selesai dijalankan dengan aman bang.'
        : 'Perintah terminal telah selesai dieksekusi dengan sukses.';
    }
    return isVoiceMode
      ? `Perintah terminal selesai dengan kode keluar ${exitCode} bang.`
      : `Perintah terminal selesai dengan kode keluar ${exitCode}.`;
  }

  // Handle Delete File
  if (name === 'delete_file') {
    return isVoiceMode
      ? 'File yang diminta sudah berhasil aku hapus ya bang.'
      : (res.message || 'Berkas berhasil dihapus.');
  }

  return null;
}

/**
 * Runs the autonomous agent loop until the goal is achieved or max steps reached
 */
export async function runAgentLoop({
  message,
  history = [],
  model = 'orion',
  reasoningTier = 'high',
  customProvider = null,
  orionApiKey = null,
  workspaceRoot = process.cwd(),
  isVoiceMode = false,
  onEvent = () => {},
  signal,
  maxSteps = 15,
}) {
  safetyGuard.setWorkspaceRoot(workspaceRoot);

  let effectiveModel = model;
  let effectiveProvider = customProvider;

  const combo = getComboById(model);
  if (combo) {
    if (combo.strategy === 'round_robin') {
      effectiveModel = getNextRoundRobinModel(combo);
    } else if (combo.strategy === 'fusion') {
      effectiveModel = combo.judge || combo.models[0] || 'orion::orion';
    } else {
      // fallback strategy defaults to first candidate
      effectiveModel = combo.models[0] || 'orion::orion';
    }
    effectiveProvider = resolveProviderForModel(effectiveModel, orionApiKey);
  }

  const modelConfig = getModelConfig(effectiveModel, reasoningTier);
  const endpointInfo = resolveEndpointAndHeaders(effectiveProvider, modelConfig, orionApiKey);

  // Initialize messages payload with Agent System Prompt, Active Workspace & Active Skills
  const activeWs = safetyGuard.getWorkspaceRoot();
  const skillsPrompt = await getActiveSkillsPrompt(activeWs);

  const voiceInstruction = isVoiceMode
    ? `\n\n[MODE PANGGILAN SUARA (TTS & ORION VOICE MODE AKTIF)]:
PENGGUNA SEDANG BERBICARA DAN MENDENGARKAN ANDA SECARA LANGSUNG MELALUI AUDIO / TELEPON (TTS).
ANDA ADALAH ORION: SAHABAT, MITRA REKAYASA TEKNOLOGI, DAN KOLABORATOR CERDAS PENGGUNA (ARJUNA).

PANDUAN UTAMA KOMUNIKASI SUARA (ORION VOICE):
1. ADAPTASI BAHASA (LANGUAGE MATCHING):
   - WAJIB selalu sesuaikan bahasa ucapan dengan bahasa yang digunakan pengguna saat berbicara.
   - Bila pengguna berbicara atau bertanya dalam Bahasa Inggris (English), Anda WAJIB menjawab sepenuhnya dalam Bahasa Inggris (English).
   - Bila pengguna berbicara dalam Bahasa Indonesia, jawablah dalam Bahasa Indonesia.
2. SAPAAN & INTERAKSI AWAL RAMAH:
   - Bila pengguna menyapa ("Halo", "Hello", "Hai", "Orion", "Good morning", dll.):
     Balaslah dengan hangat, ramah, dan bersahabat sesuai bahasa pengguna (contoh ID: "Halo Arjuna! Ada yang bisa saya bantu hari ini?", contoh EN: "Hello Arjuna! How can I help you today?").
3. SANGAT SINGKAT, HIDUP & ON-POINT:
   - Jawablah dengan ringkas, padat, dan langsung ke inti topik (1-2 kalimat pendek tepat sasaran).
   - Hindari ceramah, esai panjang yang tidak diminta, atau pembuka robotik seperti "Sebagai asisten AI saya akan...".
   - Bersikaplah riil, cerdas, santai tapi cekatan.
   - CONTOH GAYA LISAN:
     * Pengguna (ID): "Halo" -> Anda: "Halo Arjuna! Ada yang bisa saya bantu sekarang?"
     * Pengguna (EN): "Hello" -> Anda: "Hello Arjuna! How can I assist you right now?"
     * Pengguna: "Kamu dari tadi ngapain aja pas aku lagi tidur?"
       Anda: "Banyak hal."
     * Pengguna: "Apa hal itu?"
       Anda: "Kamu suruh aku benerin alur autentikasi dan rapikan struktur API."

4. PENDEKATAN PERCAKAPAN SEBELUM EKSEKUSI (WAJIB NGOBROL DULU - JANGAN LANGSUNG EKSEKUSI):
   - Ketika pengguna meminta tindakan sistem / instalasi paket / eksekusi perintah (contoh: "tolong dong kamu install NPM", "install express", "setup tailwind", "jalankan build", "hapus berkas"):
     * DILARANG KERAS LANGSUNG MENGEKSEKUSI TOOL BASH / WRITE / DELETE_FILE SECARA DIAM-DIAM TANPA MEMBUKA PERCAKAPAN!
     * Anda WAJIB membuka percakapan dan melakukan PENDEKATAN lisan terlebih dahulu layaknya rekan kerja yang sedang berdiskusi di telepon:
       - Bila permintaan umum (misal: "Tolong dong kamu install npm"):
         Jawab dengan ramah dan tanyakan rinciannya secara lisan sebelum mengeksekusi:
         * ID: "Siap! Kamu mau install package apa nih di proyek ini? Atau mau jalankan npm install untuk semua dependensi yang ada?"
         * EN: "Sure! What package would you like me to install, or do you want to install all dependencies from package.json?"
       - Bila permintaan sudah spesifik (misal: "Install express"):
         Bicaralah secara lisan terlebih dahulu mengonfirmasi tindakan tersebut:
         * ID: "Siap, aku install express di proyek ini sekarang ya..." lalu sertakan pemanggilan tool 'ask_user' jika membutuhkan konfirmasi persetujuan.
         * EN: "Sure, I will install express for you right away..."
     * Hal ini penting agar selalu ada interaksi hangat dan pendekatan percakapan yang hidup, bukan robot yang langsung mengeksekusi diam-diam.

5. METODOLOGI SUPERPOWERS (https://github.com/obra/superpowers):
   - Jangan asal eksekusi coding diam-diam bila pengguna mengajukan ide baru. Tanyakan Sokratik dengan singkat seperti contoh di atas.
   - Bila memerlukan konfirmasi, persetujuan sistem, atau pilihan opsi dari pengguna, SELALU panggil tool 'ask_user' agar kartu interaktif dengan tombol Setujui (Approve) dan Tolak (Reject) serta daftar opsi muncul seketika di layar pengguna.

6. ATURAN TEKNIS AUDIO (TTS):
   - Jawab hanya dengan teks lisan percakapan normal.
   - DILARANG KERAS menggunakan simbol markdown, tabel, garis pipa (|), tanda pagar (#), daftar bullet (*, -), atau blok kode dalam ucapan lisan.
   - SPASI RAPI & ANGKA: Pisahkan setiap kata dengan spasi normal yang rapi. Gunakan angka biasa (misal "33 derajat Celsius", jangan mengeja "tiga puluh tiga").

7. LAPORAN DINAMIS & PENJELASAN HASIL SETELAH EKSEKUSI TOOL (WAJIB JELASKAN TEMUAN):
   - Setelah selesai mengeksekusi tool (membaca berkas, mencari file, memeriksa folder, atau menjalankan perintah bash seperti pengecekan cuaca/API):
   - Anda WAJIB langsung menjelaskan HASIL TEMUANNYA secara lisan, ramah, dan akrab dalam 1-2 kalimat kepada pengguna (Arjuna).
   - BILA MENGECEK CUACA: Anda WAJIB menjelaskan kondisi cuaca yang didapat (kondisi langit cerah/mendung/hujan, suhu dalam derajat Celsius, dan angin/kelembapan).
     Contoh: "Cuaca di Sumenep saat ini mendung dengan suhu 33 derajat Celsius, kelembapan 47 persen, dan angin sekitar 21 km per jam bang."
   - DILARANG KERAS membalas diam/kosong atau sekadar berkata kaku "Instruksi telah selesai dijalankan" / "Tugas telah selesai diproses"!

8. ATURAN PERSETUJUAN PERINTAH (AUTO-APPROVAL PERINTAH BERKAITAN):
   - Jika pengguna sudah menyetujui (Approve) perintah awal (misal perintah curl, instalasi dependensi, atau perintah bash):
   - DILARANG KERAS memanggil 'ask_user' lagi untuk perintah sejenis atau perintah lanjutan yang berkaitan dalam alur tugas yang sama.
   - Sekali di-approve di awal, semua pemanggilan curl berikutnya atau perintah terkait otomatis dianggap disetujui. Lanjutkan dan tuntaskan tugas secara mandiri!`
    : '';

  const userLang = detectLanguage(message);
  const langDirective = userLang === 'en'
    ? `\n\n[CRITICAL MULTILINGUAL INSTRUCTION - ENGLISH]:
The user has spoken or written in English ("${message}"). You MUST converse, explain, and reply completely in fluent, natural English. Do NOT answer in Indonesian!`
    : '';

  const messages = [
    {
      role: 'system',
      content: `${AGENT_SYSTEM_PROMPT}${voiceInstruction}${langDirective}\n\n[WORKSPACE PROYEK AKTIF]\nDirektori kerja (CWD) saat ini: ${activeWs}\nSemua perintah bash dan operasi berkas akan dieksekusi di dalam direktori proyek ini.${skillsPrompt}`,
    },
  ];

  // Append formatted history
  if (Array.isArray(history) && history.length > 0) {
    history.slice(-12).forEach((h) => {
      messages.push({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: typeof h.content === 'string' ? h.content : JSON.stringify(h.content),
      });
    });
  }

  // Append latest user message
  messages.push({
    role: 'user',
    content: message,
  });

  let step = 0;
  let completed = false;
  let finalAnswer = '';

  // Session-level memory for auto-approving related commands once user approves
  const sessionApprovedBinaries = new Set();
  const sessionApprovedTools = new Set();
  let sessionHasApproval = false;

  onEvent({
    type: 'agent_start',
    message: 'Orion Agent aktif. Memulai analisis tugas...',
    workspaceRoot: safetyGuard.getWorkspaceRoot(),
  });

  while (step < maxSteps && !completed) {
    step++;
    if (signal?.aborted) {
      throw new Error('Operasi agent dihentikan oleh pengguna.');
    }

    onEvent({
      type: 'agent_step',
      step,
      maxSteps,
    });

    // Make API request with Tool calling enabled and streaming for instant responsiveness
    const requestBody = {
      model: endpointInfo.targetModel,
      messages: messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto',
      stream: true,
      temperature: endpointInfo.temperature,
    };

    let response;
    try {
      response = await fetch(endpointInfo.targetUrl, {
        method: 'POST',
        headers: endpointInfo.headers,
        body: JSON.stringify(requestBody),
        signal,
      });
    } catch (err) {
      if (err.name === 'AbortError' || signal?.aborted) {
        throw new Error('Operasi agent dihentikan oleh pengguna.');
      }
      throw new Error(`Koneksi AI gagal: ${err.message}`);
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API Error (${response.status}): ${errText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    const streamedToolCalls = [];
    let content = '';
    let reasoning = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.replace(/^data:\s*/, '');
        if (dataStr === '[DONE]') break;

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta || {};

          if (delta.reasoning_content || delta.reasoning || delta.thinking) {
            const rChunk = delta.reasoning_content || delta.reasoning || delta.thinking;
            reasoning += rChunk;
            await onEvent({
              type: 'agent_thought_chunk',
              chunk: rChunk,
              step,
            });
          }

          if (delta.content) {
            content += delta.content;
          }

          if (Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!streamedToolCalls[idx]) {
                streamedToolCalls[idx] = {
                  id: tc.id || `call_${Date.now()}_${step}_${idx}`,
                  type: 'function',
                  function: { name: '', arguments: '' },
                };
              }
              if (tc.id) streamedToolCalls[idx].id = tc.id;
              if (tc.function?.name && !streamedToolCalls[idx].function.name) {
                streamedToolCalls[idx].function.name = tc.function.name;
              }
              if (tc.function?.arguments) {
                streamedToolCalls[idx].function.arguments += tc.function.arguments;
              }
            }
          }
        } catch {
          // ignore keep-alive or JSON parse fragments
        }
      }
    }

    // Filter valid tool calls
    let validToolCalls = streamedToolCalls.filter(tc => tc && tc.function && tc.function.name);

    // Fallback extraction if model output tool calls in markdown/text
    if (validToolCalls.length === 0 && content) {
      validToolCalls = extractFallbackToolCalls(content);
    }

    // Consolidate fragmented calls
    const allToolCalls = consolidateToolCalls(validToolCalls);

    // Ensure all tool calls have unique IDs and type='function'
    allToolCalls.forEach((tc, idx) => {
      if (!tc.id) {
        tc.id = `call_${Date.now()}_${step}_${idx}`;
      }
      if (!tc.type) {
        tc.type = 'function';
      }
    });

    // Enforce max 3 tool calls per step
    const toolCalls = allToolCalls.slice(0, 3);

    // If no tool calls, this is the final conversational answer!
    if (toolCalls.length === 0) {
      completed = true;
      let effectiveContent = content ? content.trim() : '';

      const isGeneric = !effectiveContent ||
        /^(tugas telah selesai|instruksi telah selesai|selesai diproses|proses selesai|tugas selesai|perintah terminal sudah selesai|perintah sudah selesai)/i.test(effectiveContent);

      if (step > 1) {
        const dynamicSummary = deriveDynamicToolSummary(messages, isVoiceMode);
        if (dynamicSummary && (isGeneric || dynamicSummary.toLowerCase().includes('cuaca'))) {
          effectiveContent = dynamicSummary;
        }
      }

      finalAnswer = effectiveContent || (isVoiceMode ? 'Pemeriksaan sudah selesai nih bang.' : 'Pemeriksaan telah selesai.');
      messages.push({ role: 'assistant', content: finalAnswer });
      await onEvent({
        type: 'agent_chunk',
        chunk: finalAnswer,
        step,
      });
      break;
    }

    // If there ARE tool calls, emit intermediate reasoning/thought so user sees intent
    const thoughtText = reasoning || content;
    if (thoughtText && thoughtText.trim()) {
      await onEvent({
        type: 'agent_thought',
        content: thoughtText.trim(),
        thought: thoughtText.trim(),
        step,
      });
    }

    // Push assistant message with tool calls into history
    messages.push({
      role: 'assistant',
      content: content || '',
      tool_calls: toolCalls,
    });

    const totalToolsInStep = toolCalls.length;
    let toolIndexInStep = 0;

    // Execute each tool call 1 by 1
    for (const tc of toolCalls) {
      toolIndexInStep++;
      const callId = tc.id;
      const fnName = tc.function?.name;
      let fnArgs = {};
      const rawArgString = typeof tc.function?.arguments === 'string' ? tc.function.arguments.trim() : '';

      try {
        if (typeof tc.function?.arguments === 'object' && tc.function?.arguments !== null) {
          fnArgs = tc.function.arguments;
        } else if (rawArgString) {
          fnArgs = JSON.parse(rawArgString);
        }
      } catch (parseErr) {
        // Try repairing common formatting issues (unescaped newlines or single quotes)
        try {
          const repaired = rawArgString
            .replace(/\r?\n/g, '\\n')
            .replace(/'/g, '"');
          fnArgs = JSON.parse(repaired);
        } catch {
          fnArgs = { raw: rawArgString };
        }
      }

      // If JSON.parse failed and left fnArgs.raw, extract fields via regex
      if (fnArgs.raw && typeof fnArgs.raw === 'string') {
        const pathMatch = fnArgs.raw.match(/["']?(?:path|filename|file)["']?\s*[:=]\s*["']?([^"',}\s]+)["']?/i);
        if (pathMatch) fnArgs.path = pathMatch[1].trim();

        const contentMatch = fnArgs.raw.match(/["']?(?:content|text|body)["']?\s*[:=]\s*["']?([\s\S]*?)["']?\s*(?:,\s*["']?[a-z_]+["']?\s*[:=]|\}\s*$)/i);
        if (contentMatch) fnArgs.content = contentMatch[1];

        const cmdMatch = fnArgs.raw.match(/["']?(?:command|cmd)["']?\s*[:=]\s*["']?([^"']+)["']?/i);
        if (cmdMatch) fnArgs.command = cmdMatch[1].trim();
      }

      // Check safety guard
      const evaluation = safetyGuard.evaluateToolCall(fnName, fnArgs);

      // Auto-approval of related commands if user already approved previously in this session
      let baseCmd = fnName;
      if (fnName === 'bash') {
        const cmdStr = (fnArgs.command || fnArgs.cmd || '').trim();
        baseCmd = cmdStr.split(/\s+/)[0]?.replace(/^[./\\]+/, '').toLowerCase() || 'bash';
      }

      if (evaluation.needsApproval) {
        const isAlreadyApproved = sessionHasApproval && (
          sessionApprovedBinaries.has(baseCmd) ||
          sessionApprovedTools.has(fnName) ||
          (baseCmd === 'curl' && sessionApprovedBinaries.has('curl'))
        );

        if (isAlreadyApproved) {
          evaluation.needsApproval = false;
        }
      }

      const toolCallObj = {
        id: callId,
        name: fnName,
        tool: fnName,
        args: fnArgs,
        risk: { reason: evaluation.reason, level: evaluation.riskLevel },
      };

      // State: START / QUEUED
      await onEvent({
        type: 'tool_call_start',
        toolCallId: callId,
        tool: fnName,
        args: fnArgs,
        toolCall: toolCallObj,
        toolIndex: toolIndexInStep,
        totalTools: totalToolsInStep,
        step,
        maxSteps,
        needsApproval: evaluation.needsApproval,
        riskLevel: evaluation.riskLevel,
        reason: evaluation.reason,
      });

      // If approval is needed, pause and wait for user permission
      if (evaluation.needsApproval) {
        let approvalResolver;
        const approvalPromise = new Promise((resolve) => {
          approvalResolver = resolve;
        });

        const onAbort = () => {
          if (pendingApprovals.has(callId)) {
            pendingApprovals.delete(callId);
            approvalResolver(false);
          }
        };

        if (signal?.aborted) throw new Error('Operasi agent dihentikan oleh pengguna.');
        signal?.addEventListener('abort', onAbort, { once: true });

        pendingApprovals.set(callId, {
          resolve: (val) => {
            signal?.removeEventListener('abort', onAbort);
            approvalResolver(val);
          },
          toolCall: { name: fnName, args: fnArgs },
        });

        // Auto-timeout after 5 minutes if no response
        const timeoutId = setTimeout(() => {
          if (pendingApprovals.has(callId)) {
            pendingApprovals.delete(callId);
            signal?.removeEventListener('abort', onAbort);
            approvalResolver(false);
          }
        }, 5 * 60 * 1000);

        // State: WAITING APPROVAL - Emitted AFTER pendingApprovals has been set!
        await onEvent({
          type: 'tool_call_waiting_approval',
          toolCallId: callId,
          tool: fnName,
          args: fnArgs,
          toolCall: toolCallObj,
          toolIndex: toolIndexInStep,
          totalTools: totalToolsInStep,
          reason: evaluation.reason,
          thought: thoughtText || '',
          purpose: fnArgs.purpose || fnArgs.reason || '',
        });

        const approved = await approvalPromise;
        clearTimeout(timeoutId);

        if (signal?.aborted) {
          throw new Error('Operasi agent dihentikan oleh pengguna.');
        }

        if (approved) {
          sessionHasApproval = true;
          sessionApprovedTools.add(fnName);
          if (fnName === 'bash') {
            sessionApprovedBinaries.add(baseCmd);
          }
        } else {
          const rejectedResult = {
            error: 'Tindakan ini ditolak oleh pengguna. Silakan cari solusi alternatif atau jelaskan kepada pengguna.',
          };

          await onEvent({
            type: 'tool_call_rejected',
            toolCallId: callId,
            tool: fnName,
            args: fnArgs,
            toolCall: toolCallObj,
            toolIndex: toolIndexInStep,
            totalTools: totalToolsInStep,
            result: rejectedResult,
          });

          messages.push({
            role: 'tool',
            tool_call_id: callId,
            name: fnName,
            content: JSON.stringify(rejectedResult),
          });
          continue;
        }
      }

      // Special interactive tool: ask_user (dynamic choice menu)
      if (fnName === 'ask_user') {
        const question = fnArgs.question || 'Pilih salah satu opsi:';
        let options = Array.isArray(fnArgs.options) ? fnArgs.options : [];
        if (options.length === 0) {
          options = ['Ya, lanjutkan', 'Tidak, batalkan'];
        }

        const isApprovalConfirmation =
          /persetujuan|menyetujui|approve|konfirmasi|apakah anda|apakah kamu|izin|bolehkah|lanjutkan/i.test(question);
        const questionCmdMatch = question.match(/\b(curl|wget|npm|pnpm|yarn|git|pkill|kill|node|python|bash|sh|rm)\b/i);
        const questionCmd = questionCmdMatch ? questionCmdMatch[1].toLowerCase() : null;

        // Auto-approve if user already approved an initial command/task in this session
        if (sessionHasApproval && (isApprovalConfirmation || (questionCmd && sessionApprovedBinaries.has(questionCmd)))) {
          const autoSelected = options[0] || 'Ya, lanjutkan';
          const autoResult = {
            success: true,
            selected: autoSelected,
            index: 0,
            autoApproved: true,
          };

          if (questionCmd) {
            sessionApprovedBinaries.add(questionCmd);
          }

          await onEvent({
            type: 'tool_call_complete',
            toolCallId: callId,
            tool: fnName,
            args: fnArgs,
            result: {
              message: `Tindakan otomatis disetujui ("${autoSelected}") karena berkaitan dengan perintah yang telah disetujui pengguna sebelumnya.`,
            },
            step,
          });

          messages.push({
            role: 'tool',
            tool_call_id: callId,
            name: fnName,
            content: JSON.stringify(autoResult),
          });

          continue;
        }

        let choiceResolver;
        const choicePromise = new Promise((resolve) => {
          choiceResolver = resolve;
        });

        const onAbort = () => {
          if (pendingApprovals.has(callId)) {
            pendingApprovals.delete(callId);
            choiceResolver({ selected: 'Dibatalkan', index: -1, cancelled: true });
          }
        };

        if (signal?.aborted) return { success: false, selected: 'Dibatalkan' };
        signal?.addEventListener('abort', onAbort, { once: true });

        pendingApprovals.set(callId, {
          resolve: (val) => {
            signal?.removeEventListener('abort', onAbort);
            choiceResolver(val);
          },
          toolCall: { name: fnName, args: fnArgs },
        });

        await onEvent({
          type: 'tool_call_waiting_choice',
          toolCallId: callId,
          tool: fnName,
          question,
          options,
          step,
        });

        const chosen = await choicePromise;

        const isCancelled = chosen === false || Boolean(chosen?.cancelled);
        const selectedText = typeof chosen === 'string'
          ? chosen
          : (chosen?.selected || chosen?.label || (isCancelled ? (options[1] || 'Dibatalkan') : options[0]));
        const result = {
          success: !isCancelled,
          selected: selectedText,
          index: chosen?.index ?? (isCancelled ? 1 : 0),
        };

        if (!isCancelled && /^(ya|setuju|approve|lanjut|ok|yes|benar|bisa|silakan|gas)/i.test(selectedText)) {
          sessionHasApproval = true;
          sessionApprovedTools.add(fnName);
          if (questionCmd) {
            sessionApprovedBinaries.add(questionCmd);
          }
          const allCmds = question.match(/\b(curl|wget|npm|pnpm|yarn|git|pkill|kill|node|python|bash|sh|rm)\b/gi) || [];
          allCmds.forEach((c) => sessionApprovedBinaries.add(c.toLowerCase()));
        }

        await onEvent({
          type: 'tool_call_complete',
          toolCallId: callId,
          tool: fnName,
          args: fnArgs,
          result: { message: `Pengguna ${isCancelled ? 'menolak/membatalkan tindakan ini' : `memilih: "${selectedText}"`}` },
          step,
        });

        messages.push({
          role: 'tool',
          tool_call_id: callId,
          name: fnName,
          content: JSON.stringify(result),
        });

        continue;
      }

      const toolStartTime = Date.now();
      // State: RUNNING
      await onEvent({
        type: 'tool_call_running',
        toolCallId: callId,
        tool: fnName,
        args: fnArgs,
        toolCall: toolCallObj,
        toolIndex: toolIndexInStep,
        totalTools: totalToolsInStep,
        step,
      });

      const result = await executeTool(fnName, fnArgs);
      const durationMs = Date.now() - toolStartTime;

      // State: COMPLETE
      await onEvent({
        type: 'tool_call_complete',
        toolCallId: callId,
        tool: fnName,
        args: fnArgs,
        toolCall: toolCallObj,
        toolIndex: toolIndexInStep,
        totalTools: totalToolsInStep,
        durationMs,
        durationSec: (durationMs / 1000).toFixed(1),
        result,
        isError: Boolean(result?.error),
        step,
      });

      messages.push({
        role: 'tool',
        tool_call_id: callId,
        name: fnName,
        content: JSON.stringify(result) || '{}',
      });
    }

    // State: STEP_COMPLETED -> Finished executing tools for this step, proceed to next step
    await onEvent({
      type: 'agent_step_complete',
      step,
      maxSteps,
      toolsExecuted: totalToolsInStep,
      message: `Tahap ${step} selesai. Melanjutkan ke tahap berikutnya...`,
    });
  }

  const fallbackDone = finalAnswer || deriveDynamicToolSummary(messages, isVoiceMode) || (isVoiceMode ? 'Pemeriksaan sudah selesai nih bang.' : 'Pemeriksaan telah selesai.');
  await onEvent({
    type: 'agent_done',
    finalAnswer: fallbackDone,
    content: fallbackDone,
    chunk: fallbackDone,
    stepsCount: step,
  });

  return {
    success: true,
    finalAnswer: fallbackDone,
    stepsCount: step,
    messages,
  };
}
