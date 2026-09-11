"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ThinkingBlock } from "@/registry/new-york/agents/thinking-block";

/** The reasoning, written the way a model writes it: short paragraphs, one of them
 *  longer than the window it lands in. */
const PASSAGE = `Reading the request and separating the content model from its presentation.

The activity shell can stay consistent while each event supplies its own compact renderer.

Text remains freeform so partial tokens can update without recreating the surrounding timeline.

As each sentence wraps, the measured stream moves upward through a single transform instead of repeatedly jumping the native scroll position.

Nothing is trimmed: the window keeps its height, and the ramp at its edge is the only sign that the thought runs on past it.`;

const WORDS_PER_TICK = 2;
const TICK_MS = 40;

/** Drips a passage in a couple of words at a time. A chain of timeouts rather than an
 *  interval, so the stream stops when the passage does and leaves nothing to clear. */
const useStreamedPassage = (passage: string) => {
  const words = useMemo(() => passage.split(" "), [passage]);
  const total = Math.ceil(words.length / WORDS_PER_TICK);
  const [tick, setTick] = useState(0);
  const [run, setRun] = useState(0);
  const [startedAt, setStartedAt] = useState<number>();

  // Set from an effect rather than a `useState` initializer: the first render is the one
  // the server produced, and a clock read there would not match it.
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

/** The same pass twice: once behind a click, once opened, both finished — so the row a
 *  reader meets afterwards can be read beside the window it belongs to. */
export const ThinkingBlockStatesDemo = () => (
  <div className="flex w-full max-w-xl flex-col gap-6">
    <ThinkingBlock defaultOpen={false} duration={9}>
      {PASSAGE}
    </ThinkingBlock>
    <ThinkingBlock duration={42}>{PASSAGE}</ThinkingBlock>
  </div>
);
