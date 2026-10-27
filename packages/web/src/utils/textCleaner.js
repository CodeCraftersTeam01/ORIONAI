// packages/web/src/utils/textCleaner.js
// Shared Indonesian prose formatter ensuring clean spacing and typographic elegance

export function cleanIndonesianText(text) {
  if (!text || typeof text !== 'string') return text || '';

  // 1. Protect inline code `...`
  const codePlaceholders = [];
  let res = text.replace(/`([^`\n]+)`/g, (match) => {
    codePlaceholders.push(match);
    return `__INLINE_CODE_${codePlaceholders.length - 1}__`;
  });

  // 2. Protect markdown links [text](url)
  const linkPlaceholders = [];
  res = res.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (match) => {
    linkPlaceholders.push(match);
    return `__MD_LINK_${linkPlaceholders.length - 1}__`;
  });

  // 3. Punctuation spacing (exclamation, question mark, comma, semicolon, colon, period)
  res = res.replace(/([?!])([a-zA-Z0-9\u00C0-\u017F])/g, '$1 $2');
  res = res.replace(/,([a-zA-Z0-9\u00C0-\u017F])/g, ', $1');
  res = res.replace(/;([a-zA-Z0-9\u00C0-\u017F])/g, '; $1');
  res = res.replace(/(?<!https?|ftp|file|ws|wss):([a-zA-Z0-9\u00C0-\u017F])/g, ': $1');
  res = res.replace(/(?<=[a-zA-Z0-9\u00C0-\u017F])\.([A-Z\u00C0-\u017F])/g, '. $1');

  // 4. Em-dash and En-dash spacing
  res = res.replace(/([—–])(?=[^\s])/g, '$1 ').replace(/(?<=[^\s])([—–])/g, ' $1');

  // 5. Lowercase followed directly by Uppercase (CamelCase squished Indonesian prose)
  res = res.replace(/([a-z\u00C0-\u017F])([A-Z])/g, '$1 $2');

  // 6. Glued Relative Pronoun "yang":
  // e.g. yangdimasak -> yang dimasak, yangdibuat -> yang dibuat, yangdapat -> yang dapat
  res = res.replace(/\byang([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'yang $1');

  // 7. Glued Preposition "dengan":
  // Prefix: dengancara -> dengan cara, denganmudah -> dengan mudah, dengantingkat -> dengan tingkat
  res = res.replace(/\bdengan([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'dengan $1');
  // Suffix: disajikandengan -> disajikan dengan, berkaitandengan -> berkaitan dengan, samadengan -> sama dengan
  res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,})dengan\b/gi, '$1 dengan');

  // 8. Glued Preposition "untuk":
  // Prefix: untukmembuat -> untuk membuat, untukanak -> untuk anak
  res = res.replace(/\buntuk([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'untuk $1');
  // Suffix: bergunauntuk -> berguna untuk, cocokuntuk -> cocok untuk
  res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,})untuk\b/gi, '$1 untuk');

  // 9. Glued Linking Verbs "adalah" & "merupakan":
  // Prefix: adalahsebuah -> adalah sebuah, adalahsalah -> adalah salah
  res = res.replace(/\badalah([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'adalah $1');
  res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,})adalah\b/gi, '$1 adalah');
  res = res.replace(/\bmerupakan([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'merupakan $1');
  res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,})merupakan\b/gi, '$1 merupakan');

  // 10. Glued Adverbs & Conjunctions: "secara", "sebagai", "dalam", "tanpa":
  res = res.replace(/\bsecara([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'secara $1');
  res = res.replace(/\bsebagai([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'sebagai $1');
  res = res.replace(/\bdalam([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'dalam $1');
  res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,})dalam\b/gi, '$1 dalam');
  res = res.replace(/\btanpa([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'tanpa $1');

  // 11. Glued Preposition "pada" (preserving "padahal" and "padanan"):
  res = res.replace(/\bpada([a-zA-Z\u00C0-\u017F]{3,})\b/gi, (match, p1) => {
    if (/^(hal|nan)$/i.test(p1)) return match;
    return `pada ${p1}`;
  });

  // 12. Glued Agent Marker "oleh" (preserving "memperoleh"):
  res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,})oleh\b/gi, (match, p1) => {
    if (/^memper$/i.test(p1)) return match;
    return `${p1} oleh`;
  });

  // 13. Prepositions squished with common nouns/pronouns:
  const prepPattern = '\\b(dari|ke|di|pada|untuk|dengan|tanpa|dalam|hingga|sampai|mulai|serta|sebagai)';
  const nounPattern = '(penjelasan|perencanaan|kebutuhan|analisis|pemecahan|pertanyaan|pembuatan|pengembangan|pembelajaran|penggunaan|pelaksanaan|pekerjaan|bantuan|solusi|informasi|tugas|layanan|proses|topik|aspek|bidang|cara|tingkat|kematangan|rasa|selera|tujuan|anda|kamu|kita|saya|mereka|siapa|apa|semua)';
  res = res.replace(new RegExp(prepPattern + nounPattern + '\\b', 'gi'), '$1 $2');

  // 14. Modal verbs squished with verbs:
  const modalPattern = '\\b(siap|dapat|bisa|akan|telah|sudah|sedang|ingin|harus|perlu|boleh)';
  const verbPattern = '(membantu|menjawab|menjelaskan|menganalisis|merancang|menyelesaikan|memberikan|menemukan|melakukan|bekerja|bantu|pakai|gunakan|bicara|dengar|membuat|memasak|disajikan|dipanggang|digoreng)';
  res = res.replace(new RegExp(modalPattern + verbPattern + '\\b', 'gi'), '$1 $2');

  // 15. Suffix words: "buatanyang" -> "buatan yang", "halini" -> "hal ini"
  res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,})(yang|ini|itu|tersebut)\b/gi, (match, p1, p2) => {
    if (/^(go|sa|la|wa|ba|pe|se)yang$/i.test(match)) return match;
    return `${p1} ${p2}`;
  });

  // 15b. Squished weather, numbers, units, and compound prefixes
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

  // 16. Comprehensive dictionary of squished Indonesian phrases
  const SQUISHED_MAP = [
    [/\bSenangbertemudengan\b/gi, 'Senang bertemu dengan'],
    [/\bbertemudengan\b/gi, 'bertemu dengan'],
    [/\bSenangbertemu\b/gi, 'Senang bertemu'],
    [/\bdenganAnda\b/gi, 'dengan Anda'],
    [/\buntukAnda\b/gi, 'untuk Anda'],
    [/\bkeAnda\b/gi, 'ke Anda'],
    [/\bdiAnda\b/gi, 'di Anda'],
    [/\bsiapmembantu\b/gi, 'siap membantu'],
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
    [/\badalahasisten\b/gi, 'adalah asisten'],
    [/\bberbagaikebutuhan\b/gi, 'berbagai kebutuhan'],
    [/\bmulaidari\b/gi, 'mulai dari'],
    [/\bsampaidengan\b/gi, 'sampai dengan'],
    [/\bpadadasarnya\b/gi, 'pada dasarnya'],
    [/\bolehkarenaitu\b/gi, 'oleh karena itu'],
    [/\bolehsebabitu\b/gi, 'oleh sebab itu'],
    [/\bdandapat\b/gi, 'dan dapat'],
    [/\bdapatmembantu\b/gi, 'dapat membantu'],
    [/\bbisabantu\b/gi, 'bisa bantu'],
    [/\bsayabantu\b/gi, 'saya bantu'],
    [/\bhariini\b/gi, 'hari ini'],
    [/\bapakahada\b/gi, 'apakah ada'],
    [/\badayang\b/gi, 'ada yang'],
    [/\bsalahsatu\b/gi, 'salah satu'],
    [/\bcaramembuat\b/gi, 'cara membuat'],
    [/\bcaramemasak\b/gi, 'cara memasak'],
    [/\btingkatkematangan\b/gi, 'tingkat kematangan'],
    [/\bsesuaiselera\b/gi, 'sesuai selera'],
    [/\bdengancara\b/gi, 'dengan cara'],
    [/\byangdimasak\b/gi, 'yang dimasak'],
    [/\bdisajikandengan\b/gi, 'disajikan dengan'],
    [/\bfolderdiproyek\b/gi, 'folder di proyek'],
    [/\bdiproyek\b/gi, 'di proyek'],
    [/\bdiport\b/gi, 'di port'],
    [/\bdifolder\b/gi, 'di folder'],
    [/\bdifile\b/gi, 'di file'],
    [/\bTemplatelayoututama\b/gi, 'Template layout utama'],
    [/\blayoututama\b/gi, 'layout utama'],
    [/\bhalamanutama\b/gi, 'halaman utama'],
    [/\bEJSsederhana\b/gi, 'EJS sederhana'],
    [/\btemplatemenggunakan\b/gi, 'template menggunakan'],
    [/\bFoldertemplate\b/gi, 'Folder template'],
    [/\byangterinstall\b/gi, 'yang terpasang'],
    [/\bterinstall\b/gi, 'terpasang'],
    [/\bversidependency\b/gi, 'versi dependensi'],
    [/\b(sanbox|sanbox)\b/gi, 'sandbox'],
  ];

  for (const [re, repl] of SQUISHED_MAP) {
    res = res.replace(re, repl);
  }

  // 17. Number directly followed by alphabetic words: e.g. "2route" -> "2 route"
  res = res.replace(/(\d+)([a-zA-Z]{2,})/g, '$1 $2');

  // 18. Normalize consecutive spaces
  res = res.replace(/[ \t]{2,}/g, ' ');

  // 19. Restore placeholders
  linkPlaceholders.forEach((link, idx) => {
    res = res.replace(`__MD_LINK_${idx}__`, link);
  });
  codePlaceholders.forEach((code, idx) => {
    res = res.replace(`__INLINE_CODE_${idx}__`, code);
  });

  return res.trim();
}

/**
 * Formats any raw Agent or LLM output specifically for Voice Mode / TTS:
 * - Strips all markdown table pipes, headers, separators (|---|---|)
 * - Synthesizes extracted items/files into a natural spoken Indonesian sentence
 * - Prioritizes Summary / Kesimpulan blocks if present
 * - Strips code blocks, links, bullets, and technical markdown noise
 * - Normalizes squished words and technical terms for speech synthesis
 * - Limits length to 2-3 well-structured, natural spoken sentences
 */
export function formatVoiceForSpeechAndDisplay(rawText) {
  if (!rawText || typeof rawText !== 'string') return 'Instruksi telah selesai dijalankan.';

  let text = rawText.trim();

  // 1. Check for an explicit Summary / Ringkasan / Kesimpulan block
  const summaryRegex = /(?:ringkasan\s*(?:singkat)?|kesimpulan|rangkuman)\s*[:\-]\s*([\s\S]+)$/i;
  const summaryMatch = text.match(summaryRegex);

  // 2. Detect markdown tables & extract entity/file names
  const hasTable = text.includes('|');
  const extractedEntities = [];

  if (hasTable) {
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.includes('|')) {
        // Skip table separator line |---|---|
        if (/\|[\s\-:]+\|/.test(line)) continue;
        const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
        // Skip header row
        if (
          cells.length > 0 &&
          /^(nama|tipe|keterangan|file|folder|item|no|name|type|description|status)$/i.test(cells[0])
        ) {
          continue;
        }
        if (cells.length > 0 && cells[0].length < 40 && !cells[0].includes(' ') && !/^-+$/.test(cells[0])) {
          extractedEntities.push(cells[0]);
        }
      }
    }
  }

  // 3. Compose clean conversational text
  if (summaryMatch && summaryMatch[1]?.trim()) {
    let summaryContent = summaryMatch[1].trim();
    if (extractedEntities.length > 0) {
      const topFiles = extractedEntities.slice(0, 5).join(', ');
      text = `Berikut berkas dalam proyek: ${topFiles}. ${summaryContent}`;
    } else {
      text = summaryContent;
    }
  } else if (hasTable && extractedEntities.length > 0) {
    const topFiles = extractedEntities.slice(0, 6).join(', ');
    const moreCount = extractedEntities.length > 6 ? ` dan ${extractedEntities.length - 6} item lainnya` : '';
    text = `Berikut isi proyek yang ditemukan: ${topFiles}${moreCount}. Seluruh berkas telah siap diperiksa.`;
  }

  // 4. Strip table syntax, divider lines, and pipe characters
  text = text
    .replace(/\|[\s\-:]+\|[\s\-:|]*/g, ' ')
    .replace(/\|/g, ' ');

  // 5. Strip code blocks and inline code
  text = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1');

  // 6. Convert arrows, markdown links, and technical symbols
  text = text
    .replace(/\s*(?:->|=>)\s*/g, ' menuju ')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/[#*_~>]/g, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/\s*[-*•]\s+/g, ', ')
    .replace(/:\s*,/g, ':')
    .replace(/(?<=\s)\/([a-zA-Z0-9_-]+)/g, 'route $1')
    .replace(/(?<=\s)\/\s+menuju\b/g, 'route utama menuju');

  // 7. Fix numbers glued with words (e.g. "2route" -> "2 route", "3000Ada" -> "3000. Ada")
  text = text.replace(/(\d+)([a-zA-Z]{2,})/g, '$1 $2');

  // 8. Apply Indonesian text cleaner
  text = cleanIndonesianText(text);

  // 9. Normalize multiple spaces and line breaks to single space
  text = text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  // 10. Truncate to maximum 2 clean, punchy sentences for natural voice
  // Protect dots inside file extensions (e.g. index.js, layout.ejs) during sentence splitting
  const protectedText = text.replace(/([a-zA-Z0-9])\.([a-zA-Z0-9]{1,4})\b/g, '$1___DOT___$2');
  const sentences = protectedText.match(/[^.!?]+[.!?]+|\S+/g) || [protectedText];
  if (sentences.length > 2) {
    text = sentences.slice(0, 2).map((s) => s.replace(/___DOT___/g, '.').trim()).join(' ').trim();
  } else {
    text = text.replace(/___DOT___/g, '.').trim();
  }
  text = text.replace(/\s{2,}/g, ' ').trim();

  // Ensure valid terminal punctuation
  if (text && !/[.!?]$/.test(text)) {
    text += '.';
  }

  return text || 'Instruksi telah selesai dijalankan.';
}

