"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PromptModel } from "@/components/ui/motif/prompt-input";

import type {
  RunAnswers,
  RunQuestion,
  RunSource,
  RunStep,
  RunToolStep,
  RunTurn,
  RunUsage,
} from "./agent-run";

/* -- The stand-in transport ----------------------------------------------------
 * An agent run is only half a surface; the other half is whatever the turns come from.
 * This is the smallest thing that behaves like that half. It appends a reader's turn and
 * an empty answer, then plays a script into the answer. The script is written to walk
 * every shape a timeline can take in one run: the agent says what it will do, three calls
 * in a row that fold into one line once it speaks again, a question it stops to ask, two
 * calls that stay as rows, one of which fails, a remark, an edit held for approval, a run
 * of the tests, and the words. It is a queue of beats, each one a delay and a change to
 * the turn, played on a chain of timeouts rather than an interval, so it stops when the
 * run does and leaves nothing behind to clear.
 *
 * The write is held at a gate. The queue holds at it until `onDecide` answers, and the
 * decision picks which beats come next, the way a real agent's next move depends on the
 * reader's reply.
 *
 * The window the ring reads is an estimate, good enough to move it: a real transport
 * reports what the provider counted, and the surface is the same either way.
 *
 * Replace it with a real transport — a fetch to a streaming endpoint, a socket, an SDK —
 * and keep the shape: returns the turns, whether a run is in flight, and the things the
 * surface can ask it to do.
 * --------------------------------------------------------------------------- */

/** What the reader decides about following, and what the thread does with it. */
const FOLLOW: RunQuestion = {
  id: "follow",
  options: [
    { label: "Stop until I come back to the bottom", value: "pause" },
    { label: "Keep following no matter what", value: "keep" },
  ],
  title:
    "When you scroll up to read, should the thread keep following the newest turn?",
};

const FOLLOWING = {
  keep: "and keeps following even when you scroll up",
  pause:
    "and stops following once you scroll up, until you come back to the bottom",
};

/** The answer, written to what the reader chose. */
const answerText = (
  follow: keyof typeof FOLLOWING
) => `Done. The follow lives in **Conversation**, so the change was one line in the thread's own file:

- Read \`conversation.tsx\` and searched for how a thread keeps the newest turn in view.
- Edited \`thread.tsx\` so the viewport pins to the newest turn on a layout effect, ${FOLLOWING[follow]}.
- Ran the thread tests, and all 12 passed.

Nothing above the surface had to move.`;

/** The pages the search found, and the two the answer leans on. */
const FOUND: RunSource[] = [
  {
    href: "https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-anchor",
    title: "overflow-anchor - CSS: Cascading Style Sheets | MDN",
  },
  {
    href: "https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTo",
    title: "Element: scrollTo() method - Web APIs | MDN",
  },
  {
    href: "https://react.dev/reference/react/useLayoutEffect",
    title: "useLayoutEffect - React",
  },
];

const CITED: RunSource[] = [FOUND[0], FOUND[2]];

const ANSWER_REJECTED = `Understood, I left \`thread.tsx\` alone. The reads are in the log above if you want to look at what I found before I try another way.`;

const EDIT_INPUT = `{
  "path": "components/thread.tsx"
}`;

const NOTE_MS = 40;
const ANSWER_MS = 55;
const CALL_MS = 700;

/** Three models, so the picker's menu says what it is for without a list to read. */
export const DEMO_MODELS: PromptModel[] = [
  { id: "gpt-5.2", name: "GPT-5.2", provider: "openai" },
  { id: "claude-sonnet-4.5", name: "Claude Sonnet 4.5", provider: "anthropic" },
  { id: "gemini-3-pro", name: "Gemini 3 Pro", provider: "gemini" },
];

/** The shape `AgentRun` spreads: everything the surface needs, nothing it does not. */
export interface DemoRun {
  model: string;
  models: PromptModel[];
  onDecide: (
    id: string,
    decision: "approve" | "reject",
    reason?: string
  ) => void;
  onAnswer: (id: string, answers: RunAnswers) => void;
  onModelChange: (id: string) => void;
  onReset: () => void;
  onRetry: (id: string) => void;
  onSend: (message: string) => void;
  onStop: () => void;
  streaming: boolean;
  turns: RunTurn[];
  usage: RunUsage;
}

/** One change to the turn being played, and how long to wait before the next. */
interface Beat {
  apply: (turn: RunTurn) => RunTurn;
  /** The queue holds here until `onDecide` answers this id. */
  gate?: string;
  ms: number;
}

const withStep = (turn: RunTurn, step: RunStep): RunTurn => ({
  ...turn,
  steps: [...(turn.steps ?? []), step],
});

const patchStep = (
  turn: RunTurn,
  id: string,
  patch: Partial<RunToolStep>
): RunTurn => ({
  ...turn,
  steps: turn.steps?.map((step) =>
    "note" in step || step.id !== id ? step : { ...step, ...patch }
  ),
});

/** A call that goes in running and comes back done. */
const call = (
  id: string,
  name: string,
  summary: string,
  input: string,
  result: string,
  found?: RunSource[]
): Beat[] => [
  {
    apply: (turn) => withStep(turn, { id, name, status: "running", summary }),
    ms: CALL_MS,
  },
  {
    apply: (turn) =>
      patchStep(turn, id, { input, result, sources: found, status: "done" }),
    ms: 250,
  },
];

/** A call that goes in running and does not come back. */
const failing = (
  id: string,
  name: string,
  summary: string,
  error: string
): Beat[] => [
  {
    apply: (turn) => withStep(turn, { id, name, status: "running", summary }),
    ms: CALL_MS,
  },
  {
    apply: (turn) => patchStep(turn, id, { error, status: "failed" }),
    ms: 250,
  },
];

/** The turn stops working: how long it took, and what the answer leans on. Applied just
 *  before the first word, so the activity folds as the answer begins. */
const finish = (sources?: RunSource[]): Beat => ({
  apply: (turn) => ({
    ...turn,
    duration: turn.startedAt ? (Date.now() - turn.startedAt) / 1000 : undefined,
    sources,
  }),
  ms: 0,
});

const words = (text: string, ms: number, per: number): Beat[] => {
  const all = text.split(" ");
  const beats: Beat[] = [];
  for (let at = per; at < all.length + per; at += per) {
    const upto = Math.min(at, all.length);
    beats.push({
      apply: (turn) => ({ ...turn, content: all.slice(0, upto).join(" ") }),
      ms,
    });
  }
  return beats;
};

/** The agent says something, a word at a time, as a note in the timeline. */
const say = (id: string, text: string): Beat[] => {
  const all = text.split(" ");

  return all.map((_, at): Beat => ({
    apply: (turn) =>
      at === 0
        ? withStep(turn, { id, note: all[0] })
        : {
            ...turn,
            steps: turn.steps?.map((step) =>
              "note" in step && step.id === id
                ? { ...step, note: all.slice(0, at + 1).join(" ") }
                : step
            ),
          },
    ms: NOTE_MS,
  }));
};

const script = (id: string): Beat[] => [
  ...say(
    `${id}-n1`,
    "Let me look at how the thread follows its tail before I change anything."
  ),
  ...call(
    `${id}-read`,
    "read_file",
    "components/conversation.tsx",
    `{ "path": "components/conversation.tsx" }`,
    "212 lines. The viewport pins to the newest turn while the reader is at the end."
  ),
  ...call(
    `${id}-read-thread`,
    "read_file",
    "components/thread.tsx",
    `{ "path": "components/thread.tsx" }`,
    "58 lines. Scrolls the newest turn into view on every change."
  ),
  ...call(
    `${id}-search`,
    "web_search",
    "keep the newest message in view while it streams",
    `{ "query": "keep the newest message in view while it streams" }`,
    "3 results.",
    FOUND
  ),
  ...say(
    `${id}-n2`,
    "The thread scrolls with a smooth `scrollIntoView`, which lags behind a streaming answer. Before I replace it I need one decision from you."
  ),
  {
    apply: (turn) =>
      withStep(turn, {
        id: `${id}-ask`,
        name: "ask_user",
        questions: [FOLLOW],
        status: "approval",
      }),
    gate: `${id}-ask`,
    ms: 0,
  },
];

/** What comes after the reader answers the question: the reply is recorded as the result
 *  of that step, and the agent goes on to the edit, which it holds for approval. */
const afterAnswer = (id: string, answers: RunAnswers): Beat[] => [
  {
    apply: (turn) => patchStep(turn, `${id}-ask`, { answers, status: "done" }),
    ms: 500,
  },
  ...say(
    `${id}-n3`,
    "Thanks. Before I edit, let me see whether anything else scrolls the thread."
  ),
  ...call(
    `${id}-grep`,
    "grep",
    "scrollIntoView in components/",
    `{ "pattern": "scrollIntoView", "path": "components/" }`,
    "2 matches: thread.tsx:21, composer.tsx:44."
  ),
  ...failing(
    `${id}-read-scroll`,
    "read_file",
    "components/thread-scroll.tsx",
    "ENOENT: no such file or directory, open 'components/thread-scroll.tsx'"
  ),
  ...say(
    `${id}-n4`,
    "That file does not exist, so the follow lives only in `thread.tsx`. The edit is small, and it needs your approval."
  ),
  {
    apply: (turn) =>
      withStep(turn, {
        id: `${id}-write`,
        input: EDIT_INPUT,
        name: "edit_file",
        status: "approval",
        summary: "components/thread.tsx",
      }),
    gate: `${id}-write`,
    ms: 0,
  },
];

/** What comes after the reader answers: the held call runs and the words follow, or the
 *  call is refused and the words alone. */
const aftermath = (
  id: string,
  decision: "approve" | "reject",
  reason: string | undefined,
  follow: keyof typeof FOLLOWING
): Beat[] =>
  decision === "approve"
    ? [
        {
          apply: (turn) =>
            patchStep(turn, `${id}-write`, { status: "running" }),
          ms: CALL_MS,
        },
        {
          apply: (turn) =>
            patchStep(turn, `${id}-write`, {
              result: "Edited 1 file, +9 −5.",
              status: "done",
            }),
          ms: 250,
        },
        ...call(
          `${id}-test`,
          "run_tests",
          "components/thread.test.tsx",
          `{ "path": "components/thread.test.tsx" }`,
          "12 passed."
        ),
        finish(CITED),
        ...words(answerText(follow), ANSWER_MS, 1),
      ]
    : [
        {
          apply: (turn) =>
            patchStep(turn, `${id}-write`, {
              error: reason ? `Rejected: ${reason}` : "Rejected.",
              status: "failed",
            }),
          ms: 250,
        },
        finish(),
        ...words(ANSWER_REJECTED, ANSWER_MS, 1),
      ];

const WINDOW = 200_000;

/** What the thread is carrying, estimated: a fixed system prompt and toolset, a chunk of
 *  window for every page the agent read or searched, and about four characters a token
 *  for the words. */
const usageOf = (turns: RunTurn[]): RunUsage => {
  let chars = 0;
  let reads = 0;
  for (const turn of turns) {
    chars += turn.content.length;
    for (const step of turn.steps ?? []) {
      if ("note" in step) {
        chars += step.note.length;
        continue;
      }
      if (
        step.status === "done" &&
        ["grep", "read_file", "web_search"].includes(step.name)
      ) {
        reads += 1;
      }
    }
  }

  return {
    items: [
      { key: "system", label: "System prompt", value: 3800 },
      { key: "tools", label: "Tool definitions", value: 14_200 },
      { key: "files", label: "Files and pages", value: reads * 9000 },
      {
        key: "messages",
        label: "Messages",
        value: 1200 + Math.ceil(chars / 4),
      },
    ],
    limit: WINDOW,
  };
};

const assistantTurn = (id: string): RunTurn => ({
  content: "",
  from: "assistant",
  id,
  streaming: true,
});

/**
 * The scripted run. Pass `initialTurns` for a thread that is already underway, or
 * nothing for a surface that opens on its empty state.
 */
export const useDemoRun = (initialTurns: RunTurn[] = []): DemoRun => {
  const [turns, setTurns] = useState<RunTurn[]>(initialTurns);
  const [streaming, setStreaming] = useState(false);
  const [model, setModel] = useState(DEMO_MODELS[0].id);
  const counter = useRef(0);
  const timer = useRef<number | null>(null);
  const queue = useRef<Beat[]>([]);
  const target = useRef<string | null>(null);
  // What the reader chose about following, for the answer the run ends on.
  const follow = useRef<keyof typeof FOLLOWING>("pause");

  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  const settle = useCallback(() => {
    clear();
    queue.current = [];
    target.current = null;
    setStreaming(false);
  }, [clear]);

  const onStop = useCallback(() => {
    settle();
    // A call nobody will approve now is a refusal, not a pending card.
    setTurns((current) =>
      current.map((turn) =>
        turn.streaming
          ? {
              ...turn,
              steps: turn.steps?.map((step) =>
                !("note" in step) && step.status === "approval"
                  ? { ...step, error: "Stopped.", status: "failed" as const }
                  : step
              ),
              streaming: false,
            }
          : turn
      )
    );
  }, [settle]);

  const pump = useCallback(
    function tick() {
      const id = target.current;
      const beat = queue.current.shift();
      if (!(id && beat)) {
        // The queue ran dry: the last beat was the last word.
        setTurns((current) =>
          current.map((turn) =>
            turn.id === id ? { ...turn, streaming: false } : turn
          )
        );
        settle();
        return;
      }

      setTurns((current) =>
        current.map((turn) => (turn.id === id ? beat.apply(turn) : turn))
      );

      // Held at a gate: nothing is scheduled, and `onDecide` is what picks it back up.
      if (beat.gate) {
        timer.current = null;
        return;
      }
      timer.current = window.setTimeout(tick, beat.ms);
    },
    [settle]
  );

  const run = useCallback(
    (id: string) => {
      target.current = id;
      queue.current = script(id);
      setStreaming(true);
      setTurns((current) =>
        current.map((turn) =>
          turn.id === id ? { ...turn, startedAt: Date.now() } : turn
        )
      );
      pump();
    },
    [pump]
  );

  const onDecide = useCallback(
    (id: string, decision: "approve" | "reject", reason?: string) => {
      const { current } = target;
      if (!(current && id === `${current}-write`)) {
        return;
      }
      queue.current = aftermath(current, decision, reason, follow.current);
      pump();
    },
    [pump]
  );

  const onAnswer = useCallback(
    (id: string, answers: RunAnswers) => {
      const { current } = target;
      if (!(current && id === `${current}-ask`)) {
        return;
      }
      follow.current =
        answers.follow?.selected[0] === "keep" ? "keep" : "pause";
      queue.current = afterAnswer(current, answers);
      pump();
    },
    [pump]
  );

  const onSend = useCallback(
    (message: string) => {
      const userId = `u-${(counter.current += 1)}`;
      const assistantId = `a-${(counter.current += 1)}`;

      setTurns((current) => [
        ...current,
        { content: message, from: "user", id: userId },
        assistantTurn(assistantId),
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
          assistantTurn(assistantId),
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

  const usage = useMemo(() => usageOf(turns), [turns]);

  return {
    model,
    models: DEMO_MODELS,
    onAnswer,
    onDecide,
    onModelChange: setModel,
    onReset,
    onRetry,
    onSend,
    onStop,
    streaming,
    turns,
    usage,
  };
};
