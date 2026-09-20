"use client";

import {
  Breakdown,
  BreakdownBar,
  BreakdownLegend,
  breakdownColors,
  useBreakdown,
} from "@/registry/new-york/breakdown";
import type { BreakdownDatum } from "@/registry/new-york/breakdown";

/** A month of model spend, already ordered the way it should be drawn — the component
 *  never sorts, because the caller's order is the one the legend has to read in. */
const SPEND: BreakdownDatum[] = [
  { key: "seedance-2-5", label: "Seedance 2.5", value: 486_200 },
  { key: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", value: 312_450 },
  { key: "veo-3-1", label: "Veo 3.1", value: 184_900 },
  { key: "gpt-5-2", label: "GPT-5.2", value: 96_300 },
  { key: "kling-2-5-turbo", label: "Kling 2.5 Turbo", value: 41_750 },
  { key: "flux-2-video", label: "FLUX.2 Video", value: 12_400 },
];

/** The palette is built from the catalogue — every model the workspace can spend on, not
 *  the six that spent this month — so a model that drops out and comes back is the same
 *  colour it was. Built from `SPEND` instead, it would be a different colour every month,
 *  which is the failure the required `colors` prop exists to keep visible. */
const COLORS = breakdownColors([
  "seedance-2-5",
  "claude-sonnet-4-5",
  "veo-3-1",
  "gpt-5-2",
  "kling-2-5-turbo",
  "flux-2-video",
  "minimax-hailuo-2-3",
  "gemini-omni-1-1-flash",
]);

const pt = (value: number) => `${value.toLocaleString()} pt`;

export const BreakdownDemo = () => (
  // The heading, the period and the card are the page's: the component is the bar and
  // the legend, and everything around them is what the caller already knows.
  <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-5">
    <div className="mb-4">
      <p className="font-medium text-sm">Model consumption</p>
      <p className="text-muted-foreground text-xs">
        1,134,000 pt across 6 models, this month
      </p>
    </div>

    <Breakdown colors={COLORS} formatValue={pt} items={SPEND}>
      <div className="flex flex-col gap-4">
        <BreakdownBar label="Consumption by model" />
        <BreakdownLegend />
      </div>
    </Breakdown>
  </div>
);

/** The same breakdown in a frame of its own: one row per model, each row's bar drawn in
 *  that model's colour. Nothing here is a second implementation of the shares — the hook
 *  hands over the same slices the bar and the legend are drawn from. */
const Rows = () => {
  const { formatValue, items } = useBreakdown();

  return (
    <div className="divide-y divide-border rounded-xl border border-border text-xs">
      {items.map((item) => (
        <div className="flex items-center gap-4 px-4 py-3" key={item.key}>
          <span className="flex w-44 shrink-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: item.color }}
            />
            <span className="truncate font-medium">{item.label}</span>
          </span>
          <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full"
              style={{ background: item.color, width: `${item.share}%` }}
            />
          </span>
          <span className="w-24 shrink-0 text-right text-muted-foreground tabular-nums">
            {formatValue(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export const BreakdownRowsDemo = () => (
  <div className="w-full max-w-2xl">
    <Breakdown colors={COLORS} formatValue={pt} items={SPEND}>
      <Rows />
    </Breakdown>
  </div>
);
