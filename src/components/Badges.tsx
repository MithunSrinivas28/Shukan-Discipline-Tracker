import type { SessionRow, DailyStudyHistory } from "@/store/analyticsStore";

interface BadgesProps {
  sessions: SessionRow[];
  totalStudyMinutes: number;
  longestStreak: number;
  dailyStudyHistory: DailyStudyHistory;
}

interface Badge {
  id: string;
  symbol: string;
  title: string;
  howTo: string;
  earned: boolean;
  progress?: string;
}

function computeBadges({
  sessions,
  totalStudyMinutes,
  longestStreak,
}: BadgesProps): Badge[] {
  const totalHours = totalStudyMinutes / 60;
  const longestSessionMin = sessions.reduce(
    (m, s) => Math.max(m, s.duration_seconds / 60),
    0,
  );
  const nightCount = sessions.filter((s) => {
    const h = new Date(s.created_at).getHours();
    return h >= 20 || h < 5;
  }).length;
  const nightRatio = sessions.length ? nightCount / sessions.length : 0;

  return [
    {
      id: "first",
      symbol: "🌱",
      title: "First Session",
      howTo: "Complete your first study session.",
      earned: sessions.length >= 1,
    },
    {
      id: "10h",
      symbol: "🍵",
      title: "10 Hours Club",
      howTo: "Reach 10 hours of total study time.",
      earned: totalHours >= 10,
      progress: `${Math.min(totalHours, 10).toFixed(1)} / 10h`,
    },
    {
      id: "50h",
      symbol: "🏮",
      title: "50 Hours Club",
      howTo: "Reach 50 hours of total study time.",
      earned: totalHours >= 50,
      progress: `${Math.min(totalHours, 50).toFixed(0)} / 50h`,
    },
    {
      id: "100h",
      symbol: "⛩",
      title: "100 Hours Club",
      howTo: "Reach 100 hours of total study time.",
      earned: totalHours >= 100,
      progress: `${Math.min(totalHours, 100).toFixed(0)} / 100h`,
    },
    {
      id: "consistent",
      symbol: "🪵",
      title: "Consistent Builder",
      howTo: "Maintain a 7-day study streak.",
      earned: longestStreak >= 7,
      progress: `${Math.min(longestStreak, 7)} / 7 days`,
    },
    {
      id: "marathoner",
      symbol: "🏔",
      title: "Marathoner",
      howTo: "Complete a single session of 3 hours or more.",
      earned: longestSessionMin >= 180,
    },
    {
      id: "night_owl",
      symbol: "🌙",
      title: "Night Owl",
      howTo: "Majority of your sessions happen after 8 PM.",
      earned: sessions.length >= 5 && nightRatio > 0.5,
    },
  ];
}

export default function Badges(props: BadgesProps) {
  const badges = computeBadges(props);
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between px-1">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-body">
          Badges
        </p>
        <p className="text-[11px] text-muted-foreground font-body tabular-nums">
          {earnedCount} / {badges.length}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 sm:grid-cols-4">
        {badges.map((b) => (
          <div
            key={b.id}
            title={`${b.title} — ${b.howTo}${b.progress ? ` (${b.progress})` : ""}`}
            className={`group relative aspect-square rounded-2xl flex flex-col items-center justify-center text-center px-1.5 transition-all duration-300 cursor-default ${
              b.earned
                ? "bg-gradient-to-br from-primary/10 to-primary/[0.02] ring-1 ring-primary/15 hover:-translate-y-0.5 hover:ring-primary/30"
                : "bg-muted/30 ring-1 ring-border/30 opacity-50 grayscale hover:opacity-70"
            }`}
          >
            <span className="text-2xl leading-none mb-1">{b.symbol}</span>
            <span className="text-[10px] font-body text-foreground/80 leading-tight">
              {b.title}
            </span>

            {/* Hover tooltip */}
            <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-10 w-44 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200">
              <div className="bg-popover border border-border/60 rounded-lg shadow-md px-3 py-2 text-left">
                <p className="text-[11px] font-serif font-semibold text-foreground">
                  {b.title}
                </p>
                <p className="text-[10px] text-muted-foreground font-body mt-0.5 leading-snug">
                  {b.howTo}
                </p>
                {b.progress && !b.earned && (
                  <p className="text-[10px] text-muted-foreground font-body mt-1 tabular-nums">
                    {b.progress}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
