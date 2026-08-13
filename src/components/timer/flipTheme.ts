/**
 * Flip-clock theme configuration.
 *
 * Timer logic lives in `useTimerState`; the clock rendering lives in
 * `FlipClock`/`FlipDigit`; all visual personality lives here so future
 * Shūkan themes (Sakura, Midnight, Forest, Cozy, ...) can be added by
 * appending entries to `flipThemes` without touching timer logic.
 */

export interface FlipClockTheme {
  id: string;
  name: string;
  /** Panel (card) surface */
  panel: string;
  /** Panel gradient overlay for 3D depth */
  panelSheen: string;
  /** Digit color */
  digit: string;
  /** Horizontal split line color */
  split: string;
  /** Outer shadow around each panel */
  shadow: string;
  /** Colon / separator color */
  separator: string;
  /** Label under the clock */
  label: string;
  /** Accent glow while running */
  glow: string;
  /** Font family class for digits */
  digitFont: string;
  /** Flip animation duration in ms */
  flipDuration: number;
}

export const defaultFlipTheme: FlipClockTheme = {
  id: "premium-dark",
  name: "Premium Desk Clock",
  panel: "bg-[hsl(220_14%_11%)]",
  panelSheen:
    "bg-gradient-to-b from-white/[0.07] via-transparent to-black/25",
  digit: "text-[hsl(40_20%_94%)]",
  split: "bg-black/60",
  shadow:
    "shadow-[0_18px_40px_-18px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.06)]",
  separator: "text-[hsl(40_20%_94%)]/70",
  label: "text-muted-foreground",
  glow: "hsl(var(--primary))",
  digitFont: "font-serif",
  flipDuration: 420,
};

export const flipThemes: Record<string, FlipClockTheme> = {
  [defaultFlipTheme.id]: defaultFlipTheme,
};

export function getFlipTheme(id?: string): FlipClockTheme {
  return (id && flipThemes[id]) || defaultFlipTheme;
}
