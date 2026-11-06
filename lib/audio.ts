// ============================================================
// IdeMap — Web Audio API Synthesizer (≤15 lines of core logic)
// ============================================================

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function setMuted(value: boolean) {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

function playTone(frequency: number, duration: number, type: OscillatorType = "sine", gain = 0.18) {
  if (muted || typeof window === "undefined") return;
  const ac = getCtx();
  const osc = ac.createOscillator();
  const vol = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ac.currentTime);
  vol.gain.setValueAtTime(gain, ac.currentTime);
  vol.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
  osc.connect(vol);
  vol.connect(ac.destination);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + duration);
}

/** Tactile click — short mid tone */
export function playClick() {
  playTone(440, 0.08, "sine", 0.12);
}

/** Task completed — harmonic chime */
export function playTaskComplete() {
  playTone(523.25, 0.3, "sine", 0.15);  // C5
  setTimeout(() => playTone(659.25, 0.3, "sine", 0.12), 80);  // E5
  setTimeout(() => playTone(783.99, 0.5, "sine", 0.10), 160); // G5
}

/** Level up — ascending arpeggio */
export function playLevelUp() {
  const freqs = [261.63, 329.63, 392.0, 523.25, 659.25]; // C4→E4→G4→C5→E5
  freqs.forEach((f, i) => setTimeout(() => playTone(f, 0.4, "sine", 0.14), i * 100));
}

/** Planet focus — soft whoosh */
export function playFocus() {
  playTone(220, 0.2, "sine", 0.08);
  setTimeout(() => playTone(330, 0.25, "sine", 0.06), 60);
}
