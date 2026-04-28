import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import StreakGrid from "@/components/StreakGrid";

interface ProfileData {
  username: string;
  total_hours: number;
  points: number;
  joined_at: string;
}

interface StudySession {
  mode: string;
  duration_seconds: number;
  sessions_completed: number;
  created_at: string;
}

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [studyLogs, setStudyLogs] = useState<{ logged_at: string }[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (!user) return;

    const fetchAll = async () => {
      const [{ data: p }, { data: logs }, { data: sess }, { data: allProfiles }] = await Promise.all([
        supabase.from("profiles").select("username, total_hours, points, joined_at").eq("id", user.id).maybeSingle(),
        supabase.from("study_logs").select("logged_at").eq("user_id", user.id).order("logged_at", { ascending: false }),
        supabase.from("study_sessions").select("mode, duration_seconds, sessions_completed, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, total_hours").order("total_hours", { ascending: false }),
      ]);
      if (p) setProfile(p);
      setStudyLogs(logs ?? []);
      setSessions(sess ?? []);
      if (allProfiles) {
        const idx = allProfiles.findIndex((pr) => pr.id === user.id);
        setRank(idx >= 0 ? idx + 1 : null);
      }
    };
    fetchAll();
  }, [user, authLoading, navigate]);

  const analytics = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const prevWeekAgo = new Date(now);
    prevWeekAgo.setDate(prevWeekAgo.getDate() - 14);

    const dayMap: Record<string, number> = {};
    let weekHours = 0;
    let prevWeekHours = 0;

    for (const log of studyLogs) {
      const d = new Date(log.logged_at);
      const dateStr = d.toISOString().split("T")[0];
      dayMap[dateStr] = (dayMap[dateStr] ?? 0) + 1;
      if (d >= weekAgo) weekHours++;
      else if (d >= prevWeekAgo) prevWeekHours++;
    }

    const totalSessionCount = sessions.reduce((sum, s) => sum + s.sessions_completed, 0);
    const bestDayHours = Object.values(dayMap).length > 0 ? Math.max(...Object.values(dayMap)) : 0;
    const totalDays = Object.keys(dayMap).length;
    const avgHours = totalDays > 0 ? studyLogs.length / totalDays : 0;

    // Last 7 days array for sparkline
    const last7: { date: string; hours: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      last7.push({ date: key, hours: dayMap[key] ?? 0 });
    }

    const delta = weekHours - prevWeekHours;
    return {
      weekHours,
      prevWeekHours,
      delta,
      bestDayHours,
      avgHours,
      totalSessionCount,
      last7,
    };
  }, [studyLogs, sessions]);

  if (authLoading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground font-body animate-pulse">Loading...</p>
      </div>
    );
  }

  // Insight line — single calm sentence
  const insight = (() => {
    const { weekHours, delta, bestDayHours, avgHours } = analytics;
    if (weekHours === 0) return "A quiet week. Begin again tomorrow — one hour is enough.";
    if (delta > 2) return `You studied ${delta} more hours than last week. The rhythm is taking hold.`;
    if (delta < -2) return `Last week was stronger by ${Math.abs(delta)} hours. Return gently.`;
    if (bestDayHours >= 4) return `Your best day reached ${bestDayHours} hours — that depth of focus is rare.`;
    if (avgHours >= 2) return `You're averaging ${avgHours.toFixed(1)} hours per active day. Consistency is becoming character.`;
    return "Steady, quiet progress. Keep showing up.";
  })();

  // Sparkline geometry
  const maxHr = Math.max(1, ...analytics.last7.map((d) => d.hours));
  const W = 280;
  const H = 64;
  const points = analytics.last7.map((d, i) => {
    const x = (i / (analytics.last7.length - 1)) * W;
    const y = H - (d.hours / maxHr) * (H - 8) - 4;
    return [x, y] as const;
  });
  const pathD = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaD = `${pathD} L${W},${H} L0,${H} Z`;

  return (
    <div className="max-w-xl mx-auto py-14 px-5 space-y-14 animate-fade-in">
      {/* Header — name + total */}
      <header className="text-center space-y-3 relative">
        {/* Soft glow behind hero */}
        <div className="absolute inset-x-0 -top-8 mx-auto h-40 w-40 rounded-full bg-primary/15 blur-3xl pointer-events-none -z-10" />
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-body animate-fade-in">
          Personal report
        </p>
        <h1 className="text-3xl font-serif font-bold text-foreground tracking-tight animate-fade-in stagger-1" style={{ opacity: 0, animationFillMode: "forwards" }}>
          {profile.username}
        </h1>
        <div className="pt-2 animate-fade-in stagger-2" style={{ opacity: 0, animationFillMode: "forwards" }}>
          <p className="text-7xl font-serif font-bold tabular-nums leading-none bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
            {profile.total_hours}
            <span className="text-2xl text-muted-foreground font-body ml-1">h</span>
          </p>
          <p className="text-xs text-muted-foreground font-body mt-3 tracking-[0.15em]">
            of focused study, all-time
          </p>
        </div>
      </header>

      {/* Weekly summary — flowing line */}
      <section className="space-y-2 text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-body">
          This week
        </p>
        <p className="font-serif text-2xl font-semibold text-foreground">
          {analytics.weekHours} hours
          <span className="text-muted-foreground font-body text-base font-normal ml-2">
            {analytics.delta === 0
              ? "· steady"
              : analytics.delta > 0
              ? `· +${analytics.delta} vs last`
              : `· ${analytics.delta} vs last`}
          </span>
        </p>
      </section>

      {/* Insight line */}
      <section className="text-center px-2">
        <p className="font-serif italic text-foreground/80 text-base leading-relaxed text-balance">
          “{insight}”
        </p>
      </section>

      {/* Trend graph — minimal sparkline */}
      <section className="space-y-3">
        <div className="flex items-end justify-between px-1">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-body">
            Last 7 days
          </p>
          <p className="text-[11px] text-muted-foreground font-body tabular-nums">
            peak {maxHr}h
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
              <circle
                key={i}
                cx={x}
                cy={y}
                r="2"
                fill="hsl(var(--primary))"
                className="transition-all"
              />
            ))}
          </svg>
          <div className="flex justify-between text-[10px] text-muted-foreground font-body mt-1 px-0.5">
            {analytics.last7.map((d, i) => (
              <span key={i} className="tabular-nums">
                {new Date(d.date).toLocaleDateString(undefined, { weekday: "narrow" })}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Key stats — inline, divider-separated, no boxes */}
      <section>
        <div className="flex items-center justify-between text-center divide-x divide-border/40">
          <div className="flex-1 px-2">
            <p className="text-2xl font-serif font-bold text-foreground tabular-nums">
              {profile.points}
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-body mt-1">
              Points
            </p>
          </div>
          <div className="flex-1 px-2">
            <p className="text-2xl font-serif font-bold text-foreground tabular-nums">
              {analytics.bestDayHours}
              <span className="text-sm text-muted-foreground font-body ml-0.5">h</span>
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-body mt-1">
              Best day
            </p>
          </div>
          <div className="flex-1 px-2">
            <p className="text-2xl font-serif font-bold text-foreground tabular-nums">
              {analytics.totalSessionCount}
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

      {/* Activity heatmap — open canvas */}
      <section className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-body px-1">
          Study activity
        </p>
        <div className="overflow-hidden">
          <StreakGrid logs={studyLogs} sessions={sessions} />
        </div>
      </section>

      <p className="text-center text-[11px] text-muted-foreground font-body pt-4">
        Joined {new Date(profile.joined_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
      </p>
    </div>
  );
}
