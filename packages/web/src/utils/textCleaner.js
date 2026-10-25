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
  ];

  for (const [re, repl] of SQUISHED_MAP) {
    res = res.replace(re, repl);
  }

  // 17. Normalize consecutive spaces
  res = res.replace(/[ \t]{2,}/g, ' ');

  // 18. Restore placeholders
  linkPlaceholders.forEach((link, idx) => {
    res = res.replace(`__MD_LINK_${idx}__`, link);
  });
  codePlaceholders.forEach((code, idx) => {
    res = res.replace(`__INLINE_CODE_${idx}__`, code);
  });

  return res.trim();
}
