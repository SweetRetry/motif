"use client";

import {
  Check,
  Copy,
  FileText,
  MessageCircleQuestion,
  Pencil,
  RotateCcw,
  Search,
  Terminal,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Streamdown } from "streamdown";

import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";
import {
  AgentActivity,
  AgentActivityContent,
  AgentActivityHeader,
  AgentActivityTitle,
} from "@/components/ui/motif/agent-activity";
import { ApprovalCard } from "@/components/ui/motif/approval-card";
import { Attachment } from "@/components/ui/motif/attachment";
import {
  ContextUsage,
  ContextUsageBar,
  ContextUsageLegend,
  ContextUsageRing,
  ContextUsageSummary,
} from "@/components/ui/motif/context-usage";
import type { ContextUsageDatum } from "@/components/ui/motif/context-usage";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  useConversation,
} from "@/components/ui/motif/conversation";
import {
  LoadingState,
  LoadingStateLabel,
  LoadingStateMark,
} from "@/components/ui/motif/loading-state";
import {
  Message,
  MessageActions,
  MessageContent,
} from "@/components/ui/motif/message";
import {
  ModelPicker,
  PromptInput,
  PromptInputAttach,
  PromptInputAttachment,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ui/motif/prompt-input";
import type {
  PromptAttachment,
  PromptModel,
} from "@/components/ui/motif/prompt-input";
import { QuestionCard } from "@/components/ui/motif/question-card";
import type { QuestionCardProps } from "@/components/ui/motif/question-card";
import {
  ScrollRail,
  ScrollRailPreview,
} from "@/components/ui/motif/scroll-rail";
import type { ScrollRailItem } from "@/components/ui/motif/scroll-rail";
import {
  Source,
  SourceLabel,
  SourceList,
  SourceMark,
} from "@/components/ui/motif/source";
import {
  ToolCall,
  ToolCallContent,
  ToolCallHeader,
  ToolCallName,
  ToolCallSection,
  ToolCallStatus,
  ToolCallSummary,
} from "@/components/ui/motif/tool-call";
import type { ToolCallStatusValue } from "@/components/ui/motif/tool-call";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMessageFocus } from "@/hooks/use-scroll-focus";
import { cn } from "@/lib/utils";

/* -- The block ----------------------------------------------------------------
 * An agent run is five surfaces stacked: a frame, a thread, the activity inside a turn,
 * a composer, and the state that ties them together. Every one of them already exists
 * in this registry — the thread is `Conversation`, a turn is `Message`, what the agent
 * did before it answered is one `AgentActivity` holding a row for the thought, a row for
 * each `ToolCall`, the pages it leaned on are `Source` tags, the
 * gap before the first token is `LoadingState`, the rail beside the thread is
 * `ScrollRail`, and the box the task is written in is `PromptInput` on top of
 * `Attachment`, with `ContextUsage` in its footer. A call held at a gate is a row in the
 * timeline and an `ApprovalCard` in the composer's place. This file is the wiring: it decides
 * how they sit, and nothing else.
 *
 * The state it owns is the draft's attachments and nothing more. The turns belong to
 * the caller, because they come from a transport this component has no opinion about
 * — swap `use-demo-run` for a real one and the surface does not move.
 * --------------------------------------------------------------------------- */

/** A file riding with a reader's turn, as the thread renders it. */
export interface RunFile {
  id: string;
  name: string;
  src?: string;
}

/** A page the agent looked at or leans on. The tag draws its host from `href`. */
export interface RunSource {
  href: string;
  /** What the page calls itself, shown on hover. */
  title?: string;
}

/** What is in the model's window, for the ring in the composer. */
export interface RunUsage {
  items: ContextUsageDatum[];
  /** The window, in tokens. */
  limit: number;
}

/** What the agent asks the reader, as the card takes it. */
export type RunQuestion = QuestionCardProps["questions"][number];

/** What the reader answered, keyed by question id. */
export type RunAnswers = NonNullable<QuestionCardProps["answers"]>;

/** One call the agent made, as a row. While its `status` is `approval` a gate is holding
 *  it: the row stays in the timeline, and the card that asks the reader takes the
 *  composer's place.
 *
 *  A step with `questions` is the agent asking, not a tool running. It is held the same
 *  way, but the card is a question card, and once it is answered the row is the reader's
 *  reply: their words, in the timeline, as the result of that step and not as a new turn
 *  of the thread. */
export interface RunToolStep {
  id: string;
  name: string;
  /** What the reader answered. Empty when they dismissed the question. */
  answers?: RunAnswers;
  /** What it failed with. Drawn in the detail, so a failed row can be opened. */
  error?: string;
  /** The arguments, as text. */
  input?: string;
  /** What the agent is asking. Makes the step a question. */
  questions?: RunQuestion[];
  /** The result, as text. */
  result?: string;
  /** The pages a search found. When there are any they are the detail, as tags, in place
   *  of the raw input and result. */
  sources?: RunSource[];
  status: ToolCallStatusValue;
  /** The gist of the input, one line. */
  summary?: string;
}

/** A thing the agent said between two rounds of work: what it found, what it will do
 *  next. Markdown, and it may still be growing. */
export interface RunNote {
  id: string;
  note: string;
}

/** One thing in a turn's activity, in the order it happened. The agent talks, then acts,
 *  then talks, and the timeline keeps that order so each remark sits beside the work it
 *  explains. */
export type RunStep = RunNote | RunToolStep;

/** One turn in the thread. */
export interface RunTurn {
  id: string;
  from: "assistant" | "user";
  /** The answer, as markdown. Empty while the turn is still working. */
  content: string;
  /** Seconds the agent worked before it answered, for the activity's one-line receipt. */
  duration?: number;
  /** The pages the answer leans on, as tags under it. */
  sources?: RunSource[];
  /** Epoch ms the pass started, so the clocks survive a re-render. */
  startedAt?: number;
  /** The turn is still arriving. */
  streaming?: boolean;
  /** What the agent said and did on the way to the answer. */
  steps?: RunStep[];
  /** Files riding with a reader's turn. */
  files?: RunFile[];
}

export interface AgentRunProps {
  className?: string;
  /** First-run surface, in place of the thread while there are no turns. */
  empty?: ReactNode;
  /** The models the composer can be pointed at. */
  models: PromptModel[];
  /** Controlled model id. */
  model?: string;
  /** Answer the call a gate is holding. A rejection may carry the reader's reason. Omit it
   *  and a held call leaves the composer where it is. */
  onDecide?: (
    id: string,
    decision: "approve" | "reject",
    reason?: string
  ) => void;
  /** Answer the question a gate is holding. Empty answers mean the reader dismissed it.
   *  Omit it and a held question leaves the composer where it is. */
  onAnswer?: (id: string, answers: RunAnswers) => void;
  onModelChange?: (id: string) => void;
  /** Clear the thread. Omit it and the header keeps only its title. */
  onReset?: () => void;
  /** Re-run an answer. Omit it and the retry control is not drawn. */
  onRetry?: (id: string) => void;
  onSend: (message: string, files: RunFile[]) => void;
  onStop?: () => void;
  /** A run is in flight: the composer swaps send for stop and blocks Enter. */
  streaming?: boolean;
  title?: string;
  turns: RunTurn[];
  /** What is in the window. Omit it and the composer draws no ring. */
  usage?: RunUsage;
}

/** Reduced motion turns the rail's jump into an instant move: the destination is the
 *  information, and the glide across the thread is not worth the wait it costs. */
const prefersJump = () =>
  typeof window !== "undefined" &&
  Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

/** One control in the actions row: the platform button at its small icon size, with
 *  the label it cannot carry spelled out in a tooltip. */
const Action = ({
  children,
  label,
  ...props
}: ButtonProps & { label: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        aria-label={label}
        size="icon-sm"
        type="button"
        variant="ghost"
        {...props}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom">{label}</TooltipContent>
  </Tooltip>
);

/** The ring for the window, in the composer's footer: how full at a glance, and behind
 *  it what the agent is carrying. The detail is a popover rather than a hover, because
 *  it is read, not glimpsed, and a hover would close the moment the pointer moved to it. */
const Usage = ({ usage }: { usage: RunUsage }) => (
  <ContextUsage items={usage.items} limit={usage.limit}>
    <Popover>
      <PopoverTrigger asChild>
        <Button className="rounded-full px-2" size="sm" variant="ghost">
          <ContextUsageRing showPercent />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="flex w-72 flex-col gap-4"
        side="top"
      >
        <ContextUsageSummary />
        <ContextUsageBar />
        <ContextUsageLegend />
      </PopoverContent>
    </Popover>
  </ContextUsage>
);

/**
 * The gate, at the composer.
 *
 * A held call blocks the run, and the one thing the reader can usefully do is answer it.
 * So the question takes the composer's place instead of sitting in the thread, where it
 * would be one row among many and could be scrolled out of sight while the run waits on
 * it. The thread keeps the call as a row with an amber dot, the record of what is being
 * asked about; this is the control.
 *
 * Which card it is depends on what the gate wants from the reader. A held call wants a
 * decision, one bit, so it is an approval card. A question wants content, so it is a
 * question card. They are two surfaces because they take two kinds of thing, and neither
 * grows the other's field.
 *
 * Because it is away from the step's row an approval has to say which call it is about,
 * by name. Stop stays reachable: a gate with no way out but its own answers would be a
 * trap.
 */
const Gate = ({
  onAnswer,
  onDecide,
  onStop,
  step,
}: {
  onAnswer?: (id: string, answers: RunAnswers) => void;
  onDecide?: (
    id: string,
    decision: "approve" | "reject",
    reason?: string
  ) => void;
  onStop?: () => void;
  step: RunToolStep;
}) => {
  const detail = step.summary ?? step.input;

  return (
    <div className="flex flex-col gap-2" data-slot="agent-run-gate">
      {step.questions && onAnswer ? (
        <QuestionCard
          key={step.id}
          onDismiss={() => onAnswer(step.id, {})}
          onSubmit={(answers) => onAnswer(step.id, answers)}
          questions={step.questions}
        />
      ) : null}
      {!step.questions && onDecide ? (
        <ApprovalCard
          onApprove={() => onDecide(step.id, "approve")}
          onReject={(reason) => onDecide(step.id, "reject", reason)}
        >
          <code>{step.name}</code> wants to run
          {detail ? (
            <>
              {" "}
              on <code>{detail}</code>
            </>
          ) : null}
          . Do you approve?
        </ApprovalCard>
      ) : null}
      {onStop ? (
        <Button
          className="self-end"
          onClick={onStop}
          size="sm"
          type="button"
          variant="ghost"
        >
          Stop run
        </Button>
      ) : null}
    </div>
  );
};

/** Copy, with the one beat of confirmation a copy button owes. */
const CopyAnswer = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    if (!navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard access can be denied; the label simply stays where it is.
    }
  };

  return (
    <Action label={copied ? "Copied" : "Copy answer"} onClick={copy}>
      {copied ? (
        <Check className="size-3.5" strokeWidth={2} />
      ) : (
        <Copy className="size-3.5" strokeWidth={1.75} />
      )}
    </Action>
  );
};

/** Pages as tags in a row. The host on each is read off its link, and the title waits
 *  in the tooltip. */
const Sources = ({
  className,
  sources,
}: {
  className?: string;
  sources: RunSource[];
}) => (
  <SourceList className={className}>
    {sources.map((source) => (
      <Source href={source.href} key={source.href} title={source.title}>
        <SourceMark />
        <SourceLabel />
      </Source>
    ))}
  </SourceList>
);

/** What sits behind a call's row: the pages it found, or the raw arguments and result. */
const ToolDetail = ({ step }: { step: RunToolStep }) => {
  const found = step.sources?.length ?? 0;
  const empty = !(found || step.input || step.result || step.error);

  if (empty) {
    return null;
  }

  // What the call produced is the detail when it has a shape of its own: a search is the
  // pages. The raw arguments are the fallback.
  const body = found ? (
    <ToolCallSection title={`${found} results`}>
      <Sources sources={step.sources ?? []} />
    </ToolCallSection>
  ) : (
    <>
      <ToolCallSection title="Input">{step.input}</ToolCallSection>
      <ToolCallSection title="Result">{step.result}</ToolCallSection>
    </>
  );

  return (
    <ToolCallContent>
      {body}
      {step.error ? (
        <ToolCallSection title="Error">
          <p className="text-destructive text-xs">{step.error}</p>
        </ToolCallSection>
      ) : null}
    </ToolCallContent>
  );
};

/* -- What a step is called -----------------------------------------------------
 * A finished timeline is almost all "done". A check on every row repeats the one thing
 * the reader already knows, so a done row carries the kind of thing it was, a file, a
 * search, an edit, and the tense of its verb says the rest. The status shape is kept for
 * the exceptions, the rows where it is news: running, waiting on the reader, failed.
 *
 * The verbs are a small table because a step's name is an identifier and the reader wants
 * a sentence. `Read 2 files` and `Searched 1 query` are what a batch of calls amounts
 * to, and the same table writes them. A tool the table has not heard of reads as `Ran`
 * with its own name, so a new tool is legible before it is dressed.
 * --------------------------------------------------------------------------- */

interface Verb {
  /** The infinitive, for a call that failed: `Failed to read`. */
  base: string;
  icon: LucideIcon;
  past: string;
  present: string;
  /** What a count of them is called, singular and plural. */
  unit: [string, string];
}

const VERBS: Record<string, Verb> = {
  edit_file: {
    base: "edit",
    icon: Pencil,
    past: "Edited",
    present: "Editing",
    unit: ["file", "files"],
  },
  grep: {
    base: "search",
    icon: Search,
    past: "Searched",
    present: "Searching",
    unit: ["pattern", "patterns"],
  },
  read_file: {
    base: "read",
    icon: FileText,
    past: "Read",
    present: "Reading",
    unit: ["file", "files"],
  },
  run_tests: {
    base: "run",
    icon: Terminal,
    past: "Ran",
    present: "Running",
    unit: ["command", "commands"],
  },
  web_search: {
    base: "search",
    icon: Search,
    past: "Searched",
    present: "Searching",
    unit: ["query", "queries"],
  },
};

const FALLBACK: Verb = {
  base: "run",
  icon: Wrench,
  past: "Ran",
  present: "Running",
  unit: ["call", "calls"],
};

const verbOf = (step: RunToolStep) => VERBS[step.name] ?? FALLBACK;

const isNote = (step: RunStep): step is RunNote => "note" in step;

/** The verb a row opens with, in the tense its status is in. */
const phraseOf = (step: RunToolStep) => {
  const verb = verbOf(step);
  if (step.status === "done") {
    return verb.past;
  }

  return step.status === "failed" ? `Failed to ${verb.base}` : verb.present;
};

/** Where a row's status goes: the shape for the exceptions, the kind of thing for a row
 *  that is done. The box is the same size either way, so the words line up. */
const Lead = ({
  icon: Icon,
  status,
  word,
}: {
  icon: LucideIcon;
  status: ToolCallStatusValue;
  word?: string;
}) =>
  status === "done" ? (
    <span className="flex size-4 shrink-0 items-center justify-center">
      <Icon aria-hidden="true" className="size-3.5 text-muted-foreground" />
    </span>
  ) : (
    <ToolCallStatus label={word} />
  );

/** One call, as a sentence: `Read  components/conversation.tsx`. */
const StepRow = ({ step }: { step: RunToolStep }) => {
  const verb = verbOf(step);
  const known = step.name in VERBS;

  return (
    <ToolCall status={step.status}>
      <ToolCallHeader>
        <Lead
          icon={verb.icon}
          status={step.status}
          word={step.status === "approval" ? "Waiting for approval" : undefined}
        />
        <ToolCallName className="font-normal font-sans text-muted-foreground text-sm">
          {phraseOf(step)}
        </ToolCallName>
        <ToolCallSummary className="text-sm">
          {step.summary ?? (known ? undefined : step.name)}
        </ToolCallSummary>
      </ToolCallHeader>
      <ToolDetail step={step} />
    </ToolCall>
  );
};

/** A settled batch of calls as one line: `Read 2 files, searched 1 query`. Closed, because
 *  the line is the point; the calls are there for the reader who doubts it. */
const Batch = ({ steps }: { steps: RunToolStep[] }) => {
  const counts = new Map<string, { n: number; verb: Verb }>();
  for (const step of steps) {
    const entry = counts.get(step.name) ?? { n: 0, verb: verbOf(step) };
    entry.n += 1;
    counts.set(step.name, entry);
  }

  const line = [...counts.values()]
    .map(({ n, verb }, index) => {
      const unit = verb.unit[n === 1 ? 0 : 1];
      const text = `${verb.past} ${n} ${unit}`;

      return index === 0 ? text : text.charAt(0).toLowerCase() + text.slice(1);
    })
    .join(", ");

  return (
    <ToolCall
      className="fade-in animate-in duration-200 motion-reduce:animate-none"
      status="done"
    >
      <ToolCallHeader>
        <Lead icon={verbOf(steps[0]).icon} status="done" />
        <ToolCallName className="font-normal font-sans text-muted-foreground text-sm">
          {line}
        </ToolCallName>
      </ToolCallHeader>
      <ToolCallContent>
        {steps.map((step) => (
          <StepRow key={step.id} step={step} />
        ))}
      </ToolCallContent>
    </ToolCall>
  );
};

/** One answer in words: the labels of what was picked, then whatever was typed. */
const describeAnswer = (question: RunQuestion, answer: RunAnswers[string]) =>
  [
    ...answer.selected.map(
      (value) =>
        question.options?.find((option) => option.value === value)?.label ??
        value
    ),
    ...(answer.custom ? [answer.custom] : []),
  ].join(", ");

/** What the reader said to a question step, one entry per question they answered. */
const answeredLines = (step: RunToolStep) =>
  (step.questions ?? []).flatMap((question) => {
    const answer = step.answers?.[question.id];
    const text = answer ? describeAnswer(question, answer) : "";

    return text ? [{ question, text }] : [];
  });

/**
 * A question the agent asked, as the row it is in the timeline.
 *
 * While it is held the row says what it is waiting for and the card is at the composer.
 * Once answered it is the reader's reply, in their words and in the same place the agent
 * asked, as the result of that step. It is not a message in the thread: an answer resumes
 * the run it came from, and a bubble would read as the reader starting a new one.
 */
const Question = ({ step }: { step: RunToolStep }) => {
  const lines = answeredLines(step);
  let word = lines.length > 0 ? "You answered" : "Skipped";
  if (step.status === "approval") {
    word = "Waiting for your answer";
  }

  return (
    <ToolCall status={step.status}>
      <ToolCallHeader>
        <Lead icon={MessageCircleQuestion} status={step.status} word={word} />
        <ToolCallName className="font-normal font-sans text-muted-foreground text-sm">
          {word}
        </ToolCallName>
        <ToolCallSummary className="text-sm">
          {step.status === "approval"
            ? step.questions?.[0]?.title
            : lines.map((line) => line.text).join(" · ")}
        </ToolCallSummary>
      </ToolCallHeader>
      {lines.length > 0 ? (
        <ToolCallContent>
          {lines.map(({ question, text }) => (
            <ToolCallSection key={question.id} title={question.title}>
              <p className="text-xs">{text}</p>
            </ToolCallSection>
          ))}
        </ToolCallContent>
      ) : null}
    </ToolCall>
  );
};

/** What the agent said, as words. Not muted: it is the thread of the run, and the rows
 *  around it are the evidence. */
const Note = ({ children, live }: { children: string; live: boolean }) => (
  <Streamdown
    className="space-y-2 text-sm leading-relaxed"
    controls={false}
    lineNumbers={false}
    mode={live ? "streaming" : "static"}
  >
    {children}
  </Streamdown>
);

type Block =
  | { kind: "note"; note: RunNote }
  | { kind: "batch"; id: string; steps: RunToolStep[] }
  | { kind: "step"; step: RunToolStep };

/** How many finished calls in a row it takes to fold. Folding has to save the reader
 *  something: two rows are shorter to read than `Read 1 file, searched 1 query`, and say
 *  which file and which query, so a pair stays as it is. */
const BATCH_AT = 3;

/** A call that is finished and says nothing the sentence does not: the ones that fold. */
const foldable = (step: RunToolStep) =>
  !step.questions && step.status === "done";

/**
 * The timeline as blocks: a note, a call, or a batch of calls.
 *
 * A run of finished calls folds into a batch once it has settled, meaning something that
 * is not a call has come after it, the agent speaking or asking, or the turn has stopped
 * working. Folding sooner would collapse rows under a reader who is watching them
 * arrive.
 */
const blocksOf = (steps: RunStep[], working: boolean): Block[] => {
  const blocks: Block[] = [];
  let run: RunToolStep[] = [];

  const flush = (settled: boolean) => {
    if (settled && run.length >= BATCH_AT) {
      blocks.push({ id: run[0].id, kind: "batch", steps: run });
    } else {
      for (const step of run) {
        blocks.push({ kind: "step", step });
      }
    }
    run = [];
  };

  for (const step of steps) {
    if (!isNote(step) && foldable(step)) {
      run.push(step);
      continue;
    }

    flush(isNote(step) || Boolean(step.questions));
    blocks.push(
      isNote(step) ? { kind: "note", note: step } : { kind: "step", step }
    );
  }
  flush(!working);

  return blocks;
};

/** What the agent did before it answered, as one thing: open while it works, one line
 *  once it has answered. Inside, in the order it happened, what it said and what it did. */
const Activity = ({ turn }: { turn: RunTurn }) => {
  const working = Boolean(turn.streaming && !turn.content);
  const blocks = blocksOf(turn.steps ?? [], working);

  return (
    <AgentActivity
      duration={turn.duration}
      running={working}
      startedAt={turn.startedAt}
    >
      <AgentActivityHeader>
        <AgentActivityTitle />
      </AgentActivityHeader>
      <AgentActivityContent className="gap-2">
        {blocks.map((block, index) => {
          if (block.kind === "note") {
            return (
              <Note
                key={block.note.id}
                live={working && index === blocks.length - 1}
              >
                {block.note.note}
              </Note>
            );
          }
          if (block.kind === "batch") {
            return <Batch key={block.id} steps={block.steps} />;
          }

          return block.step.questions ? (
            <Question key={block.step.id} step={block.step} />
          ) : (
            <StepRow key={block.step.id} step={block.step} />
          );
        })}
      </AgentActivityContent>
    </AgentActivity>
  );
};

/** The answer half of a turn: what the agent said and did, the body itself, and the
 *  actions for a body that has stopped moving. */
const Answer = ({
  onRetry,
  showRetry,
  turn,
}: {
  onRetry?: (id: string) => void;
  showRetry: boolean;
  turn: RunTurn;
}) => {
  const answered = turn.content.length > 0;
  const acted = Boolean(turn.steps?.length);
  // Before the first word or the first call, the row is the only thing a working turn
  // has to say.
  const waiting = !answered && !acted && turn.streaming;

  return (
    <>
      {acted ? <Activity turn={turn} /> : null}
      {acted && answered ? <Separator /> : null}

      {answered ? (
        <Streamdown
          className="space-y-2 text-sm leading-relaxed"
          controls={false}
          lineNumbers={false}
          mode={turn.streaming ? "streaming" : "static"}
        >
          {turn.content}
        </Streamdown>
      ) : null}

      {answered && turn.sources?.length ? (
        <Sources sources={turn.sources} />
      ) : null}

      {waiting ? (
        <LoadingState>
          <LoadingStateMark />
          <LoadingStateLabel>Thinking</LoadingStateLabel>
        </LoadingState>
      ) : null}

      {answered && !turn.streaming ? (
        <MessageActions>
          <CopyAnswer value={turn.content} />
          {showRetry && onRetry ? (
            <Action label="Regenerate" onClick={() => onRetry(turn.id)}>
              <RotateCcw className="size-3.5" strokeWidth={1.75} />
            </Action>
          ) : null}
        </MessageActions>
      ) : null}
    </>
  );
};

const Turn = ({
  onRetry,
  showRetry,
  turn,
}: {
  onRetry?: (id: string) => void;
  showRetry: boolean;
  turn: RunTurn;
}) => {
  const user = turn.from === "user";

  return (
    <Message from={turn.from}>
      <MessageContent>
        {user ? (
          <>
            {turn.files?.length ? (
              <div className="flex flex-wrap gap-2.5">
                {turn.files.map((file) => (
                  <Attachment key={file.id} name={file.name} src={file.src} />
                ))}
              </div>
            ) : null}
            {turn.content}
          </>
        ) : (
          <Answer onRetry={onRetry} showRetry={showRetry} turn={turn} />
        )}
      </MessageContent>
    </Message>
  );
};

/** The line a rail tick and its preview both need: the turn's text with its whitespace
 *  flattened and its tail cut off. */
const gist = (turn: RunTurn) => {
  const text = turn.content.split(/\s+/).join(" ").trim();
  if (text.length === 0) {
    return turn.steps?.length ? "Working…" : "Thinking…";
  }

  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
};

/**
 * The thread and the rail beside it. It sits inside `Conversation` because it is the
 * part that reads the viewport the rail measures against: one tick per turn, the tick
 * under the reading line lit, and a jump when a tick is taken.
 */
const Thread = ({
  empty,
  onRetry,
  turns,
}: {
  empty?: ReactNode;
  onRetry?: (id: string) => void;
  turns: RunTurn[];
}) => {
  const { viewport } = useConversation();
  const nodes = useRef<(HTMLElement | null)[]>([]);
  const focus = useMessageFocus(viewport, nodes);

  // A turn is the only unit a reader navigates a thread by, so the rail is the thread's
  // table of contents: one tick each, and the role as the title of the preview.
  const items: ScrollRailItem[] = turns.map((turn) => ({
    id: turn.id,
    label: `${turn.from === "user" ? "You" : "Assistant"}: ${gist(turn).slice(0, 60)}`,
    preview: (
      <ScrollRailPreview title={turn.from === "user" ? "You" : "Assistant"}>
        {gist(turn)}
      </ScrollRailPreview>
    ),
  }));

  // The jump is by hand rather than `scrollIntoView`, which would drag every
  // scrollable ancestor along with it — including the page the app is embedded in.
  const jump = (index: number) => {
    const box = viewport.current;
    const node = nodes.current[index];
    if (!(box && node)) {
      return;
    }

    const top =
      box.scrollTop +
      node.getBoundingClientRect().top -
      box.getBoundingClientRect().top -
      16;
    box.scrollTo({
      behavior: prefersJump() ? "auto" : "smooth",
      top: Math.max(0, top),
    });
  };

  return (
    <div className="flex min-h-0 flex-1">
      <div className="relative flex min-h-0 min-w-0 flex-1">
        <ConversationContent className="min-w-0 px-4 pt-6 pb-16">
          {turns.length === 0 ? (
            <div className="m-auto w-full max-w-xl">{empty}</div>
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
              {turns.map((turn, index) => (
                <div
                  className="scroll-mt-4"
                  key={turn.id}
                  ref={(node) => {
                    nodes.current[index] = node;
                  }}
                >
                  <Turn
                    onRetry={onRetry}
                    showRetry={index === turns.length - 1}
                    turn={turn}
                  />
                </div>
              ))}
            </div>
          )}
        </ConversationContent>

        {/* Centred on the text, not on the row: the rail is a gutter and the button
            belongs over the column a reader is actually reading. */}
        <ConversationScrollButton />
      </div>

      {/* The rail is a read-out of the thread's shape and a way to walk it: width
          carries how far a turn is from the reading line, and a held tick previews the
          turn before the jump. */}
      <ScrollRail
        className="mr-1 self-center"
        focus={focus}
        items={items}
        onSelect={jump}
        side="right"
      />
    </div>
  );
};

export const AgentRun = ({
  className,
  empty,
  model,
  models,
  onAnswer,
  onDecide,
  onModelChange,
  onReset,
  onRetry,
  onSend,
  onStop,
  streaming = false,
  title = "Agent run",
  turns,
  usage,
}: AgentRunProps) => {
  const [files, setFiles] = useState<PromptAttachment[]>([]);
  // The call a gate is holding, if any. The oldest first: a run holds one at a time.
  const held = turns
    .flatMap((turn) => turn.steps ?? [])
    .find(
      (step): step is RunToolStep => !isNote(step) && step.status === "approval"
    );
  // Blocked only when someone is wired to answer it: a card with nobody behind its
  // buttons would cover the composer and do nothing.
  const blocked = Boolean(held && (held.questions ? onAnswer : onDecide));
  // Previews for picked files are object URLs, which nothing else will free. They are
  // kept past a send — the turn that lands reuses the same `src` — and freed when the
  // app goes away or the chip is taken back.
  const previews = useRef<string[]>([]);

  useEffect(
    () => () => {
      for (const url of previews.current) {
        URL.revokeObjectURL(url);
      }
    },
    []
  );

  const pick = (chosen: File[]) => {
    setFiles((current) => [
      ...current,
      ...chosen.map((file, index) => {
        const preview = file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined;
        if (preview) {
          previews.current.push(preview);
        }
        return {
          id: `${file.name}-${Date.now()}-${index}`,
          name: file.name,
          src: preview,
        };
      }),
    ]);
  };

  const remove = (id: string) =>
    setFiles((current) => current.filter((file) => file.id !== id));

  const submit = (message: string) => {
    onSend(
      message,
      files.map(({ id, name, src }) => ({ id, name, src }))
    );
    setFiles([]);
  };

  return (
    <div
      className={cn("flex h-full min-h-0 flex-col bg-background", className)}
      data-slot="agent-run"
    >
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border px-4">
        <h1 className="truncate text-sm font-medium">{title}</h1>
        {onReset ? (
          <Button
            className="ml-auto"
            onClick={onReset}
            size="sm"
            type="button"
            variant="ghost"
          >
            New run
          </Button>
        ) : null}
      </header>

      <Conversation>
        <Thread empty={empty} onRetry={onRetry} turns={turns} />
      </Conversation>

      <div className="shrink-0 px-4 pb-4">
        <div className="mx-auto w-full max-w-3xl">
          {blocked && held ? (
            <Gate
              onAnswer={onAnswer}
              onDecide={onDecide}
              onStop={onStop}
              step={held}
            />
          ) : null}

          {/* Covered, not unmounted: what the reader had typed is still there when the gate
              is answered. `inert` takes it out of the tab order and away from assistive
              tech along with the pointer, which is what blocking means. */}
          <div hidden={blocked} inert={blocked}>
            <PromptInput
              onStop={onStop}
              onSubmit={submit}
              streaming={streaming}
            >
              <PromptInputHeader>
                {files.map(({ id, ...chip }) => (
                  <PromptInputAttachment
                    key={id}
                    {...chip}
                    onRemove={() => remove(id)}
                  />
                ))}
              </PromptInputHeader>

              <PromptInputTextarea placeholder="Give the agent a task, or drop in a file." />

              <PromptInputFooter>
                <PromptInputAttach onFiles={pick} />
                <ModelPicker
                  models={models}
                  onValueChange={onModelChange}
                  value={model}
                />
                {/* The ring and the send button are one group at the right edge; the
                  submit's own auto margin would otherwise leave the ring beside the
                  picker. */}
                <div className="ml-auto flex items-center gap-1">
                  {usage ? <Usage usage={usage} /> : null}
                  <PromptInputSubmit className="ml-0" />
                </div>
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      </div>
    </div>
  );
};
