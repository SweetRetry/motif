"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ActivityHeatmap } from "@/registry/new-york/activity-heatmap";
import type { HeatmapDatum } from "@/registry/new-york/activity-heatmap";

/** The three windows the demo switches between. `weeks` is all the heatmap needs; the
 *  label is only here so the header can say what the total is counting. */
const RANGES = [
  { label: "3 months", weeks: 13 },
  { label: "6 months", weeks: 27 },
  { label: "12 months", weeks: 53 },
];

/** How far back the demo fabricates data — the widest range plus its own slack. */
const HISTORY_DAYS = 371;

const pad = (value: number) => String(value).padStart(2, "0");

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** A value in [0, 1) that depends on nothing but the day it is asked about.
 *
 *  This is the whole reason the demo can be server-rendered: a random walk would be
 *  generated once on the server and again in the browser, and the two would disagree at
 *  hydration. Hashing the day gives both of them the same year, and it has the second
 *  property a demo wants — the counts do not move when the range changes, so shortening
 *  the window reveals a subset instead of a different history.
 *
 *  A Lehmer step per character, not a bitwise hash: multiplying by a large odd constant
 *  and taking a prime modulus spreads neighbouring dates as well as any XOR-shift does,
 *  and stays inside the exact-integer range a float64 can represent, so the server and
 *  the browser cannot round their way to different answers. */
const hash = (value: string) => {
  let result = 1;

  for (const character of value) {
    result =
      (result * 48_271 + (character.codePointAt(0) ?? 0) * 16_807) %
      2_147_483_647;
  }

  return (result % 9973) / 9973;
};

/** Agent runs for one day, shaped like a usage graph rather than noise: weekends drop
 *  to a third, the year trends upward as the habit takes hold, and a small share of
 *  days are bursts — the days a long job ran. The seed is raised to a power rather than
 *  used raw, which is what pushes most days toward empty and leaves the busy ones as
 *  the exception. That shape is the point: it is what real usage looks like, and it is
 *  the only shape a quantile scale can read. */
const runsFor = (date: Date) => {
  const seed = hash(dayKey(date));
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const throughYear = (date.getMonth() + date.getDate() / 31) / 11;
  const burst = seed > 0.96 ? 6 : 1;

  return Math.round(
    seed ** 2.4 * 20 * (weekend ? 0.32 : 1) * (1 + throughYear * 2.4) * burst
  );
};

const buildHistory = (): HeatmapDatum[] => {
  const today = new Date();
  const history: HeatmapDatum[] = [];

  for (let back = HISTORY_DAYS; back >= 0; back -= 1) {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - back
    );

    history.push({ date, value: runsFor(date) });
  }

  return history;
};

export const ActivityHeatmapDemo = () => {
  const [history] = useState(buildHistory);
  const [range, setRange] = useState(RANGES[2]);

  // The range the heatmap derives, worked out the same way so the total under the
  // header counts exactly the days on the grid: the last column is the week `today`
  // is in, and the grid runs back from that week's first day. Summarising is the
  // caller's job — the component draws the grid and nothing else.
  const today = new Date();
  const weekStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - today.getDay()
  );
  const start = new Date(
    weekStart.getFullYear(),
    weekStart.getMonth(),
    weekStart.getDate() - (range.weeks - 1) * 7
  );
  let total = 0;

  for (const day of history) {
    if (day.date >= start) {
      total += day.value;
    }
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Agent runs</p>
          <p className="text-muted-foreground text-xs">
            {total.toLocaleString()} runs in the last {range.label}
          </p>
        </div>

        {/* A range switch is the one control a heatmap really needs: the same data at
            three densities, and the colour scale holds still across all three. */}
        <div className="flex items-center gap-1">
          {RANGES.map((option) => (
            <Button
              key={option.weeks}
              aria-pressed={option === range}
              onClick={() => setRange(option)}
              size="sm"
              sound="click"
              variant={option === range ? "secondary" : "ghost"}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <ActivityHeatmap
        className="text-chart-2"
        data={history}
        formatValue={(value) =>
          value === 0 ? "No runs" : `${value.toLocaleString()} runs`
        }
        weeks={range.weeks}
      />
    </div>
  );
};
