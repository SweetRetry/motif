"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/* -- A whole, as its parts -----------------------------------------------------
 * Where did it all go. One bar, cut into the parts that make it up, each cut as wide
 * as its share; under it, a legend naming every part and its amount. The bar answers
 * "what is the shape of this" before anything is read, and the legend answers "which
 * part is that" — which is why the two are separate parts and not one picture.
 *
 * The root derives, the parts draw. Shares, the colour of each part and the two
 * formatters are worked out once in the root, because the bar and the legend must agree
 * on all four and neither can see the other. Everything else — where they sit, whether
 * one of them is there at all — belongs to the caller: the legend alone is a list, the
 * bar alone is a strip inside somebody else's row.
 *
 * Nothing here loads, fails, or is empty in its own way. A surface that is still waiting
 * has Waiting Row; a surface with nothing to show knows it before this component does.
 * --------------------------------------------------------------------------- */

/** One part of the whole. `key` is what React and the caller's own lookups use — and what
 *  `colors` is keyed by; `label` is what a person reads. */
export interface BreakdownDatum {
  key: string;
  label: string;
  value: number;
}

/** A datum with the two things the root derives filled in: the colour it will be drawn
 *  in, and its share of the whole, 0–100 and unrounded. */
export interface BreakdownSlice extends BreakdownDatum {
  color: string;
  share: number;
}

/** What a part reads from the root. Exported with `useBreakdown` so a caller can build a
 *  frame of their own — a row per part, a second legend — without redoing the maths. */
export interface BreakdownState {
  /** The tooltip's line. Defaults to `42% of total`. */
  formatShare: (share: number) => string;
  /** The amount beside a label. Defaults to `12,400`. */
  formatValue: (value: number) => string;
  /** The parts with something in them, in the caller's order. */
  items: BreakdownSlice[];
}

export interface BreakdownProps {
  children: ReactNode;
  /** Each part's colour, keyed by `key` — any CSS colour, usually a token. Required, and
   *  deliberately so; the note under Colour says why. */
  colors: Record<string, string>;
  formatShare?: (share: number) => string;
  formatValue?: (value: number) => string;
  /** The parts, in the order they should be drawn. */
  items: BreakdownDatum[];
  /** The whole the shares are read against. Defaults to the sum of `items`, and is
   *  passed when the caller is showing a page of something larger. */
  total?: number;
}

export interface BreakdownBarProps {
  className?: string;
  /** Names the bar for a screen reader. Defaults to the parts and their amounts, which
   *  is what the bar is; a sentence in front of them is what a page usually wants. */
  label?: string;
}

export interface BreakdownLegendProps {
  className?: string;
}

/* -- Colour --------------------------------------------------------------------
 * The component draws no colour of its own. `colors` is required, keyed by `key`, and a
 * key missing from it is drawn in `--muted-foreground`: a neutral that belongs to no
 * sequence, so a part nobody coloured reads as a part nobody coloured rather than as a
 * member of the palette.
 *
 * That fallback is a report, not a repair. Falling back to `--chart-1` would claim a rank
 * the part does not have. Falling back to nothing would be quieter still — a cut the
 * track shows through, and a dot missing from the legend, which is exactly the kind of
 * omission that survives a review. The cut is the wrong colour on purpose, where it can
 * be seen. It also covers the caller whose parts arrive from a query and whose palette
 * cannot name them in advance: an uncoloured part is a legitimate runtime state, not
 * always a forgotten line.
 *
 * A palette is a statement about what the parts *mean* — which model is which — and that
 * is not something a component can know. It sees this period's parts and nothing else, so
 * a colour it invented would be a guess at an identity it cannot see, and the guess would
 * be wrong in the quietest way there is: the same model changing hue between two months
 * that are read side by side.
 *
 * `breakdownColors` is that guess, offered as a function rather than hidden as a default.
 * It hands out the theme's five chart tokens in order — the sequence the theme already
 * publishes for exactly this, so dark mode and a theme swap come free — and past five it
 * walks them again with a lightness step mixed toward `--foreground`. Toward the ink,
 * never toward the surface: a step toward the surface moves a part *into* whatever it is
 * drawn on, which brightens it on a light theme and darkens it on a dark one, so the ramp
 * would invert with the theme. Toward the ink every step moves away from the surface in
 * both, which is the argument the heatmap's alpha ramp makes and the reason it makes it.
 * Fifteen parts are distinguishable this way, past the point a stacked bar can be read.
 *
 * Hand it the catalogue, not the page: the stable list of every part that can appear, so
 * that a part keeps its colour in a month it happens to be small in, or absent from.
 * Handed the visible parts instead it is the same guess a default would have made — which
 * is fine, as long as it is written at the call site where it can be read.
 * --------------------------------------------------------------------------- */
const HUES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** How much ink each pass past the first five mixes in. Three passes is fifteen parts,
 *  which is past the point where a stacked bar can be read at all. */
const STEPS = [0, 22, 44];

const colorAt = (position: number) => {
  const hue = HUES[position % HUES.length];
  const step = STEPS[Math.floor(position / HUES.length) % STEPS.length];

  return step === 0
    ? hue
    : `color-mix(in oklab, ${hue} ${100 - step}%, var(--foreground))`;
};

/** What a part with no entry in `colors` is drawn in. */
const UNASSIGNED = "var(--muted-foreground)";

/** A palette for a list of keys, in the order given: the theme's chart sequence, one
 *  token each, then the same hues walked again with a lightness step.
 *
 *  Pass the keys of the catalogue — everything that can appear, not everything that did —
 *  so that a part's colour is a property of the part rather than of the month. */
export const breakdownColors = (keys: readonly string[]) =>
  Object.fromEntries(keys.map((key, position) => [key, colorAt(position)]));

/* -- Formatting ----------------------------------------------------------------
 * Both defaults are fixed to `en-US` rather than taken from the browser, for the reason
 * the heatmap's `locale` is fixed: the server and the client have to render the same
 * string, and a number that gains a separator on hydration is a mismatch. Both are props
 * for the caller who wants their own language.
 * --------------------------------------------------------------------------- */
const DEFAULT_NUMBER = new Intl.NumberFormat("en-US");

const DEFAULT_VALUE = (value: number) => DEFAULT_NUMBER.format(value);
const DEFAULT_SHARE = (share: number) => `${Math.round(share)}% of total`;

const BreakdownContext = createContext<BreakdownState | null>(null);

export const useBreakdown = () => {
  const context = useContext(BreakdownContext);
  if (!context) {
    throw new Error("Breakdown parts must be used within a Breakdown.");
  }

  return context;
};

/**
 * The root: it holds the parts, derives what they share, and draws nothing itself.
 *
 * A part with nothing in it is dropped rather than drawn at zero width — a cut you
 * cannot see reads as a rendering fault, not as a part with no share. `total` is what
 * the shares are read against and defaults to the sum, so passing it is only necessary
 * when the parts on screen are a slice of something larger.
 */
export const Breakdown = ({
  children,
  colors,
  formatShare,
  formatValue,
  items,
  total,
}: BreakdownProps) => {
  const state = useMemo<BreakdownState>(() => {
    const shown = items.filter((item) => item.value > 0);
    const whole = total ?? shown.reduce((sum, item) => sum + item.value, 0);

    return {
      formatShare: formatShare ?? DEFAULT_SHARE,
      formatValue: formatValue ?? DEFAULT_VALUE,
      items: shown.map((item) => ({
        ...item,
        color: colors[item.key] ?? UNASSIGNED,
        share: whole > 0 ? (item.value / whole) * 100 : 0,
      })),
    };
  }, [colors, formatShare, formatValue, items, total]);

  return (
    <BreakdownContext.Provider value={state}>
      {children}
    </BreakdownContext.Provider>
  );
};

/**
 * The bar: one cut per part, as wide as its share.
 *
 * The widths are percentages and the gaps between the cuts are `gap-px`, which together
 * would overrun the track by one pixel per cut — except that flex items shrink, and they
 * shrink in proportion to their own width, so the cuts keep their ratios and the bar
 * keeps its shape at any count. What the bar does not do is fill the track when the
 * parts do not add up to `total`: the track showing through is the reading.
 */
export const BreakdownBar = ({ className, label }: BreakdownBarProps) => {
  const { formatValue, items } = useBreakdown();

  if (items.length === 0) {
    return null;
  }

  const amounts = items
    .map((item) => `${item.label} ${formatValue(item.value)}`)
    .join(", ");

  return (
    <div
      aria-label={label ? `${label}: ${amounts}` : amounts}
      className={cn(
        "flex h-2.5 gap-px overflow-hidden rounded-full bg-muted",
        className
      )}
      data-slot="breakdown-bar"
      role="img"
    >
      {items.map((item) => (
        <span
          className="h-full"
          key={item.key}
          style={{ background: item.color, width: `${item.share}%` }}
        />
      ))}
    </div>
  );
};

/**
 * The legend: every part, its colour, its label and its amount.
 *
 * The share is not printed. The bar already carries the comparison, and a column of
 * percentages beside it is the same fact said twice — so the exact number waits in the
 * tooltip, where it costs nothing until it is asked for. It is in the accessible text
 * either way, because a tooltip is a pointer's affordance and a screen reader has none.
 */
export const BreakdownLegend = ({ className }: BreakdownLegendProps) => {
  const { formatShare, formatValue, items } = useBreakdown();

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-8 gap-y-3 text-xs sm:grid-cols-3",
        className
      )}
      data-slot="breakdown-legend"
    >
      {items.map((item) => (
        <Tooltip key={item.key}>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ background: item.color }}
              />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {item.label}
              </span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {formatValue(item.value)}
              </span>
              <span className="sr-only">{formatShare(item.share)}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>{formatShare(item.share)}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};
