"use client";

import { useState } from "react";

import { AgentIndicator } from '@/registry/new-york/agents/agent-indicator';
import type { AgentState } from '@/registry/new-york/agents/agent-indicator';

const STATES: { state: AgentState; label: string }[] = [
  { label: "Idle", state: "idle" },
  { label: "Thinking", state: "thinking" },
  { label: "Tool Call", state: "tool-call" },
  { label: "Streaming", state: "streaming" },
];

export const AgentIndicatorDemo = () => (
  <div className="flex items-center gap-6">
    {STATES.map(({ state, label }) => (
      <div className="flex flex-col items-center gap-2" key={state}>
        <AgentIndicator state={state} />
        <span className="text-muted-foreground text-xs">{label}</span>
      </div>
    ))}
  </div>
);

export const AgentIndicatorSwitchDemo = () => {
  const [active, setActive] = useState<AgentState>("idle");

  return (
    <div className="flex flex-col items-center gap-6">
      <AgentIndicator className="scale-[3]" state={active} />
      <div className="flex flex-wrap justify-center gap-2">
        {STATES.map(({ state, label }) => (
          <button
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              active === state
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
            key={state}
            onClick={() => setActive(state)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};
