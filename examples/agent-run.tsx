"use client";

import { useInView } from "motion/react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { AgentRun } from "@/registry/new-york/blocks/agent-run/agent-run";
import type { RunToolStep } from "@/registry/new-york/blocks/agent-run/agent-run";
import { useDemoRun } from "@/registry/new-york/blocks/agent-run/use-demo-run";

const TASK = "Make the thread follow its tail while I read the newest turn.";

const APPROVE_AFTER_MS = 1800;

export const AgentRunDemo = () => {
  const run = useDemoRun();
  const { onAnswer, onDecide, onReset, onSend } = run;
  const frame = useRef<HTMLDivElement>(null);
  const inView = useInView(frame, { amount: 0.4, once: true });

  const started = useRef(false);

  useEffect(() => {
    if (inView && !started.current) {
      started.current = true;
      onSend(TASK);
    }
  }, [inView, onSend]);

  const asking = run.turns
    .flatMap((turn) => turn.steps ?? [])
    .find(
      (step): step is RunToolStep =>
        !("note" in step) && step.status === "approval"
    );

  useEffect(() => {
    if (!asking) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (asking.questions) {
        onAnswer(
          asking.id,
          Object.fromEntries(
            asking.questions.map((question) => [
              question.id,
              {
                selected: question.options?.[0]
                  ? [question.options[0].value]
                  : [],
              },
            ])
          )
        );
      } else {
        onDecide(asking.id, "approve");
      }
    }, APPROVE_AFTER_MS);

    return () => window.clearTimeout(timer);
  }, [asking, onAnswer, onDecide]);

  const replay = () => {
    onReset();
    onSend(TASK);
  };

  return (
    <div
      className="h-[50rem] w-full overflow-hidden rounded-xl border border-border"
      ref={frame}
    >
      <AgentRun {...run} onReset={replay} title="Agent" />
    </div>
  );
};

export const AgentRunEmptyDemo = () => {
  const run = useDemoRun();

  return (
    <div className="h-[30rem] w-full overflow-hidden rounded-xl border border-border">
      <AgentRun
        {...run}
        empty={
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="font-medium">What should the agent do?</p>
            <Button
              onClick={() => run.onSend("Make the thread follow its tail.")}
              type="button"
              variant="outline"
            >
              Make the thread follow its tail
            </Button>
          </div>
        }
        title="Agent"
      />
    </div>
  );
};
