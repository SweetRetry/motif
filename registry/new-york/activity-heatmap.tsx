"use client";

import { useRef } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

import { cn } from "@/lib/utils";

/* -- A year, as a grid ---------------------------------------------------------
 * One square per day, one column per week: the shape that daily counts of an agent
 * actually have — quiet weekends, a busy Tuesday, a run of dark squares in the week
 * something shipped. A sparkline shows the trend of one number; this shows the
 * *texture* of a habit, which is the thing you look at when deciding whether last
 * month was normal.
 *
 * The component is a table, a colour scale and one tooltip. Almost everything that
 * looks like a decision below is really about one of three things: what a level means,
 * where the days come from, and how little work a hover is allowed to cost.
 * --------------------------------------------------------------------------- */

/** A day's count. `level` short-circuits the scale when the caller already knows the
 *  bucket — for a fixed meaning that must not move when the data does. */
export interface HeatmapDatum {
  date: string | Date;
  value: number;
  level?: 0 | 1 | 2 | 3 | 4;
}

export interface ActivityHeatmapProps {
  /** One entry per day. Days with no entry are drawn empty rather than skipped. */
  data: HeatmapDatum[];
  /** Side of a square, in px. The gap is its own prop, not a ratio of this one. */
  cellSize?: number;
  className?: string;
  /** The last day on the grid. Defaults to today; data past it extends the range. */
  end?: string | Date;
  /** Space between squares, in px — and around the grid, since it is table spacing. */
  gap?: number;
  /** The tooltip's date. Defaults to `Mar 4, 2025`. */
  formatDate?: (date: Date) => string;
  /** The tooltip's count. Defaults to `12`, or `No activity` at zero. */
  formatValue?: (value: number) => string;
  /** Whether the Less/More ramp is drawn under the grid. */
  legend?: boolean;
  lessLabel?: string;
  /** Where month, weekday and date names are read from. Fixed rather than taken from
   *  the browser so the server and the client render the same string. */
  locale?: string;
  moreLabel?: string;
  style?: CSSProperties;
  /** The four cut points between levels 1–4. Pass them when a level has to keep its
   *  meaning across datasets; left out, they are quartiles of the data. */
  thresholds?: [number, number, number, number];
  /** Which day a column starts on, `0` Sunday to `6` Saturday. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** How many columns of history. 53 weeks is a year and a day, so a given weekday
   *  lands in the same row it was in a year ago. */
  weeks?: number;
}

/** The default span: 53 columns, which covers a full year whatever day it ends on. */
const DEFAULT_WEEKS = 53;

/** Square side and spacing. 11 + 3 is the density GitHub settled on — big enough to
 *  hit with a pointer, small enough that a year fits a column without scrolling. */
const DEFAULT_CELL = 11;
const DEFAULT_GAP = 3;

/* -- The scale -----------------------------------------------------------------
 * Five steps: empty, then four shades of one colour. The shades are the colour at
 * 26/46/70/100% alpha rather than four hand-picked hexes, because that is one decision
 * instead of four, it holds on both themes, and it leaves the hue to the token the
 * caller already has — so `text-chart-2` at the call site is the entire colour story.
 *
 * Level 0 gets a much lower share of its own: an empty day is a square you can see is
 * empty, not a sixth colour. GitHub's ramp flattens toward nothing at both ends of its
 * scale for the same reason.
 * --------------------------------------------------------------------------- */
const LEVEL_SHARE = [12, 26, 46, 70, 100];

/** Where the default cut points fall among the non-empty counts, read as quantiles.
 *  The top one is not a quartile: level 4 is meant to be rare, so that a dark square
 *  still reads as "that day was unusual" rather than "that was a Tuesday". */
const QUANTILES = [0.25, 0.5, 0.75, 0.95];

/** Weekday rows that get a printed name, as `Date.getDay()` values. Naming every row
 *  would be a wall of text beside a grid small enough to read at a glance; Mon, Wed
 *  and Fri are enough to place any row. */
const LABELLED_WEEKDAYS = new Set([1, 3, 5]);

/** A month narrower than this many columns goes unlabelled — three letters need three
 *  squares of room, and a label that overhangs its own month is worse than none. The
 *  span is kept either way, so the next month still starts where it should. */
const MIN_MONTH_COLUMNS = 3;

/* -- The reveal -----------------------------------------------------------------
 * On mount the grid fills in column by column, left to right. This is the one piece of
 * motion here and it earns its place: a year of squares appearing all at once reads as
 * texture, and appearing as a wave reads as a year *accumulating*, which is the same
 * story the numbers tell. 12ms a column is a wave you notice at 53 columns and never
 * wait on; the cap keeps a longer history from turning the tail into a pause.
 * --------------------------------------------------------------------------- */
const REVEAL = "heatmap-cell-in";
const REVEAL_STEP = 12;
const REVEAL_CAP = 44;

/* -- Calendar maths -------------------------------------------------------------
 * All of it in local time, on purpose. A contribution graph is about calendar days,
 * not instants, and `new Date("2025-03-04")` is UTC midnight — which is March 3rd for
 * anyone west of Greenwich. The arithmetic below never touches epoch milliseconds, so
 * it also cannot slip an hour on a DST boundary.
 * --------------------------------------------------------------------------- */
const pad = (value: number) => String(value).padStart(2, "0");

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** Where a day sits in its week, counted from `weekStartsOn`. */
const dayIndex = (date: Date, weekStartsOn: number) =>
  (date.getDay() - weekStartsOn + 7) % 7;

/** A `YYYY-MM-DD` string is a calendar day and is read as one. Anything else is handed
 *  to `Date` and then flattened to the day it lands on locally. */
const toDay = (value: string | Date) => {
  if (value instanceof Date) {
    return startOfDay(value);
  }

  const calendar = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (calendar) {
    return new Date(
      Number(calendar[1]),
      Number(calendar[2]) - 1,
      Number(calendar[3])
    );
  }

  return startOfDay(new Date(value));
};

/** Nearest-rank quantiles of the counts — the same reading of "the top quarter of
 *  days" the levels are named after, and cheap enough to redo on every render. */
const quantiles = (values: number[], cuts: number[]) => {
  const sorted = values.toSorted((a, b) => a - b);

  return cuts.map((cut) => sorted[Math.floor((sorted.length - 1) * cut)] ?? 0);
};

/** How many cut points a count clears. Ties land on the lower level, so a plateau of
 *  identical days stays one shade instead of splitting across two. */
const levelOf = (value: number, thresholds: number[]) => {
  if (value <= 0) {
    return 0;
  }

  return Math.min(
    4,
    1 + thresholds.filter((threshold) => value > threshold).length
  );
};

/** The fill for a level, in three layers, each overriding the one under it: a
 *  per-level variable, then the shared tint, then `currentColor`. The tint is a
 *  variable of its own so that swapping the whole ramp for a token is one line —
 *  `--heatmap-tint: var(--chart-3)` — without giving up the plain `text-chart-2`
 *  route. */
const cellFill = (level: number) =>
  `var(--heatmap-${level}, color-mix(in oklab, var(--heatmap-tint, currentColor) ${LEVEL_SHARE[level]}%, transparent))`;

/** The days, keyed for lookup. Built once per render rather than searched per square:
 *  371 squares times a linear scan is the kind of thing that only shows up on someone
 *  else's laptop. */
const indexByDay = (data: HeatmapDatum[]) => {
  const byDay = new Map<string, HeatmapDatum>();

  for (const datum of data) {
    byDay.set(dayKey(toDay(datum.date)), datum);
  }

  return byDay;
};

/** The window on screen: the last day, the first day of its week, and every column
 *  between the two.
 *
 *  The grid ends on a real day — today unless told otherwise — and starts on the first
 *  day of a week, so the columns are weeks and the rows are weekdays. A year of history
 *  therefore comes out as 53 columns rather than 52.1. Data past `end` extends the
 *  range instead of being hidden: a component that silently drops rows is one you stop
 *  trusting. */
const rangeOf = ({
  data,
  end,
  weekStartsOn,
  weeks,
}: {
  data: HeatmapDatum[];
  end: string | Date | undefined;
  weekStartsOn: number;
  weeks: number;
}) => {
  const requestedEnd = end === undefined ? startOfDay(new Date()) : toDay(end);
  let latest: Date | null = null;

  for (const datum of data) {
    const day = toDay(datum.date);

    if (latest === null || day > latest) {
      latest = day;
    }
  }

  const endDay =
    latest !== null && latest > requestedEnd ? latest : requestedEnd;
  const startDay = addDays(
    endDay,
    -(dayIndex(endDay, weekStartsOn) + (weeks - 1) * 7)
  );

  return {
    columns: Array.from({ length: weeks }, (_, column) =>
      addDays(startDay, column * 7)
    ),
    endDay,
    startDay,
  };
};

/** The month labels, and which column each one starts at.
 *
 *  A label belongs to the column where the month turns over and to no other: it is the
 *  boundary that is worth printing, not the month's own first column. Every band keeps
 *  its width whether or not it keeps its label, so a month too narrow to name does not
 *  pull the next label out of alignment with its own squares. */
const monthBands = (columns: Date[], format: Intl.DateTimeFormat) => {
  const starts: { column: number; label: string }[] = [];
  let running = columns[0]?.getMonth() ?? -1;

  for (let column = 1; column < columns.length; column += 1) {
    const week = columns[column];

    if (week.getMonth() !== running) {
      starts.push({ column, label: format.format(week) });
      running = week.getMonth();
    }
  }

  return {
    bands: starts.map((start, index) => ({
      ...start,
      span: (starts[index + 1]?.column ?? columns.length) - start.column,
    })),
    leading: starts[0]?.column ?? columns.length,
  };
};

/** Everything the caption adds up, so the summary and the squares agree. */
const sumInRange = (data: HeatmapDatum[], start: Date, end: Date) => {
  let total = 0;

  for (const datum of data) {
    const day = toDay(datum.date);

    if (day >= start && day <= end) {
      total += datum.value;
    }
  }

  return total;
};

/* -- The tooltip -----------------------------------------------------------------
 * One bubble for the whole grid, moved and retyped directly through the DOM. A React
 * state per hover would re-render 371 squares to move one box, and a tooltip component
 * per square would mount 371 of them; the text it needs is already on the square as
 * `data-tooltip`, because the same string is what a screen reader reads.
 *
 * It is `fixed` rather than absolute so that it escapes the horizontal scroll container
 * the grid lives in — an absolutely positioned bubble gets clipped at the container's
 * edge, which is exactly where a tooltip is most likely to want to go.
 * --------------------------------------------------------------------------- */
const useHoverTooltip = () => {
  const bubble = useRef<HTMLDivElement>(null);
  const shown = useRef<HTMLElement | null>(null);

  const hide = () => {
    shown.current = null;

    if (bubble.current) {
      bubble.current.dataset.visible = "false";
    }
  };

  const show = (cell: HTMLElement) => {
    const node = bubble.current;
    const text = cell.dataset.tooltip;

    // Re-measuring the same bubble for every pixel of travel inside one square is work
    // that cannot change the answer.
    if (!(node && text) || shown.current === cell) {
      return;
    }

    shown.current = cell;
    node.textContent = text;
    node.dataset.visible = "true";

    const rect = cell.getBoundingClientRect();
    const half = node.offsetWidth / 2;
    const centre = rect.left + rect.width / 2;

    // Kept inside the viewport, or a square in the first or last column would push its
    // own label off-screen.
    node.style.left = `${Math.min(
      Math.max(centre, half + 8),
      window.innerWidth - half - 8
    )}px`;
    node.style.top = `${rect.top - 6}px`;
  };

  const onPointerOver = (event: ReactPointerEvent<HTMLTableElement>) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-tooltip]"
    );

    if (cell) {
      show(cell);
    } else {
      // A day that has not happened yet has no text, and no tooltip should linger.
      hide();
    }
  };

  return { bubble, hide, onPointerOver };
};

/**
 * A year of daily counts as a GitHub-style grid: a column per week, a row per weekday,
 * one square per day, shaded by how much happened.
 *
 * The colour is a text colour: the default ink is `text-foreground`, and a token class at
 * the call site overrides it — `text-chart-2`, `text-primary`, anything. For a ramp of its
 * own, set `--heatmap-tint`, or `--heatmap-0` … `--heatmap-4` for a level at a time.
 *
 * Hovering a square raises one shared tooltip; nothing about hover lives in React
 * state, which is what keeps a 371-square grid from re-rendering on every pointer move.
 */
export const ActivityHeatmap = ({
  cellSize = DEFAULT_CELL,
  className,
  data,
  end,
  formatDate,
  formatValue,
  gap = DEFAULT_GAP,
  legend = true,
  lessLabel = "Less",
  locale = "en-US",
  moreLabel = "More",
  style,
  thresholds,
  weekStartsOn = 0,
  weeks = DEFAULT_WEEKS,
}: ActivityHeatmapProps) => {
  const { bubble, hide, onPointerOver } = useHoverTooltip();

  const byDay = indexByDay(data);
  const { columns, endDay, startDay } = rangeOf({
    data,
    end,
    weekStartsOn,
    weeks,
  });

  /* Cut points come from the whole dataset rather than the visible range, so that
   * shortening the range rearranges the grid without repainting what is left of it. */
  const scale =
    thresholds ??
    quantiles(
      data.map((datum) => datum.value).filter((value) => value > 0),
      QUANTILES
    );

  const monthFormat = new Intl.DateTimeFormat(locale, { month: "short" });
  const weekdayFormat = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const dayFormat = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const formatDay = formatDate ?? ((day: Date) => dayFormat.format(day));
  const formatCount =
    formatValue ??
    ((value: number) => (value <= 0 ? "No activity" : String(value)));

  const { bands, leading } = monthBands(columns, monthFormat);

  /** The row names, read off the first column so they follow `weekStartsOn`. */
  const rowLabels = Array.from({ length: 7 }, (_, row) => {
    const day = addDays(startDay, row);

    return LABELLED_WEEKDAYS.has(day.getDay())
      ? weekdayFormat.format(day)
      : null;
  });

  const total = sumInRange(data, startDay, endDay);

  return (
    <div
      className={cn("w-full text-foreground", className)}
      data-slot="activity-heatmap"
      style={style}
    >
      {/* Keyframes have to travel with the component: a registry install copies files,
          not a stylesheet. The same rules from two instances on one page are the same
          rule twice, so repeating them costs nothing. */}
      <style>{`@keyframes ${REVEAL}{from{opacity:0;transform:scale(0.72)}}
@media (prefers-reduced-motion: reduce){[data-heatmap-cell]{animation:none !important}}`}</style>

      <div className="overflow-x-auto" onScroll={hide}>
        <table
          className="border-separate"
          onPointerLeave={hide}
          onPointerOver={onPointerOver}
          style={{ borderSpacing: gap }}
        >
          <caption className="sr-only">
            {`Daily activity from ${formatDay(startDay)} to ${formatDay(
              endDay
            )}, ${total} in total.`}
          </caption>

          <thead>
            <tr>
              {/* The corner above the weekday names, and the columns before the first
                  month boundary — the grid starts mid-month most of the time. */}
              <th scope="col" />
              {leading > 0 ? <th colSpan={leading} scope="colgroup" /> : null}
              {bands.map((band) => (
                <th
                  className="pb-1 text-left align-bottom font-normal text-muted-foreground text-xs leading-none whitespace-nowrap"
                  colSpan={band.span}
                  key={band.column}
                  scope="colgroup"
                >
                  {band.span >= MIN_MONTH_COLUMNS ? band.label : null}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rowLabels.map((label, row) => (
              <tr key={row}>
                <th
                  className="pr-2 text-right align-middle font-normal text-[10px] text-muted-foreground leading-none whitespace-nowrap"
                  scope="row"
                  style={{ height: cellSize }}
                >
                  {label}
                </th>

                {columns.map((week, column) => {
                  const day = addDays(week, row);
                  const datum = byDay.get(dayKey(day));
                  // Days past the end are the tail of the last week: kept so the last
                  // column is a column, drawn so it reads as "not yet".
                  const future = day > endDay;
                  const value = datum?.value ?? 0;
                  const level = future
                    ? 0
                    : (datum?.level ?? levelOf(value, scale));
                  const text = future
                    ? null
                    : `${formatCount(value)} on ${formatDay(day)}`;

                  return (
                    <td
                      aria-hidden={future ? true : undefined}
                      className="rounded-[2px] p-0"
                      data-heatmap-cell=""
                      data-tooltip={text ?? undefined}
                      key={dayKey(day)}
                      style={{
                        animation: future
                          ? undefined
                          : `${REVEAL} 320ms cubic-bezier(0.22, 1, 0.36, 1) ${
                              Math.min(column, REVEAL_CAP) * REVEAL_STEP
                            }ms backwards`,
                        backgroundColor: future ? undefined : cellFill(level),
                        height: cellSize,
                        width: cellSize,
                      }}
                    >
                      {text ? <span className="sr-only">{text}</span> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {legend ? (
        <div className="mt-3 flex items-center justify-end gap-1.5 text-muted-foreground text-xs">
          <span>{lessLabel}</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              aria-hidden="true"
              className="rounded-[2px]"
              key={level}
              style={{
                backgroundColor: cellFill(level),
                height: cellSize,
                width: cellSize,
              }}
            />
          ))}
          <span>{moreLabel}</span>
        </div>
      ) : null}

      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-md bg-primary px-2 py-1 font-medium text-primary-foreground text-xs whitespace-nowrap opacity-0 shadow-md transition-opacity duration-150 data-[visible=true]:opacity-100"
        data-visible="false"
        ref={bubble}
      />
    </div>
  );
};
