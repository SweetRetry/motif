import type { ReactNode } from "react";

/** One maker a model can come from. `icon` is a mark drawn at 18px in `currentColor`
 *  (see `ProviderMark`); without one the rail and the rows fall back to the maker's
 *  initial, because a slot that draws nothing is a control with nothing to aim at. */
export interface ModelSelectProvider {
  id: string;
  name: string;
  icon?: ReactNode;
}

/** One model the picker can be pointed at. */
export interface ModelSelectModel {
  /** What `value` and `onValueChange` trade in. */
  id: string;
  name: string;
  /** A `ModelSelectProvider.id`. */
  provider: string;
  /** The line under the name. Omit it and the row is one line tall. */
  description?: string;
  /** Drawn beside the name — a duration, a set of capability glyphs, a price. */
  meta?: ReactNode;
  /** Lifts the model into the recommended section that heads the list. */
  recommended?: boolean;
  /** Extra words the search may match that are not on screen, e.g. `"audio"`. */
  keywords?: string[];
}

/** One section of the list, and one entry in the rail that indexes it. Derived from
 *  `models` and `providers` rather than passed in: the rail and the list read the same
 *  array, which is what keeps the index from disagreeing with what is on screen. */
export interface ModelSelectSectionData {
  /** Said under the heading, e.g. what "recommended" was measured against here. */
  hint?: string;
  /** Drawn at the head of the section. Defaults to the maker's mark, or a sparkle for
   *  the recommended section. */
  icon?: ReactNode;
  /** Also the `data-section` the rail walks to. */
  id: string;
  label: string;
  models: ModelSelectModel[];
  /** Set on a maker's section: the mark, the name and the rail entry come from here. */
  provider?: ModelSelectProvider;
}

export interface ModelSelectProps {
  children: ReactNode;
  defaultOpen?: boolean;
  /** Model the picker opens on when it holds the choice itself. Defaults to the first
   *  model in the list: a picker that opens on nothing makes every caller write the
   *  same fallback. */
  defaultValue?: string;
  disabled?: boolean;
  /** Said when nothing matches the query. */
  emptyLabel?: string;
  models: ModelSelectModel[];
  onOpenChange?: (open: boolean) => void;
  onValueChange?: (id: string) => void;
  open?: boolean;
  /** The makers, in the order the rail and the list walk them. */
  providers: ModelSelectProvider[];
  /** Explains what "recommended" means for this run, e.g. `"Fits your 30s · audio
   *  setup"`. Omit it and the heading carries no hint. */
  recommendedHint?: string;
  /** Drawn at the head of the recommended section and in the rail. Defaults to a target:
   *  these are the models that fit what is being made. */
  recommendedIcon?: ReactNode;
  /** Heading over the recommended models. */
  recommendedLabel?: string;
  /** Said by the trigger when no model is selected. */
  triggerPlaceholder?: string;
  /** Controlled model id. */
  value?: string;
}
