import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import StreakGrid from "@/components/StreakGrid";
import FocusSignature from "@/components/FocusSignature";
import { supabase } from "@/integrations/supabase/client";
import {
  useAnalyticsStore,
  selectDailyHistoryWindow,
} from "@/store/analyticsStore";

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const profile = useAnalyticsStore((s) => s.profile);
  const sessions = useAnalyticsStore((s) => s.sessions);
  const legacyLogs = useAnalyticsStore((s) => s.legacyLogs);
  const totalStudyMinutes = useAnalyticsStore((s) => s.totalStudyMinutes);
  const totalPoints = useAnalyticsStore((s) => s.totalPoints);
  const totalSessions = useAnalyticsStore((s) => s.totalSessions);
  const bestDayMinutes = useAnalyticsStore((s) => s.bestDayMinutes);
  const rank = useAnalyticsStore((s) => s.rank);
  const dailyStudyHistory = useAnalyticsStore((s) => s.dailyStudyHistory);
  const fetchAnalytics = useAnalyticsStore((s) => s.fetchAnalytics);
  const loaded = useAnalyticsStore((s) => s.loaded);

  const [goalCompletionRate, setGoalCompletionRate] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) fetchAnalytics(user.id, { force: true });
  }, [user, authLoading, navigate, fetchAnalytics]);

  // Goal completion rate from daily_commitments vs actual daily minutes
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("daily_commitments")
        .select("target_hours, commitment_date")
        .eq("user_id", user.id);
      if (!data || data.length === 0) {
        setGoalCompletionRate(0);
        return;
      }
      let met = 0;
      for (const c of data) {
        const mins = dailyStudyHistory[c.commitment_date] ?? 0;
        if (mins / 60 >= c.target_hours) met++;
      }
      setGoalCompletionRate(met / data.length);
    })();
  }, [user, dailyStudyHistory]);

  if (authLoading || !loaded || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground font-body animate-pulse">Loading...</p>
      </div>
    );
  }

  // Last 7 days from the shared dailyStudyHistory
  const last7 = selectDailyHistoryWindow(dailyStudyHistory, 7);
  const last14 = selectDailyHistoryWindow(dailyStudyHistory, 14);

  const weekMinutes = last7.reduce((s, d) => s + d.minutes, 0);
  const prevWeekMinutes = last14
    .slice(0, 7)
    .reduce((s, d) => s + d.minutes, 0);
  const deltaMin = weekMinutes - prevWeekMinutes;

  const weekHours = +(weekMinutes / 60).toFixed(1);
  const deltaHours = +(deltaMin / 60).toFixed(1);
  const bestDayHours = +(bestDayMinutes / 60).toFixed(1);

  // Insight
  const insight = (() => {
    if (weekMinutes === 0)
      return "A quiet week. Begin again tomorrow — one hour is enough.";
    if (deltaHours > 2)
      return `You studied ${deltaHours}h more than last week. The rhythm is taking hold.`;
    if (deltaHours < -2)
      return `Last week was stronger by ${Math.abs(deltaHours)}h. Return gently.`;
    if (bestDayHours >= 4)
      return `Your best day reached ${bestDayHours}h — that depth of focus is rare.`;
    return "Steady, quiet progress. Keep showing up.";
  })();

  // Sparkline geometry — minutes per day
  const peakMin = Math.max(1, ...last7.map((d) => d.minutes));
  const peakHours = +(peakMin / 60).toFixed(1);
  const W = 280;
  const H = 64;
  const points = last7.map((d, i) => {
    const x = (i / (last7.length - 1)) * W;
    const y = H - (d.minutes / peakMin) * (H - 8) - 4;
    return [x, y] as const;
  });
  const pathD = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const areaD = `${pathD} L${W},${H} L0,${H} Z`;

  return (
    <div className="max-w-xl mx-auto py-14 px-5 space-y-14 animate-fade-in">
      {/* Header */}
      <header className="text-center space-y-3 relative">
        <div className="absolute inset-x-0 -top-8 mx-auto h-40 w-40 rounded-full bg-primary/15 blur-3xl pointer-events-none -z-10" />
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-body animate-fade-in">
          Personal report
        </p>
        <h1
          className="text-3xl font-serif font-bold text-foreground tracking-tight animate-fade-in stagger-1"
          style={{ opacity: 0, animationFillMode: "forwards" }}
        >
          {profile.username}
        </h1>
        <div
          className="pt-2 animate-fade-in stagger-2"
          style={{ opacity: 0, animationFillMode: "forwards" }}
        >
          <p className="text-7xl font-serif font-bold tabular-nums leading-none bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
            {Math.floor(totalStudyMinutes / 60)}
            <span className="text-2xl text-muted-foreground font-body ml-1">h</span>{" "}
            {totalStudyMinutes % 60}
            <span className="text-2xl text-muted-foreground font-body ml-1">m</span>
          </p>
          <p className="text-xs text-muted-foreground font-body mt-3 tracking-[0.15em]">
            of focused study, all-time
          </p>
        </div>
      </header>

      {/* This week */}
      <section className="space-y-2 text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-body">
          This week
        </p>
        <p className="font-serif text-2xl font-semibold text-foreground">
          {weekHours} hours
          <span className="text-muted-foreground font-body text-base font-normal ml-2">
            {deltaHours === 0
              ? "· steady"
              : deltaHours > 0
              ? `· +${deltaHours}h vs last`
              : `· ${deltaHours}h vs last`}
          </span>
        </p>
      </section>

      {/* Insight */}
      <section className="text-center px-2">
        <p className="font-serif italic text-foreground/80 text-base leading-relaxed text-balance">
          “{insight}”
        </p>
      </section>

      {/* Trend graph */}
      <section className="space-y-3">
        <div className="flex items-end justify-between px-1">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-body">
            Last 7 days
          </p>
          <p className="text-[11px] text-muted-foreground font-body tabular-nums">
            peak {peakHours}h
          </p>
        </div>
        <div className="px-2 py-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaD} fill="url(#sparkFill)" />
            <path
              d={pathD}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="2" fill="hsl(var(--primary))" />
            ))}
          </svg>
          <div className="flex justify-between text-[10px] text-muted-foreground font-body mt-1 px-0.5">
            {last7.map((d, i) => (
              <span key={i} className="tabular-nums">
                {new Date(d.date + "T00:00:00").toLocaleDateString(undefined, {
                  weekday: "narrow",
                })}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Key stats */}
      <section>
        <div className="flex items-center justify-between text-center divide-x divide-border/40">
          <div className="flex-1 px-2">
            <p className="text-2xl font-serif font-bold text-foreground tabular-nums">
              {totalPoints}
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-body mt-1">
              Points
            </p>
          </div>
          <div className="flex-1 px-2">
            <p className="text-2xl font-serif font-bold text-foreground tabular-nums">
              {bestDayHours}
              <span className="text-sm text-muted-foreground font-body ml-0.5">h</span>
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-body mt-1">
              Best day
            </p>
          </div>
          <div className="flex-1 px-2">
            <p className="text-2xl font-serif font-bold text-foreground tabular-nums">
              {totalSessions}
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-body mt-1">
              Sessions
            </p>
          </div>
          <div className="flex-1 px-2">
            <p className="text-2xl font-serif font-bold text-foreground tabular-nums">
              {rank ? `#${rank}` : "—"}
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-body mt-1">
              Rank
            </p>
          </div>
        </div>
      </section>

      {/* Activity heatmap */}
      <section className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-body px-1">
          Study activity
        </p>
        <div className="overflow-hidden">
          <StreakGrid logs={legacyLogs} sessions={sessions} />
        </div>
      </section>

      <p className="text-center text-[11px] text-muted-foreground font-body pt-4">
        Joined{" "}
        {new Date(profile.joined_at).toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        })}
      </p>
    </div>
  );
}
