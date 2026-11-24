"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ThinkingBlock } from "@/registry/new-york/agents/thinking-block";

const PASSAGE = `Reading the request and separating the content model from its presentation.

The activity shell can stay consistent while each event supplies its own compact renderer.

Text remains freeform so partial tokens can update without recreating the surrounding timeline.

As each sentence wraps, the measured stream moves upward through a single transform instead of repeatedly jumping the native scroll position.

Nothing is trimmed: the window keeps its height, and the ramp at its edge is the only sign that the thought runs on past it.`;

const WORDS_PER_TICK = 2;
const TICK_MS = 40;

const useStreamedPassage = (passage: string) => {
  const words = useMemo(() => passage.split(" "), [passage]);
  const total = Math.ceil(words.length / WORDS_PER_TICK);
  const [tick, setTick] = useState(0);
  const [run, setRun] = useState(0);
  const [startedAt, setStartedAt] = useState<number>();

  useEffect(() => {
    setTick(0);
    setStartedAt(Date.now());
  }, [run]);

  useEffect(() => {
    if (tick >= total) {
      return;
    }

    const timer = window.setTimeout(
      () => setTick((current) => current + 1),
      TICK_MS
    );
    return () => window.clearTimeout(timer);
  }, [tick, total]);

  return {
    content: words.slice(0, tick * WORDS_PER_TICK).join(" "),
    replay: () => setRun((current) => current + 1),
    startedAt,
    streaming: tick < total,
  };
};

export const ThinkingBlockDemo = () => {
  const { content, replay, startedAt, streaming } = useStreamedPassage(PASSAGE);

  return (
    <div className="w-full max-w-xl">
      <ThinkingBlock startedAt={startedAt} streaming={streaming}>
        {content}
      </ThinkingBlock>

      <div className="mt-4 flex justify-end">
        <Button onClick={replay} size="sm" variant="ghost">
          Replay
        </Button>
      </div>
    </div>
  );
};

export const ThinkingBlockStatesDemo = () => (
  <div className="flex w-full max-w-xl flex-col gap-6">
    <ThinkingBlock defaultOpen={false} duration={9}>
      {PASSAGE}
    </ThinkingBlock>
    <ThinkingBlock duration={42}>{PASSAGE}</ThinkingBlock>
  </div>
);
