"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ContextUsage,
  ContextUsageBar,
  ContextUsageLegend,
  ContextUsageRing,
  ContextUsageSummary,
} from "@/registry/new-york/agents/context-usage";
import type { ContextUsageDatum } from "@/registry/new-york/agents/context-usage";

const WINDOW = 200_000;

/** Where a turn's tokens went. The order is the legend's order and fixes each hue. */
const turn = (messages: number): ContextUsageDatum[] => [
  { key: "system", label: "System prompt", value: 3800 },
  { key: "tools", label: "Tool definitions", value: 14_200 },
  { key: "files", label: "Files", value: 22_500 },
  { key: "messages", label: "Messages", value: messages },
];

/** The ring in a footer, the rest behind it. The trigger is a button the caller draws,
 *  because opening something is the caller's decision and the ring is only a value. */
export const ContextUsageDemo = () => (
  <ContextUsage items={turn(31_400)} limit={WINDOW}>
    <Popover>
      <PopoverTrigger asChild>
        <Button className="gap-1.5 px-2" size="sm" variant="ghost">
          <ContextUsageRing showPercent />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-72 flex-col gap-4">
        <ContextUsageSummary />
        <ContextUsageBar />
        <ContextUsageLegend />
      </PopoverContent>
    </Popover>
  </ContextUsage>
);

/** The same window three times. The ring changes role, not hue: ok, then warning once it
 *  is near, then destructive when there is no room. */
export const ContextUsageToneDemo = () => (
  <div className="flex items-center gap-8">
    {[60_000, 158_000, 205_000].map((used) => (
      <ContextUsage
        items={[{ key: "all", label: "Context", value: used }]}
        key={used}
        limit={WINDOW}
      >
        <ContextUsageRing showPercent />
      </ContextUsage>
    ))}
  </div>
);

/** The bar open in a panel of its own, with a turn that can be run to see it fill. */
export const ContextUsagePanelDemo = () => {
  const [messages, setMessages] = useState(31_400);

  return (
    <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <ContextUsage items={turn(messages)} limit={WINDOW}>
        <div className="flex items-start justify-between gap-4">
          <ContextUsageSummary />
          <ContextUsageRing />
        </div>
        <ContextUsageBar />
        <ContextUsageLegend />
      </ContextUsage>
      <div className="flex gap-2">
        <Button
          onClick={() => setMessages((value) => value + 24_000)}
          size="sm"
          variant="outline"
        >
          Add a turn
        </Button>
        <Button onClick={() => setMessages(31_400)} size="sm" variant="ghost">
          Reset
        </Button>
      </div>
    </div>
  );
};
