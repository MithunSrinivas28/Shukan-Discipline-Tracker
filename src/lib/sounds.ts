// Timer sound library — WebAudio synthesized sounds, no external assets.
// Each sound is built from oscillators so it works offline and stays tiny.

export type SoundId =
  | "temple_bell"
  | "wind_chime"
  | "soft_piano"
  | "study_bell"
  | "forest_chime"
  | "digital_alert";

export type SoundMeta = {
  id: SoundId;
  name: string;
  description: string;
};

export const SOUND_LIBRARY: SoundMeta[] = [
  { id: "temple_bell", name: "Temple Bell", description: "Calm and traditional" },
  { id: "wind_chime", name: "Japanese Wind Chime", description: "Light and peaceful" },
  { id: "soft_piano", name: "Soft Piano Note", description: "Minimal and elegant" },
  { id: "study_bell", name: "Study Bell", description: "Clear and professional" },
  { id: "forest_chime", name: "Forest Chime", description: "Natural and relaxing" },
  { id: "digital_alert", name: "Digital Alert", description: "Modern and noticeable" },
];

let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as
        | typeof AudioContext
        | undefined;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  } catch {
    return null;
  }
}

type Tone = {
  freq: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  duration?: number;
};

function playTones(tones: Tone[], baseVolume: number, masterDuration: number) {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(Math.max(0.0002, baseVolume), now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, now + masterDuration);
  master.connect(ctx.destination);

  tones.forEach((t) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = t.type ?? "sine";
    osc.frequency.setValueAtTime(t.freq, now + (t.delay ?? 0));
    const start = now + (t.delay ?? 0);
    const dur = t.duration ?? masterDuration - (t.delay ?? 0);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(t.gain ?? 1, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  });
}

export function playSound(id: SoundId, volume = 0.5) {
  const v = Math.max(0.0001, Math.min(1, volume));
  switch (id) {
    case "temple_bell":
      playTones(
        [
          { freq: 220, type: "sine", gain: v, duration: 3.2 },
          { freq: 440, type: "sine", gain: v * 0.7, duration: 2.8 },
          { freq: 660, type: "sine", gain: v * 0.35, duration: 2.0 },
          { freq: 880, type: "sine", gain: v * 0.2, duration: 1.4 },
        ],
        v,
        3.4,
      );
      return;
    case "wind_chime":
      playTones(
        [
          { freq: 1046.5, type: "sine", gain: v * 0.9, delay: 0, duration: 1.2 },
          { freq: 1318.5, type: "sine", gain: v * 0.8, delay: 0.18, duration: 1.2 },
          { freq: 1568.0, type: "sine", gain: v * 0.7, delay: 0.36, duration: 1.4 },
          { freq: 2093.0, type: "sine", gain: v * 0.4, delay: 0.5, duration: 1.0 },
        ],
        v,
        2.0,
      );
      return;
    case "soft_piano":
      playTones(
        [
          { freq: 523.25, type: "triangle", gain: v, duration: 1.6 },
          { freq: 1046.5, type: "sine", gain: v * 0.25, duration: 1.4 },
        ],
        v,
        1.8,
      );
      return;
    case "study_bell":
      playTones(
        [
          { freq: 880, type: "sine", gain: v, duration: 1.6 },
          { freq: 1318.51, type: "sine", gain: v * 0.5, duration: 1.4 },
        ],
        v,
        1.8,
      );
      return;
    case "forest_chime":
      playTones(
        [
          { freq: 660, type: "sine", gain: v * 0.9, delay: 0, duration: 1.6 },
          { freq: 990, type: "sine", gain: v * 0.6, delay: 0.25, duration: 1.6 },
          { freq: 1320, type: "sine", gain: v * 0.35, delay: 0.5, duration: 1.4 },
        ],
        v,
        2.2,
      );
      return;
    case "digital_alert":
      playTones(
        [
          { freq: 1200, type: "square", gain: v * 0.6, delay: 0, duration: 0.15 },
          { freq: 1600, type: "square", gain: v * 0.6, delay: 0.22, duration: 0.15 },
          { freq: 1200, type: "square", gain: v * 0.6, delay: 0.44, duration: 0.15 },
        ],
        v,
        0.7,
      );
      return;
  }
}

// ---------- Preferences ----------
const PREFS_KEY = "shukan.sound.prefs.v1";

export type SoundPrefs = {
  enabled: boolean;
  volume: number; // 0..1
  focusComplete: SoundId;
  breakComplete: SoundId;
  goalComplete: SoundId;
};

export const DEFAULT_PREFS: SoundPrefs = {
  enabled: true,
  volume: 0.5,
  focusComplete: "study_bell",
  breakComplete: "wind_chime",
  goalComplete: "temple_bell",
};

export function loadPrefs(): SoundPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: SoundPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent("shukan:sound-prefs"));
  } catch {
    // ignore
  }
}

export type SoundSlot = "focusComplete" | "breakComplete" | "goalComplete";

export function playSlot(slot: SoundSlot, opts?: { strong?: boolean }) {
  const prefs = loadPrefs();
  if (!prefs.enabled) return;
  const id = prefs[slot];
  if (opts?.strong) {
    // Stronger completion: play 3 times, louder, slight stagger.
    const vol = Math.min(1, prefs.volume * 1.4);
    playSound(id, vol);
    setTimeout(() => playSound(id, vol), 750);
    setTimeout(() => playSound(id, vol), 1500);
  } else {
    playSound(id, prefs.volume);
  }
}
