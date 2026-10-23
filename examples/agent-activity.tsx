"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  AgentActivity,
  AgentActivityContent,
  AgentActivityHeader,
  AgentActivitySummary,
  AgentActivityTitle,
} from "@/registry/new-york/agents/agent-activity";
import { ThinkingBlock } from "@/registry/new-york/agents/thinking-block";
import {
  ToolCall,
  ToolCallContent,
  ToolCallHeader,
  ToolCallName,
  ToolCallSection,
  ToolCallStatus,
  ToolCallSummary,
} from "@/registry/new-york/agents/tool-call";
import type { ToolCallStatusValue } from "@/registry/new-york/agents/tool-call";

interface Step {
  id: string;
  name: string;
  result: string;
  summary: string;
}

const STEPS: Step[] = [
  {
    id: "grep",
    name: "grep",
    result: "src/auth/session.ts:3\nsrc/auth/middleware.ts:11",
    summary: "createSession in src/",
  },
  {
    id: "read",
    name: "read_file",
    result: "export const createSession = (userId: string) => { … };",
    summary: "src/auth/session.ts",
  },
  {
    id: "edit",
    name: "edit_file",
    result: "Replaced 1 occurrence, +4 −1",
    summary: "src/auth/session.ts",
  },
  { id: "test", name: "run_tests", result: "12 passed", summary: "src/auth" },
];

const THOUGHT =
  "Sessions are created in one place and read in the middleware. Expiry belongs on the session itself, so the fix is in `createSession`, not in the callers.";

const Call = ({
  status,
  step,
}: {
  status: ToolCallStatusValue;
  step: Step;
}) => (
  <ToolCall status={status}>
    <ToolCallHeader>
      <ToolCallStatus />
      <ToolCallName>{step.name}</ToolCallName>
      <ToolCallSummary>{step.summary}</ToolCallSummary>
    </ToolCallHeader>
    {status === "done" ? (
      <ToolCallContent>
        <ToolCallSection title="Result">{step.result}</ToolCallSection>
      </ToolCallContent>
    ) : null}
  </ToolCall>
);

/** A finished run. It is open here so the timeline is on show; left alone, a run that has
 *  stopped is the one line in the header and nothing else. */
export const AgentActivityDemo = () => (
  <AgentActivity
    className="w-full max-w-xl"
    defaultOpen
    duration={42}
    running={false}
  >
    <AgentActivityHeader>
      <AgentActivityTitle />
      <AgentActivitySummary>1 thought, 4 tool calls</AgentActivitySummary>
    </AgentActivityHeader>
    <AgentActivityContent>
      <ThinkingBlock defaultOpen={false} doneLabel="Thought" duration={6}>
        {THOUGHT}
      </ThinkingBlock>
      {STEPS.map((step) => (
        <Call key={step.id} status="done" step={step} />
      ))}
    </AgentActivityContent>
  </AgentActivity>
);

const STEP_MS = 1500;

/** One live run. Mounted fresh for each replay, so every piece of state starts from its
 *  own initial value rather than being reset by an effect. */
const LiveRun = () => {
  // How many steps have been reached; the last one reached is the one in flight.
  const [reached, setReached] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [duration, setDuration] = useState<number>();

  const running = reached <= STEPS.length;

  useEffect(() => {
    if (!running) {
      return;
    }

    const timer = window.setTimeout(() => {
      setReached(reached + 1);
      if (reached === STEPS.length) {
        setDuration((Date.now() - startedAt) / 1000);
      }
    }, STEP_MS);

    return () => window.clearTimeout(timer);
  }, [reached, running, startedAt]);

  return (
    <AgentActivity
      className="w-full"
      duration={duration}
      running={running}
      startedAt={startedAt}
    >
      <AgentActivityHeader>
        <AgentActivityTitle />
        <AgentActivitySummary>
          {running ? null : `${STEPS.length} tool calls`}
        </AgentActivitySummary>
      </AgentActivityHeader>
      <AgentActivityContent>
        {STEPS.slice(0, reached + 1).map((step, index) => (
          <Call
            key={step.id}
            status={index < reached ? "done" : "running"}
            step={step}
          />
        ))}
      </AgentActivityContent>
    </AgentActivity>
  );
};

/** The same run, live. The timeline is open while it goes, and folds into the one-line
 *  receipt the moment it stops, unless the header has been pressed in between. */
export const AgentActivityLiveDemo = () => {
  const [run, setRun] = useState(0);

  return (
    <div className="flex w-full max-w-xl flex-col items-start gap-4">
      <LiveRun key={run} />
      <Button
        onClick={() => setRun((current) => current + 1)}
        size="sm"
        variant="outline"
      >
        Replay
      </Button>
    </div>
  );
};
