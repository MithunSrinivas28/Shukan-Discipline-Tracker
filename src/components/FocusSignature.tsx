import { useMemo } from "react";
import type { SessionRow, DailyStudyHistory } from "@/store/analyticsStore";

export { buildTraits };
export type { Trait, TraitId };

interface FocusSignatureProps {
  sessions: SessionRow[];
  dailyStudyHistory: DailyStudyHistory;
  goalCompletionRate?: number; // 0..1, optional
}

type TraitId =
  | "night_owl"
  | "early_bird"
  | "marathoner"
  | "sprinter"
  | "consistent_builder"
  | "burst_studier"
  | "precision_planner";

interface Trait {
  id: TraitId;
  title: string;
  symbol: string;
  description: string;
  insight: string;
  score: number;
}

function buildTraits(
  sessions: SessionRow[],
  history: DailyStudyHistory,
  goalRate: number,
): Trait[] {
  const totalSeconds = sessions.reduce((s, x) => s + x.duration_seconds, 0);
  const sessionCount = sessions.length || 1;
  const avgMinutes = totalSeconds / 60 / sessionCount;

  // Time-of-day distribution from session start times
  let nightCount = 0; // 21:00–04:59
  let morningCount = 0; // 05:00–10:59
  for (const s of sessions) {
    const h = new Date(s.created_at).getHours();
    if (h >= 21 || h < 5) nightCount++;
    else if (h >= 5 && h < 11) morningCount++;
  }
  const nightRatio = nightCount / sessionCount;
  const morningRatio = morningCount / sessionCount;

  // Streak consistency: % of last 30 days with any study
  const days30: number[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = d.toISOString().split("T")[0];
    days30.push(history[k] ?? 0);
  }
  const activeDays = days30.filter((m) => m > 0).length;
  const consistency = activeDays / 30;

  // Day-to-day variance — for burst vs consistent
  const activeMins = days30.filter((m) => m > 0);
  let variance = 0;
  if (activeMins.length > 1) {
    const mean = activeMins.reduce((a, b) => a + b, 0) / activeMins.length;
    variance =
      Math.sqrt(
        activeMins.reduce((a, b) => a + (b - mean) ** 2, 0) / activeMins.length,
      ) / Math.max(mean, 1);
  }

  const avgH = (avgMinutes / 60).toFixed(1);

  const traits: Trait[] = [
    {
      id: "marathoner",
      title: "Marathoner",
      symbol: "🏔",
      description: "Built for long, immersive deep-work sessions.",
      insight: `Your sessions average ${avgH}h — you thrive in extended focus where ideas deepen.`,
      score: Math.min(1, avgMinutes / 75),
    },
    {
      id: "sprinter",
      title: "Sprinter",
      symbol: "⚡",
      description: "Sharp, contained bursts of focus.",
      insight: `Short, decisive sessions (around ${avgH}h) suit how you think — momentum over endurance.`,
      score: avgMinutes > 0 && avgMinutes <= 30 ? 1 - avgMinutes / 30 : 0,
    },
    {
      id: "night_owl",
      title: "Night Owl",
      symbol: "🌙",
      description: "The world quiets, your mind opens.",
      insight: `${Math.round(nightRatio * 100)}% of your sessions happen after 9pm — your clearest hours are nocturnal.`,
      score: nightRatio,
    },
    {
      id: "early_bird",
      title: "Early Bird",
      symbol: "🌅",
      description: "Mornings are your sharpest hours.",
      insight: `${Math.round(morningRatio * 100)}% of your study lands before 11am — you lead the day, not chase it.`,
      score: morningRatio,
    },
    {
      id: "consistent_builder",
      title: "Consistent Builder",
      symbol: "🪵",
      description: "Quiet, daily presence over flashy effort.",
      insight: `You showed up ${activeDays} of the last 30 days. Practice compounds in the unseen days.`,
      score: consistency,
    },
    {
      id: "burst_studier",
      title: "Burst Studier",
      symbol: "🌊",
      description: "Waves of intensity, then rest.",
      insight: `Your effort moves in tides — heavy days followed by quiet ones. It's a rhythm, not a flaw.`,
      score: variance > 0.6 ? Math.min(1, variance) : 0,
    },
    {
      id: "precision_planner",
      title: "Precision Planner",
      symbol: "🎯",
      description: "You set a target and meet it.",
      insight: `You complete ${Math.round(goalRate * 100)}% of the daily commitments you set — intention matched by follow-through.`,
      score: goalRate,
    },
  ];

  return traits.sort((a, b) => b.score - a.score);
}

export default function FocusSignature({
  sessions,
  dailyStudyHistory,
  goalCompletionRate = 0,
}: FocusSignatureProps) {
  const ranked = useMemo(
    () => buildTraits(sessions, dailyStudyHistory, goalCompletionRate),
    [sessions, dailyStudyHistory, goalCompletionRate],
  );

  // Need at least some signal to show a signature
  const hasSignal = sessions.length >= 3;

  if (!hasSignal) {
    return (
      <section className="space-y-3 text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-body">
          Focus signature
        </p>
        <p className="font-serif italic text-foreground/60 text-sm leading-relaxed text-balance px-4">
          Your study identity will emerge after a few sessions. Keep going — the
          shape is forming.
        </p>
      </section>
    );
  }

  const primary = ranked[0];
  const secondary = ranked.slice(1, 3).filter((t) => t.score > 0.15);

  return (
    <section className="space-y-6">
      <div className="text-center space-y-1">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-body">
          Focus signature
        </p>
        <p className="text-[11px] text-muted-foreground/70 font-body italic">
          Your study identity, drawn from how you actually work
        </p>
      </div>

      {/* Primary trait */}
      <div className="relative text-center px-2 py-6">
        <div className="absolute inset-x-0 top-0 mx-auto h-32 w-32 rounded-full bg-primary/10 blur-3xl pointer-events-none -z-10" />
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-body mb-3">
          Primary trait
        </p>
        <p className="text-4xl mb-2 leading-none">{primary.symbol}</p>
        <h3 className="font-serif text-2xl font-semibold text-foreground tracking-tight">
          {primary.title}
        </h3>
        <p className="text-sm text-muted-foreground font-body mt-2 max-w-sm mx-auto">
          {primary.description}
        </p>
        <p className="font-serif italic text-foreground/80 text-base leading-relaxed text-balance mt-5 max-w-md mx-auto">
          “{primary.insight}”
        </p>
      </div>

      {/* Secondary traits */}
      {secondary.length > 0 && (
        <div className="space-y-4 pt-2">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-body text-center">
            Also you
          </p>
          <div className="space-y-3">
            {secondary.map((t) => (
              <div
                key={t.id}
                className="flex gap-4 items-start px-2 py-3 border-t border-border/30"
              >
                <span className="text-xl leading-none pt-0.5">{t.symbol}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-base font-semibold text-foreground">
                    {t.title}
                  </p>
                  <p className="text-xs text-muted-foreground font-body mt-0.5 leading-relaxed">
                    {t.insight}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
