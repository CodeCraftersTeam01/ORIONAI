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

    // Master envelope for swell
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.28, now + 0.42); // Smooth crescendo swell
    masterGain.gain.exponentialRampToValueAtTime(0.12, now + 1.2);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5); // Long ethereal tail

    // Resonant Lowpass filter sweep: creates the signature "eeeennnngg" opening texture
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 3.2; // Warm resonance
    filter.frequency.setValueAtTime(140, now);
    filter.frequency.exponentialRampToValueAtTime(780, now + 0.65); // "eeeee" opening sweep
    filter.frequency.exponentialRampToValueAtTime(260, now + 2.2);  // "nnnng" settling body

    // Oscillator 1: Warm sub drone (A2 ~110 Hz)
    const oscSub = ctx.createOscillator();
    oscSub.type = 'sawtooth';
    oscSub.frequency.setValueAtTime(96, now);
    oscSub.frequency.exponentialRampToValueAtTime(110, now + 0.8);

    // Oscillator 2: Radiant fifth harmonic (E3 ~164.8 Hz)
    const oscFifth = ctx.createOscillator();
    oscFifth.type = 'triangle';
    oscFifth.frequency.setValueAtTime(146.8, now);
    oscFifth.frequency.exponentialRampToValueAtTime(164.8, now + 0.8);

    // Oscillator 3: Shimmering octave (A3 ~220 Hz)
    const oscShimmer = ctx.createOscillator();
    oscShimmer.type = 'sine';
    oscShimmer.frequency.setValueAtTime(220, now);
    oscShimmer.frequency.linearRampToValueAtTime(221.8, now + 1.6); // Subtle celestial beating

    oscSub.connect(filter);
    oscFifth.connect(filter);
    oscShimmer.connect(filter);

    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    oscSub.start(now);
    oscFifth.start(now);
    oscShimmer.start(now);

    oscSub.stop(now + 2.6);
    oscFifth.stop(now + 2.6);
    oscShimmer.stop(now + 2.6);

    // Clean up AudioContext once playback concludes to free system audio channels
    setTimeout(() => {
      try {
        if (ctx && ctx.state !== 'closed') {
          ctx.close().catch(() => {});
        }
      } catch {}
    }, 2800);
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
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

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
