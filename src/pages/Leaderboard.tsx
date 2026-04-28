import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Crown, Medal, Award, Swords } from "lucide-react";

interface LeaderboardEntry {
  username: string;
  total_hours: number;
  total_study_minutes: number;
  battle_points: number;
  battle_wins: number;
  joined_at: string;
}

function getTitle(hours: number): string {
  if (hours >= 51) return "Master";
  if (hours >= 26) return "Ascetic";
  if (hours >= 11) return "Disciplined";
  return "Beginner";
}

const rankConfig: Record<number, { icon: typeof Crown; color: string; label: string }> = {
  1: { icon: Crown, color: "hsl(43 80% 65%)", label: "gold" },
  2: { icon: Medal, color: "hsl(220 10% 72%)", label: "silver" },
  3: { icon: Award, color: "hsl(30 55% 55%)", label: "bronze" },
};

type LeaderboardTab = "study" | "battle";

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [tab, setTab] = useState<LeaderboardTab>("study");

  useEffect(() => {
    const fetchData = async () => {
      const orderCol = tab === "study" ? "total_study_minutes" : "battle_points";
      const [{ data: leaderboard }, profileResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("username, total_hours, total_study_minutes, battle_points, battle_wins, joined_at" as any)
          .order(orderCol as any, { ascending: false })
          .limit(20),
        user
          ? supabase.from("profiles").select("username").eq("id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setEntries((leaderboard ?? []) as any as LeaderboardEntry[]);
      if (profileResult?.data) setCurrentUsername(profileResult.data.username);
      setLoading(false);
    };
    fetchData();
  }, [user, tab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground font-body animate-pulse-sakura">Loading...</p>
      </div>
    );
  }

  const leaderMinutes = entries.length > 0 ? entries[0].total_study_minutes : 0;
  const leaderBP = entries.length > 0 ? entries[0].battle_points : 0;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-16 animate-fade-in">
      <div className="text-center mb-10 space-y-2">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-body">
          Standings
        </p>
        <h1 className="text-4xl font-serif font-bold text-foreground tracking-tight">Leaderboard</h1>
        <p className="font-body text-muted-foreground text-sm italic">Ranked by Real Work</p>
      </div>

      {/* Tabs — pill segmented control */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex gap-1 p-1 rounded-full bg-muted/50 border border-border/40 backdrop-blur-sm">
          {(["study", "battle"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-1.5 rounded-full text-xs font-body transition-all duration-300 ${
                tab === t
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "study" ? "Solo Study" : "Study Together"}
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-center text-muted-foreground font-body">No entries yet. Be the first!</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const rank = i + 1;
            const config = rankConfig[rank];
            const isCurrentUser = currentUsername === entry.username;
            const daysSinceJoined = Math.max(
              1,
              Math.floor((Date.now() - new Date(entry.joined_at).getTime()) / 86400000)
            );
            const title = getTitle(entry.total_hours);

            if (tab === "battle") {
              const gap = leaderBP - entry.battle_points;
              return (
                <div
                  key={entry.username}
                  className={`flex items-center gap-4 rounded-2xl px-5 animate-fade-in transition-all duration-400 hover:-translate-y-0.5 ${
                    rank === 1 ? "py-5" : "py-4"
                  } ${
                    isCurrentUser
                      ? "bg-primary/8 border border-primary/30 shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.4)]"
                      : "bg-card/40 border border-border/40 backdrop-blur-sm hover:bg-card/70 hover:border-border/70 hover:shadow-[0_12px_40px_-16px_hsl(var(--foreground)/0.18)]"
                  } ${rank === 1 ? "ring-1 ring-primary/15" : ""}`}
                  style={{ animationDelay: `${i * 40}ms`, opacity: 0, animationFillMode: "forwards" }}
                >
                  <div className="w-10 flex items-center justify-center">
                    {config ? (
                      <config.icon size={rank === 1 ? 26 : 22} style={{ color: config.color }} />
                    ) : (
                      <span className="text-lg font-serif font-bold text-muted-foreground">{rank}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-body font-medium truncate ${rank === 1 ? "text-lg text-foreground" : "text-foreground"}`}>
                      {entry.username}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-body">
                        <Swords size={10} className="inline mr-0.5" />{entry.battle_wins} wins
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-serif font-bold text-foreground ${rank === 1 ? "text-2xl" : rank <= 3 ? "text-xl" : "text-lg"}`}>
                      {entry.battle_points}
                      <span className="text-xs text-muted-foreground font-body ml-0.5">bp</span>
                    </p>
                    {rank > 1 && gap > 0 && (
                      <p className="text-xs text-muted-foreground font-body">{gap}bp behind</p>
                    )}
                  </div>
                </div>
              );
            }

            // Study tab
            const totalMin = entry.total_study_minutes;
            const displayH = Math.floor(totalMin / 60);
            const displayM = totalMin % 60;
            const gap = leaderMinutes - totalMin;
            const gapH = Math.floor(gap / 60);
            const gapM = gap % 60;

            return (
              <div
                key={entry.username}
                className={`flex items-center gap-4 rounded-2xl px-5 animate-fade-in transition-all duration-400 hover:-translate-y-0.5 ${
                  rank === 1 ? "py-5" : "py-4"
                } ${
                  isCurrentUser
                    ? "bg-primary/8 border border-primary/30 shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.4)]"
                    : "bg-card/40 border border-border/40 backdrop-blur-sm hover:bg-card/70 hover:border-border/70 hover:shadow-[0_12px_40px_-16px_hsl(var(--foreground)/0.18)]"
                } ${rank === 1 ? "ring-1 ring-primary/15" : ""}`}
                style={{ animationDelay: `${i * 40}ms`, opacity: 0, animationFillMode: "forwards" }}
              >
                <div className="w-10 flex items-center justify-center">
                  {config ? (
                    <config.icon size={rank === 1 ? 26 : 22} style={{ color: config.color }} />
                  ) : (
                    <span className="text-lg font-serif font-bold text-muted-foreground">{rank}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-body font-medium truncate ${rank === 1 ? "text-lg text-foreground" : "text-foreground"}`}>
                    {entry.username}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-body italic">{title}</span>
                    <span className="text-xs text-muted-foreground/50">·</span>
                    <span className="text-xs text-muted-foreground font-body">{daysSinceJoined}d</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-serif font-bold text-foreground ${rank === 1 ? "text-2xl" : rank <= 3 ? "text-xl" : "text-lg"}`}>
                    {displayH}<span className="text-xs text-muted-foreground font-body ml-0.5">h</span>
                    {" "}{displayM}<span className="text-xs text-muted-foreground font-body ml-0.5">m</span>
                  </p>
                  {rank > 1 && gap > 0 && (
                    <p className="text-xs text-muted-foreground font-body">
                      {gapH > 0 ? `${gapH}h ` : ""}{gapM}m behind
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
