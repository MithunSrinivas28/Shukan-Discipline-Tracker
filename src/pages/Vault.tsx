import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Copy, Check, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import hljs from "highlight.js/lib/common";
import "highlight.js/styles/github.css";

// ---------- Types ----------
type Flashcard = {
  id: string;
  user_id: string;
  title: string;
  question: string;
  answer: string;
  tags: string[];
  source: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type Snippet = {
  id: string;
  user_id: string;
  title: string;
  language: string;
  code: string;
  tags: string[];
  notes: string | null;
  source: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const LANGUAGES = [
  "plaintext",
  "javascript",
  "typescript",
  "python",
  "cpp",
  "c",
  "java",
  "csharp",
  "go",
  "rust",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "sql",
  "bash",
  "html",
  "css",
  "json",
  "yaml",
  "markdown",
];

function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

// ---------- Page ----------
export default function Vault() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState<"flashcards" | "snippets">("flashcards");
  const [query, setQuery] = useState("");

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [creatingCard, setCreatingCard] = useState(false);
  const [editingSnip, setEditingSnip] = useState<Snippet | null>(null);
  const [creatingSnip, setCreatingSnip] = useState(false);

  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [langFilter, setLangFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    const [f, s] = await Promise.all([
      (supabase.from("flashcards" as any) as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      (supabase.from("code_snippets" as any) as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    if (f.error) toast({ title: "Failed to load flashcards", description: f.error.message, variant: "destructive" });
    if (s.error) toast({ title: "Failed to load snippets", description: s.error.message, variant: "destructive" });
    setFlashcards((f.data as Flashcard[]) || []);
    setSnippets((s.data as Snippet[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Filtered lists
  const q = query.trim().toLowerCase();
  const filteredCards = useMemo(() => {
    return flashcards.filter((c) => {
      if (tagFilter && !c.tags.includes(tagFilter)) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.question.toLowerCase().includes(q) ||
        c.answer.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [flashcards, q, tagFilter]);

  const filteredSnips = useMemo(() => {
    return snippets.filter((s) => {
      if (langFilter && s.language !== langFilter) return false;
      if (tagFilter && !s.tags.includes(tagFilter)) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.language.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [snippets, q, tagFilter, langFilter]);

  const allCardTags = useMemo(
    () => Array.from(new Set(flashcards.flatMap((c) => c.tags))).sort(),
    [flashcards],
  );
  const allSnipTags = useMemo(
    () => Array.from(new Set(snippets.flatMap((s) => s.tags))).sort(),
    [snippets],
  );
  const allLanguages = useMemo(
    () => Array.from(new Set(snippets.map((s) => s.language))).sort(),
    [snippets],
  );

  // ---------- Actions ----------
  const saveCard = async (data: Partial<Flashcard>, id?: string) => {
    if (!user) return;
    if (id) {
      const { error } = await (supabase.from("flashcards" as any) as any)
        .update({
          title: data.title,
          question: data.question,
          answer: data.answer,
          tags: data.tags,
        })
        .eq("id", id);
      if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      const { error } = await (supabase.from("flashcards" as any) as any).insert({
        user_id: user.id,
        title: data.title,
        question: data.question,
        answer: data.answer,
        tags: data.tags || [],
      });
      if (error) return toast({ title: "Create failed", description: error.message, variant: "destructive" });
    }
    setCreatingCard(false);
    setEditingCard(null);
    refresh();
  };

  const deleteCard = async (id: string) => {
    const { error } = await (supabase.from("flashcards" as any) as any).delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    refresh();
  };

  const saveSnip = async (data: Partial<Snippet>, id?: string) => {
    if (!user) return;
    if (id) {
      const { error } = await (supabase.from("code_snippets" as any) as any)
        .update({
          title: data.title,
          language: data.language,
          code: data.code,
          tags: data.tags,
          notes: data.notes,
        })
        .eq("id", id);
      if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      const { error } = await (supabase.from("code_snippets" as any) as any).insert({
        user_id: user.id,
        title: data.title,
        language: data.language || "plaintext",
        code: data.code,
        tags: data.tags || [],
        notes: data.notes,
      });
      if (error) return toast({ title: "Create failed", description: error.message, variant: "destructive" });
    }
    setCreatingSnip(false);
    setEditingSnip(null);
    refresh();
  };

  const deleteSnip = async (id: string) => {
    const { error } = await (supabase.from("code_snippets" as any) as any).delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    refresh();
  };

  if (authLoading || !user) return null;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 space-y-8 animate-fade-in">
      {/* Header */}
      <header className="space-y-2 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-body">
          The Vault
        </p>
        <h1 className="font-serif text-4xl font-bold text-foreground">
          Your knowledge, kept
        </h1>
        <p className="text-sm text-muted-foreground font-body">
          A quiet place for flashcards and code worth remembering.
        </p>
      </header>

      {/* Search */}
      <div className="relative max-w-xl mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles, content, tags…"
          className="pl-9 font-body"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-center gap-1 p-1 rounded-full bg-muted/60 border border-border/50 w-fit mx-auto">
        {([
          { id: "flashcards", label: "Flashcards", count: flashcards.length },
          { id: "snippets", label: "Code Snippets", count: snippets.length },
        ] as const).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setTagFilter(null);
                setLangFilter(null);
              }}
              className={`px-5 py-1.5 rounded-full text-xs font-body transition-all duration-300 ${
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}{" "}
              <span className={active ? "opacity-70" : "opacity-50"}>({t.count})</span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {tab === "flashcards" && allCardTags.length > 0 && (
            <TagPills tags={allCardTags} active={tagFilter} onPick={setTagFilter} />
          )}
          {tab === "snippets" && (
            <>
              {allLanguages.length > 0 && (
                <Pills
                  label="Lang"
                  items={allLanguages}
                  active={langFilter}
                  onPick={setLangFilter}
                />
              )}
              {allSnipTags.length > 0 && (
                <TagPills tags={allSnipTags} active={tagFilter} onPick={setTagFilter} />
              )}
            </>
          )}
        </div>
        <Button
          onClick={() => (tab === "flashcards" ? setCreatingCard(true) : setCreatingSnip(true))}
          className="font-body btn-press"
        >
          <Plus className="h-4 w-4 mr-1" />
          {tab === "flashcards" ? "New flashcard" : "New snippet"}
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-center text-sm text-muted-foreground font-body py-12">Loading…</p>
      ) : tab === "flashcards" ? (
        filteredCards.length === 0 ? (
          <EmptyState
            label="No flashcards yet"
            hint="Start by capturing one question worth remembering."
            cta="Create your first flashcard"
            onCta={() => setCreatingCard(true)}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCards.map((c) => (
              <FlashcardItem
                key={c.id}
                card={c}
                onEdit={() => setEditingCard(c)}
                onDelete={() => deleteCard(c.id)}
              />
            ))}
          </div>
        )
      ) : filteredSnips.length === 0 ? (
        <EmptyState
          label="No snippets yet"
          hint="Save code you want to return to."
          cta="Create your first snippet"
          onCta={() => setCreatingSnip(true)}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredSnips.map((s) => (
            <SnippetItem
              key={s.id}
              snip={s}
              onEdit={() => setEditingSnip(s)}
              onDelete={() => deleteSnip(s.id)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <FlashcardDialog
        open={creatingCard || !!editingCard}
        card={editingCard}
        onClose={() => {
          setCreatingCard(false);
          setEditingCard(null);
        }}
        onSave={saveCard}
      />
      <SnippetDialog
        open={creatingSnip || !!editingSnip}
        snip={editingSnip}
        onClose={() => {
          setCreatingSnip(false);
          setEditingSnip(null);
        }}
        onSave={saveSnip}
      />
    </div>
  );
}

// ---------- Small bits ----------
function Pills({
  label,
  items,
  active,
  onPick,
}: {
  label: string;
  items: string[];
  active: string | null;
  onPick: (v: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-body mr-1">
        {label}
      </span>
      {items.map((v) => {
        const sel = active === v;
        return (
          <button
            key={v}
            onClick={() => onPick(sel ? null : v)}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-body border transition-all duration-200 ${
              sel
                ? "bg-foreground text-background border-foreground"
                : "bg-muted/40 text-muted-foreground border-border/40 hover:text-foreground"
            }`}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}

function TagPills({
  tags,
  active,
  onPick,
}: {
  tags: string[];
  active: string | null;
  onPick: (v: string | null) => void;
}) {
  return <Pills label="Tags" items={tags} active={active} onPick={onPick} />;
}

function EmptyState({
  label,
  hint,
  cta,
  onCta,
}: {
  label: string;
  hint: string;
  cta: string;
  onCta: () => void;
}) {
  return (
    <div className="text-center py-16 space-y-3">
      <p className="font-serif text-xl text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground font-body">{hint}</p>
      <Button onClick={onCta} variant="outline" className="font-body mt-2">
        {cta}
      </Button>
    </div>
  );
}

function ItemMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="More"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------- Flashcard ----------
function FlashcardItem({
  card,
  onEdit,
  onDelete,
}: {
  card: Flashcard;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div
      className="relative h-56 [perspective:1200px] cursor-pointer group"
      onClick={() => setFlipped((f) => !f)}
    >
      <div
        className="relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d]"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Front */}
        <div className="absolute inset-0 [backface-visibility:hidden] surface px-5 py-4 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-body">
              Question
            </p>
            <ItemMenu onEdit={onEdit} onDelete={onDelete} />
          </div>
          <h3 className="font-serif text-lg font-semibold text-foreground mt-1 line-clamp-1">
            {card.title}
          </h3>
          <p className="text-sm text-foreground/90 font-body mt-2 line-clamp-5 flex-1">
            {card.question}
          </p>
          {card.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {card.tags.slice(0, 4).map((t) => (
                <span
                  key={t}
                  className="text-[10px] font-body text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground/70 font-body mt-2 italic">
            Tap to reveal
          </p>
        </div>
        {/* Back */}
        <div
          className="absolute inset-0 [backface-visibility:hidden] surface px-5 py-4 flex flex-col bg-muted/40"
          style={{ transform: "rotateY(180deg)" }}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-body">
              Answer
            </p>
            <ItemMenu onEdit={onEdit} onDelete={onDelete} />
          </div>
          <p className="text-sm text-foreground font-body mt-2 line-clamp-[8] flex-1 whitespace-pre-wrap">
            {card.answer}
          </p>
          <p className="text-[10px] text-muted-foreground/70 font-body mt-2 italic">
            Tap to flip back
          </p>
        </div>
      </div>
    </div>
  );
}

function FlashcardDialog({
  open,
  card,
  onClose,
  onSave,
}: {
  open: boolean;
  card: Flashcard | null;
  onClose: () => void;
  onSave: (data: Partial<Flashcard>, id?: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(card?.title || "");
      setQuestion(card?.question || "");
      setAnswer(card?.answer || "");
      setTags(card?.tags?.join(", ") || "");
    }
  }, [open, card]);

  const submit = () => {
    if (!title.trim() || !question.trim() || !answer.trim()) return;
    onSave(
      {
        title: title.trim(),
        question: question.trim(),
        answer: answer.trim(),
        tags: parseTags(tags),
      },
      card?.id,
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {card ? "Edit flashcard" : "New flashcard"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="font-body"
          />
          <Textarea
            placeholder="Question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            className="font-body"
          />
          <Textarea
            placeholder="Answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={5}
            className="font-body"
          />
          <Input
            placeholder="Tags (comma separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="font-body"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="font-body">
            Cancel
          </Button>
          <Button onClick={submit} className="font-body">
            {card ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Snippet ----------
function SnippetItem({
  snip,
  onEdit,
  onDelete,
}: {
  snip: Snippet;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement | null>(null);

  const html = useMemo(() => {
    try {
      if (hljs.getLanguage(snip.language)) {
        return hljs.highlight(snip.code, { language: snip.language, ignoreIllegals: true }).value;
      }
      return hljs.highlightAuto(snip.code).value;
    } catch {
      return null;
    }
  }, [snip.code, snip.language]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snip.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="surface px-5 py-4 space-y-3 group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-lg font-semibold text-foreground truncate">
            {snip.title}
          </h3>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-body mt-0.5">
            {snip.language}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={copy}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Copy code"
          >
            {copied ? <Check className="h-4 w-4 text-foreground" /> : <Copy className="h-4 w-4" />}
          </button>
          <ItemMenu onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
      <pre className="text-xs bg-muted/40 rounded-lg p-3 overflow-x-auto max-h-64 font-mono leading-relaxed">
        {html ? (
          <code ref={codeRef} className={`hljs language-${snip.language}`} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <code>{snip.code}</code>
        )}
      </pre>
      {snip.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {snip.tags.map((t) => (
            <span
              key={t}
              className="text-[10px] font-body text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SnippetDialog({
  open,
  snip,
  onClose,
  onSave,
}: {
  open: boolean;
  snip: Snippet | null;
  onClose: () => void;
  onSave: (data: Partial<Snippet>, id?: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("plaintext");
  const [code, setCode] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(snip?.title || "");
      setLanguage(snip?.language || "plaintext");
      setCode(snip?.code || "");
      setTags(snip?.tags?.join(", ") || "");
      setNotes(snip?.notes || "");
    }
  }, [open, snip]);

  const submit = () => {
    if (!title.trim() || !code.trim()) return;
    onSave(
      {
        title: title.trim(),
        language,
        code,
        tags: parseTags(tags),
        notes: notes.trim() || null,
      },
      snip?.id,
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {snip ? "Edit snippet" : "New snippet"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-3">
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-body flex-1"
            />
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-44 font-body">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="Paste your code…"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={10}
            className="font-mono text-xs"
          />
          <Input
            placeholder="Tags (comma separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="font-body"
          />
          <Textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="font-body"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="font-body">
            Cancel
          </Button>
          <Button onClick={submit} className="font-body">
            {snip ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
