import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { TimerPhase } from "@/hooks/useTimerState";
import FlipClock from "@/components/timer/FlipClock";
import TimerStage from "@/components/timer/TimerStage";
import {
  ensureNotificationPermission,
  notifyGoalComplete,
} from "@/lib/notifications";

interface CountdownModeProps {
  userId: string;
  phase: TimerPhase;
  isRunning: boolean;
  remaining: number;
  elapsed: number;
  focusDuration: number; // goal in seconds
  onSetGoalDuration: (seconds: number) => void;
  onStart: () => void;
  onPause: () => void;
  onStop: () => number;
  onSessionLogged: () => void;
}

const PRESETS: { label: string; hours: number }[] = [
  { label: "30m", hours: 0.5 },
  { label: "1h", hours: 1 },
  { label: "2h", hours: 2 },
  { label: "3h", hours: 3 },
  { label: "4h", hours: 4 },
  { label: "5h", hours: 5 },
  { label: "6h", hours: 6 },
  { label: "8h", hours: 8 },
];

function formatHMS(total: number) {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function formatShort(total: number) {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export default function CountdownMode({
  userId,
  phase,
  isRunning,
  remaining,
  elapsed,
  focusDuration,
  onSetGoalDuration,
  onStart,
  onPause,
  onStop,
  onSessionLogged,
}: CountdownModeProps) {
  const { toast } = useToast();
  const loggedRef = useRef(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customH, setCustomH] = useState("");
  const [customM, setCustomM] = useState("");
  const [completionOpen, setCompletionOpen] = useState(false);
  const [completedGoal, setCompletedGoal] = useState(0);

  // Detect completion
  useEffect(() => {
    if (
      isRunning &&
      phase === "focus" &&
      remaining <= 0 &&
      !loggedRef.current &&
      focusDuration > 0
    ) {
      loggedRef.current = true;
      const goalSec = focusDuration;
      const minutesEarned = Math.round(goalSec / 60);

      notifyGoalComplete(
        "Study Goal Complete",
        `You completed your ${formatShort(goalSec)} goal.`,
      );

      Promise.all([
        supabase.from("study_sessions").insert({
          user_id: userId,
          mode: "countdown",
          duration_seconds: goalSec,
          sessions_completed: 1,
          interval_type: `goal_${Math.round(goalSec / 60)}m`,
        }),
        supabase.rpc("increment_study_minutes" as any, {
          p_user_id: userId,
          p_minutes: minutesEarned,
        }),
      ]).then(() => {
        onSessionLogged();
      });

      setCompletedGoal(goalSec);
      setCompletionOpen(true);
      onStop();
      // allow next session to log again after a beat
      setTimeout(() => {
        loggedRef.current = false;
      }, 1000);
    }
  }, [
    remaining,
    isRunning,
    phase,
    focusDuration,
    userId,
    onSessionLogged,
    onStop,
  ]);

  const isIdle = phase === "idle";
  const display = isIdle ? formatHMS(focusDuration) : formatHMS(remaining);
  const progressPct =
    focusDuration > 0 ? Math.min(100, (elapsed / focusDuration) * 100) : 0;
  const elapsedDisplay = formatShort(Math.min(elapsed, focusDuration));
  const goalDisplay = formatShort(focusDuration);

  const handleStart = () => {
    if (focusDuration < 60) {
      toast({
        title: "Pick a goal",
        description: "Choose a countdown duration first.",
        variant: "destructive",
      });
      return;
    }
    ensureNotificationPermission();
    onStart();
  };

  const handleEarlyStop = async () => {
    const totalSeconds = onStop();
    if (totalSeconds < 60) {
      toast({
        title: "Too short",
        description: "Study at least 1 minute to log.",
      });
      return;
    }
    const minutesEarned = Math.floor(totalSeconds / 60);
    await Promise.all([
      supabase.from("study_sessions").insert({
        user_id: userId,
        mode: "countdown",
        duration_seconds: totalSeconds,
        sessions_completed: 1,
        interval_type: `goal_${Math.round(focusDuration / 60)}m_partial`,
      }),
      supabase.rpc("increment_study_minutes" as any, {
        p_user_id: userId,
        p_minutes: minutesEarned,
      }),
    ]);
    toast({
      title: "Session saved",
      description: `${formatShort(totalSeconds)} of your ${goalDisplay} goal logged.`,
    });
    onSessionLogged();
  };

  const applyCustom = () => {
    const h = parseInt(customH || "0", 10) || 0;
    const m = parseInt(customM || "0", 10) || 0;
    const secs = h * 3600 + m * 60;
    if (secs < 60) {
      toast({
        title: "Too short",
        description: "Set at least 1 minute.",
        variant: "destructive",
      });
      return;
    }
    if (secs > 12 * 3600) {
      toast({
        title: "Too long",
        description: "Max 12 hours.",
        variant: "destructive",
      });
      return;
    }
    onSetGoalDuration(secs);
    setShowCustom(false);
  };

  const header = isIdle ? (
    <div className="space-y-3">
      <p className="text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-body">
        Choose your goal
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {PRESETS.map((p) => {
          const selected = focusDuration === Math.round(p.hours * 3600);
          return (
            <button
              key={p.label}
              onClick={() => onSetGoalDuration(Math.round(p.hours * 3600))}
              className={`px-4 py-1.5 rounded-full text-xs font-body transition-all duration-300 border ${
                selected
                  ? "bg-foreground text-background border-foreground shadow-sm"
                  : "bg-muted/40 text-muted-foreground border-border/40 hover:text-foreground hover:border-border"
              }`}
            >
              {p.label}
            </button>
          );
        })}
        <button
          onClick={() => setShowCustom((v) => !v)}
          className={`px-4 py-1.5 rounded-full text-xs font-body transition-all duration-300 border ${
            showCustom
              ? "bg-foreground text-background border-foreground"
              : "bg-muted/40 text-muted-foreground border-border/40 hover:text-foreground hover:border-border"
          }`}
        >
          Custom
        </button>
      </div>
      <p className="text-center text-[11px] italic text-muted-foreground font-body">
        Recommended: 3–4 hours
      </p>

      {showCustom && (
        <div className="flex items-center justify-center gap-2 pt-1 animate-fade-in">
          <Input
            type="number"
            min={0}
            max={12}
            value={customH}
            onChange={(e) => setCustomH(e.target.value)}
            placeholder="h"
            className="w-16 text-center font-body"
          />
          <span className="text-muted-foreground text-sm">h</span>
          <Input
            type="number"
            min={0}
            max={59}
            value={customM}
            onChange={(e) => setCustomM(e.target.value)}
            placeholder="m"
            className="w-16 text-center font-body"
          />
          <span className="text-muted-foreground text-sm">m</span>
          <Button onClick={applyCustom} variant="outline" size="sm" className="font-body">
            Set
          </Button>
        </div>
      )}
    </div>
  ) : null;

  const controls = isIdle ? (
    <Button onClick={handleStart} className="font-body px-10 btn-press">
      Start Countdown
    </Button>
  ) : isRunning ? (
    <>
      <Button onClick={onPause} variant="outline" className="font-body px-8 btn-press">
        Pause
      </Button>
      <Button onClick={handleEarlyStop} variant="secondary" className="font-body px-8 btn-press">
        End Early
      </Button>
    </>
  ) : (
    <>
      <Button onClick={handleStart} className="font-body px-8 btn-press">
        Resume
      </Button>
      <Button onClick={handleEarlyStop} variant="secondary" className="font-body px-8 btn-press">
        End Early
      </Button>
    </>
  );

  return (
    <>
      <TimerStage
        header={header}
        clock={
          <FlipClock
            time={display}
            label={isIdle ? "Goal" : isRunning ? "Counting down" : "Paused"}
            size="md"
            running={isRunning}
            complete={!isIdle && remaining <= 0}
          />
        }
        controls={controls}
      >
        {!isIdle && (
          <div className="space-y-2">
            <div className="w-full h-1 bg-muted/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary via-sakura-glow to-primary rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-center text-xs text-muted-foreground font-body tabular-nums">
              <span className="text-foreground font-serif font-semibold">{elapsedDisplay}</span> /{" "}
              {goalDisplay} completed ·{" "}
              <span className="tabular-nums">{Math.floor(progressPct)}%</span>
            </p>
          </div>
        )}
      </TimerStage>

      {/* Completion modal */}
      {completionOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-background/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setCompletionOpen(false)}
        >
          <div
            className="surface max-w-sm mx-4 px-8 py-10 text-center space-y-3 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-body">
              Goal reached
            </p>
            <h2 className="text-3xl font-serif font-bold text-foreground">Study Goal Complete</h2>
            <p className="text-sm text-muted-foreground font-body">
              You completed your {formatShort(completedGoal)} goal.
            </p>
            <div className="pt-3">
              <Button onClick={() => setCompletionOpen(false)} className="font-body px-8">
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

