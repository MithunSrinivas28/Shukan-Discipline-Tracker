import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { IntervalType, TimerPhase } from "@/hooks/useTimerState";
import { ensureNotificationPermission, notifyStudyEvent, notifyBreakComplete } from "@/lib/notifications";
import FlipClock from "@/components/timer/FlipClock";
import TimerStage from "@/components/timer/TimerStage";

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
      } else if (phase === "break") {
        notifyBreakComplete("Break finished. Time to continue.", "Back to focus.");
      }
      onCompleteSession();
    }
  }, [remaining, isRunning, phase]);

  const progress = phase !== "idle" ? Math.max(0, 1 - remaining / (phase === "break" ? (intervalType === "pomodoro" ? 300 : 600) : focusDuration)) : 0;

  const label = phase === "idle" ? "Ready" : phase === "focus" ? "Focus" : "Break";
  const display = phase === "idle" ? formatTime(focusDuration) : formatTime(remaining);

  const header = (
    <div className="flex justify-center">
      <div className="inline-flex gap-1 p-1 rounded-full bg-muted/60 border border-border/50">
        {(["pomodoro", "long"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onSetIntervalType(t)}
            disabled={isRunning}
            className={`px-4 py-1.5 rounded-full text-xs font-body transition-all duration-300 ${
              intervalType === t
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            } disabled:opacity-50`}
          >
            {t === "pomodoro" ? "25 / 5" : "50 / 10"}
          </button>
        ))}
      </div>
    </div>
  );

  const controls =
    phase === "idle" ? (
      <Button onClick={() => { ensureNotificationPermission(); onStart(); }} className="font-body px-10 btn-press">
        Start Focus
      </Button>
    ) : isRunning ? (
      <Button onClick={onPause} variant="outline" className="font-body px-10 btn-press">
        Pause
      </Button>
    ) : (
      <Button onClick={() => { ensureNotificationPermission(); onStart(); }} className="font-body px-10 btn-press">
        Resume
      </Button>
    );

  return (
    <TimerStage
      header={header}
      clock={
        <FlipClock time={display} label={label} size="lg" running={isRunning && phase === "focus"} />
      }
      controls={controls}
    >
      {/* Progress bar */}
      {phase !== "idle" && (
        <div className="w-full h-1 bg-muted/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary via-sakura-glow to-primary rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

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
      <p className="text-center text-xs text-muted-foreground font-body tracking-wide">
        Sessions today · <span className="font-serif font-bold text-foreground">{sessionsCompleted}</span>
      </p>
    </TimerStage>
  );
}

