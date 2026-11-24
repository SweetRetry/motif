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

const turn = (messages: number): ContextUsageDatum[] => [
  { key: "system", label: "System prompt", value: 3800 },
  { key: "tools", label: "Tool definitions", value: 14_200 },
  { key: "files", label: "Files", value: 22_500 },
  { key: "messages", label: "Messages", value: messages },
];

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

const INITIAL_MESSAGES = 31_400;

export const ContextUsagePanelDemo = () => {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <ContextUsage items={turn(messages)} limit={WINDOW}>
          <div className="flex items-start justify-between gap-4">
            <ContextUsageSummary />
            <ContextUsageRing />
          </div>
          <ContextUsageBar />
          <ContextUsageLegend />
        </ContextUsage>
        <div className="flex items-center justify-end border-border border-t pt-3">
          <Button
            disabled={messages <= INITIAL_MESSAGES}
            onClick={() =>
              setMessages((value) =>
                Math.max(INITIAL_MESSAGES, Math.round(value * 0.35))
              )
            }
            size="sm"
            variant="outline"
          >
            Compact
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={() => setMessages((value) => value + 36_000)}
          size="sm"
          variant="ghost"
        >
          Add a turn
        </Button>
        <Button
          onClick={() => setMessages(INITIAL_MESSAGES)}
          size="sm"
          variant="ghost"
        >
          Reset
        </Button>
      </div>
    </div>
  );
};
