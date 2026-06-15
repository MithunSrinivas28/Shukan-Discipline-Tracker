import { useEffect, useState } from "react";
import {
  SOUND_LIBRARY,
  SoundId,
  SoundPrefs,
  SoundSlot,
  loadPrefs,
  playSound,
  savePrefs,
} from "@/lib/sounds";
import { Play, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

const SLOTS: { slot: SoundSlot; label: string; hint: string }[] = [
  { slot: "focusComplete", label: "Focus session end", hint: "Plays when a Pomodoro focus block completes." },
  { slot: "breakComplete", label: "Break end", hint: "Plays when a break finishes." },
  { slot: "goalComplete", label: "Countdown goal", hint: "Plays louder when a study goal is reached." },
];

export default function SoundSettings() {
  const [prefs, setPrefs] = useState<SoundPrefs>(() => loadPrefs());
  const [activeSlot, setActiveSlot] = useState<SoundSlot>("focusComplete");

  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  const update = (patch: Partial<SoundPrefs>) =>
    setPrefs((p) => ({ ...p, ...patch }));

  const currentId = prefs[activeSlot];

  return (
    <section className="surface px-6 py-7 space-y-6">
      <header className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-body">
          Timer Sounds
        </p>
        <h2 className="font-serif text-2xl font-semibold text-foreground">
          Sound preferences
        </h2>
        <p className="text-xs text-muted-foreground font-body">
          Choose how Shūkan sounds when timers complete.
        </p>
      </header>

      {/* Enable + volume */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Switch
            checked={prefs.enabled}
            onCheckedChange={(v) => update({ enabled: v })}
            id="sound-enabled"
          />
          <label htmlFor="sound-enabled" className="text-sm font-body text-foreground">
            Enable timer sounds
          </label>
        </div>
        <div className="flex items-center gap-3 sm:w-64">
          <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-body">
            Volume
          </span>
          <Slider
            value={[Math.round(prefs.volume * 100)]}
            onValueChange={([v]) => update({ volume: v / 100 })}
            min={0}
            max={100}
            step={5}
            disabled={!prefs.enabled}
            className="flex-1"
          />
          <span className="tabular-nums text-xs text-muted-foreground font-body w-8 text-right">
            {Math.round(prefs.volume * 100)}
          </span>
        </div>
      </div>

      {/* Slot tabs */}
      <div className="flex flex-wrap gap-2">
        {SLOTS.map((s) => {
          const active = activeSlot === s.slot;
          return (
            <button
              key={s.slot}
              onClick={() => setActiveSlot(s.slot)}
              className={`px-4 py-1.5 rounded-full text-xs font-body border transition-all duration-300 ${
                active
                  ? "bg-foreground text-background border-foreground"
                  : "bg-muted/40 text-muted-foreground border-border/40 hover:text-foreground hover:border-border"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] italic text-muted-foreground font-body -mt-3">
        {SLOTS.find((s) => s.slot === activeSlot)?.hint}
      </p>

      {/* Sound picker */}
      <div className="grid sm:grid-cols-2 gap-2">
        {SOUND_LIBRARY.map((s) => {
          const selected = currentId === s.id;
          return (
            <div
              key={s.id}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all duration-300 cursor-pointer ${
                selected
                  ? "border-foreground/60 bg-muted/40"
                  : "border-border/40 hover:border-border bg-background"
              }`}
              onClick={() => update({ [activeSlot]: s.id as SoundId } as Partial<SoundPrefs>)}
            >
              <div className="min-w-0">
                <p className="text-sm font-body text-foreground truncate flex items-center gap-2">
                  {s.name}
                  {selected && <Check className="h-3.5 w-3.5 text-foreground" />}
                </p>
                <p className="text-[11px] text-muted-foreground font-body truncate">
                  {s.description}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playSound(s.id, prefs.volume || 0.5);
                }}
                aria-label={`Preview ${s.name}`}
                className="shrink-0 h-8 w-8 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border transition-colors"
              >
                <Play className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
