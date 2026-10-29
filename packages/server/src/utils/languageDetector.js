/**
 * Language Detector for Adaptive Multilingual Responses
 * Accurately determines if the user is asking in English, Indonesian, or another language
 */
export function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'id';
  const clean = text.toLowerCase().trim();

  // 1. Direct explicit phrases or questions starting in English
  if (
    /^(can you|could you|would you|do you|are you|what|how|why|where|when|who|is|tell me|explain|please|hello|hi|hey|good morning|good afternoon|good evening|thanks|thank you)\b/i.test(clean) ||
    /\b(speak english|in english|talk in english|english please|can speak)\b/i.test(clean)
  ) {
    return 'en';
  }

  // 2. Direct explicit Indonesian question/greeting starters
  if (
    /^(apakah|kamu|bisa|tolong|bagaimana|gimana|kenapa|mengapa|dimana|kapan|siapa|halo|hai|pagi|siang|sore|malam|apa kabar|coba|buatkan|bikin|jelaskan|cek|periksa)\b/i.test(clean)
  ) {
    return 'id';
  }

  // 3. Keyword frequency scoring
  const enPatterns = [
    /\b(can|could|would|please|what|how|why|where|when|who|is|are|am|was|were|the|and|or|for|with|from|this|that|your|my|you|we|they|it|have|has|do|does|did|will|help|weather|today|now|speak|english)\b/gi,
  ];

  const idPatterns = [
    /\b(apakah|bisa|tolong|bagaimana|kenapa|mengapa|dimana|kapan|siapa|halo|hai|dan|atau|untuk|dengan|dari|ini|itu|kamu|saya|aku|kita|mereka|ada|sudah|telah|akan|bantu|cuaca|hari ini|sekarang|bicara|indonesia)\b/gi,
  ];

  let enScore = 0;
  for (const p of enPatterns) {
    const m = clean.match(p);
    if (m) enScore += m.length;
  }

  let idScore = 0;
  for (const p of idPatterns) {
    const m = clean.match(p);
    if (m) idScore += m.length;
  }

  if (enScore > idScore) return 'en';
  if (idScore > enScore) return 'id';

  // Fallback: check for dominant English stopwords
  if (/\b(the|is|are|you|how|what|we|my|and)\b/i.test(clean)) return 'en';

  return 'id';
}
