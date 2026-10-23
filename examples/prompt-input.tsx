"use client";

import { useEffect, useRef, useState } from "react";

import {
  LoadingState,
  LoadingStateLabel,
  LoadingStateMark,
} from "@/components/ui/motif/loading-state";
import {
  ModelPicker,
  PromptInput,
  PromptInputAttach,
  PromptInputAttachment,
  PromptInputEditor,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTrigger,
} from "@/registry/new-york/agents/prompt-input";
import type {
  PromptAttachment,
  PromptModel,
  PromptSegment,
  PromptTriggerItem,
} from "@/registry/new-york/agents/prompt-input";

/** Shipped with the docs so the demo needs no external host. */
const THUMB = "/attachment-demo.jpg";

/** Three vendors, which is as many as a menu of models needs to show what it
 *  does: a mark, a name, and the maker on the far side to tell two `Pro`s apart. */
const MODELS: PromptModel[] = [
  { id: "gpt-5.2", name: "GPT-5.2", provider: "openai" },
  { id: "claude-sonnet-4.5", name: "Claude Sonnet 4.5", provider: "anthropic" },
  { id: "gemini-3-pro", name: "Gemini 3 Pro", provider: "gemini" },
];

/** A finished image and one upload still in flight, so the header shows both states. */
const SEEDED: PromptAttachment[] = [
  { id: "raven", name: "raven.jpg", src: THUMB },
  { id: "assets", name: "brand-assets.zip", progress: 34 },
];

/** Stands in for an upload service: everything under 100 climbs, and anything that
 *  reaches it stops reporting progress and reads as ready on its own. */
const useUploads = (
  setAttachments: React.Dispatch<React.SetStateAction<PromptAttachment[]>>
) => {
  useEffect(() => {
    const timer = window.setInterval(() => {
      setAttachments((current) =>
        current.map((file) =>
          file.progress === undefined || file.progress >= 100
            ? file
            : { ...file, progress: Math.min(100, file.progress + 7) }
        )
      );
    }, 200);
    return () => window.clearInterval(timer);
  }, [setAttachments]);
};

export const PromptInputDemo = () => {
  const [attachments, setAttachments] = useState<PromptAttachment[]>(SEEDED);
  const [model, setModel] = useState(MODELS[0].id);
  const [sent, setSent] = useState<string | null>(null);
  // Thumbnails for picked files are object URLs, which nothing else will free.
  const previews = useRef<string[]>([]);

  useUploads(setAttachments);

  useEffect(
    () => () => {
      for (const url of previews.current) {
        URL.revokeObjectURL(url);
      }
    },
    []
  );

  const pick = (files: File[]) => {
    setAttachments((current) => [
      ...current,
      ...files.map((file, index) => {
        const preview = file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined;
        if (preview) {
          previews.current.push(preview);
        }
        return {
          id: `${file.name}-${Date.now()}-${index}`,
          name: file.name,
          progress: 0,
          src: preview,
        };
      }),
    ]);
  };

  const answer = MODELS.find((entry) => entry.id === model)?.name ?? model;

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <PromptInput onSubmit={setSent}>
        <PromptInputHeader>
          {attachments.map(({ id, ...chip }) => (
            <PromptInputAttachment
              key={id}
              {...chip}
              onRemove={() =>
                setAttachments((current) =>
                  current.filter((item) => item.id !== id)
                )
              }
            />
          ))}
        </PromptInputHeader>

        <PromptInputTextarea placeholder="Review the current implementation and suggest the next improvement." />

        <PromptInputFooter>
          <PromptInputAttach onFiles={pick} />
          <ModelPicker models={MODELS} onValueChange={setModel} value={model} />
          <PromptInputSubmit />
        </PromptInputFooter>
      </PromptInput>

      {/* The sent line keeps its height while it is empty, so sending a message does
          not move the composer out from under the pointer that sent it. */}
      <p aria-live="polite" className="min-h-5 text-muted-foreground text-xs">
        {sent ? `Sent to ${answer}: “${sent}”` : null}
      </p>
    </div>
  );
};

const NARROW: PromptModel[] = [
  { id: "gpt-5.2", name: "GPT-5.2", provider: "openai" },
  { id: "claude-sonnet-4.5", name: "Claude Sonnet 4.5", provider: "anthropic" },
];

/** Sending holds the composer in `streaming` for a beat, which is what the stop button
 *  and the answered-in-place state are for. No header: an attachment-less composer is
 *  the same parts with one of them left out. */
export const PromptInputStreamingDemo = () => {
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    if (!streaming) {
      return;
    }
    const timer = window.setTimeout(() => setStreaming(false), 2800);
    return () => window.clearTimeout(timer);
  }, [streaming]);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      {streaming ? (
        <LoadingState>
          <LoadingStateMark />
          <LoadingStateLabel>Thinking</LoadingStateLabel>
        </LoadingState>
      ) : null}
      <PromptInput
        onStop={() => setStreaming(false)}
        onSubmit={() => setStreaming(true)}
        streaming={streaming}
      >
        <PromptInputTextarea placeholder="Ask something that takes a while…" />
        <PromptInputFooter>
          <ModelPicker models={NARROW} />
          <PromptInputSubmit />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
};

const FILES: PromptTriggerItem[] = [
  { description: "components/chat", id: "agent-run", label: "agent-run.tsx" },
  { description: "components/chat", id: "message", label: "message.tsx" },
  { description: "registry", id: "registry", label: "registry.json" },
];

const COMMANDS: PromptTriggerItem[] = [
  { description: "Read the diff", id: "review", label: "review" },
  { description: "Write the failing test first", id: "test", label: "test" },
  { description: "Clear the conversation", id: "clear", label: "clear" },
];

/** `@` points at something and stays in the message as a chip. `/clear` acts on the spot,
 *  so it returns `false` and leaves nothing behind. Sending shows the segments the caller
 *  receives, which is where the ids are. */
export const PromptInputMentionDemo = () => {
  const [sent, setSent] = useState<PromptSegment[] | null>(null);

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-3">
      <PromptInput onSubmit={(_, segments) => setSent(segments)}>
        <PromptInputEditor placeholder="Type @ to point at a file, / to run a command.">
          <PromptInputTrigger char="@" items={FILES} />
          <PromptInputTrigger
            char="/"
            items={COMMANDS}
            lineStart
            onSelect={(item) => (item.id === "clear" ? false : undefined)}
          />
        </PromptInputEditor>
        <PromptInputFooter>
          <PromptInputSubmit />
        </PromptInputFooter>
      </PromptInput>

      <pre
        aria-live="polite"
        className="min-h-5 w-full overflow-x-auto text-muted-foreground text-xs"
      >
        {sent ? JSON.stringify(sent) : null}
      </pre>
    </div>
  );
};
