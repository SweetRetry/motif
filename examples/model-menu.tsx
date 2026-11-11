"use client";

import { useState } from "react";

import {
  ModelMenu,
  ModelMenuContent,
  ModelMenuEffort,
  ModelMenuModels,
  ModelMenuTrigger,
} from "@/registry/new-york/agents/model-menu";
import type {
  ChatModel,
  ReasoningEffort,
} from "@/registry/new-york/agents/model-menu";

/** Three protocols, four models, and four different sets of thinking steps: each set
 *  is what that vendor's API accepts, so no two lists in the menu are the same. */
const MODELS: ChatModel[] = [
  {
    family: "deepseek",
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    provider: "deepseek",
    thinking: { default: "high", options: ["off", "low", "high", "max"] },
  },
  {
    family: "gemini",
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    provider: "gemini",
    thinking: { default: "medium", options: ["low", "medium", "high"] },
  },
  {
    family: "gemini",
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash Lite",
    provider: "gemini",
    thinking: {
      default: "medium",
      options: ["minimal", "low", "medium", "high"],
    },
  },
  {
    family: "anthropic",
    id: "claude-sonnet-5-5",
    name: "Claude Sonnet 5.5",
    provider: "anthropic",
    thinking: {
      default: "high",
      options: ["low", "medium", "high", "xhigh", "max"],
    },
  },
];

export const ModelMenuDemo = () => {
  const [model, setModel] = useState(MODELS[0].id);
  const [effort, setEffort] = useState<ReasoningEffort | null>(null);

  return (
    <ModelMenu
      effort={effort}
      models={MODELS}
      onEffortChange={setEffort}
      onValueChange={setModel}
      value={model}
    >
      <ModelMenuTrigger />
      <ModelMenuContent>
        <ModelMenuModels />
        <ModelMenuEffort />
      </ModelMenuContent>
    </ModelMenu>
  );
};

/** A conversation that already ran on Gemini: the other Gemini stays open, the rest
 *  stay listed and disabled. */
export const ModelMenuLockedDemo = () => (
  <ModelMenu defaultValue="gemini-3.8-flash" family="gemini" models={MODELS}>
    <ModelMenuTrigger />
    <ModelMenuContent>
      <ModelMenuModels />
      <ModelMenuEffort />
    </ModelMenuContent>
  </ModelMenu>
);
