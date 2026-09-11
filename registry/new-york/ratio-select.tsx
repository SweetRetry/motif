"use client";

import { Scan } from "lucide-react";

import { cn } from "@/lib/utils";

/* -- The glyph -----------------------------------------------------------------
 * A ratio is a shape, and a shape is easier to compare than a string of digits.
 * Every glyph is drawn inside the same square window, so `1:1` and `16:9` line up
 * on the grid and the eye reads the difference in geometry, not in label width.
 * --------------------------------------------------------------------------- */

/** Ratios offered when the caller does not pass their own. */
const DEFAULT_OPTIONS = ["1:1", "16:9", "9:16", "4:3", "3:4"] as const;

/** The values that mean "let the model decide", in the spellings models use. */
const ADAPTIVE = new Set(["adaptive", "auto", "自适应"]);

/** Reads `"16:9"` into `[16, 9]`, falling back to a square for anything unparseable. */
const parseRatio = (ratio: string): [number, number] => {
  const [w, h] = ratio.split(":").map(Number);
  return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0
    ? [w, h]
    : [1, 1];
};

export interface RatioIconProps {
  className?: string;
  /** A ratio like `"1:1"`, `"16:9"`, `"3:4"` — or `"adaptive"` / `"auto"`. */
  ratio: string;
  /** Side of the square window the glyph is drawn in, in px. Defaults to 16. */
  size?: number;
  /** Draws a dashed square around the glyph, so the chosen frame has a reference. */
  showReferenceBox?: boolean;
}

/**
 * The ratio drawn to scale inside a fixed square window. The window never changes
 * size, so a row of ratios stays aligned instead of stepping with their shapes — the
 * outer square is the layout, the inner rectangle is the information.
 */
export const RatioIcon = ({
  className,
  ratio,
  showReferenceBox = false,
  size = 16,
}: RatioIconProps) => {
  if (ADAPTIVE.has(ratio.toLowerCase())) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex shrink-0 items-center justify-center",
          className
        )}
        style={{ height: size, width: size }}
      >
        <Scan className="size-3.5 text-current opacity-80" />
      </span>
    );
  }

  const [w, h] = parseRatio(ratio);
  const max = Math.max(w, h);
  // Two px of slack for the 1px stroke on either side.
  const bound = Math.max(8, size - 2);
  const width = Math.max(4, Math.round((w / max) * bound));
  const height = Math.max(4, Math.round((h / max) * bound));

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        className
      )}
      style={{ height: size, width: size }}
    >
      {showReferenceBox ? (
        <span
          className="pointer-events-none absolute rounded-[2px] border border-current/20 border-dashed"
          style={{ height: bound, width: bound }}
        />
      ) : null}
      <span
        className="shrink-0 rounded-[2px] border border-current transition-all"
        style={{ height, width }}
      />
    </span>
  );
};

export interface RatioSelectProps {
  /**
   * Names the grid for assistive tech, e.g. `"Aspect ratio"` or `"Canvas"`. The
   * heading above the control is the caller's to draw — the component ships no label,
   * because a field's label belongs to the form around it.
   */
  "aria-label"?: string;
  className?: string;
  /** Called with the chosen ratio, e.g. a `"16:9"` string. */
  onChange: (value: string) => void;
  /** Choices to offer, in display order. Five fit a row before wrapping. */
  options?: readonly string[];
  /** The ratio currently in effect. */
  value: string;
}

/**
 * The aspect ratio as a grid of to-scale glyphs. The frame answers "what shape am I
 * asking for" at a glance — the ratio printed under it is only there to confirm the
 * number.
 */
export const RatioSelect = ({
  "aria-label": ariaLabel,
  className,
  onChange,
  options = DEFAULT_OPTIONS,
  value,
}: RatioSelectProps) => {
  // Five per row is the most that keeps the labels legible at the shipped width;
  // anything beyond that wraps instead of shrinking.
  const columns = Math.max(1, Math.min(options.length, 5));

  return (
    <div
      aria-label={ariaLabel}
      className={cn("grid gap-1.5", className)}
      role="group"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((ratio) => {
        const isSelected = value === ratio;

        return (
          <button
            aria-pressed={isSelected}
            className={cn(
              "flex h-13 flex-col items-center justify-center gap-1 rounded-lg border p-1 text-xs outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring/50",
              isSelected
                ? "border-foreground/80 bg-accent font-semibold text-accent-foreground shadow-xs"
                : "border-border/40 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground"
            )}
            key={ratio}
            onClick={() => onChange(ratio)}
            type="button"
          >
            <RatioIcon ratio={ratio} showReferenceBox={isSelected} size={18} />
            <span className="font-mono text-xs leading-none tracking-tight">
              {ratio}
            </span>
          </button>
        );
      })}
    </div>
  );
};
