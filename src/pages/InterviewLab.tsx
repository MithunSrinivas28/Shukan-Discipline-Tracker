import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Mic, MicOff, StopCircle, ArrowLeft, Loader2, Volume2, Upload, FileText } from "lucide-react";
import { speak, stopSpeaking, createRecognizer, speechSupported } from "@/lib/speech";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { extractResumeText, emptyResume, type ResumeData } from "@/lib/resumeParser";
import { ResumePreview } from "@/components/ResumePreview";

const DOMAINS = [
  "Software Engineering",
  "Data Structures & Algorithms",
  "Cloud & DevOps",
  "Data Science",
  "Core ECE",
  "VLSI",
  "Embedded Systems",
  "AI / ML",
  "Electrical Networks",
  "Computer Networks",
  "Operating Systems",
  "DBMS",
  "Custom Topic",
];
const DIFFICULTIES = ["5 LPA", "10 LPA", "15+ LPA", "25+ LPA"];
const DURATIONS = [10, 20, 30];

type Turn = { role: "interviewer" | "candidate"; text: string };
type QEval = { score: number; feedback: string; betterAnswer: string };
type Phase = "setup" | "resume_upload" | "resume_review" | "interview" | "report" | "history" | "view";
type InterviewType = "standard" | "resume";

export default function InterviewLab() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("setup");
  const [interviewType, setInterviewType] = useState<InterviewType>("standard");
  const [resumeData, setResumeData] = useState<ResumeData>(emptyResume);
  const [parsingResume, setParsingResume] = useState(false);

  const [domain, setDomain] = useState(DOMAINS[0]);
  const [customTopic, setCustomTopic] = useState("");
  const [difficulty, setDifficulty] = useState(DIFFICULTIES[1]);
  const [duration, setDuration] = useState(20);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [evals, setEvals] = useState<Record<number, QEval>>({});
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [pseudocode, setPseudocode] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [report, setReport] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [viewSession, setViewSession] = useState<any | null>(null);

  const recRef = useRef<ReturnType<typeof createRecognizer>>(null);
  const supported = useMemo(() => speechSupported(), []);

  // Tick timer
  useEffect(() => {
    if (phase !== "interview" || !startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase, startedAt]);

  // Auto-finish on timeout
  useEffect(() => {
    if (phase !== "interview" || !startedAt) return;
    const elapsed = (now - startedAt) / 1000;
    if (elapsed >= duration * 60) finishInterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  async function invokeAI(payload: any) {
    const { data, error } = await supabase.functions.invoke("interview-ai", { body: payload });
    if (error) throw error;
    return data;
  }

  async function startInterview() {
    if (!user) {
      toast.error("Please sign in to start an interview");
      return;
    }
    if (!supported) {
      toast.error("Your browser doesn't support voice recognition. Use Chrome on desktop.");
      return;
    }
    setLoading(true);
    try {
      const { data: row, error } = await supabase
        .from("interview_sessions")
        .insert({
          user_id: user.id,
          domain,
          custom_topic: domain === "Custom Topic" ? customTopic : null,
          difficulty,
          duration_minutes: duration,
          status: "in_progress",
          transcript: [],
          interview_type: interviewType,
          resume_data: interviewType === "resume" ? (resumeData as any) : {},
        })
        .select()
        .single();
      if (error) throw error;
      setSessionId(row.id);

      const res = await invokeAI({
        action: "start",
        domain,
        customTopic,
        difficulty,
        interviewType,
        resumeData: interviewType === "resume" ? resumeData : undefined,
      });
      const firstQ = res.question;
      const initial: Turn[] = [{ role: "interviewer", text: firstQ }];
      setTranscript(initial);
      setEvals({});
      setStartedAt(Date.now());
      setPhase("interview");
      speakTurn(firstQ);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to start");
    } finally {
      setLoading(false);
    }
  }

  function speakTurn(text: string) {
    setSpeaking(true);
    speak(text, () => setSpeaking(false));
  }

  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    stopSpeaking();
    setSpeaking(false);
    setCurrentAnswer("");
    const rec = createRecognizer({
      onPartial: (t) => setCurrentAnswer(t),
      onFinal: (t) => setCurrentAnswer(t),
      onError: (err) => {
        if (err !== "no-speech") toast.error(`Mic: ${err}`);
      },
      onEnd: () => setListening(false),
    });
    if (!rec) {
      toast.error("Speech recognition not available");
      return;
    }
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  async function submitAnswer() {
    const answer = currentAnswer.trim();
    if (!answer && !pseudocode.trim()) {
      toast.error("Speak or write an answer first");
      return;
    }
    recRef.current?.stop();
    setListening(false);

    const fullAnswer = pseudocode.trim()
      ? `${answer}\n\n[Pseudocode]\n${pseudocode.trim()}`
      : answer;

    const lastQ = transcript[transcript.length - 1]?.text ?? "";
    const newTranscript: Turn[] = [...transcript, { role: "candidate", text: fullAnswer }];
    setTranscript(newTranscript);
    setCurrentAnswer("");
    setPseudocode("");
    setLoading(true);

    try {
      // Per-question evaluation in parallel with next-question generation
      const qIndex = newTranscript.filter((t) => t.role === "candidate").length - 1;
      const [evalRes, nextRes] = await Promise.all([
        invokeAI({
          action: "evaluate",
          domain,
          customTopic,
          difficulty,
          lastQuestion: lastQ,
          lastAnswer: fullAnswer,
          interviewType,
          resumeData: interviewType === "resume" ? resumeData : undefined,
        }),
        invokeAI({
          action: "next",
          domain,
          customTopic,
          difficulty,
          transcript: newTranscript,
          interviewType,
          resumeData: interviewType === "resume" ? resumeData : undefined,
        }),
      ]);
      setEvals((prev) => ({ ...prev, [qIndex]: evalRes }));
      const nextQ = nextRes.question;
      const updated: Turn[] = [...newTranscript, { role: "interviewer", text: nextQ }];
      setTranscript(updated);
      if (sessionId) {
        await supabase
          .from("interview_sessions")
          .update({ transcript: updated as any })
          .eq("id", sessionId);
      }
      speakTurn(nextQ);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to get next question");
    } finally {
      setLoading(false);
    }
  }

  async function finishInterview() {
    recRef.current?.stop();
    stopSpeaking();
    setListening(false);
    setSpeaking(false);
    setLoading(true);
    try {
      const rep = await invokeAI({
        action: "report",
        domain,
        customTopic,
        difficulty,
        transcript,
        interviewType,
        resumeData: interviewType === "resume" ? resumeData : undefined,
      });
      setReport(rep);
      if (sessionId) {
        await supabase
          .from("interview_sessions")
          .update({
            status: "completed",
            overall_score: rep.overallScore ?? null,
            category_scores: rep.categories ?? {},
            strengths: rep.strengths ?? [],
            improvements: rep.improvements ?? [],
            transcript: transcript as any,
            metadata: { summary: rep.summary, evals } as any,
            completed_at: new Date().toISOString(),
          })
          .eq("id", sessionId);
      }
      setPhase("report");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    if (!user) return;
    const { data, error } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setHistory(data ?? []);
    setPhase("history");
  }

  async function handleResumeFile(file: File) {
    setParsingResume(true);
    try {
      const text = await extractResumeText(file);
      if (!text || text.length < 30) {
        toast.error("Couldn't read meaningful text from this file.");
        return;
      }
      const { data, error } = await supabase.functions.invoke("interview-ai", {
        body: { action: "parse_resume", resumeText: text },
      });
      if (error) throw error;
      setResumeData({ ...emptyResume, ...data });
      setPhase("resume_review");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to parse resume");
    } finally {
      setParsingResume(false);
    }
  }

  const elapsedSec = startedAt ? Math.floor((now - startedAt) / 1000) : 0;
  const totalSec = duration * 60;
  const remaining = Math.max(0, totalSec - elapsedSec);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const progressPct = Math.min(100, (elapsedSec / totalSec) * 100);

  // ---------- RENDER ----------
  if (!user) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-serif text-3xl mb-3">Interview Lab</h1>
        <p className="text-muted-foreground mb-6">Sign in to practice voice interviews.</p>
        <Link to="/auth"><Button>Sign in</Button></Link>
      </div>
    );
  }

  if (phase === "setup") {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-4xl tracking-tight">Interview Lab</h1>
            <p className="text-muted-foreground mt-1 font-body">
              Voice-first interview practice with adaptive follow-ups.
            </p>
          </div>
          <Button variant="ghost" onClick={loadHistory}>Past interviews</Button>
        </div>

        <Card className="p-8 space-y-8 border-border/60">
          <Field label="Interview type">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setInterviewType("standard")}
                className={`text-left p-4 rounded-lg border transition ${interviewType === "standard" ? "border-foreground bg-muted/30" : "border-border/60 hover:border-foreground/40"}`}
              >
                <p className="font-medium font-body">Standard</p>
                <p className="text-xs text-muted-foreground mt-1">Topic-based interview on a domain you pick.</p>
              </button>
              <button
                onClick={() => setInterviewType("resume")}
                className={`text-left p-4 rounded-lg border transition ${interviewType === "resume" ? "border-foreground bg-muted/30" : "border-border/60 hover:border-foreground/40"}`}
              >
                <p className="font-medium font-body">Resume Interview</p>
                <p className="text-xs text-muted-foreground mt-1">Upload your resume — questions drawn from your real projects and skills.</p>
              </button>
            </div>
          </Field>

          <Field label="Domain">
            <div className="flex flex-wrap gap-2">
              {DOMAINS.map((d) => (
                <Pill key={d} active={domain === d} onClick={() => setDomain(d)}>{d}</Pill>
              ))}
            </div>
            {domain === "Custom Topic" && (
              <Input
                className="mt-3"
                placeholder="e.g. System Design for streaming platforms"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
              />
            )}
          </Field>

          <Field label="Target package">
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map((d) => (
                <Pill key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>{d}</Pill>
              ))}
            </div>
          </Field>

          <Field label="Duration">
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <Pill key={d} active={duration === d} onClick={() => setDuration(d)}>{d} min</Pill>
              ))}
            </div>
          </Field>

          {!supported && (
            <p className="text-sm text-destructive">
              Voice recognition isn't available in this browser. Please use desktop Chrome.
            </p>
          )}

          <Button size="lg" className="w-full" onClick={startInterview} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Begin Interview
          </Button>
        </Card>
      </div>
    );
  }

  if (phase === "interview") {
    const lastTurn = transcript[transcript.length - 1];
    const awaitingAnswer = lastTurn?.role === "interviewer";
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className="font-body">{domain === "Custom Topic" ? customTopic : domain} · {difficulty}</Badge>
          <div className="flex items-center gap-3 text-sm font-mono">
            <span>{mm}:{ss}</span>
            <Button variant="ghost" size="sm" onClick={finishInterview} disabled={loading}>
              <StopCircle className="h-4 w-4 mr-1" /> End
            </Button>
          </div>
        </div>
        <Progress value={progressPct} className="h-1 mb-6" />

        <Card className="p-6 mb-6 min-h-[140px] flex items-start gap-4">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-all ${speaking ? "bg-primary/20 animate-pulse" : "bg-muted"}`}>
            <Volume2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Interviewer</p>
            <p className="font-body leading-relaxed">{lastTurn?.text}</p>
          </div>
        </Card>

        {awaitingAnswer && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Your answer</p>
              <Button
                variant={listening ? "destructive" : "default"}
                size="sm"
                onClick={toggleMic}
                disabled={loading}
              >
                {listening ? <><MicOff className="h-4 w-4 mr-1" /> Stop</> : <><Mic className="h-4 w-4 mr-1" /> Speak</>}
              </Button>
            </div>
            <div className="min-h-[80px] p-3 rounded-md bg-muted/40 font-body text-sm">
              {currentAnswer || <span className="text-muted-foreground">{listening ? "Listening…" : "Tap Speak and answer naturally."}</span>}
            </div>
            <Textarea
              placeholder="Optional: pseudocode sandbox (for coding questions)"
              value={pseudocode}
              onChange={(e) => setPseudocode(e.target.value)}
              className="font-mono text-sm min-h-[100px]"
            />
            <Button onClick={submitAnswer} disabled={loading || (!currentAnswer.trim() && !pseudocode.trim())} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit answer
            </Button>
          </Card>
        )}

        {transcript.length > 1 && (
          <div className="mt-8">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Conversation</p>
            <div className="space-y-3">
              {transcript.slice(0, -1).map((t, i) => (
                <div key={i} className={`p-3 rounded-md text-sm font-body ${t.role === "interviewer" ? "bg-muted/40" : "bg-primary/5 border border-primary/10"}`}>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground mr-2">{t.role}</span>
                  {t.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === "report" && report) {
    return <ReportView report={report} transcript={transcript} evals={evals} onBack={() => { setPhase("setup"); setReport(null); setTranscript([]); setEvals({}); }} />;
  }

  if (phase === "history") {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-3xl">Past Interviews</h1>
          <Button variant="ghost" onClick={() => setPhase("setup")}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </div>
        {history.length === 0 ? (
          <p className="text-muted-foreground">No interviews yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((h) => (
              <Card key={h.id} className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition" onClick={() => { setViewSession(h); setPhase("view"); }}>
                <div>
                  <p className="font-body font-medium">{h.domain === "Custom Topic" ? h.custom_topic : h.domain}</p>
                  <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()} · {h.difficulty} · {h.duration_minutes}m</p>
                </div>
                <div className="text-right">
                  {h.overall_score != null ? (
                    <span className="font-mono text-2xl">{h.overall_score}</span>
                  ) : (
                    <Badge variant="outline">{h.status}</Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (phase === "view" && viewSession) {
    const rep = {
      overallScore: viewSession.overall_score ?? 0,
      categories: viewSession.category_scores ?? {},
      strengths: viewSession.strengths ?? [],
      improvements: viewSession.improvements ?? [],
      summary: viewSession.metadata?.summary ?? "",
    };
    const t: Turn[] = (viewSession.transcript as any) ?? [];
    const ev: Record<number, QEval> = viewSession.metadata?.evals ?? {};
    return <ReportView report={rep} transcript={t} evals={ev} onBack={() => setPhase("history")} />;
  }

  return null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-body">{label}</p>
      {children}
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-body border transition-all ${
        active
          ? "bg-foreground text-background border-foreground"
          : "border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40"
      }`}
    >
      {children}
    </button>
  );
}

function ReportView({ report, transcript, evals, onBack }: { report: any; transcript: Turn[]; evals: Record<number, QEval>; onBack: () => void }) {
  const cats = report.categories ?? {};
  const qaPairs: { q: string; a: string; idx: number }[] = [];
  let qIdx = -1;
  for (let i = 0; i < transcript.length; i++) {
    if (transcript[i].role === "interviewer" && i + 1 < transcript.length && transcript[i + 1].role === "candidate") {
      qIdx++;
      qaPairs.push({ q: transcript[i].text, a: transcript[i + 1].text, idx: qIdx });
    }
  }
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <Button variant="ghost" onClick={onBack} className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>

      <Card className="p-8 mb-6 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Overall Score</p>
        <p className="font-serif text-6xl">{report.overallScore ?? 0}</p>
        {report.summary && <p className="mt-4 text-sm font-body text-muted-foreground">{report.summary}</p>}
      </Card>

      <Card className="p-6 mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Categories</p>
        <div className="space-y-3">
          {[
            ["Technical Knowledge", cats.technicalKnowledge],
            ["Communication", cats.communication],
            ["Confidence", cats.confidence],
            ["Problem Solving", cats.problemSolving],
            ["Depth of Understanding", cats.depthOfUnderstanding],
          ].map(([label, val]) => (
            <div key={label as string}>
              <div className="flex justify-between text-sm font-body mb-1">
                <span>{label}</span>
                <span className="font-mono">{val ?? 0}</span>
              </div>
              <Progress value={(val as number) ?? 0} className="h-1" />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">What you did well</p>
          <ul className="space-y-2 text-sm font-body">
            {(report.strengths ?? []).map((s: string, i: number) => <li key={i}>• {s}</li>)}
          </ul>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">What to improve</p>
          <ul className="space-y-2 text-sm font-body">
            {(report.improvements ?? []).map((s: string, i: number) => <li key={i}>• {s}</li>)}
          </ul>
        </Card>
      </div>

      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Question breakdown</p>
      <div className="space-y-4">
        {qaPairs.map(({ q, a, idx }) => {
          const e = evals[idx];
          return (
            <Card key={idx} className="p-5 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Q{idx + 1}</p>
                <p className="font-body">{q}</p>
              </div>
              <div className="text-sm font-body p-3 rounded-md bg-muted/40 whitespace-pre-wrap">{a}</div>
              {e && (
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Evaluation</span>
                    <span className="font-mono text-sm">{e.score}/100</span>
                  </div>
                  <p className="text-sm font-body text-muted-foreground">{e.feedback}</p>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Better answer</p>
                    <p className="text-sm font-body">{e.betterAnswer}</p>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
