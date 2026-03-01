// Sound system with real audio files + Web Audio API synthesis

let audioContext: AudioContext | null = null;
let tickBuffer: AudioBuffer | null = null;
let tickTockBuffer: AudioBuffer | null = null;
let tickLoaded = false;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

// Preload real tick sounds from public/sounds/
async function loadSound(url: string): Promise<AudioBuffer | null> {
  try {
    const ctx = getAudioContext();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer);
  } catch (e) {
    console.warn("Failed to load sound:", url, e);
    return null;
  }
}

export async function preloadSounds() {
  if (tickLoaded) return;
  tickLoaded = true;
  const [tick, tock] = await Promise.all([
    loadSound("/sounds/tick-single.mp3"),
    loadSound("/sounds/tick-tock.mp3"),
  ]);
  tickBuffer = tick;
  tickTockBuffer = tock;
}

function playBuffer(buffer: AudioBuffer | null, volume = 0.5, playbackRate = 1) {
  if (!buffer) return;
  try {
    const ctx = getAudioContext();
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
  } catch {
    // Silently fail
  }
}

export function playTickSound(isWarning: boolean = false) {
  // Use real tick sound if loaded
  if (tickBuffer) {
    playBuffer(tickBuffer, isWarning ? 0.8 : 0.4, isWarning ? 1.3 : 1.0);
    // Add a synthetic urgent double-beat for warning
    if (isWarning) {
      setTimeout(() => playBuffer(tickBuffer, 0.6, 1.5), 120);
    }
    return;
  }

  // Fallback: Web Audio API synthesis
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(isWarning ? 1200 : 800, now);
    osc.frequency.exponentialRampToValueAtTime(isWarning ? 600 : 400, now + 0.06);
    gain.gain.setValueAtTime(isWarning ? 0.3 : 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(isWarning ? 2400 : 1600, now);
    osc2.frequency.exponentialRampToValueAtTime(isWarning ? 1000 : 800, now + 0.04);
    gain2.gain.setValueAtTime(isWarning ? 0.15 : 0.08, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.05);

    if (isWarning) {
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(1400, now + 0.12);
      osc3.frequency.exponentialRampToValueAtTime(700, now + 0.18);
      gain3.gain.setValueAtTime(0.2, now + 0.12);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.12);
      osc3.stop(now + 0.2);
    }
  } catch {
    // Silently fail
  }
}

export function playTimeUpSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Dramatic descending buzz
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.6);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);

    // Second voice for depth
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "square";
    osc2.frequency.setValueAtTime(400, now + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(80, now + 0.5);
    gain2.gain.setValueAtTime(0.12, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.5);
  } catch {
    // Silently fail
  }
}

export function playCorrectSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Triumphant ascending chime with richer harmonics
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const delay = i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + delay);
      gain.gain.setValueAtTime(0.25, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.3);

      // Harmonic overtone
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(freq * 2, now + delay);
      gain2.gain.setValueAtTime(0.08, now + delay);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + delay);
      osc2.stop(now + delay + 0.2);
    });
  } catch {
    // Silently fail
  }
}

export function playWrongSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.setValueAtTime(180, now + 0.15);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);

    // Dissonant second voice
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(155, now + 0.05);
    osc2.frequency.setValueAtTime(140, now + 0.2);
    gain2.gain.setValueAtTime(0.08, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.35);
  } catch {
    // Silently fail
  }
}
