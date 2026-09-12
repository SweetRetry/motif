"use client";

import { Check, Copy, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Streamdown } from "streamdown";

import {
  ModelPicker,
  PromptInput,
  PromptInputAttach,
  PromptInputAttachment,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/agents/prompt-input";
import type {
  PromptAttachment,
  PromptModel,
} from "@/components/agents/prompt-input";
import { ThinkingBlock } from "@/components/agents/thinking-block";
import { ScrollRail, ScrollRailPreview } from "@/components/scroll-rail";
import type { ScrollRailItem } from "@/components/scroll-rail";
import { Attachment } from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  useConversation,
} from "@/components/ui/conversation";
import {
  Message,
  MessageActions,
  MessageContent,
} from "@/components/ui/message";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WaitingRow } from "@/components/ui/waiting-row";
import { useMessageFocus } from "@/lib/hooks/use-scroll-focus";
import { cn } from "@/lib/utils";

/* -- The app -------------------------------------------------------------------
 * A chat app is four surfaces stacked: a frame, a thread, a composer, and the state
 * that ties them together. Every one of them already exists in this registry — the
 * thread is `Conversation`, a turn is `Message`, the reasoning behind an answer is
 * `ThinkingBlock`, the gap before the first token is `WaitingRow`, the rail beside the
 * thread is `ScrollRail`, and the box the message is written in is `PromptInput` on top
 * of `Attachment`. This file is the wiring: it decides how they sit, and nothing else.
 *
 * The state it owns is the draft's attachments and nothing more. The turns belong to
 * the caller, because they come from a transport this component has no opinion about
 * — swap `use-demo-chat` for a real one and the surface does not move.
 * --------------------------------------------------------------------------- */

/** A file riding with a reader's turn, as the thread renders it. */
export interface ChatFile {
  id: string;
  name: string;
  src?: string;
}

/** One turn in the thread. */
export interface ChatTurn {
  id: string;
  from: "assistant" | "user";
  /** The answer, as markdown. Empty while the turn is still thinking. */
  content: string;
  /** The reasoning the answer was written from, when the model exposed one. */
  reasoning?: string;
  /** Epoch ms the pass started, so the thinking block's clock survives a re-render. */
  startedAt?: number;
  /** The turn is still arriving. */
  streaming?: boolean;
  /** Files riding with a reader's turn. */
  files?: ChatFile[];
}

export interface ChatAppProps {
  className?: string;
  /** First-run surface, in place of the thread while there are no turns. */
  empty?: ReactNode;
  /** The models the composer can be pointed at. */
  models: PromptModel[];
  /** Controlled model id. */
  model?: string;
  onModelChange?: (id: string) => void;
  /** Clear the thread. Omit it and the header keeps only its title. */
  onReset?: () => void;
  /** Re-run an answer. Omit it and the retry control is not drawn. */
  onRetry?: (id: string) => void;
  onSend: (message: string, files: ChatFile[]) => void;
  onStop?: () => void;
  /** An answer is arriving: the composer swaps send for stop and blocks Enter. */
  streaming?: boolean;
  title?: string;
  turns: ChatTurn[];
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

/** The answer half of a turn: the reasoning behind it, the body itself, and the
 *  actions for a body that has stopped moving. */
const Answer = ({
  onRetry,
  showRetry,
  turn,
}: {
  onRetry?: (id: string) => void;
  showRetry: boolean;
  turn: ChatTurn;
}) => {
  const answered = turn.content.length > 0;
  // Reasoning is over the moment the answer starts: the block freezes on its finished
  // count while the text below it keeps arriving.
  const thinking = Boolean(turn.streaming && !turn.content);
  // With no reasoning to show, the row is the only thing a thinking turn has to say.
  const waiting = !answered && turn.streaming && turn.reasoning === undefined;

  return (
    <>
      {turn.reasoning === undefined ? null : (
        <ThinkingBlock
          label="Thinking"
          startedAt={turn.startedAt}
          streaming={thinking}
        >
          {turn.reasoning}
        </ThinkingBlock>
      )}

      {answered ? (
        <Streamdown
          className="text-sm leading-relaxed"
          controls={false}
          lineNumbers={false}
          mode={turn.streaming ? "streaming" : "static"}
        >
          {turn.content}
        </Streamdown>
      ) : null}

      {waiting ? <WaitingRow label="Thinking" /> : null}

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
  turn: ChatTurn;
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
const gist = (turn: ChatTurn) => {
  const text = turn.content.split(/\s+/).join(" ").trim();
  if (text.length === 0) {
    return "Thinking…";
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
  turns: ChatTurn[];
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

export const ChatApp = ({
  className,
  empty,
  model,
  models,
  onModelChange,
  onReset,
  onRetry,
  onSend,
  onStop,
  streaming = false,
  title = "Chat",
  turns,
}: ChatAppProps) => {
  const [files, setFiles] = useState<PromptAttachment[]>([]);
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
      data-slot="chat-app"
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
            New chat
          </Button>
        ) : null}
      </header>

      <Conversation>
        <Thread empty={empty} onRetry={onRetry} turns={turns} />
      </Conversation>

      <div className="shrink-0 px-4 pb-4">
        <div className="mx-auto w-full max-w-3xl">
          <PromptInput onStop={onStop} onSubmit={submit} streaming={streaming}>
            <PromptInputHeader>
              {files.map(({ id, ...chip }) => (
                <PromptInputAttachment
                  key={id}
                  {...chip}
                  onRemove={() => remove(id)}
                />
              ))}
            </PromptInputHeader>

            <PromptInputTextarea placeholder="Ask anything, or drop in a file." />

            <PromptInputFooter>
              <PromptInputAttach onFiles={pick} />
              <ModelPicker
                models={models}
                onValueChange={onModelChange}
                value={model}
              />
              <PromptInputSubmit />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
};
