"use client";

import {
  PROVIDER_NAMES,
  ProviderLogo,
} from "@/components/ui/motif/provider-logo";
import type { ProviderId } from "@/components/ui/motif/provider-logo";

/** Every mark in the set, named underneath so it is clear which is which — a logo grid
 *  is a riddle without the labels. */
const PROVIDERS: ProviderId[] = [
  "alibaba",
  "anthropic",
  "bfl",
  "bytedance",
  "deepseek",
  "gemini",
  "google",
  "groq",
  "kling",
  "luma",
  "meta",
  "minimax",
  "mistral",
  "moonshot",
  "ollama",
  "openai",
  "openrouter",
  "perplexity",
  "pika",
  "qwen",
  "runway",
  "xai",
  "zhipu",
];

export const ProviderLogoDemo = () => (
  <div className="grid w-full grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
    {PROVIDERS.map((provider) => (
      <div
        className="flex flex-col items-center gap-2 rounded-xl border border-border/60 py-4"
        key={provider}
      >
        <ProviderLogo className="size-6" provider={provider} />
        <span className="text-center text-muted-foreground text-xs">
          {PROVIDER_NAMES[provider]}
        </span>
      </div>
    ))}
  </div>
);

/** One mark, toned by its parent — the mono cuts follow the text they are planted in. */
export const ProviderLogoMonoDemo = () => (
  <div className="flex items-center gap-6">
    <span className="flex items-center gap-2 text-foreground text-sm">
      <ProviderLogo className="size-5" provider="openai" />
      OpenAI, in the text's own tone
    </span>
    <span className="flex items-center gap-2 text-muted-foreground text-sm">
      <ProviderLogo className="size-5" provider="xai" />
      xAI, muted with the sentence
    </span>
  </div>
);
