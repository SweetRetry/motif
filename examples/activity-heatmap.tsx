"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ActivityHeatmap } from "@/registry/new-york/activity-heatmap";
import type { HeatmapDatum } from "@/registry/new-york/activity-heatmap";

const RANGES = [
  { label: "3 months", weeks: 13 },
  { label: "6 months", weeks: 27 },
  { label: "12 months", weeks: 53 },
];

const HISTORY_DAYS = 371;

const pad = (value: number) => String(value).padStart(2, "0");

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const hash = (value: string) => {
  let result = 1;

  for (const character of value) {
    result =
      (result * 48_271 + (character.codePointAt(0) ?? 0) * 16_807) %
      2_147_483_647;
  }

  return (result % 9973) / 9973;
};

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
