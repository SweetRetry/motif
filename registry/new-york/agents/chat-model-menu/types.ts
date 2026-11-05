import type { ReactNode } from "react";

import type { ProviderId } from "@/components/ui/motif/provider-mark";

/** The steps a vendor tells apart when it is asked how hard to think, weakest first.
 *  A model offers the subset its API accepts; no model offers them all. */
export const REASONING_EFFORTS = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

/** One chat model the conversation can run on. */
export interface ChatModel {
  /** What `value` and `onValueChange` trade in. */
  id: string;
  name: string;
  provider: ProviderId;
  /**
   * The protocol the model is spoken to in. A conversation stores its history in one
   * protocol's shape, so once it has a turn it can only move between models that share
   * this. Omit it and the model is never locked out.
   */
  family?: string;
  /** The thinking steps this model offers, and the one a turn runs at without a pick.
   *  Omit it, or offer one step, and the menu draws no thinking control for it. */
  thinking?: {
    options: readonly ReasoningEffort[];
    default: ReasoningEffort;
  };
}

export interface ChatModelMenuProps {
  children: ReactNode;
  /** Model the menu opens on when it holds the choice itself. Defaults to the first. */
  defaultValue?: string;
  /** Thinking step the menu starts on when it holds the pick itself. */
  defaultEffort?: ReasoningEffort | null;
  disabled?: boolean;
  /**
   * The user's thinking pick, controlled. It is a wish, not a setting: a model that does
   * not offer it runs at its own default, and the pick comes back when the user returns
   * to a model that does. `null` means "the model's default".
   */
  effort?: ReasoningEffort | null;
  /**
   * The family the conversation is locked to, or omit it before the first turn. Models
   * of another family stay listed and disabled, so the user sees why they cannot switch
   * instead of wondering where they went.
   */
  family?: string;
  models: ChatModel[];
  onEffortChange?: (effort: ReasoningEffort) => void;
  onValueChange?: (id: string) => void;
  /** Controlled model id. */
  value?: string;
}
