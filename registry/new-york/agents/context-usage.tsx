"use client";

import type { ComponentProps, ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";

import {
  Breakdown,
  BreakdownBar,
  BreakdownLegend,
  breakdownColors,
} from "@/components/ui/motif/breakdown";
import type { BreakdownDatum } from "@/components/ui/motif/breakdown";
import { cn } from "@/lib/utils";

/* -- How much of the window is left --------------------------------------------
 * A model reads a fixed window, and everything the agent is carrying — the system
 * prompt, the tool definitions, the conversation — has to fit in it. This is that fit,
 * said as a number, a ring and a bar. It is a Breakdown whose whole is the window: the
 * parts are what is in it, and the track the bar leaves showing is what is not.
 *
 * The root derives and the parts draw, as in Breakdown. What it adds is the one number a
 * composer cares about, how full, and the tone that number takes as it nears the edge.
 * Where the ring sits, whether the bar and the legend open from it or sit beside it, is
 * the caller's: the ring alone is a glance in the footer of a prompt input, the bar and
 * legend behind it are for the reader who wants to know what to drop.
 *
 * The ring is a part rather than a prop on the root for the same reason: a caller who
 * only has room for a percentage draws one from `useContextUsage` and loses nothing.
 * --------------------------------------------------------------------------- */

/** What fills the window. Same shape as a Breakdown part: `key` for React and `colors`,
 *  `label` for a person, `value` in tokens. */
export type ContextUsageDatum = BreakdownDatum;

/** How close the window is to full. Three words, because a ring has three things to
 *  say: plenty of room, getting tight, no room. */
export type ContextUsageTone = "ok" | "near" | "full";

/** What a part reads from the root. Exported with `useContextUsage` so a caller can draw
 *  a part of their own, a "compact now" button that only exists once the window is
 *  `near`, from the same numbers the shipped parts use. */
export interface ContextUsageState {
  formatTokens: (tokens: number) => string;
  /** The window, in tokens. */
  limit: number;
  /** Used as a share of the window, 0–100 and unrounded. Past 100 when over. */
  percent: number;
  /** Tokens left, never below zero. */
  remaining: number;
  tone: ContextUsageTone;
  /** Tokens in the window. */
  used: number;
}

export interface ContextUsageProps {
  children: ReactNode;
  /** Each part's colour, keyed by `key`. Defaults to the theme's chart sequence in the
   *  order of `items`. */
  colors?: Record<string, string>;
  /** Tokens as they are written beside a label. Defaults to `48.2K`. */
  formatTokens?: (tokens: number) => string;
  /** What is in the window, in the order it should be drawn. */
  items: ContextUsageDatum[];
  /** The window, in tokens. */
  limit: number;
  /** The share at which the ring turns `near`. Defaults to 80. */
  nearAt?: number;
}

export interface ContextUsageRingProps extends ComponentProps<"span"> {
  /** Draws the rounded percentage beside the ring. */
  showPercent?: boolean;
  /** Names the ring for a screen reader. Defaults to `Context used`. */
  label?: string;
}

export type ContextUsageBarProps = ComponentProps<typeof BreakdownBar>;
export type ContextUsageLegendProps = ComponentProps<typeof BreakdownLegend>;
export type ContextUsageSummaryProps = ComponentProps<"div">;

const COMPACT = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  notation: "compact",
});

// Fixed to `en-US` for the reason Breakdown's formatters are: the server and the client
// have to write the same string.
const DEFAULT_TOKENS = (tokens: number) => COMPACT.format(tokens);

const toneOf = (percent: number, nearAt: number): ContextUsageTone => {
  if (percent >= 100) {
    return "full";
  }

  return percent >= nearAt ? "near" : "ok";
};

/** `<1%` for a window that is used but not by a whole point: a rounded `0%` would say
 *  the agent is carrying nothing. */
const printPercent = (percent: number) =>
  percent > 0 && percent < 1 ? "<1%" : `${Math.round(percent)}%`;

const ContextUsageContext = createContext<ContextUsageState | null>(null);

export const useContextUsage = () => {
  const context = useContext(ContextUsageContext);
  if (!context) {
    throw new Error("Context usage parts must be used within a ContextUsage.");
  }

  return context;
};

/**
 * The root: it holds the window and what is in it, and draws nothing itself.
 *
 * The palette is built from `items` before zero-sized parts are dropped, so a category
 * that is empty this turn and full the next keeps its colour. The order of `items` is
 * what fixes a part's hue, which is why it is the caller's and never sorted.
 */
export const ContextUsage = ({
  children,
  colors,
  formatTokens = DEFAULT_TOKENS,
  items,
  limit,
  nearAt = 80,
}: ContextUsageProps) => {
  const palette = useMemo(
    () => colors ?? breakdownColors(items.map((item) => item.key)),
    [colors, items]
  );

  const state = useMemo<ContextUsageState>(() => {
    const used = items.reduce((sum, item) => sum + Math.max(item.value, 0), 0);
    const percent = limit > 0 ? (used / limit) * 100 : 0;

    return {
      formatTokens,
      limit,
      percent,
      remaining: Math.max(limit - used, 0),
      tone: toneOf(percent, nearAt),
      used,
    };
  }, [formatTokens, items, limit, nearAt]);

  return (
    <ContextUsageContext.Provider value={state}>
      <Breakdown
        colors={palette}
        formatShare={(share) => `${printPercent(share)} of window`}
        formatValue={formatTokens}
        items={items}
        total={limit}
      >
        {children}
      </Breakdown>
    </ContextUsageContext.Provider>
  );
};

const RING_SIZE = 20;
const RING_STROKE = 2.5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** The arc's colour is the role the number is in, not a hue: `warning` once the window
 *  is near, `destructive` once it is full. */
const ARC: Record<ContextUsageTone, string> = {
  full: "stroke-destructive",
  near: "stroke-warning",
  ok: "stroke-foreground",
};

/**
 * The ring: how full the window is, small enough for a composer's footer.
 *
 * A `role="meter"`, not an image, because it is a value in a known range. The arc stops
 * at a full turn however far over the window the agent is; the percentage beside it, if
 * shown, keeps counting.
 */
export const ContextUsageRing = ({
  className,
  label = "Context used",
  showPercent = false,
  ...props
}: ContextUsageRingProps) => {
  const { percent, tone } = useContextUsage();
  const arc = Math.min(Math.max(percent, 0), 100) / 100;

  return (
    <span
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(percent)}
      aria-valuetext={printPercent(percent)}
      className={cn(
        "inline-flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums",
        className
      )}
      data-slot="context-usage-ring"
      data-tone={tone}
      role="meter"
      {...props}
    >
      <svg
        aria-hidden="true"
        className="-rotate-90 shrink-0"
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        width={RING_SIZE}
      >
        <circle
          className="stroke-border"
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          fill="none"
          r={RING_RADIUS}
          strokeWidth={RING_STROKE}
        />
        <circle
          className={cn(
            ARC[tone],
            "transition-[stroke-dashoffset] duration-300 ease-out motion-reduce:transition-none"
          )}
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          fill="none"
          r={RING_RADIUS}
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - arc)}
          strokeLinecap="round"
          strokeWidth={RING_STROKE}
        />
      </svg>
      {showPercent ? <span>{printPercent(percent)}</span> : null}
    </span>
  );
};

/**
 * The bar: what is in the window, one cut per part, with the track left showing for what
 * is not. It is Breakdown's bar with the window as its whole, so a window that is a
 * quarter full draws a quarter of the track.
 *
 * The track is drawn in `border`, not Breakdown's `muted`. The free space is the half of
 * this bar that carries the meaning, and `muted` is the popover's own colour in dark, so
 * in the popover this lives in the track vanished and the bar read as shorter than the
 * window. `border` is the same step off the surface in both themes.
 */
export const ContextUsageBar = ({
  className,
  label = "Context window",
  ...props
}: ContextUsageBarProps) => (
  <BreakdownBar
    className={cn("bg-border", className)}
    label={label}
    {...props}
  />
);

/**
 * The legend: every part with something in it, its colour and its size in tokens. One
 * column, because it lives in a popover about the width of a sentence.
 */
export const ContextUsageLegend = ({
  className,
  ...props
}: ContextUsageLegendProps) => (
  <BreakdownLegend
    className={cn("grid-cols-1 gap-x-0 gap-y-2 sm:grid-cols-1", className)}
    {...props}
  />
);

/**
 * The summary: `48.2K of 200K`, and what is left. The two numbers a reader actually
 * decides on, in the one sentence the bar cannot write.
 */
export const ContextUsageSummary = ({
  className,
  ...props
}: ContextUsageSummaryProps) => {
  const { formatTokens, limit, percent, remaining, used } = useContextUsage();

  return (
    <div
      className={cn("flex flex-col gap-0.5 text-xs", className)}
      data-slot="context-usage-summary"
      {...props}
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-medium tabular-nums">
          {formatTokens(used)} of {formatTokens(limit)}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {printPercent(percent)}
        </span>
      </div>
      <span className="text-muted-foreground tabular-nums">
        {formatTokens(remaining)} left
      </span>
    </div>
  );
};
