// packages/web/src/utils/textCleaner.js
// Shared Indonesian prose formatter ensuring identical typographic quality between text chat and voice mode

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

  // 6. Prepositions squished with words/pronouns (e.g. denganAnda -> dengan Anda, untukAnda -> untuk Anda)
  const prepPattern = '\\b(dari|ke|di|pada|untuk|dengan|tanpa|dalam|hingga|sampai|mulai|serta|sebagai)';
  const nounPattern = '(penjelasan|perencanaan|kebutuhan|analisis|pemecahan|pertanyaan|pembuatan|pengembangan|pembelajaran|penggunaan|pelaksanaan|pekerjaan|bantuan|solusi|informasi|tugas|layanan|proses|topik|aspek|bidang|anda|kamu|kita|saya|mereka|siapa|apa|semua)';
  res = res.replace(new RegExp(prepPattern + nounPattern + '\\b', 'gi'), '$1 $2');

  // 7. Modal verbs squished with verbs (e.g. siapmembantu -> siap membantu, bisabantu -> bisa bantu)
  const modalPattern = '\\b(siap|dapat|bisa|akan|telah|sudah|sedang|ingin|harus|perlu|boleh)';
  const verbPattern = '(membantu|menjawab|menjelaskan|menganalisis|merancang|menyelesaikan|memberikan|menemukan|melakukan|bekerja|bantu|pakai|gunakan|bicara|dengar)';
  res = res.replace(new RegExp(modalPattern + verbPattern + '\\b', 'gi'), '$1 $2');

  // 8. Pronouns squished with words ("buatanyang" -> "buatan yang")
  res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,})(yang|ini|itu|tersebut)\b/gi, (match, p1, p2) => {
    if (/^(go|sa|la|wa|ba|pe|se)yang$/i.test(match)) return match;
    return `${p1} ${p2}`;
  });

  // 9. Dictionary of known glued Indonesian phrases
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
  ];

  for (const [re, repl] of SQUISHED_MAP) {
    res = res.replace(re, repl);
  }

  // 10. Normalize consecutive spaces
  res = res.replace(/[ \t]{2,}/g, ' ');

  // 11. Restore placeholders
  linkPlaceholders.forEach((link, idx) => {
    res = res.replace(`__MD_LINK_${idx}__`, link);
  });
  codePlaceholders.forEach((code, idx) => {
    res = res.replace(`__INLINE_CODE_${idx}__`, code);
  });

  return res.trim();
}
