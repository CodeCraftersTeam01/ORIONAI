// packages/web/src/utils/audioEffects.js
// High-fidelity Web Audio API synthesizer for cosmic UI effects

function createAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  } catch (e) {
    console.warn('AudioContext creation error:', e);
    return null;
  }
}

/**
 * Synthesizes the ambient "eeeennnngg" cosmic portal swell sound requested by the user.
 * Combines warm sub-harmonics, resonant lowpass filter sweep, and detuned celestial beating.
 * Creates a dedicated AudioContext each time to ensure it plays reliably on every button press
 * across all browsers (including Safari and iOS WebKit) without being blocked or muted.
 */
export function playCosmicHumSound() {
  try {
    const ctx = createAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Master envelope for gentle, cozy swell (safe for all speakers)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(0.045, now + 0.38); // Gentle soft swell
    masterGain.gain.exponentialRampToValueAtTime(0.015, now + 1.1);
    masterGain.gain.exponentialRampToValueAtTime(0.00005, now + 2.2); // Warm gentle fade

    // Warm Lowpass filter sweep without harsh resonance
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1.2; // Soft, smooth resonance (won't clip or buzz speakers)
    filter.frequency.setValueAtTime(160, now);
    filter.frequency.exponentialRampToValueAtTime(540, now + 0.6);
    filter.frequency.exponentialRampToValueAtTime(220, now + 2.0);

    // Oscillator 1: Warm sub drone with smooth triangle wave (no harsh sawtooth harmonics)
    const oscSub = ctx.createOscillator();
    oscSub.type = 'triangle';
    oscSub.frequency.setValueAtTime(96, now);
    oscSub.frequency.exponentialRampToValueAtTime(110, now + 0.7);

    // Oscillator 2: Radiant fifth harmonic (E3 ~164.8 Hz)
    const oscFifth = ctx.createOscillator();
    oscFifth.type = 'sine';
    oscFifth.frequency.setValueAtTime(146.8, now);
    oscFifth.frequency.exponentialRampToValueAtTime(164.8, now + 0.7);

    // Oscillator 3: Shimmering octave (A3 ~220 Hz)
    const oscShimmer = ctx.createOscillator();
    oscShimmer.type = 'sine';
    oscShimmer.frequency.setValueAtTime(220, now);
    oscShimmer.frequency.linearRampToValueAtTime(221.5, now + 1.4);

    oscSub.connect(filter);
    oscFifth.connect(filter);
    oscShimmer.connect(filter);

    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    oscSub.start(now);
    oscFifth.start(now);
    oscShimmer.start(now);

    oscSub.stop(now + 2.3);
    oscFifth.stop(now + 2.3);
    oscShimmer.stop(now + 2.3);

    // Clean up AudioContext once playback concludes to free system audio channels
    setTimeout(() => {
      try {
        if (ctx && ctx.state !== 'closed') {
          ctx.close().catch(() => {});
        }
      } catch {}
    }, 2500);
  } catch (err) {
    console.warn('Audio effect error:', err);
  }
}

/**
 * Soft ending chime when voice call session closes
 */
export function playCosmicEndCallSound() {
  try {
    const ctx = createAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.035, now + 0.05); // Very soft and pleasant
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(329.63, now); // E4
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.5); // A3

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.75);

    setTimeout(() => {
      try {
        if (ctx && ctx.state !== 'closed') {
          ctx.close().catch(() => {});
        }
      } catch {}
    }, 900);
  } catch {}
}
