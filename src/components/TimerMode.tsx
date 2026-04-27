import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { IntervalType, TimerPhase } from "@/hooks/useTimerState";
import { ensureNotificationPermission, notifyStudyEvent } from "@/lib/notifications";

interface TimerModeProps {
  userId: string;
  phase: TimerPhase;
  isRunning: boolean;
  remaining: number;
  elapsed: number;
  intervalType: IntervalType;
  sessionsCompleted: number;
  focusDuration: number;
  onSetIntervalType: (t: IntervalType) => void;
  onStart: () => void;
  onPause: () => void;
  onCompleteSession: () => void;
  onSessionLogged: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function TimerMode({
  userId,
  phase,
  isRunning,
  remaining,
  intervalType,
  sessionsCompleted,
  focusDuration,
  onSetIntervalType,
  onStart,
  onPause,
  onCompleteSession,
  onSessionLogged,
}: TimerModeProps) {
  const loggedRef = useRef(false);

  // Auto-transition when timer hits 0
  useEffect(() => {
    if (isRunning && remaining <= 0 && phase !== "idle") {
      if (phase === "focus" && !loggedRef.current) {
        loggedRef.current = true;
        const minutesEarned = Math.round(focusDuration / 60);
        // Notify user that the focus session ended.
        notifyStudyEvent("Focus session complete", "Take a break.");
        // Log completed focus session & update profile minutes
        Promise.all([
          supabase.from("study_sessions").insert({
            user_id: userId,
            mode: "timer",
            duration_seconds: focusDuration,
            sessions_completed: 1,
            interval_type: intervalType,
          }),
          supabase.rpc("increment_study_minutes" as any, { p_user_id: userId, p_minutes: minutesEarned }),
        ]).then(() => {
            onSessionLogged();
            loggedRef.current = false;
          });
      }
      onCompleteSession();
    }
  }, [remaining, isRunning, phase]);

  const progress = phase !== "idle" ? Math.max(0, 1 - remaining / (phase === "break" ? (intervalType === "pomodoro" ? 300 : 600) : focusDuration)) : 0;

  return (
    <div className="space-y-6">
      {/* Interval selector */}
      <div className="flex justify-center gap-3">
        {(["pomodoro", "long"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onSetIntervalType(t)}
            disabled={isRunning}
            className={`px-4 py-2 rounded-lg text-sm font-body border transition-colors ${
              intervalType === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:border-primary/50"
            } disabled:opacity-50`}
          >
            {t === "pomodoro" ? "25 / 5 min" : "50 / 10 min"}
          </button>
        ))}
      </div>

      {/* Timer display */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground font-body mb-2 uppercase tracking-wide">
          {phase === "idle" ? "Ready" : phase === "focus" ? "Focus" : "Break"}
        </p>
        <p className="text-6xl font-serif font-bold text-foreground tabular-nums tracking-tight">
          {phase === "idle" ? formatTime(focusDuration) : formatTime(remaining)}
        </p>
      </div>

      {/* Progress bar */}
      {phase !== "idle" && (
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-center gap-3">
        {phase === "idle" ? (
          <Button onClick={() => { ensureNotificationPermission(); onStart(); }} className="font-body px-8">
            Start Focus
          </Button>
        ) : isRunning ? (
          <Button onClick={onPause} variant="outline" className="font-body px-8">
            Pause
          </Button>
        ) : (
          <Button onClick={() => { ensureNotificationPermission(); onStart(); }} className="font-body px-8">
            Resume
          </Button>
        )}
      </div>

      {/* Float Timer */}
      {phase !== "idle" && (
        <div className="flex justify-center">
          <button
            onClick={() => window.open('/float-timer.html', 'shukan-float', 'width=220,height=140,menubar=no,toolbar=no,location=no,status=no')}
            className="text-xs text-muted-foreground font-body hover:text-foreground transition-colors"
          >
            🪟 Float Timer
          </button>
        </div>
      )}

      {/* Sessions count */}
      <p className="text-center text-sm text-muted-foreground font-body">
        Sessions today: <span className="font-serif font-bold text-foreground">{sessionsCompleted}</span>
      </p>
    </div>
  );
}
