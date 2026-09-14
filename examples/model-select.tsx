"use client";

import { Frame, Image, Music } from "lucide-react";
import { useState } from "react";

import { ProviderMark } from "@/components/ui/provider-mark";
import {
  ModelSelect,
  ModelSelectContent,
  ModelSelectIndex,
  ModelSelectList,
  ModelSelectSearch,
  ModelSelectTrigger,
} from "@/registry/new-york/model-select";
import type {
  ModelSelectModel,
  ModelSelectProvider,
} from "@/registry/new-york/model-select";

/** A mark each, so the rail reads as a column of brands. The colour is the artwork's:
 *  these are the cuts LobeHub draws, sized by the slot they land in. */
const PROVIDERS: ModelSelectProvider[] = [
  {
    icon: <ProviderMark provider="bytedance" />,
    id: "bytedance",
    name: "ByteDance",
  },
  { icon: <ProviderMark provider="minimax" />, id: "minimax", name: "MiniMax" },
  { icon: <ProviderMark provider="google" />, id: "google", name: "Google" },
  { icon: <ProviderMark provider="kling" />, id: "kling", name: "Kling" },
  { icon: <ProviderMark provider="alibaba" />, id: "alibaba", name: "Alibaba" },
  {
    icon: <ProviderMark provider="bfl" />,
    id: "bfl",
    name: "Black Forest Labs",
  },
  { icon: <ProviderMark provider="runway" />, id: "runway", name: "Runway" },
];

/** What a model can do, as glyphs. The caller's own vocabulary: the picker only knows
 *  that something belongs beside the name. */
const CAPS = {
  audio: { icon: <Music className="size-3.5" />, label: "Native audio" },
  frame: {
    icon: <Frame className="size-3.5" />,
    label: "First and last frame",
  },
  ref: {
    icon: <Image className="size-3.5" />,
    label: "Takes reference images",
  },
};

const meta = (duration: string, caps: (keyof typeof CAPS)[]) => (
  <>
    <span className="rounded-md bg-foreground/10 px-1.5 py-0.5 font-medium text-[11px] text-muted-foreground">
      {duration}
    </span>
    <span className="flex items-center gap-1.5 text-muted-foreground/70">
      {caps.map((cap) => (
        <span key={cap} title={CAPS[cap].label}>
          {CAPS[cap].icon}
        </span>
      ))}
    </span>
  </>
);

/** Long enough to be worth indexing: seven makers, fifteen models, four of them
 *  recommended for what the trigger says is being made. */
const MODELS: ModelSelectModel[] = [
  {
    description: "Single-shot video up to 30 seconds with native audio.",
    id: "seedance-2-5",
    meta: meta("5m", ["ref", "audio", "frame"]),
    name: "Seedance 2.5",
    provider: "bytedance",
    recommended: true,
  },
  {
    description: "Lightweight, cost-effective generation with audio.",
    id: "seedance-2-mini",
    meta: meta("30s", ["ref", "audio", "frame"]),
    name: "Seedance 2.0 Mini",
    provider: "bytedance",
  },
  {
    description: "Generate video guided by reference images.",
    id: "seedance-2-ref",
    meta: meta("7m", ["ref", "frame"]),
    name: "Seedance 2.0 Reference",
    provider: "bytedance",
  },
  {
    description: "Powerful model with native sound.",
    id: "seedance-1-5-pro",
    meta: meta("2m", ["ref", "audio"]),
    name: "Seedance 1.5 Pro",
    provider: "bytedance",
  },
  {
    description: "Hailuo's post-trained H3: sharper prompt adherence.",
    id: "minimax-h3-max",
    meta: meta("30s", ["ref", "audio", "frame"]),
    name: "MiniMax H3 Max",
    provider: "minimax",
    recommended: true,
  },
  {
    description: "Fast, cinematic motion at 1080p.",
    id: "hailuo-2-3",
    meta: meta("10s", ["ref", "audio"]),
    name: "MiniMax Hailuo 2.3",
    provider: "minimax",
  },
  {
    description: "Reliable text-to-video starter model.",
    id: "hailuo-02",
    meta: meta("6s", ["ref"]),
    name: "MiniMax Hailuo 02",
    provider: "minimax",
  },
  {
    description: "Google's Omni video model, 360p–4k output.",
    id: "gemini-omni-1-1",
    meta: meta("3m", ["ref", "audio", "frame"]),
    name: "Gemini Omni 1.1 Flash",
    provider: "google",
    recommended: true,
  },
  {
    description: "Native audio and dialogue, up to 4k.",
    id: "veo-3-1",
    meta: meta("8s", ["ref", "audio", "frame"]),
    name: "Veo 3.1",
    provider: "google",
  },
  {
    description: "Best-in-class motion and prompt adherence.",
    id: "kling-2-5-turbo",
    meta: meta("10s", ["ref", "audio", "frame"]),
    name: "Kling 2.5 Turbo",
    provider: "kling",
    recommended: true,
  },
  {
    description: "Highest-fidelity Kling, slower.",
    id: "kling-2-1-master",
    meta: meta("10s", ["ref", "frame"]),
    name: "Kling 2.1 Master",
    provider: "kling",
  },
  {
    description: "Budget Kling for drafts.",
    id: "kling-2-1-standard",
    meta: meta("5s", ["ref"]),
    name: "Kling 2.1 Standard",
    provider: "kling",
  },
  {
    description: "Open-weight video model with audio.",
    id: "wan-2-5",
    meta: meta("10s", ["ref", "audio"]),
    name: "Wan 2.5 Preview",
    provider: "alibaba",
  },
  {
    description: "Image-first generation from Black Forest Labs.",
    id: "flux-2-video",
    meta: meta("5s", ["ref"]),
    name: "FLUX.2 Video",
    provider: "bfl",
  },
  {
    description: "Fast, consistent characters across shots.",
    id: "gen-4-turbo",
    meta: meta("10s", ["ref", "audio"]),
    name: "Gen-4 Turbo",
    provider: "runway",
  },
];

export const ModelSelectDemo = () => {
  const [value, setValue] = useState("minimax-h3-max");

  return (
    <ModelSelect
      models={MODELS}
      onValueChange={setValue}
      providers={PROVIDERS}
      recommendedHint="Fits this run: 30s, native audio, a reference image to start from"
      value={value}
    >
      <ModelSelectTrigger />
      <ModelSelectContent>
        <ModelSelectSearch />
        {/* The rail and the list are one arrangement of the parts; leaving the rail out
            is another, and it is the whole difference between a browsable catalogue and
            a searchable one. */}
        <div className="flex min-h-0 flex-1">
          <ModelSelectIndex />
          <ModelSelectList />
        </div>
      </ModelSelectContent>
    </ModelSelect>
  );
};

/** A short list, one maker, no rail: the same parts, arranged for a picker that has
 *  nothing to index. */
const CHAT_MODELS: ModelSelectModel[] = [
  {
    description: "Best for long, careful work.",
    id: "claude-sonnet-4.5",
    meta: "$3 / Mtok",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    recommended: true,
  },
  {
    description: "The fast one.",
    id: "gpt-5.2",
    name: "GPT-5.2",
    provider: "openai",
  },
  {
    description: "Cheap, and good enough for most of this.",
    id: "deepseek-v3.2",
    name: "DeepSeek V3.2",
    provider: "deepseek",
  },
  {
    description: "Runs on your machine.",
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B",
    provider: "ollama",
  },
];

const CHAT_PROVIDERS: ModelSelectProvider[] = [
  {
    icon: <ProviderMark provider="anthropic" />,
    id: "anthropic",
    name: "Anthropic",
  },
  { icon: <ProviderMark provider="openai" />, id: "openai", name: "OpenAI" },
  {
    icon: <ProviderMark provider="deepseek" />,
    id: "deepseek",
    name: "DeepSeek",
  },
  { icon: <ProviderMark provider="ollama" />, id: "ollama", name: "Ollama" },
];

export const ModelSelectShortDemo = () => (
  <ModelSelect
    defaultValue="claude-sonnet-4.5"
    models={CHAT_MODELS}
    providers={CHAT_PROVIDERS}
  >
    <ModelSelectTrigger className="border border-border bg-card" />
    <ModelSelectContent className="w-80">
      <ModelSelectSearch placeholder="Search models" />
      <ModelSelectList />
    </ModelSelectContent>
  </ModelSelect>
);
