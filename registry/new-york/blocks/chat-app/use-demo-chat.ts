"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PromptModel } from "@/components/agents/prompt-input";

import type { ChatTurn } from "./chat-app";

/* -- The stand-in transport ----------------------------------------------------
 * A chat surface is only half a chat app; the other half is whatever the turns come
 * from. This is the smallest thing that behaves like that half: it appends a reader's
 * turn, appends an empty answer, then drips reasoning and answer into it a couple of
 * words at a time. It streams on a chain of timeouts rather than an interval, so it
 * stops when the passage does and leaves nothing behind to clear.
 *
 * Replace it with a real transport — a fetch to a streaming endpoint, a socket, an
 * SDK — and keep the shape: returns the turns, whether an answer is arriving, and the
 * four things the composer can ask it to do.
 * --------------------------------------------------------------------------- */

const REASONING = `Starting from the question rather than from the components. A thread is a scroll region that follows its own tail, so the follow belongs to the region, not to the page that happens to render it.

The turns belong to the caller. What the surface owns is the draft and the files riding with it, which is exactly what a composer owns everywhere else it appears.`;

const ANSWER = `The pieces already existed, so the template is mostly arrangement:

- **Conversation** owns the follow: it pins to the newest turn while you are at the end, and stops the moment you scroll away to re-read something.
- **Message** owns a turn's anatomy — the body, and the actions that appear once you are done reading.
- **PromptInput** owns the draft, and **ThinkingBlock** owns the reasoning an answer was written from.

Swap this transport for a real one and nothing above it moves.`;

const REASONING_WORDS = REASONING.split(" ");
const ANSWER_WORDS = ANSWER.split(" ");

/** Reasoning drips two words at a time because a thought arrives faster than an
 *  answer; the answer goes one at a time, which is the speed it is read at. */
const REASONING_MS = 45;
const ANSWER_MS = 55;

/** Three models, so the picker's menu says what it is for without a list to read. */
export const DEMO_MODELS: PromptModel[] = [
  { id: "gpt-5.2", name: "GPT-5.2", provider: "openai" },
  { id: "claude-sonnet-4.5", name: "Claude Sonnet 4.5", provider: "anthropic" },
  { id: "gemini-3-pro", name: "Gemini 3 Pro", provider: "gemini" },
];

/** The shape `ChatApp` spreads: everything the surface needs, nothing it does not. */
export interface DemoChat {
  model: string;
  models: PromptModel[];
  onModelChange: (id: string) => void;
  onReset: () => void;
  onRetry: (id: string) => void;
  onSend: (message: string) => void;
  onStop: () => void;
  streaming: boolean;
  turns: ChatTurn[];
}

/**
 * The scripted chat. Pass `initialTurns` for a thread that is already underway, or
 * nothing for a surface that opens on its empty state.
 */
export const useDemoChat = (initialTurns: ChatTurn[] = []): DemoChat => {
  const [turns, setTurns] = useState<ChatTurn[]>(initialTurns);
  const [streaming, setStreaming] = useState(false);
  const [model, setModel] = useState(DEMO_MODELS[0].id);
  const counter = useRef(0);
  const timer = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  const onStop = useCallback(() => {
    clear();
    setStreaming(false);
    setTurns((current) =>
      current.map((turn) =>
        turn.streaming ? { ...turn, streaming: false } : turn
      )
    );
  }, [clear]);

  const run = useCallback((id: string) => {
    const startedAt = Date.now();
    setStreaming(true);

    let reasoning = 0;
    let answered = 0;

    const step = () => {
      reasoning = Math.min(reasoning + 2, REASONING_WORDS.length);
      const reasoningDone = reasoning >= REASONING_WORDS.length;
      if (reasoningDone) {
        answered += 1;
      }

      const finished = reasoningDone && answered >= ANSWER_WORDS.length;

      setTurns((current) =>
        current.map((turn) =>
          turn.id === id
            ? {
                ...turn,
                content: ANSWER_WORDS.slice(0, answered).join(" "),
                reasoning: REASONING_WORDS.slice(0, reasoning).join(" "),
                startedAt,
                streaming: !finished,
              }
            : turn
        )
      );

      if (finished) {
        timer.current = null;
        setStreaming(false);
        return;
      }
      timer.current = window.setTimeout(
        step,
        reasoningDone ? ANSWER_MS : REASONING_MS
      );
    };

    step();
  }, []);

  const onSend = useCallback(
    (message: string) => {
      const userId = `u-${(counter.current += 1)}`;
      const assistantId = `a-${(counter.current += 1)}`;

      setTurns((current) => [
        ...current,
        { content: message, from: "user", id: userId },
        {
          content: "",
          from: "assistant",
          id: assistantId,
          reasoning: "",
          streaming: true,
        },
      ]);
      run(assistantId);
    },
    [run]
  );

  const onRetry = useCallback(
    (id: string) => {
      const assistantId = `a-${(counter.current += 1)}`;

      setTurns((current) => {
        const at = current.findIndex((turn) => turn.id === id);
        return [
          ...current.slice(0, at === -1 ? current.length : at),
          {
            content: "",
            from: "assistant",
            id: assistantId,
            reasoning: "",
            streaming: true,
          },
        ];
      });
      run(assistantId);
    },
    [run]
  );

  const onReset = useCallback(() => {
    onStop();
    setTurns([]);
  }, [onStop]);

  return {
    model,
    models: DEMO_MODELS,
    onModelChange: setModel,
    onReset,
    onRetry,
    onSend,
    onStop,
    streaming,
    turns,
  };
};
