"use client";

import { createContext, useContext } from "react";

import type { ChatModel, ReasoningEffort } from "./types";

/** What a part needs from the root: the catalogue, the model in use, the step it runs
 *  at, and the two ways to change them. */
export interface ChatModelMenuState {
  /** The model in use. */
  active: ChatModel;
  /** Whether `model` can take over this conversation. */
  allows: (model: ChatModel) => boolean;
  disabled: boolean;
  /** The step the active model runs at: the pick when it offers it, else its default.
   *  `null` when the model has no thinking control. */
  effort: ReasoningEffort | null;
  /** Whether a family lock is greying any model out. */
  locked: boolean;
  models: ChatModel[];
  /** Whether the menu is open. The content freezes on the last open state while it
   *  animates out. */
  open: boolean;
  pickEffort: (effort: ReasoningEffort) => void;
  pickModel: (id: string) => void;
}

export const ChatModelMenuContext = createContext<ChatModelMenuState | null>(
  null
);

export const useChatModelMenu = () => {
  const context = useContext(ChatModelMenuContext);
  if (!context) {
    throw new Error("ChatModelMenu parts must be used within a ChatModelMenu.");
  }

  return context;
};
