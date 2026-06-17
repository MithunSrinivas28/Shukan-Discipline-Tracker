import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import type { ResumeData } from "@/lib/resumeParser";

interface Props {
  data: ResumeData;
  onChange: (d: ResumeData) => void;
}

export function ResumePreview({ data, onChange }: Props) {
  const update = (patch: Partial<ResumeData>) => onChange({ ...data, ...patch });

  const ListSection = ({
    title,
    items,
    onUpdate,
    placeholder,
  }: {
    title: string;
    items: string[];
    onUpdate: (next: string[]) => void;
    placeholder: string;
  }) => (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-muted border border-border/60">
            {s}
            <button onClick={() => onUpdate(items.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        placeholder={placeholder}
        onKeyDown={(e) => {
          const v = (e.target as HTMLInputElement).value.trim();
          if (e.key === "Enter" && v) {
            onUpdate([...items, v]);
            (e.target as HTMLInputElement).value = "";
            e.preventDefault();
          }
        }}
      />
    </div>
  );

  return (
    <Card className="p-6 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Candidate name</p>
        <Input value={data.name ?? ""} onChange={(e) => update({ name: e.target.value })} />
      </div>

      <ListSection
        title="Skills"
        items={data.skills ?? []}
        onUpdate={(next) => update({ skills: next })}
        placeholder="Type a skill and press Enter"
      />

      <ListSection
        title="Technologies"
        items={data.technologies ?? []}
        onUpdate={(next) => update({ technologies: next })}
        placeholder="Type a technology and press Enter"
      />

      <ListSection
        title="Certifications"
        items={data.certifications ?? []}
        onUpdate={(next) => update({ certifications: next })}
        placeholder="Type a certification and press Enter"
      />

      {/* Projects */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Projects</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => update({ projects: [...(data.projects ?? []), { name: "", description: "", tech: [] }] })}
          >
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-3">
          {(data.projects ?? []).map((p, i) => (
            <div key={i} className="p-3 rounded-md border border-border/60 space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Project name"
                  value={p.name}
                  onChange={(e) => {
                    const next = [...(data.projects ?? [])];
                    next[i] = { ...p, name: e.target.value };
                    update({ projects: next });
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => update({ projects: (data.projects ?? []).filter((_, j) => j !== i) })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                placeholder="Short description"
                value={p.description ?? ""}
                onChange={(e) => {
                  const next = [...(data.projects ?? [])];
                  next[i] = { ...p, description: e.target.value };
                  update({ projects: next });
                }}
                className="min-h-[60px] text-sm"
              />
              <Input
                placeholder="Tech (comma-separated)"
                value={(p.tech ?? []).join(", ")}
                onChange={(e) => {
                  const next = [...(data.projects ?? [])];
                  next[i] = { ...p, tech: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) };
                  update({ projects: next });
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Experience */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Experience</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => update({ experience: [...(data.experience ?? []), { company: "", role: "", duration: "", description: "" }] })}
          >
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-3">
          {(data.experience ?? []).map((x, i) => (
            <div key={i} className="p-3 rounded-md border border-border/60 space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Company"
                  value={x.company ?? ""}
                  onChange={(e) => {
                    const next = [...(data.experience ?? [])];
                    next[i] = { ...x, company: e.target.value };
                    update({ experience: next });
                  }}
                />
                <Input
                  placeholder="Role"
                  value={x.role ?? ""}
                  onChange={(e) => {
                    const next = [...(data.experience ?? [])];
                    next[i] = { ...x, role: e.target.value };
                    update({ experience: next });
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => update({ experience: (data.experience ?? []).filter((_, j) => j !== i) })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Input
                placeholder="Duration"
                value={x.duration ?? ""}
                onChange={(e) => {
                  const next = [...(data.experience ?? [])];
                  next[i] = { ...x, duration: e.target.value };
                  update({ experience: next });
                }}
              />
              <Textarea
                placeholder="Description"
                value={x.description ?? ""}
                onChange={(e) => {
                  const next = [...(data.experience ?? [])];
                  next[i] = { ...x, description: e.target.value };
                  update({ experience: next });
                }}
                className="min-h-[60px] text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Education */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Education</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => update({ education: [...(data.education ?? []), { degree: "", institution: "", year: "" }] })}
          >
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-3">
          {(data.education ?? []).map((e, i) => (
            <div key={i} className="p-3 rounded-md border border-border/60 grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
              <Input
                placeholder="Degree"
                value={e.degree ?? ""}
                onChange={(ev) => {
                  const next = [...(data.education ?? [])];
                  next[i] = { ...e, degree: ev.target.value };
                  update({ education: next });
                }}
              />
              <Input
                placeholder="Institution"
                value={e.institution ?? ""}
                onChange={(ev) => {
                  const next = [...(data.education ?? [])];
                  next[i] = { ...e, institution: ev.target.value };
                  update({ education: next });
                }}
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Year"
                  value={e.year ?? ""}
                  onChange={(ev) => {
                    const next = [...(data.education ?? [])];
                    next[i] = { ...e, year: ev.target.value };
                    update({ education: next });
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => update({ education: (data.education ?? []).filter((_, j) => j !== i) })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
