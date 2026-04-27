import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Users, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FocusSession {
  id: string;
  created_by: string;
  status: string;
  focus_duration: number;
  break_duration: number;
  started_at: string | null;
  ended_at: string | null;
}

interface Participant {
  id: string;
  user_id: string;
  username: string;
  status: string;
  points_earned: number;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function FocusRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [session, setSession] = useState<FocusSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Fetch session data
  const fetchSession = async () => {
    if (!roomId || !user) return;

    const { data: sess } = await supabase
      .from("focus_sessions")
      .select("*")
      .eq("id", roomId)
      .maybeSingle();

    if (!sess) {
      toast({ title: "Session not found", variant: "destructive" });
      navigate("/dashboard");
      return;
    }

    setSession(sess as FocusSession);

    const { data: parts } = await supabase
      .from("focus_participants")
      .select("id, user_id, status, points_earned")
      .eq("session_id", roomId);

    if (parts) {
      const userIds = parts.map((p) => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds);
      const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.username]));
      setParticipants(
        parts.map((p) => ({
          ...p,
          username: nameMap.get(p.user_id) ?? "Unknown",
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    fetchSession();
  }, [user, authLoading, roomId]);

  // Realtime subscription
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`focus-room-${roomId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "focus_sessions",
        filter: `id=eq.${roomId}`,
      }, () => fetchSession())
      .on("postgres_changes", {
        event: "*", schema: "public", table: "focus_participants",
        filter: `session_id=eq.${roomId}`,
      }, () => fetchSession())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  // Timer tick
  useEffect(() => {
    if (session?.status !== "in_progress" || !session.started_at) return;
    const tick = () => {
      const start = new Date(session.started_at!).getTime();
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session?.status, session?.started_at]);

  // Auto-complete when time is up
  useEffect(() => {
    if (!session || session.status !== "in_progress") return;
    const total = session.focus_duration + session.break_duration;
    if (elapsed >= total && !completed) {
      setCompleted(true);
      handleComplete();
    }
  }, [elapsed, session, completed]);

  const isFocusPhase = elapsed < (session?.focus_duration ?? 0);
  const totalDuration = session ? session.focus_duration + session.break_duration : 0;
  const isBreakPhase = !isFocusPhase && elapsed < totalDuration;
  const phaseRemaining = isFocusPhase
    ? (session?.focus_duration ?? 0) - elapsed
    : isBreakPhase
    ? totalDuration - elapsed
    : 0;
  const progress = isFocusPhase
    ? elapsed / (session?.focus_duration ?? 1)
    : isBreakPhase
    ? (elapsed - (session?.focus_duration ?? 0)) / (session?.break_duration ?? 1)
    : 1;

  const handleLeave = async () => {
    if (!user || !session || leaving) return;
    setLeaving(true);
    const now = new Date().toISOString();
    const earnedEarly = elapsed >= (session.focus_duration) ? 50 : 10;

    // Mark self as left
    await supabase.from("focus_participants")
      .update({ status: "left", left_at: now, points_earned: earnedEarly } as any)
      .eq("session_id", session.id)
      .eq("user_id", user.id);

    // Award battle points to self
    const { data: myProfile } = await supabase.from("profiles").select("battle_points").eq("id", user.id).maybeSingle();
    await supabase.from("profiles")
      .update({ battle_points: (myProfile?.battle_points ?? 0) + earnedEarly })
      .eq("id", user.id);

    // If left early during focus, other participant wins
    if (elapsed < session.focus_duration) {
      const other = participants.find((p) => p.user_id !== user.id && p.status === "joined");
      if (other) {
        const { data: otherProfile } = await supabase.from("profiles")
          .select("battle_points, battle_wins").eq("id", other.user_id).maybeSingle();
        await supabase.from("focus_participants")
          .update({ points_earned: 80 } as any)
          .eq("id", other.id);
        await supabase.from("profiles")
          .update({
            battle_points: (otherProfile?.battle_points ?? 0) + 80,
            battle_wins: (otherProfile?.battle_wins ?? 0) + 1,
          })
          .eq("id", other.user_id);
      }
    }

    // Add study minutes
    const mins = Math.floor(elapsed / 60);
    if (mins > 0) {
      await supabase.rpc("increment_study_minutes", { p_user_id: user.id, p_minutes: mins });
    }

    // Check if everyone left
    const { data: remaining } = await supabase
      .from("focus_participants")
      .select("status")
      .eq("session_id", session.id)
      .eq("status", "joined");

    if (!remaining || remaining.length === 0) {
      await supabase.from("focus_sessions")
        .update({ status: "completed", ended_at: now } as any)
        .eq("id", session.id);
    }

    toast({ title: "You left the session", description: `Earned ${earnedEarly} battle points` });
    navigate("/dashboard");
  };

  const handleComplete = async () => {
    if (!user || !session) return;
    const now = new Date().toISOString();

    // Award 50 points to all remaining joined participants
    const joined = participants.filter((p) => p.status === "joined");
    for (const p of joined) {
      await supabase.from("focus_participants")
        .update({ status: "completed", left_at: now, points_earned: 50 } as any)
        .eq("id", p.id);
      const { data: prof } = await supabase.from("profiles")
        .select("battle_points").eq("id", p.user_id).maybeSingle();
      await supabase.from("profiles")
        .update({ battle_points: (prof?.battle_points ?? 0) + 50 })
        .eq("id", p.user_id);

      const focusMins = Math.floor(session.focus_duration / 60);
      await supabase.rpc("increment_study_minutes", { p_user_id: p.user_id, p_minutes: focusMins });
    }

    await supabase.from("focus_sessions")
      .update({ status: "completed", ended_at: now } as any)
      .eq("id", session.id);

    toast({ title: "Session complete!", description: "Both participants earned 50 battle points" });
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground font-body animate-pulse">Loading session...</p>
      </div>
    );
  }

  // Session completed state
  if (session?.status === "completed") {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <CheckCircle2 size={48} className="mx-auto mb-4 text-primary" />
        <h1 className="text-2xl font-serif font-bold text-foreground mb-2">Session Complete</h1>
        <p className="text-muted-foreground font-body text-sm mb-6">Great discipline. Points have been awarded.</p>
        <div className="flex justify-center gap-4 mb-6">
          {participants.map((p) => (
            <div key={p.id} className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-1">
                <span className="text-lg font-serif font-bold text-primary">
                  {p.username[0].toUpperCase()}
                </span>
              </div>
              <p className="text-sm font-body text-foreground">{p.username}</p>
              <p className="text-xs text-muted-foreground font-body">
                {p.points_earned}bp · {p.status === "left" ? "Left early" : "Completed"}
              </p>
            </div>
          ))}
        </div>
        <Button onClick={() => navigate("/dashboard")} className="font-body">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // Pending state - waiting for friend to join
  if (session?.status === "pending") {
    const invited = participants.find((p) => p.status === "invited");
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <Clock size={32} className="mx-auto mb-3 text-muted-foreground animate-pulse" />
        <h1 className="text-xl font-serif font-bold text-foreground mb-2">
          Waiting for {invited?.username ?? "friend"} to join...
        </h1>
        <p className="text-sm text-muted-foreground font-body mb-6">They've been notified</p>
        <Button variant="outline" onClick={handleLeave} className="font-body">
          Cancel
        </Button>
      </div>
    );
  }

  // Active session - shared study room
  const phase = isFocusPhase ? "Focus" : isBreakPhase ? "Break" : "Complete";

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Users size={16} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-body uppercase tracking-widest">Focus Room</span>
        </div>
        <p className="text-xs text-muted-foreground font-body">
          Shared {phase} · {participants.filter(p => p.status === "joined").length} studying
        </p>
      </div>

      {/* Timer */}
      <div className="bg-card rounded-2xl border border-border p-8 mb-6 text-center">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-wide mb-3">
          {phase} Phase
        </p>
        <p className="text-6xl font-serif font-bold text-foreground tabular-nums tracking-tight mb-4">
          {formatTime(Math.max(0, phaseRemaining))}
        </p>

        {/* Progress bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-6">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isFocusPhase ? "bg-primary" : "bg-accent"
            }`}
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>

        {/* Participants */}
        <div className="flex justify-center gap-8">
          {participants.filter(p => p.status === "joined" || p.status === "completed").map((p) => (
            <div key={p.id} className="text-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2 ${
                p.status === "left" ? "bg-muted" : "bg-primary/20"
              }`}>
                <span className={`text-xl font-serif font-bold ${
                  p.status === "left" ? "text-muted-foreground" : "text-primary"
                }`}>
                  {p.username[0].toUpperCase()}
                </span>
              </div>
              <p className="text-sm font-body text-foreground">{p.username}</p>
              {p.status === "left" && (
                <p className="text-xs text-destructive font-body">Left</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Leave button */}
      <div className="flex justify-center">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleLeave}
          disabled={leaving}
          className="font-body"
        >
          <LogOut size={14} className="mr-1.5" />
          {elapsed < (session?.focus_duration ?? 0)
            ? "Leave Early (fewer points)"
            : "Leave Session"}
        </Button>
      </div>
    </div>
  );
}
