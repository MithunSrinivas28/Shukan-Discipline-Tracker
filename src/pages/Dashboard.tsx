import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DailyCommitment from "@/components/DailyCommitment";
import SakuraTree from "@/components/SakuraTree";
import FocusRooms from "@/components/FocusRooms";
import TimerMode from "@/components/TimerMode";
import StopwatchMode from "@/components/StopwatchMode";
import CountdownMode from "@/components/CountdownMode";
import StudyCallLinks from "@/components/StudyCallLinks";
import { useTimerState, type StudyMode } from "@/hooks/useTimerState";
import { useAnalyticsStore } from "@/store/analyticsStore";
import { STUDY_TOGETHER_ENABLED } from "@/lib/features";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [commitment, setCommitment] = useState<{ target_hours: number } | null>(null);
  const [showFocusRooms, setShowFocusRooms] = useState(false);

  const timer = useTimerState();

  const profile = useAnalyticsStore((s) => s.profile);
  const sessions = useAnalyticsStore((s) => s.sessions);
  const legacyLogs = useAnalyticsStore((s) => s.legacyLogs);
  const totalStudyMinutes = useAnalyticsStore((s) => s.totalStudyMinutes);
  const totalSessions = useAnalyticsStore((s) => s.totalSessions);
  const fetchAnalytics = useAnalyticsStore((s) => s.fetchAnalytics);
  const loaded = useAnalyticsStore((s) => s.loaded);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const [{ data: commitData }] = await Promise.all([
      supabase
        .from("daily_commitments")
        .select("target_hours")
        .eq("user_id", user.id)
        .eq("commitment_date", today)
        .maybeSingle(),
      fetchAnalytics(user.id, { force: true }),
    ]);
    setCommitment(commitData ?? null);
  }, [user, fetchAnalytics]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    fetchData();
  }, [user, authLoading, navigate, fetchData]);

  // Today's stats — derived from the shared sessions + legacy logs
  const todayStr = new Date().toISOString().split("T")[0];
  const todayLegacyHours = legacyLogs.filter((l) =>
    l.logged_at.startsWith(todayStr),
  ).length;
  const todaySessions = sessions.filter((s) => s.created_at.startsWith(todayStr));
  const todayTimerSessions = todaySessions
    .filter((s) => s.mode === "timer")
    .reduce((sum, s) => sum + s.sessions_completed, 0);
  const todayStopwatchMinutes = Math.floor(
    todaySessions
      .filter((s) => s.mode === "stopwatch")
      .reduce((sum, s) => sum + s.duration_seconds, 0) / 60,
  );

  if (authLoading || !loaded || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground font-body animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-12 px-5 space-y-14 animate-fade-in">
      {/* Welcome */}
      <header className="text-center space-y-1.5">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-body">
          Welcome back
        </p>
        <h1 className="text-4xl font-serif font-bold text-foreground tracking-tight leading-none">
          {profile.username}
        </h1>
      </header>

      {/* Focus workspace — HERO */}
      <section className="space-y-4">
        <div className="flex items-center justify-center">
          <div className="inline-flex gap-1 p-1 rounded-full bg-muted/50 border border-border/40">
            {(["timer", "stopwatch", "countdown"] as StudyMode[]).map((m) => (
              <button
                key={m}
                onClick={() => timer.setMode(m)}
                disabled={timer.isRunning}
                className={`px-5 py-1.5 rounded-full text-xs font-body transition-all duration-300 ${
                  timer.mode === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                } disabled:opacity-50`}
              >
                {m === "timer" ? "Pomodoro" : m === "stopwatch" ? "Stopwatch" : "Countdown Goal"}
              </button>
            ))}
          </div>
        </div>

        <div className="py-6 sm:py-10">
          {timer.mode === "timer" ? (
            <TimerMode
              userId={user!.id}
              phase={timer.phase}
              isRunning={timer.isRunning}
              remaining={timer.remaining}
              elapsed={timer.elapsed}
              intervalType={timer.intervalType}
              sessionsCompleted={timer.sessionsCompleted}
              focusDuration={timer.focusDuration}
              onSetIntervalType={timer.setIntervalType}
              onStart={timer.start}
              onPause={timer.pause}
              onCompleteSession={timer.completeTimerSession}
              onSessionLogged={fetchData}
            />
          ) : timer.mode === "stopwatch" ? (
            <StopwatchMode
              userId={user!.id}
              isRunning={timer.isRunning}
              elapsed={timer.elapsed}
              phase={timer.phase}
              onStart={timer.start}
              onPause={timer.pause}
              onStop={timer.stop}
              onSessionLogged={fetchData}
            />
          ) : (
            <CountdownMode
              userId={user!.id}
              phase={timer.phase}
              isRunning={timer.isRunning}
              remaining={timer.remaining}
              elapsed={timer.elapsed}
              focusDuration={timer.focusDuration}
              onSetGoalDuration={timer.setGoalDuration}
              onStart={timer.start}
              onPause={timer.pause}
              onStop={timer.stop}
              onSessionLogged={fetchData}
            />
          )}
        </div>
      </section>

      {/* Today — soft inline stats */}
      <section className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-body px-1">
          Today
        </p>
        <div className="grid grid-cols-2 divide-x divide-border/40 surface-soft overflow-hidden">
          <div className="text-center py-5">
            <p className="text-3xl font-serif font-bold text-foreground tabular-nums">
              {todayTimerSessions}
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-body mt-1">
              Timer Sessions
            </p>
          </div>
          <div className="text-center py-5">
            <p className="text-3xl font-serif font-bold text-foreground tabular-nums">
              {todayStopwatchMinutes}
              <span className="text-lg text-muted-foreground font-body ml-0.5">m</span>
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-body mt-1">
              Stopwatch Time
            </p>
          </div>
        </div>
      </section>

      {/* Daily Commitment */}
      <section>
        <DailyCommitment
          userId={user!.id}
          todayHours={todayLegacyHours + Math.floor(todayStopwatchMinutes / 60)}
          commitment={commitment}
          onCommitmentSet={fetchData}
        />
      </section>

      {/* Sakura Tree */}
      <section>
        <SakuraTree
          totalHours={Math.floor(totalStudyMinutes / 60)}
          totalSessions={totalSessions}
        />
      </section>

      {/* Study Together — feature-flagged */}
      {STUDY_TOGETHER_ENABLED && (
        <>
          <section>
            <button
              onClick={() => setShowFocusRooms((v) => !v)}
              className="group w-full rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 px-6 py-4 text-left transition-all duration-300 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-[0_10px_40px_-16px_hsl(var(--primary)/0.35)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-serif font-semibold text-foreground text-sm tracking-wide">
                    🤝 Start Study Together
                  </p>
                  <p className="text-xs text-muted-foreground font-body mt-1">
                    Invite a friend to a shared focus session
                  </p>
                </div>
                <span className="text-muted-foreground text-xs transition-transform group-hover:translate-x-1">
                  {showFocusRooms ? "Hide" : "Open"} →
                </span>
              </div>
            </button>

            {showFocusRooms && (
              <div className="mt-4 animate-fade-in">
                <FocusRooms />
              </div>
            )}
          </section>

          <section className="text-center pt-2">
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-body mb-3">
              Studying with a friend?
            </p>
            <StudyCallLinks />
          </section>
        </>
      )}
    </div>
  );
}
