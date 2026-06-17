// Interview Lab AI endpoint: standard + resume-based interviews.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const MODEL = "google/gemini-3-flash-preview";

type TurnMsg = { role: "interviewer" | "candidate"; text: string };
type ResumeData = {
  name?: string;
  education?: any[];
  skills?: string[];
  technologies?: string[];
  projects?: { name: string; description?: string; tech?: string[] }[];
  experience?: { company?: string; role?: string; duration?: string; description?: string }[];
  certifications?: string[];
};

async function callAI(messages: any[], jsonMode = false): Promise<string> {
  const body: any = { model: MODEL, messages };
  if (jsonMode) body.response_format = { type: "json_object" };

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`AI error ${r.status}: ${t}`);
  }
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

function resumeSummary(r: ResumeData): string {
  if (!r) return "";
  const parts: string[] = [];
  if (r.name) parts.push(`Candidate: ${r.name}`);
  if (r.education?.length) parts.push(`Education: ${JSON.stringify(r.education)}`);
  if (r.skills?.length) parts.push(`Skills: ${r.skills.join(", ")}`);
  if (r.technologies?.length) parts.push(`Technologies: ${r.technologies.join(", ")}`);
  if (r.certifications?.length) parts.push(`Certifications: ${r.certifications.join(", ")}`);
  if (r.experience?.length) parts.push(`Experience: ${JSON.stringify(r.experience)}`);
  if (r.projects?.length) parts.push(`Projects: ${JSON.stringify(r.projects)}`);
  return parts.join("\n");
}

function systemPrompt(
  domain: string,
  customTopic: string | null,
  difficulty: string,
  interviewType: string,
  resumeData?: ResumeData,
) {
  const topic = domain === "Custom Topic" && customTopic ? customTopic : domain;

  if (interviewType === "resume" && resumeData) {
    return `You are a senior technical interviewer / recruiter conducting a real ${difficulty} package-level interview based on the candidate's actual resume.

CANDIDATE RESUME:
${resumeSummary(resumeData)}

Rules:
- Behave like a real human interviewer, not a chatbot. Conversational, warm but rigorous.
- Focus HEAVILY on project deep-dives. Drill into architecture, design choices, trade-offs, scaling, failure scenarios, and why decisions were made. Continue drilling until you can tell whether the candidate actually built it.
- Also probe listed technologies/skills/certifications with realistic interview questions (similar in spirit to Glassdoor / AmbitionBox / InterviewBit / LeetCode-discussion patterns — never copy verbatim).
- Difficulty "${difficulty}" calibrates depth: 5 LPA = fundamentals; 10 LPA = applied + trade-offs; 15+ LPA = system design + edge cases; 25+ LPA = expert depth, scaling, internals, ambiguous problems.
- For Software Engineering domain, occasionally ask for pseudocode ("write pseudocode in the editor").
- Ask ONE question at a time. Keep your spoken turns SHORT (1-3 sentences). Never lecture.
- Don't repeat questions. Reference specific items from the resume by name.
- Preferred domain focus: ${topic}.`;
  }

  return `You are a senior technical interviewer conducting a real ${difficulty} package-level interview on "${topic}".

Rules:
- Behave like a real human interviewer, not a chatbot. Be conversational, warm but rigorous.
- Ask one question at a time. Follow up on weak answers. Challenge vague claims. Ask "why" and "how".
- Difficulty "${difficulty}" calibrates depth: 5 LPA = fundamentals; 10 LPA = applied + tradeoffs; 15+ LPA = design + edge cases; 25+ LPA = expert depth, scaling, internals.
- If the topic involves coding/DS&A, occasionally ask the candidate to write pseudocode (mention "write pseudocode in the editor").
- Keep your spoken turns SHORT (1-3 sentences). Never lecture.
- Don't repeat questions already asked.`;
}

function transcriptToMessages(transcript: TurnMsg[]) {
  return transcript.map((t) => ({
    role: t.role === "interviewer" ? "assistant" : "user",
    content: t.text,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      action,
      domain,
      customTopic,
      difficulty,
      transcript,
      lastQuestion,
      lastAnswer,
      interviewType = "standard",
      resumeData,
      resumeText,
    } = await req.json();

    if (action === "parse_resume") {
      const prompt = `Extract structured information from this resume text. Return JSON with this exact shape:
{
  "name": "string or empty",
  "education": [{"degree":"","institution":"","year":""}],
  "skills": ["..."],
  "technologies": ["..."],
  "projects": [{"name":"","description":"","tech":["..."]}],
  "experience": [{"company":"","role":"","duration":"","description":""}],
  "certifications": ["..."]
}

Be thorough. Capture every project, every job, every skill mentioned. Distinguish soft skills from technologies.

RESUME TEXT:
${(resumeText ?? "").slice(0, 20000)}`;

      const text = await callAI(
        [
          { role: "system", content: "You extract resume data and respond only with valid JSON." },
          { role: "user", content: prompt },
        ],
        true,
      );
      let parsed: ResumeData = {};
      try {
        parsed = JSON.parse(text);
      } catch {}
      return Response.json(parsed, { headers: corsHeaders });
    }

    const sys = systemPrompt(domain, customTopic, difficulty, interviewType, resumeData);

    if (action === "start") {
      const opener =
        interviewType === "resume"
          ? "Begin the interview. Greet the candidate briefly (one sentence, referencing their background), then ask your first question — ideally about one of their listed projects or top skills."
          : "Begin the interview. Greet the candidate briefly in one sentence, then ask your first question.";
      const text = await callAI([
        { role: "system", content: sys },
        { role: "user", content: opener },
      ]);
      return Response.json({ question: text.trim() }, { headers: corsHeaders });
    }

    if (action === "next") {
      const directive =
        interviewType === "resume"
          ? "Based on the candidate's last answer, ask the next interview question OR a sharp follow-up. Prefer drilling deeper into the current project/topic before moving on. Keep it short."
          : "Based on the candidate's last answer, ask the next interview question OR a sharp follow-up. Keep it short.";
      const msgs = [
        { role: "system", content: sys },
        ...transcriptToMessages(transcript || []),
        { role: "user", content: directive },
      ];
      const text = await callAI(msgs);
      return Response.json({ question: text.trim() }, { headers: corsHeaders });
    }

    if (action === "evaluate") {
      const resumeNote =
        interviewType === "resume" && resumeData
          ? `\nRESUME CONTEXT (for authenticity check):\n${resumeSummary(resumeData).slice(0, 2000)}`
          : "";
      const evalPrompt = `Evaluate this single Q&A from a ${difficulty} interview on "${
        domain === "Custom Topic" ? customTopic : domain
      }".${resumeNote}

QUESTION: ${lastQuestion}
ANSWER: ${lastAnswer}

Return JSON: { "score": 0-100, "feedback": "1-2 sentence evaluation", "betterAnswer": "concise model answer, 2-4 sentences" }`;
      const text = await callAI(
        [
          { role: "system", content: "You are a strict but fair technical interview evaluator. Respond only with JSON." },
          { role: "user", content: evalPrompt },
        ],
        true,
      );
      let parsed = { score: 0, feedback: "", betterAnswer: "" };
      try {
        parsed = JSON.parse(text);
      } catch {}
      return Response.json(parsed, { headers: corsHeaders });
    }

    if (action === "report") {
      const isResume = interviewType === "resume";
      const resumeNote = isResume && resumeData ? `\nRESUME:\n${resumeSummary(resumeData).slice(0, 4000)}` : "";
      const extraCats = isResume
        ? `,\n    "projectUnderstanding": 0-100,\n    "resumeAuthenticity": 0-100`
        : "";
      const reportPrompt = `Analyze this full interview transcript and produce a final report.

Domain: ${domain === "Custom Topic" ? customTopic : domain}
Difficulty: ${difficulty}
Type: ${interviewType}${resumeNote}

TRANSCRIPT:
${(transcript as TurnMsg[]).map((t) => `${t.role.toUpperCase()}: ${t.text}`).join("\n")}

Return JSON:
{
  "overallScore": 0-100,
  "categories": {
    "technicalKnowledge": 0-100,
    "communication": 0-100,
    "confidence": 0-100,
    "problemSolving": 0-100,
    "depthOfUnderstanding": 0-100${extraCats}
  },
  "strengths": ["short bullet", "..."],
  "improvements": ["short bullet", "..."],
  "summary": "2-3 sentence overall summary"
}
${isResume ? 'For "resumeAuthenticity", judge whether the candidate sounded like the real builder of their listed projects. For "projectUnderstanding", judge depth of architectural and design knowledge of their own work.' : ""}`;
      const text = await callAI(
        [
          { role: "system", content: "You are a technical interview evaluator. Respond only with JSON." },
          { role: "user", content: reportPrompt },
        ],
        true,
      );
      let parsed: any = {};
      try {
        parsed = JSON.parse(text);
      } catch {}
      return Response.json(parsed, { headers: corsHeaders });
    }

    return new Response("Unknown action", { status: 400, headers: corsHeaders });
  } catch (e: any) {
    console.error("interview-ai error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
