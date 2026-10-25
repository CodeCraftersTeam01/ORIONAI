// packages/web/src/utils/audioEffects.js
// High-fidelity Web Audio API synthesizer for cosmic UI effects

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx) {
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Synthesizes the ambient "eeeennnngg" cosmic portal swell sound requested by the user.
 * Combines warm sub-harmonics, resonant lowpass filter sweep, and detuned celestial beating.
 */
export function playCosmicHumSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Master envelope for swell
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.26, now + 0.45); // Smooth crescendo swell
    masterGain.gain.exponentialRampToValueAtTime(0.10, now + 1.3);
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
    oscShimmer.frequency.linearRampToValueAtTime(221.8, now + 1.6); // Subtle beating

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
  } catch (err) {
    console.warn('Audio effect error:', err);
  }
}

/**
 * Soft ending chime when voice call session closes
 */
export function playCosmicEndCallSound() {
  try {
    const ctx = getAudioContext();
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
  } catch {}
}
