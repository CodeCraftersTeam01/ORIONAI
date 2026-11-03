import fs from 'fs';
import os from 'os';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getActiveSkillsPromptSync } from './skillService.js';
import { getComboById, getNextRoundRobinModel } from './comboService.js';
import { detectLanguage } from '../utils/languageDetector.js';

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

const SYSTEM_PROMPT = `Identitas Anda adalah asisten kecerdasan kosmik Orion: santun, presisi, cerdas, dan sangat membantu. Jawablah secara terstruktur menggunakan Markdown yang rapi.

PANDUAN ADAPTASI BAHASA (LANGUAGE MATCHING RULE):
- WAJIB selalu sesuaikan bahasa jawaban dengan bahasa yang digunakan oleh pengguna dalam pertanyaan atau instruksinya.
- Bila pengguna bertanya atau menulis dalam Bahasa Inggris (English), Anda WAJIB menjawab sepenuhnya dalam Bahasa Inggris (English) yang fasih, alami, dan jelas.
- Bila pengguna bertanya dalam Bahasa Indonesia, jawablah dalam Bahasa Indonesia yang luwes, santun, dan jelas.
- Jika pengguna mencampur bahasa atau meminta bahasa tertentu secara eksplisit, prioritaskan permintaan eksplisit tersebut.

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
   - Jaga spasi alami antar kata dalam teks penjelasan (jangan menggabungkan kata atau membuat CamelCase seperti "Kenalijenis", "diBrowser", "SiapDipakai", selalu pisahkan dengan spasi: "Kenali jenis", "di browser", "siap dipakai").
8. Kerapihan Bahasa & Spasi:
   - WAJIB selalu gunakan spasi alami yang tepat antar setiap kata dalam bahasa yang digunakan (baik Bahasa Indonesia maupun Bahasa Inggris).
   - Selalu berikan tepat satu spasi setelah setiap tanda baca (titik, koma, tanda tanya, tanda seru, titik dua, titik koma). Contoh: 'Halo! Senang bertemu dengan Anda. Ada yang bisa saya bantu hari ini?' atau 'Hello! Glad to meet you. How can I assist you today?'
   - Selalu pisahkan kata dengan penegasan tebal menggunakan spasi. Contoh: 'Saya **Orion AI**, siap membantu...' atau 'I am **Orion AI**, ready to assist...'.`;

/**
 * Configure behavior, temperature, and system prompt according to selected model & reasoning tier
 */
export function getModelConfig(modelId = 'orion', reasoningTier = 'medium') {
  let normalizedModel = modelId || 'orion';
  let normalizedTier = reasoningTier || 'medium';

  // Strip provider prefix if present (e.g. orion::orion -> orion)
  if (typeof normalizedModel === 'string' && normalizedModel.includes('::')) {
    normalizedModel = normalizedModel.split('::')[1];
  }

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
  if (normalizedModel === 'agnes' || normalizedModel === 'agnes-2.5-flash' || (typeof normalizedModel === 'string' && normalizedModel.startsWith('agnes'))) {
    return {
      id: 'agnes-2.5-flash',
      name: 'Agnes 2.5 Flash',
      upstreamModel: AGNES_MODEL,
      temperature: 0.7,
      systemPromptExtra: `
[IDENTITAS: AGNES 2.5 FLASH]
Karakteristik & Perilaku:
1. Identitas Anda adalah AGNES 2.5 FLASH, asisten AI yang cerdas, lincah, ekspresif, hangat, dan kreatif.
2. Anda berfokus pada jawaban cepat, ramah, dan solutif tanpa penalaran bertingkat yang rumit. Jangan sebut diri Anda Orion; perkenalkan dan posisikan diri Anda sebagai Agnes.
3. Selalu gunakan tanda spasi yang benar antar kata dalam bahasa Indonesia. Selalu berikan spasi satu ketukan setelah tanda baca (contoh: 'hari ini? Ada yang bisa saya bantu?'). Tulislah setiap kata dan kalimat secara terpisah dan rapi.`,
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

export function cleanIndonesianText(text) {
  if (!text) return text;
  let res = text;

  // 1. Punctuation followed by letter/number without space
  res = res.replace(/([?!.,;:])([a-zA-Z0-9\u00C0-\u017F])/g, '$1 $2');

  // Space around parentheses: e.g. "Store(berisi" -> "Store (berisi", ")Tidak" -> ") Tidak"
  res = res.replace(/([a-zA-Z0-9\u00C0-\u017F])\(/g, '$1 (');
  res = res.replace(/\)([a-zA-Z0-9\u00C0-\u017F])/g, ') $1');

  // Colons and hyphens list formatting: e.g. "yaitu: -.DS_Store" -> "yaitu: - .DS_Store"
  res = res.replace(/:\s*-\s*([a-zA-Z0-9.])/g, ': - $1');
  res = res.replace(/(^|\s)-([a-zA-Z0-9.])/g, '$1- $2');

  // Clitic pronominal "-nya" glued with next word (e.g. "menyapanyalagi" -> "menyapanya lagi")
  res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,}nya)(lagi|dan|atau|di|ke|dari|pada|yang|ini|itu|bisa|dapat|sudah|telah|akan|juga|saja|tidak|belum|adalah|karena|untuk|dengan|tersebut|pun)\b/gi, '$1 $2');

  // Squished demonstratives and adverbs (e.g. "inihanyaada" -> "ini hanya ada")
  res = res.replace(/\b(ini|itu)(hanya|ada|adalah|berisi|terdiri|merupakan|bisa|dapat|satu|dua|tiga|file|folder|berkas|proyek|hasil|saja|juga|tidak|belum)/gi, '$1 $2');
  res = res.replace(/\b(hanya)(ada|satu|dua|tiga|berisi|file|folder|berkas|item|terdapat|ditemukan)/gi, '$1 $2');
  res = res.replace(/\b(ada)(satu|dua|tiga|empat|lima|file|folder|berkas|item|beberapa)/gi, '$1 $2');
  res = res.replace(/\b(satu|dua|tiga|empat|lima)(file|folder|berkas|item|buah|biji)/gi, '$1 $2');

  // Suffix prepositions glued with nouns (e.g. "folderdari" -> "folder dari")
  res = res.replace(/\b(folder|file|berkas|tampilan|isi|data|sistem|dokumen|bagian|hasil|catatan|kode|versi|pilihan|pengaturan|keluar|berasal|terdiri|mulai)dari\b/gi, '$1 dari');
  res = res.replace(/\b(folder|file|berkas|tampilan|isi|data|sistem|dokumen|bagian|hasil|catatan|kode|versi|pilihan|pengaturan)di\b/gi, '$1 di');
  res = res.replace(/\b(folder|file|berkas|tampilan|isi|data|sistem|dokumen|bagian|hasil|catatan|kode|versi|pilihan|pengaturan)ke\b/gi, '$1 ke');
  res = res.replace(/\b(folder|file|berkas|tampilan|isi|data|sistem|dokumen|bagian|hasil|catatan|kode|versi|pilihan|pengaturan)pada\b/gi, '$1 pada');

  // System/tech compound nouns (e.g. "sistemmac" -> "sistem mac")
  res = res.replace(/\b(sistem|os|perangkat|aplikasi|platform)(mac|macos|windows|linux|ios|android)\b/gi, '$1 $2');

  // Restore damaged system filenames: e.g. ".DSStore" -> ".DS_Store"
  res = res.replace(/\.DSStore\b/g, '.DS_Store');

  // 2. Dash/Em-dash spacing
  res = res.replace(/([—–])(?=[^\s])/g, '$1 ').replace(/(?<=[^\s])([—–])/g, ' $1');

  // 3. Lowercase followed immediately by Uppercase (CamelCase squish)
  res = res.replace(/([a-z\u00C0-\u017F])([A-Z])/g, '$1 $2');

  // 4. Space around markdown bold if glued
  res = res.replace(/([a-zA-Z0-9\u00C0-\u017F])(\*\*[^\*\n]+\*\*)/g, '$1 $2');
  res = res.replace(/(\*\*[^\*\n]+\*\*)([a-zA-Z0-9\u00C0-\u017F])/g, '$1 $2');

  // 5. Glued Relative Pronoun "yang"
  res = res.replace(/\byang([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'yang $1');

  // 6. Glued Preposition "dengan"
  res = res.replace(/\bdengan([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'dengan $1');
  res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,})dengan\b/gi, '$1 dengan');

  // 7. Glued Preposition "untuk"
  res = res.replace(/\buntuk([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'untuk $1');
  res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,})untuk\b/gi, '$1 untuk');

  // 8. Glued Linking Verbs "adalah" & "merupakan"
  res = res.replace(/\badalah([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'adalah $1');
  res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,})adalah\b/gi, '$1 adalah');
  res = res.replace(/\bmerupakan([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'merupakan $1');
  res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,})merupakan\b/gi, '$1 merupakan');

  // 9. Glued Adverbs & Prepositions: secara, sebagai, dalam, tanpa, pada, oleh
  res = res.replace(/\bsecara([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'secara $1');
  res = res.replace(/\bsebagai([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'sebagai $1');
  res = res.replace(/\bdalam([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'dalam $1');
  res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,})dalam\b/gi, '$1 dalam');
  res = res.replace(/\btanpa([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'tanpa $1');
  res = res.replace(/\bpada([a-zA-Z\u00C0-\u017F]{3,})\b/gi, (m, p1) => (/^(hal|nan)$/i.test(p1) ? m : `pada ${p1}`));
  res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,})oleh\b/gi, (m, p1) => (/^memper$/i.test(p1) ? m : `${p1} oleh`));

  // 10. Prepositions squished with words
  res = res.replace(/\b(dari|ke|di|pada|untuk|dengan|tanpa|dalam|hingga|sampai|mulai|serta)(penjelasan|perencanaan|kebutuhan|analisis|pemecahan|pertanyaan|pembuatan|pengembangan|pembelajaran|penggunaan|pelaksanaan|pekerjaan|cara|tingkat|kematangan|rasa|selera)\b/gi, '$1 $2');

  // 11. Modal verbs squished with verbs
  res = res.replace(/\b(siap|dapat|bisa|akan|telah|sudah|sedang|ingin)(membantu|menjawab|menjelaskan|menganalisis|merancang|menyelesaikan|memberikan|menemukan|melakukan)\b/gi, '$1 $2');

  // 12. Word squished with "yang"
  res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,})(yang|ini|itu|tersebut)\b/gi, (match, p1, p2) => {
    if (/^(go|sa|la|wa|ba|pe|se)yang$/i.test(match)) return match;
    return `${p1} ${p2}`;
  });

  // 13. Squished numbers, weather terms, units, and compound prefixes
  const idNumbers = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas', 'belas', 'puluh', 'ratus', 'ribu', 'juta'];
  const idUnits = ['derajat', 'celcius', 'celsius', 'fahrenheit', 'persen', 'kilometer', 'km', 'meter', 'jam', 'hari', 'bulan', 'tahun'];
  const idApprox = ['seperti', 'sekitar', 'antara', 'kurang', 'lebih', 'mencapai', 'berkisar', 'minimum', 'maksimum'];

  res = res.replace(/\b(ini)(suhunya|suhu|cuaca|kondisi|data)/gi, '$1 $2');
  res = res.replace(/(suhunya|suhu|minimum|maksimum)(sekitar|mencapai|adalah|berkisar)/gi, '$1 $2');
  res = res.replace(/(cuaca)(terbaru|terkini|hari|saat)/gi, '$1 $2');
  res = res.replace(/(saat)(ini)/gi, '$1 $2');
  res = res.replace(/(suhu)(terasa|maksimum|minimum|saat|rata)/gi, '$1 $2');
  res = res.replace(/(dari)(arah)/gi, '$1 $2');
  res = res.replace(/(kilometer|meter|mil)(per)/gi, '$1 $2');
  res = res.replace(/(per)(jam|hari|detik|bulan|tahun)/gi, '$1 $2');
  res = res.replace(/(berkisar)(antara)/gi, '$1 $2');
  res = res.replace(/(ke)(depan|belakang|bawah|atas)/gi, '$1 $2');

  const numRegex = new RegExp('(' + idNumbers.join('|') + ')(' + idNumbers.join('|') + ')', 'gi');
  res = res.replace(numRegex, '$1 $2');
  res = res.replace(numRegex, '$1 $2');

  const unitRegex = new RegExp('(' + idUnits.join('|') + ')(' + idUnits.join('|') + ')', 'gi');
  res = res.replace(unitRegex, '$1 $2');
  const numUnitRegex = new RegExp('(' + idNumbers.join('|') + ')(' + idUnits.join('|') + ')', 'gi');
  res = res.replace(numUnitRegex, '$1 $2');
  const unitNumRegex = new RegExp('(' + idUnits.join('|') + ')(' + idNumbers.join('|') + ')', 'gi');
  res = res.replace(unitNumRegex, '$1 $2');

  const approxNumRegex = new RegExp('(' + idApprox.join('|') + ')(' + idNumbers.join('|') + ')', 'gi');
  res = res.replace(approxNumRegex, '$1 $2');

  res = res.replace(new RegExp('(' + idUnits.join('|') + ')(ke)', 'gi'), '$1 $2');

  const SQUISHED_MAP = [
    [/\bSenangbertemudengan\b/gi, 'Senang bertemu dengan'],
    [/\bbertemudengan\b/gi, 'bertemu dengan'],
    [/\bSenangbertemu\b/gi, 'Senang bertemu'],
    [/\bselamatpagi\b/gi, 'Selamat pagi'],
    [/\bselamatsiang\b/gi, 'Selamat siang'],
    [/\bselamatsore\b/gi, 'Selamat sore'],
    [/\bselamatmalam\b/gi, 'Selamat malam'],
    [/\bselamatdatang\b/gi, 'Selamat datang'],
    [/\bterimakasih\b/gi, 'terima kasih'],
    [/\bsamadengan\b/gi, 'sama dengan'],
    [/\basistenkecerdasan\b/gi, 'asisten kecerdasan'],
    [/\bkecerdasanbuatan\b/gi, 'kecerdasan buatan'],
    [/\bbuatanyang\b/gi, 'buatan yang'],
    [/\byangsiap\b/gi, 'yang siap'],
    [/\bsiapmembantu\b/gi, 'siap membantu'],
    [/\badalahasisten\b/gi, 'adalah asisten'],
    [/\bberbagaikebutuhan\b/gi, 'berbagai kebutuhan'],
    [/\bdaripenjelasan\b/gi, 'dari penjelasan'],
    [/\bmulaidaripenjelasan\b/gi, 'mulai dari penjelasan'],
    [/\bmulaidari\b/gi, 'mulai dari'],
    [/\bhinggaperencanaan\b/gi, 'hingga perencanaan'],
    [/\bhinggasaat\b/gi, 'hingga saat'],
    [/\bsampaidengan\b/gi, 'sampai dengan'],
    [/\buntuktugas\b/gi, 'untuk tugas'],
    [/\buntukmembantu\b/gi, 'untuk membantu'],
    [/\bdengancara\b/gi, 'dengan cara'],
    [/\bdenganberbagai\b/gi, 'dengan berbagai'],
    [/\bpadadasarnya\b/gi, 'pada dasarnya'],
    [/\bolehkarenaitu\b/gi, 'oleh karena itu'],
    [/\bolehsebabitu\b/gi, 'oleh sebab itu'],
    [/\bdandapat\b/gi, 'dan dapat'],
    [/\bdapatmembantu\b/gi, 'dapat membantu'],
    [/\bbisabantu\b/gi, 'bisa bantu'],
    [/\bsayabantu\b/gi, 'saya bantu'],
    [/\bhariini\b/gi, 'hari ini'],
    [/\byangdimasak\b/gi, 'yang dimasak'],
    [/\bdisajikandengan\b/gi, 'disajikan dengan'],
    [/\btingkatkematangan\b/gi, 'tingkat kematangan'],
    [/\bsesuaiselera\b/gi, 'sesuai selera'],
    [/\bberbicarabahasa\b/gi, 'berbicara bahasa'],
    [/\bbahasainggris\b/gi, 'bahasa Inggris'],
    [/\bbahasaindonesia\b/gi, 'bahasa Indonesia'],
    [/\bbahasalainnya\b/gi, 'bahasa lainnya'],
    [/\bbisaberbicara\b/gi, 'bisa berbicara'],
    [/\bdapatberbicara\b/gi, 'dapat berbicara'],
    [/\bbisabanget\b/gi, 'bisa banget'],
    [/\bbisajuga\b/gi, 'bisa juga'],
    [/\bremotedesktop\b/gi, 'remote desktop'],
    [/\bkontroljarakjauh\b/gi, 'kontrol jarak jauh'],
    [/\bsudahterpasangaplikasi\b/gi, 'sudah terpasang aplikasi'],
    [/\bcukupketik\b/gi, 'cukup ketik'],
    [/\balamatIP\b/gi, 'alamat IP'],
    [/\batauhostname\b/gi, 'atau hostname'],
    [/\btargetdi\b/gi, 'target di'],
    [/\bingindihubungkan\b/gi, 'ingin dihubungkan'],
    [/\bmendukungstandar\b/gi, 'mendukung standar'],
    [/\bstandarVNC\b/gi, 'standar VNC'],
    [/\bHPAndroid\b/gi, 'HP Android'],
    [/\bCocokuntuk\b/gi, 'Cocok untuk'],
    [/\bcocokuntuk\b/gi, 'cocok untuk'],
    [/\bdariperangkat\b/gi, 'dari perangkat'],
    [/\bterminallain\b/gi, 'terminal lain'],
    [/\bTipssingkat\b/gi, 'Tips singkat'],
    [/\btipssingkat\b/gi, 'tips singkat'],
    [/\bSharingbawaan\b/gi, 'Sharing bawaan'],
    [/\bsharingbawaan\b/gi, 'sharing bawaan'],
    [/\bsimpledan\b/gi, 'simple dan'],
    [/\byanggratis\b/gi, 'yang gratis'],
    [/\buntukpersonal\b/gi, 'untuk personal'],
    [/\bChromeRemote\b/gi, 'Chrome Remote'],
    [/\bRemoteDesktop\b/gi, 'Remote Desktop'],
    [/\bScreenSharing\b/gi, 'Screen Sharing'],
    [/\bRemoteLogin\b/gi, 'Remote Login'],
  ];

  res = res.replace(/\b(berbicara|bicara)(bahasa)\b/gi, '$1 $2');
  res = res.replace(/\b(bahasa)(inggris|indonesia|lainnya|daerah|asing)\b/gi, '$1 $2');

  for (const [re, repl] of SQUISHED_MAP) {
    res = res.replace(re, repl);
  }

  res = res.replace(/[ \t]{2,}/g, ' ');
  return res;
}

/**
 * Sanitize text to guarantee correct identity & clean formatting
 */
export function sanitizeOrionText(text, modelId) {
  if (!text) return text;
  let sanitized = text;

  // Bila model Agnes yang dipilih, pertahankan identitas Agnes!
  if (modelId === 'agnes' || modelId === 'agnes-2.5-flash' || (typeof modelId === 'string' && modelId.startsWith('agnes'))) {
    sanitized = sanitized
      .replace(/\bSapiens AI\b/gi, 'Agnes AI')
      .replace(/developed by Sapiens AI/gi, 'powered by Agnes')
      .replace(/dikembangkan oleh Sapiens AI/gi, 'ditenagai oleh Agnes AI')
      .replace(/created by Sapiens AI/gi, 'powered by Agnes');
    return cleanIndonesianText(sanitized);
  }

  // Bila model Nemotron yang dipilih, pertahankan identitas Nemotron!
  if (modelId === 'nemotron-3' || (typeof modelId === 'string' && modelId.includes('nemotron'))) {
    sanitized = sanitized
      .replace(/\bSapiens AI\b/gi, 'Nemotron')
      .replace(/developed by Sapiens AI/gi, 'powered by Nemotron')
      .replace(/dikembangkan oleh Sapiens AI/gi, 'ditenagai oleh Nemotron')
      .replace(/created by Sapiens AI/gi, 'powered by Nemotron');
    return cleanIndonesianText(sanitized);
  }

  // Untuk model Orion, terapkan sanitasi standar Orion
  sanitized = sanitized
    .replace(/\bAgnes\b/gi, 'Orion AI')
    .replace(/\bSapiens AI\b/gi, 'Orion AI')
    .replace(/developed by Sapiens AI/gi, 'powered by Orion')
    .replace(/dikembangkan oleh Sapiens AI/gi, 'ditenagai oleh Orion AI')
    .replace(/created by Sapiens AI/gi, 'powered by Orion');

  return cleanIndonesianText(sanitized);
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

  const skillsPrompt = getActiveSkillsPromptSync();
  const userLang = detectLanguage(message);
  let langDirective = '';
  if (userLang === 'en') {
    langDirective = `\n\n[CRITICAL MULTILINGUAL INSTRUCTION - ENGLISH]:
The user's question or message is in English. You MUST respond completely in natural, fluent, and precise English. Do NOT answer in Indonesian!`;
  }
  const fullSystemPrompt = `${SYSTEM_PROMPT}\n${modelConfig.systemPromptExtra}${skillsPrompt ? `\n${skillsPrompt}` : ''}${langDirective}`;

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
export function resolveEndpointAndHeaders(customProvider, config, userOrionApiKey) {
  let targetUrl;
  let targetApiKey;
  let targetModel;
  let temperature = 0.7;

  if (customProvider && customProvider.baseUrl) {
    const cleanBase = customProvider.baseUrl.trim().replace(/\/+$/, '');
    targetUrl = cleanBase.endsWith('/chat/completions') ? cleanBase : `${cleanBase}/chat/completions`;
    targetApiKey = customProvider.apiKey ? customProvider.apiKey.trim() : '';

    // Fallback to server env or userOrionApiKey for official provider
    if (!targetApiKey && (customProvider.id === 'orion' || customProvider.name?.toLowerCase().includes('orion') || customProvider.templateId === 'orion')) {
      targetApiKey = (userOrionApiKey && userOrionApiKey.trim()) || (API_KEY && API_KEY.trim()) || '';
    }

    targetModel = customProvider.modelId || config.upstreamModel || 'default';
    if (customProvider.temperature !== undefined && customProvider.temperature !== null) {
      temperature = Number(customProvider.temperature);
    } else {
      temperature = config.temperature;
    }

    if (!targetApiKey && (customProvider.requiresApiKey || customProvider.id === 'orion' || customProvider.name?.toLowerCase().includes('orion'))) {
      throw new Error(
        '⚠️ API Key untuk provider ini belum dimasukkan atau tidak valid. Silakan buka menu Provider dan periksa kembali API Key Anda.'
      );
    }
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

const orionConfigDir = path.join(os.homedir(), '.orion');
const providersConfigFile = path.join(orionConfigDir, 'providers.json');
const credentialsFile = path.join(orionConfigDir, 'credentials.json');

/**
 * Dynamically resolves provider endpoint and credentials for any model identifier
 */
export function resolveProviderForModel(modelId, userOrionApiKey = null) {
  if (!modelId) return null;

  let savedApiKey = (userOrionApiKey && userOrionApiKey.trim()) || API_KEY || '';
  if (fs.existsSync(credentialsFile)) {
    try {
      const creds = JSON.parse(fs.readFileSync(credentialsFile, 'utf8'));
      if (creds.apiKey) savedApiKey = creds.apiKey;
    } catch {}
  }

  let providers = [];
  if (fs.existsSync(providersConfigFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(providersConfigFile, 'utf8'));
      providers = data.providers || [];
    } catch {}
  }

  let provId = null;
  let modId = modelId;

  if (modelId.includes('::')) {
    const parts = modelId.split('::');
    provId = parts[0];
    modId = parts.slice(1).join('::');
  }

  if (provId) {
    const parentProv = providers.find((p) => p.id === provId);
    if (parentProv) {
      let activeKey = parentProv.apiKeys?.find((k) => k.active)?.key || parentProv.apiKey || '';
      if (!activeKey && (provId === 'orion' || parentProv.templateId === 'orion' || parentProv.name?.toLowerCase().includes('official'))) {
        activeKey = savedApiKey;
      }
      return {
        id: parentProv.id,
        baseUrl: parentProv.baseUrl,
        apiKey: activeKey,
        modelId: modId,
        name: parentProv.name,
        requiresApiKey: parentProv.requiresApiKey,
      };
    }
  }

  // Search models array across providers
  for (const p of providers) {
    const match = (p.models || []).find((m) => (typeof m === 'string' ? m === modId : m.id === modId));
    if (match) {
      let activeKey = p.apiKeys?.find((k) => k.active)?.key || p.apiKey || '';
      if (!activeKey && (p.id === 'orion' || p.templateId === 'orion' || p.name?.toLowerCase().includes('official'))) {
        activeKey = savedApiKey;
      }
      return {
        id: p.id,
        baseUrl: p.baseUrl,
        apiKey: activeKey,
        modelId: modId,
        name: p.name,
        requiresApiKey: p.requiresApiKey,
      };
    }
  }

  // Default Orion official fallback
  return {
    id: 'orion',
    baseUrl: BASE_URL,
    apiKey: savedApiKey,
    modelId: modId,
    name: 'Orion AI',
    requiresApiKey: true,
  };
}

/**
 * Internal single-model Non-Streaming Chat Completion
 */
async function getChatCompletionInternal({
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
 * Execute Combo Strategies for Non-Streaming Completion
 */
async function executeComboChatCompletion({
  combo,
  message,
  history = [],
  attachments = [],
  reasoningTier = 'medium',
  orionApiKey = null,
  signal,
}) {
  const strategy = combo.strategy || 'fallback';

  if (strategy === 'round_robin') {
    const selectedModel = getNextRoundRobinModel(combo);
    const resolvedProv = resolveProviderForModel(selectedModel, orionApiKey);
    const result = await getChatCompletionInternal({
      message,
      history,
      attachments,
      model: selectedModel,
      reasoningTier,
      customProvider: resolvedProv,
      orionApiKey,
      signal,
    });
    return {
      ...result,
      model: `${combo.name} [Round Robin: ${selectedModel}]`,
    };
  }

  if (strategy === 'fallback') {
    let lastError = null;
    for (let i = 0; i < combo.models.length; i++) {
      const candidateModel = combo.models[i];
      try {
        const resolvedProv = resolveProviderForModel(candidateModel, orionApiKey);
        const result = await getChatCompletionInternal({
          message,
          history,
          attachments,
          model: candidateModel,
          reasoningTier,
          customProvider: resolvedProv,
          orionApiKey,
          signal,
        });
        return {
          ...result,
          model: `${combo.name} [Fallback: ${candidateModel}]`,
        };
      } catch (err) {
        lastError = err;
        console.warn(`[COMBO FALLBACK] Model ${candidateModel} failed: ${err.message}. Trying next candidate...`);
      }
    }
    throw new Error(`Semua model dalam combo "${combo.name}" gagal merespons. Error terakhir: ${lastError?.message || 'Unknown error'}`);
  }

  if (strategy === 'fusion') {
    // 1. Run all panel models in parallel
    const panelPromises = combo.models.map(async (panelModel) => {
      try {
        const resolvedProv = resolveProviderForModel(panelModel, orionApiKey);
        const res = await getChatCompletionInternal({
          message,
          history,
          attachments,
          model: panelModel,
          reasoningTier,
          customProvider: resolvedProv,
          orionApiKey,
          signal,
        });
        return { model: panelModel, reply: res.reply };
      } catch (err) {
        console.warn(`[COMBO FUSION] Panel model ${panelModel} error: ${err.message}`);
        return null;
      }
    });

    const results = await Promise.all(panelPromises);
    const validResults = results.filter(Boolean);

    if (validResults.length === 0) {
      throw new Error(`Semua model panel dalam combo "${combo.name}" gagal merespons.`);
    }

    if (validResults.length === 1) {
      return {
        reply: validResults[0].reply,
        model: `${combo.name} [Fusion: ${validResults[0].model}]`,
        source: 'combo-fusion',
      };
    }

    // 2. Synthesize with Judge Model
    const judgeModel = combo.judge || combo.models[0] || 'orion::orion';
    const resolvedJudgeProv = resolveProviderForModel(judgeModel, orionApiKey);

    const judgePrompt = `Berikut adalah hasil tanggapan dari beberapa model AI panel mengenai pertanyaan pengguna:

[PERMINTAAN PENGGUNA]:
${message}

--- DRAF TANGGAPAN PANEL ---
${validResults.map((r, idx) => `[Panel ${idx + 1} - Model ${r.model}]:\n${r.reply}`).join('\n\n---\n\n')}

[PERAN ANDA SEBAGAI MODEL JURI & SINTESIS]:
Analisis seluruh draf panel di atas. Gabungkan fakta dan gagasan terakurat, perbaiki kesalahan, dan buatlah SATU jawaban akhir yang utuh, berstruktur rapi, elegan, dan paling memuaskan untuk pengguna. Jangan sebutkan proses penjurian atau nama-nama panel di jawaban akhir; sajikan langsung respon terbaiknya.`;

    const synthesis = await getChatCompletionInternal({
      message: judgePrompt,
      history: [],
      attachments: [],
      model: judgeModel,
      reasoningTier,
      customProvider: resolvedJudgeProv,
      orionApiKey,
      signal,
    });

    return {
      reply: synthesis.reply,
      model: `${combo.name} [Fusion: ${validResults.length} models -> Judge: ${judgeModel}]`,
      source: 'combo-fusion',
    };
  }

  throw new Error(`Strategi combo "${strategy}" tidak dikenali.`);
}

/**
 * Public Non-Streaming Chat Completion (with Combo Router Support)
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
  const combo = getComboById(model);
  if (combo) {
    return executeComboChatCompletion({
      combo,
      message,
      history,
      attachments,
      reasoningTier,
      orionApiKey,
      signal,
    });
  }

  return getChatCompletionInternal({
    message,
    history,
    attachments,
    model,
    reasoningTier,
    customProvider,
    orionApiKey,
    signal,
  });
}

/**
 * Internal single-model Streaming Chat Completion (SSE)
 */
async function streamChatCompletionInternal({
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
  try {
    const { messages, config } = buildMessagesPayload({ message, history, attachments, modelId: model, reasoningTier });
    const { targetUrl, headers, targetModel, temperature } = resolveEndpointAndHeaders(customProvider, config, orionApiKey);
    if (process.env.DEBUG_AI) {
      console.log(`[AI STREAM] Routing request -> modelId: "${model}", targetModel: "${targetModel}", targetUrl: "${targetUrl}"`);
    }

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
          if (typeof onDone === 'function') onDone();
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

    if (typeof onDone === 'function') onDone();
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error('[AI STREAM ERROR]:', err.message);
    if (typeof onError === 'function') {
      onError(err);
    } else {
      throw err;
    }
  }
}

/**
 * Execute Combo Strategies for Streaming Completion (SSE)
 */
async function executeComboStreamCompletion({
  combo,
  message,
  history = [],
  attachments = [],
  reasoningTier = 'medium',
  orionApiKey = null,
  onChunk,
  onDone,
  onError,
  signal,
}) {
  const strategy = combo.strategy || 'fallback';

  if (strategy === 'round_robin') {
    const selectedModel = getNextRoundRobinModel(combo);
    const resolvedProv = resolveProviderForModel(selectedModel, orionApiKey);
    return streamChatCompletionInternal({
      message,
      history,
      attachments,
      model: selectedModel,
      reasoningTier,
      customProvider: resolvedProv,
      orionApiKey,
      onChunk,
      onDone,
      onError,
      signal,
    });
  }

  if (strategy === 'fallback') {
    let lastError = null;
    let didEmitAnyChunk = false;

    for (let i = 0; i < combo.models.length; i++) {
      const candidateModel = combo.models[i];
      try {
        const resolvedProv = resolveProviderForModel(candidateModel, orionApiKey);
        let currentChunkCount = 0;

        await new Promise((resolve, reject) => {
          streamChatCompletionInternal({
            message,
            history,
            attachments,
            model: candidateModel,
            reasoningTier,
            customProvider: resolvedProv,
            orionApiKey,
            onChunk: (chunk) => {
              currentChunkCount++;
              didEmitAnyChunk = true;
              onChunk(chunk);
            },
            onDone: () => {
              resolve();
            },
            onError: (err) => {
              if (currentChunkCount === 0) {
                // Not emitted anything yet, can safely fail over to next model
                reject(err);
              } else {
                // Already started streaming chunks to client, propagate error
                if (typeof onError === 'function') onError(err);
                resolve();
              }
            },
            signal,
          }).catch(reject);
        });

        // Finished successfully
        if (typeof onDone === 'function') onDone();
        return;
      } catch (err) {
        lastError = err;
        console.warn(`[COMBO STREAM FALLBACK] Model ${candidateModel} failed: ${err.message}. Trying next candidate...`);
        if (didEmitAnyChunk) {
          // If we already sent chunks to user, do not fallback to avoid garbled mix
          break;
        }
      }
    }

    const finalErr = new Error(`Semua model dalam combo "${combo.name}" gagal merespons. Error: ${lastError?.message || 'Unknown error'}`);
    if (typeof onError === 'function') {
      onError(finalErr);
    } else {
      throw finalErr;
    }
    return;
  }

  if (strategy === 'fusion') {
    // Notify user of parallel panel execution
    onChunk(`*[Fusion Router: Mengumpulkan analisis dari ${combo.models.length} model panel...]*\n\n`);

    const panelPromises = combo.models.map(async (panelModel) => {
      try {
        const resolvedProv = resolveProviderForModel(panelModel, orionApiKey);
        const res = await getChatCompletionInternal({
          message,
          history,
          attachments,
          model: panelModel,
          reasoningTier,
          customProvider: resolvedProv,
          orionApiKey,
          signal,
        });
        return { model: panelModel, reply: res.reply };
      } catch (err) {
        console.warn(`[COMBO FUSION STREAM] Panel model ${panelModel} error: ${err.message}`);
        return null;
      }
    });

    const results = await Promise.all(panelPromises);
    const validResults = results.filter(Boolean);

    if (validResults.length === 0) {
      const err = new Error(`Semua model panel dalam combo "${combo.name}" gagal merespons.`);
      if (typeof onError === 'function') onError(err);
      return;
    }

    if (validResults.length === 1) {
      onChunk(validResults[0].reply);
      if (typeof onDone === 'function') onDone();
      return;
    }

    // Synthesize using Judge model
    const judgeModel = combo.judge || combo.models[0] || 'orion::orion';
    const resolvedJudgeProv = resolveProviderForModel(judgeModel, orionApiKey);

    const judgePrompt = `Berikut adalah hasil draf tanggapan dari beberapa model AI panel mengenai pertanyaan pengguna:

[PERMINTAAN PENGGUNA]:
${message}

--- DRAF TANGGAPAN PANEL ---
${validResults.map((r, idx) => `[Panel ${idx + 1} - Model ${r.model}]:\n${r.reply}`).join('\n\n---\n\n')}

[PERAN ANDA SEBAGAI MODEL JURI & SINTESIS]:
Analisis seluruh draf panel di atas. Gabungkan fakta terakurat, perbaiki kesalahan, dan buatlah SATU jawaban akhir yang utuh, berstruktur rapi, elegan, dan paling memuaskan untuk pengguna. Jangan sebutkan proses penjurian atau nama-nama panel di jawaban akhir; sajikan langsung respon terbaiknya.`;

    return streamChatCompletionInternal({
      message: judgePrompt,
      history: [],
      attachments: [],
      model: judgeModel,
      reasoningTier,
      customProvider: resolvedJudgeProv,
      orionApiKey,
      onChunk,
      onDone,
      onError,
      signal,
    });
  }

  const err = new Error(`Strategi combo "${strategy}" tidak dikenali.`);
  if (typeof onError === 'function') onError(err);
}

/**
 * Public Streaming Chat Completion (SSE) (with Combo Router Support)
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
  const combo = getComboById(model);
  if (combo) {
    return executeComboStreamCompletion({
      combo,
      message,
      history,
      attachments,
      reasoningTier,
      orionApiKey,
      onChunk,
      onDone,
      onError,
      signal,
    });
  }

  return streamChatCompletionInternal({
    message,
    history,
    attachments,
    model,
    reasoningTier,
    customProvider,
    orionApiKey,
    onChunk,
    onDone,
    onError,
    signal,
  });
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
  const timeoutId = setTimeout(() => controller.abort(), 45000);

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
      let parsedMsg = '';
      try {
        const parsed = JSON.parse(errText);
        parsedMsg = parsed.error?.message || (typeof parsed.error === 'string' ? parsed.error : null) || parsed.message || '';
      } catch {}

      if (res.status === 401 || res.status === 403 || /unauthorized|api\s*key|kredensial|token/i.test(parsedMsg || errText)) {
        throw new Error('API Key belum diisi atau tidak valid (Akses ditolak). Silakan tambahkan API Key yang benar pada menu "API Keys" di atas.');
      }
      if (res.status === 404) {
        throw new Error(`Model "${modelId}" tidak ditemukan atau tidak tersedia di server provider.`);
      }
      throw new Error(parsedMsg || `HTTP ${res.status}: Gagal memverifikasi model`);
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
