"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
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

const INPUT = `{
  "path": "src/auth/session.ts",
  "start_line": 1,
  "end_line": 40
}`;

const RESULT = `export const createSession = (userId: string) => {
  const token = crypto.randomUUID();
  sessions.set(token, { userId, createdAt: Date.now() });
  return token;
};`;

const ERROR = "ENOENT: no such file or directory, open 'src/auth/sessions.ts'";

/** The four things a row can say, one each. The finished call is open, since the detail
 *  is the half of the component that a closed row does not show. */
export const ToolCallDemo = () => (
  <div className="flex w-full max-w-xl flex-col gap-3">
    <ToolCall status="done" defaultOpen>
      <ToolCallHeader>
        <ToolCallStatus />
        <ToolCallName>read_file</ToolCallName>
        <ToolCallSummary>src/auth/session.ts</ToolCallSummary>
      </ToolCallHeader>
      <ToolCallContent>
        <ToolCallSection title="Input">{INPUT}</ToolCallSection>
        <ToolCallSection title="Result">{RESULT}</ToolCallSection>
      </ToolCallContent>
    </ToolCall>

    <ToolCall status="running">
      <ToolCallHeader>
        <ToolCallStatus />
        <ToolCallName>grep</ToolCallName>
        <ToolCallSummary>createSession in src/</ToolCallSummary>
      </ToolCallHeader>
    </ToolCall>

    <ToolCall status="queued">
      <ToolCallHeader>
        <ToolCallStatus />
        <ToolCallName>run_tests</ToolCallName>
        <ToolCallSummary>src/auth</ToolCallSummary>
      </ToolCallHeader>
    </ToolCall>

    <ToolCall status="failed">
      <ToolCallHeader>
        <ToolCallStatus />
        <ToolCallName>read_file</ToolCallName>
        <ToolCallSummary>src/auth/sessions.ts</ToolCallSummary>
      </ToolCallHeader>
      <ToolCallContent>
        <ToolCallSection title="Input">
          {'{ "path": "src/auth/sessions.ts" }'}
        </ToolCallSection>
        <ToolCallSection title="Error">
          <p className="text-destructive text-xs">{ERROR}</p>
        </ToolCallSection>
      </ToolCallContent>
    </ToolCall>
  </div>
);

const LIFECYCLE: ToolCallStatusValue[] = ["queued", "running", "done"];
const STEP_MS = 1400;

/** One call walked through its life. The row is the same row throughout: the status
 *  changes in place, and the detail only exists once there is a result to show. */
export const ToolCallLifecycleDemo = () => {
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    setStep(0);
  }, [run]);

  useEffect(() => {
    if (step >= LIFECYCLE.length - 1) {
      return;
    }

    const timer = window.setTimeout(() => setStep(step + 1), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [run, step]);

  const status = LIFECYCLE[step];

  return (
    <div className="flex w-full max-w-xl flex-col items-start gap-4">
      <ToolCall className="w-full" status={status}>
        <ToolCallHeader>
          <ToolCallStatus />
          <ToolCallName>read_file</ToolCallName>
          <ToolCallSummary>src/auth/session.ts</ToolCallSummary>
        </ToolCallHeader>
        {status === "done" ? (
          <ToolCallContent>
            <ToolCallSection title="Input">{INPUT}</ToolCallSection>
            <ToolCallSection title="Result">{RESULT}</ToolCallSection>
          </ToolCallContent>
        ) : null}
      </ToolCall>
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
