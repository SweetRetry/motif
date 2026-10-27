"use client";

import { useInView } from "motion/react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { AgentRun } from "@/registry/new-york/blocks/agent-run/agent-run";
import type { RunToolStep } from "@/registry/new-york/blocks/agent-run/agent-run";
import { useDemoRun } from "@/registry/new-york/blocks/agent-run/use-demo-run";

const TASK = "Make the thread follow its tail while I read the newest turn.";

/** How long a card is left at the composer before the demo answers it itself. Long enough
 *  to read the question; the reader can still answer first. */
const APPROVE_AFTER_MS = 1800;

/**
 * A run that plays itself. It starts when it scrolls into view, so a reader arrives at
 * something already moving: the task is sent, the thought streams in as the row in
 * flight, the reads and the search come back one after the other, the agent stops to ask
 * a question, the demo answers it, the edit is held for approval, the demo approves, the
 * edit lands, the activity folds into its one-line receipt and the answer is written to
 * what the reader chose, with its sources under it.
 *
 * Both halves of the playback are the demo's and not the block's. The block is the
 * surface; a real product's transport decides when a run starts and a person decides the
 * approval. "New run" in the header plays it again.
 */
export const AgentRunDemo = () => {
  const run = useDemoRun();
  const { onAnswer, onDecide, onReset, onSend } = run;
  const frame = useRef<HTMLDivElement>(null);
  const inView = useInView(frame, { amount: 0.4, once: true });

  // Strict mode runs an effect twice on mount, and a second send would be a second run.
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

    // A question is answered with its first option, a held call is approved. The reader
    // can press first; this is only what happens if they do not.
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
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex flex-col gap-1.5">
              <p className="font-medium">What should the agent do?</p>
              <p className="text-sm text-muted-foreground">
                The empty slot is the caller's — a greeting, a fan of covers, a
                list of starting points.
              </p>
            </div>
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
