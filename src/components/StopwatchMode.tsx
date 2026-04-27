import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ensureNotificationPermission, notifyStudyEvent } from "@/lib/notifications";

interface StopwatchModeProps {
  userId: string;
  isRunning: boolean;
  elapsed: number; // seconds
  phase: string;
  onStart: () => void;
  onPause: () => void;
  onStop: () => number;
  onSessionLogged: () => void;
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function StopwatchMode({
  userId,
  isRunning,
  elapsed,
  phase,
  onStart,
  onPause,
  onStop,
  onSessionLogged,
}: StopwatchModeProps) {
  const { toast } = useToast();

  // Fire a chime + browser notification every 60 minutes of elapsed stopwatch time.
  const lastNotifiedHourRef = useRef(0);
  useEffect(() => {
    if (!isRunning) return;
    const hoursElapsed = Math.floor(elapsed / 3600);
    if (hoursElapsed > lastNotifiedHourRef.current) {
      lastNotifiedHourRef.current = hoursElapsed;
      notifyStudyEvent(
        hoursElapsed === 1 ? "1 hour completed" : `${hoursElapsed} hours completed`,
        "Keep going.",
      );
    }
  }, [elapsed, isRunning]);

  // Reset the hourly counter whenever the stopwatch returns to idle.
  useEffect(() => {
    if (phase === "idle" && elapsed === 0) {
      lastNotifiedHourRef.current = 0;
    }
  }, [phase, elapsed]);

  const handleStart = () => {
    ensureNotificationPermission();
    onStart();
  };

  const handleStop = async () => {
    const totalSeconds = onStop();
    if (totalSeconds < 60) {
      toast({ title: "Too short", description: "Study at least 1 minute to log.", variant: "destructive" });
      return;
    }
    const minutesEarned = Math.floor(totalSeconds / 60);
    const [{ error }] = await Promise.all([
      supabase.from("study_sessions").insert({
        user_id: userId,
        mode: "stopwatch",
        duration_seconds: totalSeconds,
        sessions_completed: 1,
      }),
      supabase.rpc("increment_study_minutes" as any, { p_user_id: userId, p_minutes: minutesEarned }),
    ]);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Session saved!", description: `${formatElapsed(totalSeconds)} logged 💪` });
      onSessionLogged();
    }
  };

  const hasStarted = phase !== "idle" || elapsed > 0;

  return (
    <div className="space-y-6">
      {/* Display */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground font-body mb-2 uppercase tracking-wide">
          {isRunning ? "Studying..." : hasStarted ? "Paused" : "Ready"}
        </p>
        <p className="text-6xl font-serif font-bold text-foreground tabular-nums tracking-tight">
          {formatElapsed(elapsed)}
        </p>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
        {!hasStarted ? (
          <Button onClick={handleStart} className="font-body px-8">
            Start Studying
          </Button>
        ) : isRunning ? (
          <>
            <Button onClick={onPause} variant="outline" className="font-body px-6">
              Pause
            </Button>
            <Button onClick={handleStop} variant="secondary" className="font-body px-6">
              Stop & Save
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onStart} className="font-body px-6">
              Resume
            </Button>
            <Button onClick={handleStop} variant="secondary" className="font-body px-6">
              Stop & Save
            </Button>
          </>
        )}
      </div>

      {/* Float Timer */}
      {hasStarted && (
        <div className="flex justify-center">
          <button
            onClick={() => window.open('/float-timer.html', 'shukan-float', 'width=220,height=140,menubar=no,toolbar=no,location=no,status=no')}
            className="text-xs text-muted-foreground font-body hover:text-foreground transition-colors"
          >
            🪟 Float Timer
          </button>
        </div>
      )}
    </div>
  );
}
