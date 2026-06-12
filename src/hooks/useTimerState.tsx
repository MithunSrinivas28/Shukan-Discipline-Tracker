import { useState, useEffect, useCallback, useRef } from "react";

export type StudyMode = "timer" | "stopwatch" | "countdown";
export type TimerPhase = "focus" | "break" | "idle";
export type IntervalType = "pomodoro" | "long";

interface TimerState {
  mode: StudyMode;
  isRunning: boolean;
  phase: TimerPhase;
  intervalType: IntervalType;
  sessionStartTimestamp: number | null;
  pauseAccumulated: number; // ms accumulated before current run
  pauseTimestamp: number | null;
  sessionsCompleted: number;
  focusDuration: number; // seconds
  breakDuration: number; // seconds
}

const STORAGE_KEY = "shukan-timer-state";

const defaultState: TimerState = {
  mode: "timer",
  isRunning: false,
  phase: "idle",
  intervalType: "pomodoro",
  sessionStartTimestamp: null,
  pauseAccumulated: 0,
  pauseTimestamp: null,
  sessionsCompleted: 0,
  focusDuration: 25 * 60,
  breakDuration: 5 * 60,
};

function loadState(): TimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    // Check if stored date is today
    const storedDate = parsed._date;
    const today = new Date().toISOString().split("T")[0];
    if (storedDate !== today) {
      localStorage.removeItem(STORAGE_KEY);
      return defaultState;
    }
    return { ...defaultState, ...parsed };
  } catch {
    return defaultState;
  }
}

function saveState(state: TimerState) {
  const today = new Date().toISOString().split("T")[0];
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, _date: today }));
}

export function useTimerState() {
  const [state, setState] = useState<TimerState>(loadState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsed, setElapsed] = useState(0); // seconds

  // Persist state changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Calculate elapsed time
  const calcElapsed = useCallback(() => {
    if (!state.sessionStartTimestamp) return 0;
    if (state.pauseTimestamp) {
      return Math.floor(state.pauseAccumulated / 1000);
    }
    if (state.isRunning) {
      return Math.floor((state.pauseAccumulated + Date.now() - state.sessionStartTimestamp) / 1000);
    }
    return Math.floor(state.pauseAccumulated / 1000);
  }, [state.sessionStartTimestamp, state.isRunning, state.pauseAccumulated, state.pauseTimestamp]);

  // Tick
  useEffect(() => {
    if (state.isRunning) {
      setElapsed(calcElapsed());
      intervalRef.current = setInterval(() => {
        setElapsed(calcElapsed());
      }, 200);
    } else {
      setElapsed(calcElapsed());
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isRunning, calcElapsed]);

  const setMode = (mode: StudyMode) => {
    setState((s) => ({ ...defaultState, mode }));
  };

  /** Set the goal duration (in seconds) for Countdown mode. Only effective when idle. */
  const setGoalDuration = (seconds: number) => {
    setState((s) => {
      if (s.phase !== "idle") return s;
      return {
        ...s,
        focusDuration: Math.max(60, Math.floor(seconds)),
        sessionStartTimestamp: null,
        pauseAccumulated: 0,
        pauseTimestamp: null,
      };
    });
  };

  const setIntervalType = (type: IntervalType) => {
    const focus = type === "pomodoro" ? 25 * 60 : 50 * 60;
    const brk = type === "pomodoro" ? 5 * 60 : 10 * 60;
    setState((s) => ({
      ...s,
      intervalType: type,
      focusDuration: focus,
      breakDuration: brk,
      phase: "idle",
      isRunning: false,
      sessionStartTimestamp: null,
      pauseAccumulated: 0,
      pauseTimestamp: null,
    }));
  };

  const start = () => {
    setState((s) => ({
      ...s,
      isRunning: true,
      phase: s.phase === "idle" ? "focus" : s.phase,
      sessionStartTimestamp: Date.now(),
      pauseAccumulated: s.pauseTimestamp ? s.pauseAccumulated : 0,
      pauseTimestamp: null,
    }));
  };

  const pause = () => {
    setState((s) => {
      const now = Date.now();
      const accumulated = s.sessionStartTimestamp
        ? s.pauseAccumulated + (now - s.sessionStartTimestamp)
        : s.pauseAccumulated;
      return {
        ...s,
        isRunning: false,
        pauseAccumulated: accumulated,
        pauseTimestamp: now,
        sessionStartTimestamp: null,
      };
    });
  };

  const stop = () => {
    const finalElapsed = calcElapsed();
    setState((s) => ({
      ...s,
      isRunning: false,
      phase: "idle",
      sessionStartTimestamp: null,
      pauseAccumulated: 0,
      pauseTimestamp: null,
    }));
    return finalElapsed;
  };

  const completeTimerSession = () => {
    setState((s) => {
      if (s.phase === "focus") {
        return {
          ...s,
          phase: "break",
          sessionsCompleted: s.sessionsCompleted + 1,
          sessionStartTimestamp: Date.now(),
          pauseAccumulated: 0,
          pauseTimestamp: null,
        };
      } else {
        // Break done, go back to idle
        return {
          ...s,
          phase: "idle",
          isRunning: false,
          sessionStartTimestamp: null,
          pauseAccumulated: 0,
          pauseTimestamp: null,
        };
      }
    });
  };

  const resetSessions = () => {
    setState((s) => ({ ...s, sessionsCompleted: 0 }));
  };

  // For timer mode: remaining time
  const currentDuration = state.phase === "break" ? state.breakDuration : state.focusDuration;
  const remaining = Math.max(0, currentDuration - elapsed);

  return {
    ...state,
    elapsed,
    remaining,
    currentDuration,
    setMode,
    setIntervalType,
    setGoalDuration,
    start,
    pause,
    stop,
    completeTimerSession,
    resetSessions,
  };
}
