import FlipDigit from "./FlipDigit";
import { defaultFlipTheme, type FlipClockTheme } from "./flipTheme";

export type FlipSize = "sm" | "md" | "lg" | "xl";

interface FlipClockProps {
  /** e.g. "25:00" or "01:42:37" — non-digit chars render as separators */
  time: string;
  label?: string;
  size?: FlipSize;
  running?: boolean;
  complete?: boolean;
  theme?: FlipClockTheme;
}

const SIZES: Record<FlipSize, { panel: string; text: string; sep: string; gap: string }> = {
  sm: {
    panel: "w-[34px] h-[52px]",
    text: "text-[38px] leading-[52px]",
    sep: "text-[26px]",
    gap: "gap-[3px]",
  },
  md: {
    panel: "w-[52px] h-[78px] sm:w-[62px] sm:h-[94px]",
    text: "text-[58px] leading-[78px] sm:text-[70px] sm:leading-[94px]",
    sep: "text-[34px] sm:text-[40px]",
    gap: "gap-[5px]",
  },
  lg: {
    panel: "w-[54px] h-[82px] sm:w-[76px] sm:h-[114px] md:w-[92px] md:h-[138px]",
    text:
      "text-[60px] leading-[82px] sm:text-[84px] sm:leading-[114px] md:text-[104px] md:leading-[138px]",
    sep: "text-[34px] sm:text-[46px] md:text-[56px]",
    gap: "gap-[6px]",
  },
  xl: {
    panel:
      "w-[62px] h-[96px] sm:w-[104px] sm:h-[158px] md:w-[136px] md:h-[204px] lg:w-[164px] lg:h-[248px]",
    text:
      "text-[70px] leading-[96px] sm:text-[118px] sm:leading-[158px] md:text-[154px] md:leading-[204px] lg:text-[186px] lg:leading-[248px]",
    sep: "text-[40px] sm:text-[64px] md:text-[84px] lg:text-[100px]",
    gap: "gap-[8px] sm:gap-[12px]",
  },
};

export default function FlipClock({
  time,
  label,
  size = "lg",
  running = false,
  complete = false,
  theme = defaultFlipTheme,
}: FlipClockProps) {
  const s = SIZES[size];
  const chars = time.split("");

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* ambient glow while running */}
      {running && (
        <div
          className="pointer-events-none absolute inset-0 -m-10 rounded-[3rem] blur-3xl opacity-40 animate-pulse-sakura"
          style={{ background: `radial-gradient(closest-side, ${theme.glow}, transparent)` }}
        />
      )}

      <div
        className={`relative flex items-center ${s.gap} transition-transform duration-500 ${
          complete ? "flip-complete" : ""
        }`}
        role="timer"
        aria-label={`${label ?? "Timer"} ${time}`}
      >
        {chars.map((c, i) =>
          /\d/.test(c) ? (
            <FlipDigit
              key={i}
              value={c}
              theme={theme}
              sizeClass={s.panel}
              textClass={`${theme.digitFont} font-bold tabular-nums ${s.text}`}
            />
          ) : (
            <span
              key={i}
              className={`${s.sep} ${theme.separator} font-serif font-bold px-[0.1em] ${
                running ? "animate-pulse" : ""
              }`}
            >
              :
            </span>
          ),
        )}
      </div>

      {label && (
        <p
          className={`mt-5 text-[10px] sm:text-[11px] uppercase tracking-[0.45em] font-body ${theme.label}`}
        >
          {label}
        </p>
      )}
    </div>
  );
}
