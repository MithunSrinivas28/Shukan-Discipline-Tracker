import { useEffect, useRef, useState } from "react";
import type { FlipClockTheme } from "./flipTheme";

interface FlipDigitProps {
  value: string;
  theme: FlipClockTheme;
  /** tailwind size classes for the panel */
  sizeClass: string;
  textClass: string;
}

/**
 * A single split-flap panel. Purely presentational — it animates whenever the
 * `value` prop changes and holds no timer logic.
 */
export default function FlipDigit({ value, theme, sizeClass, textClass }: FlipDigitProps) {
  const [current, setCurrent] = useState(value);
  const [previous, setPrevious] = useState(value);
  const [flipping, setFlipping] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value === current) return;
    setPrevious(current);
    setCurrent(value);
    setFlipping(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setFlipping(false), theme.flipDuration);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value, current, theme.flipDuration]);

  const half =
    "absolute inset-x-0 h-1/2 overflow-hidden flex justify-center " + theme.panel;
  const dur = { animationDuration: `${theme.flipDuration / 2}ms` } as const;

  return (
    <div
      className={`flip-panel relative rounded-[0.35em] ${sizeClass} ${theme.shadow} ${theme.panel}`}
    >
      {/* sheen */}
      <div className={`pointer-events-none absolute inset-0 rounded-[0.35em] ${theme.panelSheen}`} />

      {/* static top (new value) */}
      <div className={`${half} top-0 rounded-t-[0.35em] items-start`}>
        <span className={`flip-num flip-num-top ${textClass} ${theme.digit}`}>{current}</span>
      </div>
      {/* static bottom (old value while flipping) */}
      <div className={`${half} bottom-0 rounded-b-[0.35em] items-end`}>
        <span className={`flip-num flip-num-bottom ${textClass} ${theme.digit}`}>
          {flipping ? previous : current}
        </span>
      </div>

      {flipping && (
        <>
          <div
            className={`${half} top-0 rounded-t-[0.35em] items-start flip-anim-top z-20`}
            style={dur}
          >
            <span className={`flip-num flip-num-top ${textClass} ${theme.digit}`}>{previous}</span>
          </div>
          <div
            className={`${half} bottom-0 rounded-b-[0.35em] items-end flip-anim-bottom z-20`}
            style={{ ...dur, animationDelay: `${theme.flipDuration / 2}ms` }}
          >
            <span className={`flip-num flip-num-bottom ${textClass} ${theme.digit}`}>{current}</span>
          </div>
        </>
      )}

      {/* split line */}
      <div className={`pointer-events-none absolute inset-x-0 top-1/2 h-px z-30 ${theme.split}`} />
    </div>
  );
}
