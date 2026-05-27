const SOUND_KEY = "matemax-sound-enabled";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(SOUND_KEY);
  return v === null ? true : v === "1";
}

export function setSoundEnabled(enabled: boolean) {
  localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
}

// ─── MP3 loader (fallback to synth if file missing) ──────────────────────────

const audioCache = new Map<string, HTMLAudioElement>();

function tryPlayMp3(path: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    let audio = audioCache.get(path);
    if (!audio) {
      audio = new Audio(path);
      audio.preload = "auto";
      audioCache.set(path, audio);
    }
    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.volume = 0.55;
    const p = clone.play();
    if (p) {
      p.catch(() => {
        audioCache.delete(path); // remove broken entry, synth will take over
      });
    }
    return true;
  } catch {
    return false;
  }
}

// ─── Web Audio synth fallback ─────────────────────────────────────────────────

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    return new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch {
    return null;
  }
}

function synthNote(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  dur: number,
  volume = 0.18,
  type: OscillatorType = "sine"
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  const t = ctx.currentTime + startOffset;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.start(t);
  osc.stop(t + dur);
}

function synthCorrect() {
  const ctx = getCtx();
  if (!ctx) return;
  // Ascending C-major triad chime with harmonic overtone
  const notes = [
    { freq: 659.25, t: 0,    dur: 0.32, vol: 0.17 },
    { freq: 783.99, t: 0.09, dur: 0.30, vol: 0.17 },
    { freq: 1046.5, t: 0.18, dur: 0.46, vol: 0.20 },
  ];
  for (const { freq, t, dur, vol } of notes) {
    synthNote(ctx, freq, t, dur, vol, "sine");
    synthNote(ctx, freq * 2, t, dur * 0.6, vol * 0.28, "sine"); // octave shimmer
  }
}

function synthWrong() {
  const ctx = getCtx();
  if (!ctx) return;
  // Low "thud" + descending sawtooth
  synthNote(ctx, 85, 0, 0.18, 0.16, "sine");
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(260, ctx.currentTime + 0.01);
  osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.22);
  gain.gain.setValueAtTime(0, ctx.currentTime + 0.01);
  gain.gain.linearRampToValueAtTime(0.10, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.24);
  osc.start(ctx.currentTime + 0.01);
  osc.stop(ctx.currentTime + 0.24);
}

function synthLevelUp() {
  const ctx = getCtx();
  if (!ctx) return;
  // Triumphant C-major arpeggio + chord stab
  const melody = [
    { freq: 523.25, t: 0,    dur: 0.18 },
    { freq: 659.25, t: 0.12, dur: 0.18 },
    { freq: 783.99, t: 0.24, dur: 0.18 },
    { freq: 1046.5, t: 0.36, dur: 0.55 },
  ];
  for (const { freq, t, dur } of melody) {
    synthNote(ctx, freq, t, dur, 0.20, "sine");
    synthNote(ctx, freq * 2, t, dur * 0.5, 0.07, "sine");
  }
  // Final chord stab
  for (const freq of [523.25, 659.25, 783.99]) {
    synthNote(ctx, freq, 0.38, 0.5, 0.10, "sine");
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function playCorrect() {
  if (!isSoundEnabled()) return;
  if (!tryPlayMp3("/sounds/correct.mp3")) synthCorrect();
}

export function playWrong() {
  if (!isSoundEnabled()) return;
  if (!tryPlayMp3("/sounds/wrong.mp3")) synthWrong();
}

export function playLevelUp() {
  if (!isSoundEnabled()) return;
  if (!tryPlayMp3("/sounds/level-up.mp3")) synthLevelUp();
}

export function playBossWin() {
  if (!isSoundEnabled()) return;
  if (!tryPlayMp3("/sounds/boss-win.mp3")) synthLevelUp(); // same fanfare as fallback
}
