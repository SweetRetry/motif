"use client";

import { useEffect, useRef, useState } from "react";

import { WaitingRow } from "@/components/ui/waiting-row";
import {
  ModelPicker,
  PromptInput,
  PromptInputAttach,
  PromptInputAttachment,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/registry/new-york/agents/prompt-input";
import type {
  PromptAttachment,
  PromptModel,
} from "@/registry/new-york/agents/prompt-input";

/** Shipped with the docs so the demo needs no external host. */
const THUMB = "/attachment-demo.jpg";

/** One model per mark the picker draws, so the menu shows the whole set at once. */
const MODELS: PromptModel[] = [
  { id: "gpt-5.2", name: "GPT-5.2", provider: "openai" },
  { id: "claude-sonnet-4.5", name: "Claude Sonnet 4.5", provider: "anthropic" },
  { id: "gemini-3-pro", name: "Gemini 3 Pro", provider: "gemini" },
  { id: "grok-4", name: "Grok 4", provider: "xai" },
  { id: "deepseek-v3.2", name: "DeepSeek V3.2", provider: "deepseek" },
  { id: "qwen3-max", name: "Qwen3 Max", provider: "qwen" },
  { id: "kimi-k2", name: "Kimi K2", provider: "moonshot" },
  { id: "glm-4.6", name: "GLM-4.6", provider: "zhipu" },
  { id: "llama-4-maverick", name: "Llama 4 Maverick", provider: "meta" },
  { id: "mistral-large-3", name: "Mistral Large 3", provider: "mistral" },
  { id: "sonar-pro", name: "Sonar Pro", provider: "perplexity" },
  { id: "llama-3.3-70b", name: "Llama 3.3 70B", provider: "ollama" },
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
      {streaming ? <WaitingRow label="Thinking" /> : null}
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
