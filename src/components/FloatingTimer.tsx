import { useEffect, useRef, useState } from "react";

interface FloatingTimerProps {
  cooldown: number;
  mode?: string;
  elapsed?: number;
  phase?: string;
  isRunning?: boolean;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function FloatingTimer({ cooldown, mode, elapsed = 0, phase, isRunning }: FloatingTimerProps) {
  const [minimized, setMinimized] = useState(false);

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-6 right-6 z-50 bg-card/80 backdrop-blur-md border border-border/50 rounded-full w-12 h-12 flex items-center justify-center shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.35)] text-primary font-serif font-bold text-sm transition-all duration-300 hover:scale-110 hover:shadow-[0_10px_40px_-8px_hsl(var(--primary)/0.55)] animate-scale-in"
      >
        {mode === "stopwatch" ? "⏱" : `${Math.floor((mode === "timer" ? cooldown : elapsed) / 60)}m`}
      </button>
    );
  }

  const isStopwatch = mode === "stopwatch";
  const displayTime = isStopwatch ? formatElapsed(elapsed) : formatCountdown(cooldown);
  const label = isStopwatch
    ? "Studying..."
    : phase === "break"
    ? "Break"
    : phase === "focus"
    ? "Focus"
    : "Cooldown";

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-in-right">
      <div
        className={`bg-card/75 backdrop-blur-xl border border-border/50 rounded-2xl px-5 py-4 flex items-center gap-4 min-w-[200px] shadow-[0_20px_60px_-20px_hsl(var(--foreground)/0.25)] transition-all duration-300 hover:-translate-y-0.5 ${
          isRunning && phase === "focus" ? "ring-1 ring-primary/20" : ""
        }`}
      >
        <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-primary animate-pulse-sakura" : "bg-muted-foreground/40"}`} />
        <div className="flex-1">
          <p className="text-lg font-serif font-bold text-foreground tabular-nums tracking-tight leading-none">
            {displayTime}
          </p>
          <p className="text-[11px] text-muted-foreground font-body mt-1 uppercase tracking-wider">{label}</p>
        </div>
        <button
          onClick={() => setMinimized(true)}
          className="text-muted-foreground hover:text-foreground text-xs font-body transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
