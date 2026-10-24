import React, { useState, useEffect, useMemo } from 'react';

/**
 * Curated list of thinking phrases tailored for each model and reasoning depth.
 * Begins with a clear initial indicator, then smoothly transitions into varied reasoning steps.
 */
const PHRASE_COLLECTIONS = {
  orion_high: [
    'Thinking deeply...',
    'Membedah prinsip dasar (first-principles)...',
    'Menganalisis arsitektur & trade-off...',
    'Mengevaluasi edge cases & implikasi...',
    'Memvalidasi ketajaman alur logika...',
    'Menyintesis pemikiran komprehensif...',
    'Merumuskan solusi mendalam...',
    'Menyempurnakan penjelasan terstruktur...',
  ],
  orion_medium: [
    'Thinking...',
    'Memahami konteks pertanyaan...',
    'Menghubungkan pola logika...',
    'Menganalisis sudut pandang...',
    'Merumuskan kerangka solusi...',
    'Menyusun jawaban terstruktur...',
    'Menyempurnakan penjelasan...',
    'Hampir selesai...',
  ],
  orion_low: [
    'Thinking...',
    'Menangkap inti pesan...',
    'Memproses poin utama...',
    'Menyiapkan jawaban praktis...',
    'Merangkai ringkasan cepat...',
  ],
  agnes: [
    'Agnes sedang berpikir...',
    'Menyelami ide & konteks...',
    'Merancang respons kreatif...',
    'Menyusun sudut pandang segar...',
    'Memoles narasi kalimat...',
    'Menyiapkan jawaban inspiratif...',
  ],
  'nemotron-3': [
    'Thinking...',
    'Menjalankan komputasi logika...',
    'Memvalidasi instruksi teknis...',
    'Mengoptimalkan struktur data...',
    'Menyusun jawaban presisi...',
    'Menyelesaikan kalkulasi...',
  ],
};

export default function ThinkingIndicator({ model = 'orion', reasoningTier = 'medium' }) {
  // Determine phrase collection based on model & tier
  const phrases = useMemo(() => {
    if (model === 'agnes') return PHRASE_COLLECTIONS.agnes;
    if (model === 'nemotron-3') return PHRASE_COLLECTIONS['nemotron-3'];
    if (reasoningTier === 'high') return PHRASE_COLLECTIONS.orion_high;
    if (reasoningTier === 'low') return PHRASE_COLLECTIONS.orion_low;
    return PHRASE_COLLECTIONS.orion_medium;
  }, [model, reasoningTier]);

  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    // Reset to start whenever model/tier changes
    setPhraseIndex(0);

    // Initial phrase shows for 1.8s, subsequent phrases transition every 2.3s
    let timeoutId;
    let intervalId;

    timeoutId = setTimeout(() => {
      setPhraseIndex(1 % phrases.length);

      intervalId = setInterval(() => {
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
      }, 2300);
    }, 1800);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [phrases]);

  const currentPhrase = phrases[phraseIndex] || phrases[0];

  return (
    <div className="thinking-row" role="status" aria-live="polite">
      <div className="thinking-dots">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
      <span
        key={phraseIndex}
        className="thinking-shine-text thinking-text-anim"
      >
        {currentPhrase}
      </span>
    </div>
  );
}
