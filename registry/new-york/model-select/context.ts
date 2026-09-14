"use client";

import type { RefObject } from "react";
import { createContext, useContext } from "react";

import type {
  ModelSelectModel,
  ModelSelectProvider,
  ModelSelectSectionData,
} from "./types";

/**
 * What a part needs from the root to do its job: the catalogue, where the selection is,
 * and the three pieces of state the parts trade through — the query, the list's own
 * scroll box, and which section the list is showing. The parts that only lay out (the
 * content shell, a section) read this too, because a section cannot know where it sits in
 * the list without knowing what the list holds.
 */
export interface ModelSelectState {
  /** The section at the top of the list, as the list last saw it. */
  activeSection: string | null;
  clearPendingSection: () => void;
  disabled: boolean;
  emptyLabel: string;
  /** The list's scroll box, so the rail can walk to a section it is not holding. */
  listRef: RefObject<HTMLDivElement | null>;
  models: ModelSelectModel[];
  /** A section the rail asked for, waiting for the list to be laid out again. */
  pendingSection: string | null;
  providers: ModelSelectProvider[];
  query: string;
  sections: ModelSelectSectionData[];
  select: (id: string) => void;
  setActiveSection: (id: string) => void;
  setQuery: (query: string) => void;
  triggerPlaceholder: string;
  value?: string;
  /** Ask the list to bring a section to the top, dropping the query first if the search
   *  is what the list is showing. */
  walkTo: (id: string) => void;
}

export const ModelSelectContext = createContext<ModelSelectState | null>(null);

export const useModelSelect = () => {
  const context = useContext(ModelSelectContext);
  if (!context) {
    throw new Error("ModelSelect parts must be used within a ModelSelect.");
  }

  return context;
};
