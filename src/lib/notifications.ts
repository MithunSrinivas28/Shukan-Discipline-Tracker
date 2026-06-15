// Lightweight notification helpers: soft bell chime + browser notification.
// Sound is synthesized via WebAudio so no asset is required.

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/** Play a soft bell chime once. Requires prior user interaction (browser policy). */
export function playChime(volume = 0.35) {
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Two-tone bell: fundamental + a higher overtone for warmth.
  const tones = [
    { freq: 880, gain: volume },        // A5
    { freq: 1318.51, gain: volume * 0.5 }, // E6 overtone
  ];

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(1, now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
  master.connect(ctx.destination);

  tones.forEach(({ freq, gain }) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(gain, now);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 1.9);
  });
}

/** Ask the user for notification permission (no-op if unsupported or already decided). */
export async function ensureNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "default") {
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }
  return Notification.permission;
}

/** Show a browser notification if permitted. Silent fallback otherwise. */
export function showBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.png", silent: true });
  } catch {
    // ignore
  }
}

import { playSlot } from "./sounds";

/** Focus session / stopwatch hour: play selected focus sound + show notification. */
export function notifyStudyEvent(title: string, body: string) {
  playSlot("focusComplete");
  showBrowserNotification(title, body);
}

/** Break complete: play selected break sound + show notification. */
export function notifyBreakComplete(
  title = "Break finished. Time to continue.",
  body = "Your break is over.",
) {
  playSlot("breakComplete");
  showBrowserNotification(title, body);
}

/** Goal completion: stronger, repeated goal sound + browser notification. */
export function notifyGoalComplete(title: string, body: string) {
  playSlot("goalComplete", { strong: true });
  showBrowserNotification(title, body);
}
