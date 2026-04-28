import { useState } from "react";
import { Minus, Timer as TimerIcon } from "lucide-react";

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

  const isStopwatch = mode === "stopwatch";
  const displayTime = isStopwatch ? formatElapsed(elapsed) : formatCountdown(cooldown);
  const label = isStopwatch
    ? "Stopwatch"
    : phase === "break"
    ? "Break"
    : phase === "focus"
    ? "Focus"
    : "Idle";

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        aria-label="Expand floating timer"
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full flex items-center justify-center
          bg-card/70 backdrop-blur-xl border border-border/50
          shadow-[0_10px_30px_-12px_hsl(var(--primary)/0.45)]
          text-primary font-serif font-bold text-xs
          transition-all duration-300 ease-out
          hover:scale-110 hover:shadow-[0_14px_40px_-10px_hsl(var(--primary)/0.6)]
          animate-scale-in"
      >
        <TimerIcon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-in-right">
      <div
        className={`group relative flex items-center gap-4 min-w-[210px] rounded-2xl px-5 py-3.5
          bg-card/70 backdrop-blur-xl border border-border/50
          shadow-[0_20px_60px_-24px_hsl(var(--foreground)/0.35)]
          transition-all duration-300 ease-out
          hover:scale-[1.025] hover:-translate-y-0.5
          hover:shadow-[0_24px_70px_-20px_hsl(var(--foreground)/0.45)]
          ${isRunning && phase === "focus" ? "ring-1 ring-primary/30" : ""}`}
      >
        {/* Subtle inner glow when active */}
        {isRunning && (
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        )}

        {/* Status dot */}
        <div className="relative flex items-center justify-center">
          <span
            className={`block h-2 w-2 rounded-full ${
              isRunning ? "bg-primary animate-pulse-sakura" : "bg-muted-foreground/40"
            }`}
          />
        </div>

        {/* Time + label */}
        <div className="relative flex-1 leading-none">
          <p className="text-[19px] font-serif font-bold text-foreground tabular-nums tracking-tight">
            {displayTime}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-body">
            {label}
          </p>
        </div>

        {/* Minimize */}
        <button
          onClick={() => setMinimized(true)}
          aria-label="Minimize floating timer"
          className="relative h-7 w-7 rounded-full flex items-center justify-center
            text-muted-foreground hover:text-foreground hover:bg-muted/60
            transition-all duration-200"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
