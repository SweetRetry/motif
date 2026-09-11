"use client";

import type { RefObject } from "react";
import { createContext, useContext } from "react";

/**
 * What a part needs from the root to do its job: the draft, the door out of it, and the
 * field — so a part that takes a click can hand focus back to the place the user was
 * typing. The parts that only lay out (the header, the footer, a plain button chip) take
 * no context and can be used anywhere.
 */
export interface PromptInputState {
  /** There is something to send and the composer is not disabled. */
  canSend: boolean;
  disabled: boolean;
  field: RefObject<HTMLTextAreaElement | null>;
  setValue: (value: string) => void;
  /** The composer's `onStop`, for the submit part's stop face. */
  stop?: () => void;
  streaming: boolean;
  submit: () => void;
  value: string;
}

export const PromptInputContext = createContext<PromptInputState | null>(null);

export const usePromptInput = () => {
  const context = useContext(PromptInputContext);
  if (!context) {
    throw new Error("PromptInput parts must be used within a PromptInput.");
  }

  return context;
};
