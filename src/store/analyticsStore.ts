import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

/* ---------------- Types ---------------- */

export interface ProfileSnapshot {
  id: string;
  username: string;
  joined_at: string;
  total_study_minutes: number;
  points: number;
  avatar_url: string | null;
}

export interface SessionRow {
  mode: string;
  duration_seconds: number;
  sessions_completed: number;
  created_at: string;
}

export interface LegacyLogRow {
  logged_at: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  total_study_minutes: number;
  battle_points: number;
  battle_wins: number;
  joined_at: string;
}

/** Map of ISO date (YYYY-MM-DD) -> minutes studied. */
export type DailyStudyHistory = Record<string, number>;

interface AnalyticsState {
  // Status
  userId: string | null;
  loading: boolean;
  loaded: boolean;
  lastFetchedAt: number | null;

  // Raw
  profile: ProfileSnapshot | null;
  sessions: SessionRow[];
  legacyLogs: LegacyLogRow[];
  leaderboard: LeaderboardEntry[];

  // Derived (single source of truth)
  totalStudyMinutes: number;
  totalPoints: number;
  totalSessions: number;
  bestDayMinutes: number;
  streak: number;
  longestStreak: number;
  rank: number | null;
  dailyStudyHistory: DailyStudyHistory;

  // Actions
  fetchAnalytics: (userId: string, opts?: { force?: boolean }) => Promise<void>;
  reset: () => void;
}

/* ---------------- Helpers ---------------- */

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildDailyHistory(
  sessions: SessionRow[],
  legacyLogs: LegacyLogRow[],
): DailyStudyHistory {
  const map: DailyStudyHistory = {};
  for (const s of sessions) {
    const key = isoDate(new Date(s.created_at));
    map[key] = (map[key] ?? 0) + Math.floor(s.duration_seconds / 60);
  }
  // Legacy hour-increment logs count as 60 minutes each.
  for (const l of legacyLogs) {
    const key = isoDate(new Date(l.logged_at));
    map[key] = (map[key] ?? 0) + 60;
  }
  return map;
}

function computeStreaks(history: DailyStudyHistory): {
  streak: number;
  longestStreak: number;
} {
  // Current streak ending today
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while ((history[isoDate(cursor)] ?? 0) > 0) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Longest streak across all known active days
  const days = Object.keys(history)
    .filter((d) => (history[d] ?? 0) > 0)
    .sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const d of days) {
    const cur = new Date(d + "T00:00:00");
    if (prev && (cur.getTime() - prev.getTime()) / 86400000 === 1) {
      run++;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = cur;
  }

  return { streak, longestStreak: longest };
}

/* ---------------- Store ---------------- */

const STALE_MS = 15_000; // skip re-fetch if very recent

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  userId: null,
  loading: false,
  loaded: false,
  lastFetchedAt: null,

  profile: null,
  sessions: [],
  legacyLogs: [],
  leaderboard: [],

  totalStudyMinutes: 0,
  totalPoints: 0,
  totalSessions: 0,
  bestDayMinutes: 0,
  streak: 0,
  longestStreak: 0,
  rank: null,
  dailyStudyHistory: {},

  fetchAnalytics: async (userId, opts) => {
    const force = opts?.force ?? false;
    const state = get();
    if (
      !force &&
      state.userId === userId &&
      state.lastFetchedAt &&
      Date.now() - state.lastFetchedAt < STALE_MS
    ) {
      return;
    }

    set({ loading: true, userId });

    const [
      { data: profileData },
      { data: sessionsData },
      { data: legacyLogsData },
      { data: leaderboardData },
      { data: leaderboardMinutesData },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, total_study_minutes, points, joined_at, avatar_url" as any)
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("study_sessions")
        .select("mode, duration_seconds, sessions_completed, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("study_logs")
        .select("logged_at")
        .eq("user_id", userId)
        .order("logged_at", { ascending: false }),
      supabase
        .from("profiles")
        .select(
          "id, username, total_study_minutes, battle_points, battle_wins, joined_at" as any,
        ),
      // SECURITY DEFINER RPC: returns derived total_minutes (sessions + legacy logs)
      // for every user, bypassing per-user RLS so the leaderboard is accurate
      // regardless of who is signed in.
      supabase.rpc("get_leaderboard_minutes" as any),
    ]);

    const profile = (profileData as unknown as ProfileSnapshot) ?? null;
    const sessions = (sessionsData ?? []) as SessionRow[];
    const legacyLogs = (legacyLogsData ?? []) as LegacyLogRow[];
    const leaderboard = ((leaderboardData ?? []) as any[]) as LeaderboardEntry[];

    const dailyStudyHistory = buildDailyHistory(sessions, legacyLogs);
    const minutesValues = Object.values(dailyStudyHistory);
    const bestDayMinutes = minutesValues.reduce(
      (max, v) => (v > max ? v : max),
      0,
    );
    const totalStudyMinutes = minutesValues.reduce((sum, v) => sum + v, 0);
    const { streak, longestStreak } = computeStreaks(dailyStudyHistory);
    const totalSessions = sessions.reduce(
      (sum, s) => sum + s.sessions_completed,
      0,
    );

    const minutesByUser: Record<string, number> = {};
    for (const row of (leaderboardMinutesData ?? []) as {
      user_id: string;
      total_minutes: number | string;
    }[]) {
      minutesByUser[row.user_id] = Number(row.total_minutes) || 0;
    }

    const sortedLeaderboard = leaderboard
      .map((p) => ({ ...p, total_study_minutes: minutesByUser[p.id] ?? 0 }))
      .sort((a, b) => b.total_study_minutes - a.total_study_minutes);
    const rankIdx = sortedLeaderboard.findIndex((p) => p.id === userId);
    const rank = rankIdx >= 0 ? rankIdx + 1 : null;

    if (import.meta.env.DEV) {
      console.log("[analytics] canonical totalStudyMinutes:", totalStudyMinutes, {
        derivedForCurrentUser: minutesByUser[userId] ?? 0,
        cachedProfileColumn: profile?.total_study_minutes,
      });
    }

    set({
      loading: false,
      loaded: true,
      lastFetchedAt: Date.now(),
      profile,
      sessions,
      legacyLogs,
      leaderboard: sortedLeaderboard,
      totalStudyMinutes,
      totalPoints: profile?.points ?? 0,
      totalSessions,
      bestDayMinutes,
      streak,
      longestStreak,
      rank,
      dailyStudyHistory,
    });
  },

  reset: () =>
    set({
      userId: null,
      loaded: false,
      lastFetchedAt: null,
      profile: null,
      sessions: [],
      legacyLogs: [],
      leaderboard: [],
      totalStudyMinutes: 0,
      totalPoints: 0,
      totalSessions: 0,
      bestDayMinutes: 0,
      streak: 0,
      longestStreak: 0,
      rank: null,
      dailyStudyHistory: {},
    }),
}));

/* ---------------- Selectors ---------------- */

/** Last N days (default 7) as ordered [{date, minutes}], oldest -> newest. */
export function selectDailyHistoryWindow(
  history: DailyStudyHistory,
  days = 7,
): { date: string; minutes: number }[] {
  const out: { date: string; minutes: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = isoDate(d);
    out.push({ date: key, minutes: history[key] ?? 0 });
  }
  return out;
}
