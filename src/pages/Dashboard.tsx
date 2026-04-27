import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DailyCommitment from "@/components/DailyCommitment";
import SakuraTree from "@/components/SakuraTree";
import FocusRooms from "@/components/FocusRooms";
import TimerMode from "@/components/TimerMode";
import StopwatchMode from "@/components/StopwatchMode";
import StudyCallLinks from "@/components/StudyCallLinks";
import { useTimerState, type StudyMode } from "@/hooks/useTimerState";

interface Profile {
  username: string;
  total_hours: number;
  points: number;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<{ mode: string; duration_seconds: number; sessions_completed: number; created_at: string }[]>([]);
  const [commitment, setCommitment] = useState<{ target_hours: number } | null>(null);
  const [studyLogs, setStudyLogs] = useState<{ logged_at: string }[]>([]);
  const [showFocusRooms, setShowFocusRooms] = useState(false);

  const timer = useTimerState();

  const fetchData = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const [{ data: p }, { data: sess }, { data: commitData }, { data: logs }] = await Promise.all([
      supabase.from("profiles").select("username, total_hours, points").eq("id", user.id).maybeSingle(),
      supabase.from("study_sessions").select("mode, duration_seconds, sessions_completed, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("daily_commitments").select("target_hours").eq("user_id", user.id).eq("commitment_date", today).maybeSingle(),
      supabase.from("study_logs").select("logged_at").eq("user_id", user.id).order("logged_at", { ascending: false }),
    ]);
    if (p) setProfile(p);
    setSessions(sess ?? []);
    setCommitment(commitData ?? null);
    setStudyLogs(logs ?? []);
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    fetchData();
  }, [user, authLoading, navigate, fetchData]);

  // Compute today's hours from study_logs
  const todayStr = new Date().toISOString().split("T")[0];
  const todayHours = studyLogs.filter((l) => l.logged_at.startsWith(todayStr)).length;

  // Compute today's session stats
  const todaySessions = sessions.filter((s) => s.created_at.startsWith(todayStr));
  const todayTimerSessions = todaySessions.filter((s) => s.mode === "timer").reduce((sum, s) => sum + s.sessions_completed, 0);
  const todayStopwatchMinutes = Math.floor(todaySessions.filter((s) => s.mode === "stopwatch").reduce((sum, s) => sum + s.duration_seconds, 0) / 60);

  // Total for tree
  const totalSessions = sessions.reduce((sum, s) => sum + s.sessions_completed, 0);

  if (authLoading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground font-body animate-pulse">Loading...</p>
      </div>
    );
  }


  return (
    <div className="max-w-xl mx-auto py-12 px-5 space-y-12">
      {/* Welcome */}
      <header className="text-center space-y-2">
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-body">
          Welcome back
        </p>
        <h1 className="text-4xl font-serif font-bold text-foreground tracking-tight leading-none">
          {profile.username}
        </h1>
      </header>

      {/* Start Study Together */}
      <section>
        <button
          onClick={() => setShowFocusRooms((v) => !v)}
          className="group w-full rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 px-6 py-4 text-left transition-all duration-300 hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.25)]"
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
            <span className="text-muted-foreground text-xs transition-transform group-hover:translate-x-0.5">
              {showFocusRooms ? "Hide" : "Open"} →
            </span>
          </div>
        </button>

        {showFocusRooms && (
          <div className="mt-4">
            <FocusRooms />
          </div>
        )}
      </section>

      {/* Sakura Tree — open canvas, no card */}
      <section>
        <SakuraTree totalHours={profile.total_hours} totalSessions={totalSessions} />
      </section>

      {/* Focus workspace */}
      <section className="space-y-5">
        <div className="flex items-end justify-between px-1">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-body">
              Focus
            </p>
            <h2 className="font-serif text-xl font-semibold text-foreground mt-0.5">
              Begin a session
            </h2>
          </div>
          <div className="flex gap-1.5 p-1 rounded-full bg-muted/60 border border-border/60">
            {(["timer", "stopwatch"] as StudyMode[]).map((m) => (
              <button
                key={m}
                onClick={() => timer.setMode(m)}
                disabled={timer.isRunning}
                className={`px-4 py-1.5 rounded-full text-xs font-body transition-all ${
                  timer.mode === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                } disabled:opacity-50`}
              >
                {m === "timer" ? "Timer" : "Stopwatch"}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-card/60 border border-border/60 backdrop-blur-sm p-7 shadow-[0_2px_20px_-8px_hsl(var(--foreground)/0.08)] transition-all">
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
          ) : (
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
          )}
        </div>
      </section>

      {/* Daily Commitment */}
      <section>
        <DailyCommitment
          userId={user!.id}
          todayHours={todayHours + Math.floor(todayStopwatchMinutes / 60)}
          commitment={commitment}
          onCommitmentSet={fetchData}
        />
      </section>

      {/* Today — soft inline stats */}
      <section className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-body px-1">
          Today
        </p>
        <div className="grid grid-cols-2 divide-x divide-border/60 rounded-2xl bg-muted/40 border border-border/60 overflow-hidden">
          <div className="text-center py-5">
            <p className="text-3xl font-serif font-bold text-foreground tabular-nums">
              {todayTimerSessions}
            </p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-body mt-1">
              Timer Sessions
            </p>
          </div>
          <div className="text-center py-5">
            <p className="text-3xl font-serif font-bold text-foreground tabular-nums">
              {todayStopwatchMinutes}
              <span className="text-lg text-muted-foreground font-body ml-0.5">m</span>
            </p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-body mt-1">
              Stopwatch Time
            </p>
          </div>
        </div>
      </section>

      {/* Studying with someone? */}
      <section className="text-center pt-2">
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-body mb-3">
          Studying with a friend?
        </p>
        <StudyCallLinks />
      </section>
    </div>
  );
}
