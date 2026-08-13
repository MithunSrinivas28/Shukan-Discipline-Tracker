import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

interface TimerStageProps {
  /** clock + label */
  clock: ReactNode;
  /** controls rendered in both normal and fullscreen layouts */
  controls: ReactNode;
  /** extra content shown only in the normal (non-fullscreen) layout */
  children?: ReactNode;
  /** content above the clock in normal layout (mode selectors etc.) */
  header?: ReactNode;
}

/**
 * Presentational shell around the flip clock. Owns nothing but fullscreen
 * state — the timer keeps running because the same React tree stays mounted.
 */
export default function TimerStage({ clock, controls, children, header }: TimerStageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const supported =
    typeof document !== "undefined" &&
    (document.fullscreenEnabled || !!(document as any).webkitFullscreenEnabled);

  useEffect(() => {
    const onChange = () =>
      setIsFullscreen(
        !!(document.fullscreenElement || (document as any).webkitFullscreenElement),
      );
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange as EventListener);
    };
  }, []);

  const toggle = useCallback(async () => {
    const el = ref.current;
    if (!el) return;
    try {
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        await (document.exitFullscreen?.() ?? (document as any).webkitExitFullscreen?.());
      } else if (el.requestFullscreen || (el as any).webkitRequestFullscreen) {
        await (el.requestFullscreen?.() ?? (el as any).webkitRequestFullscreen?.());
      } else {
        // Graceful fallback: immersive in-page overlay
        setIsFullscreen((v) => !v);
      }
    } catch {
      setIsFullscreen((v) => !v);
    }
  }, []);

  return (
    <div
      ref={ref}
      className={
        isFullscreen
          ? "fixed inset-0 z-[100] flex flex-col items-center justify-center gap-12 bg-background px-6 animate-fade-in"
          : "space-y-8 animate-fade-in"
      }
    >
      {!isFullscreen && header}

      <div className={isFullscreen ? "scale-100" : ""}>{clock}</div>

      <div className="flex flex-wrap items-center justify-center gap-3">{controls}</div>

      {!isFullscreen && children}

      <button
        onClick={toggle}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        className={`inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] font-body text-muted-foreground hover:text-foreground transition-colors duration-300 ${
          isFullscreen ? "" : "mx-auto"
        } ${isFullscreen ? "" : "block"}`}
      >
        {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        {isFullscreen ? "Exit Fullscreen" : supported ? "Fullscreen" : "Focus View"}
      </button>
    </div>
  );
}
