// Generate sounds using Web Audio API - no external files needed

let audioCtx: AudioContext | null = null;
let lastHiddenAt = 0;
let brownNoiseLastVolume = 0.15;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Destroy the AudioContext and create a fresh one.
// This forces the browser to re-establish the connection to the audio device,
// which fixes the "state says running but nothing comes out" bug that happens
// in Firefox after system sleep / lid close.
function recreateContext(): void {
  const wasBrownNoisePlaying = brownNoiseProcessor !== null;
  const vol = brownNoiseLastVolume;

  // Tear down old context
  if (brownNoiseProcessor) {
    brownNoiseProcessor.disconnect();
    brownNoiseProcessor.onaudioprocess = null;
    brownNoiseProcessor = null;
  }
  brownNoiseGain = null;
  brownNoiseState = 0;
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }

  // Create fresh context — getCtx() will do this lazily on next sound play,
  // but if brown noise was running we need to restart it now.
  if (wasBrownNoisePlaying) {
    startBrownNoise(vol);
  }
}

// Detect system wake / tab re-focus after sleep.
// When the page was hidden for more than 5 seconds, assume a sleep cycle
// occurred and recreate the AudioContext on return.
function setupWakeDetection(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      lastHiddenAt = Date.now();
    } else {
      const elapsed = Date.now() - lastHiddenAt;
      if (elapsed > 5000 && audioCtx) {
        recreateContext();
      }
    }
  });
}
setupWakeDetection();

// Also try to resume on any user interaction, so audio recovers after BT reconnect
function setupAutoResume(): void {
  const resume = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  };
  for (const evt of ['click', 'keydown', 'pointerdown', 'touchstart']) {
    document.addEventListener(evt, resume, { capture: true });
  }
}
setupAutoResume();

export function playStartSound(): void {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(392, ctx.currentTime);      // G4
  osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.08); // C5
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.25);
}

export function playCompletionSound(): void {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
  osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
  osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
}

export function playAllCompleteSound(): void {
  const ctx = getCtx();
  const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50, 1318.51];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = i < 4 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
    gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.4);
    osc.start(ctx.currentTime + i * 0.12);
    osc.stop(ctx.currentTime + i * 0.12 + 0.4);
  });
}

export function playMeditationChime(volume: number = 0.3): void {
  const ctx = getCtx();
  const freqs = [528, 1056, 1584];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    const vol = volume * (1 - i * 0.3);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 2.5);
  });
}

// Brown noise generator for meditation
// Uses real-time generation (ScriptProcessorNode) so every sample is fresh —
// no looped buffer means no repeating pattern and no audible seam.
let brownNoiseProcessor: ScriptProcessorNode | null = null;
let brownNoiseGain: GainNode | null = null;
let brownNoiseState = 0; // running integrator state, persists across audio callbacks

export function startBrownNoise(volume: number = 0.15): void {
  if (brownNoiseProcessor) return;
  brownNoiseLastVolume = volume;
  const ctx = getCtx();

  // ScriptProcessorNode: 4096 samples per callback, mono
  brownNoiseProcessor = ctx.createScriptProcessor(4096, 0, 1);
  brownNoiseState = 0;

  brownNoiseProcessor.onaudioprocess = (e) => {
    const output = e.outputBuffer.getChannelData(0);
    let state = brownNoiseState;
    for (let i = 0; i < output.length; i++) {
      const white = Math.random() * 2 - 1;
      state = (state + 0.02 * white) / 1.02;
      output[i] = state * 3.5;
    }
    brownNoiseState = state;
  };

  brownNoiseGain = ctx.createGain();
  brownNoiseGain.gain.setValueAtTime(volume, ctx.currentTime);

  brownNoiseProcessor.connect(brownNoiseGain);
  brownNoiseGain.connect(ctx.destination);
}

export function setBrownNoiseVolume(volume: number): void {
  brownNoiseLastVolume = volume;
  if (brownNoiseGain) {
    const ctx = getCtx();
    brownNoiseGain.gain.setValueAtTime(volume, ctx.currentTime);
  }
}

export function stopBrownNoise(): void {
  if (brownNoiseProcessor) {
    brownNoiseProcessor.disconnect();
    brownNoiseProcessor.onaudioprocess = null;
    brownNoiseProcessor = null;
  }
  if (brownNoiseGain) {
    brownNoiseGain.disconnect();
    brownNoiseGain = null;
  }
  brownNoiseState = 0;
}

export function playTimerEndSound(): void {
  const ctx = getCtx();
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime + i * 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.3 + 0.25);
    osc.start(ctx.currentTime + i * 0.3);
    osc.stop(ctx.currentTime + i * 0.3 + 0.25);
  }
}
