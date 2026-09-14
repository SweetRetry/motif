"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { Popover } from "@/components/ui/popover";

import { ModelSelectContext } from "./context";
import type { ModelSelectState } from "./context";
import type { ModelSelectProps, ModelSelectSectionData } from "./types";

export {
  ModelSelectContent,
  ModelSelectIndex,
  ModelSelectItem,
  ModelSelectList,
  ModelSelectSearch,
  ModelSelectSection,
  ModelSelectTrigger,
  ProviderGlyph,
} from "./parts";
export type {
  ModelSelectContentProps,
  ModelSelectItemProps,
  ModelSelectSectionProps,
  ModelSelectTriggerProps,
} from "./parts";
export { useModelSelect } from "./context";
export type { ModelSelectState } from "./context";
export type {
  ModelSelectModel,
  ModelSelectProps,
  ModelSelectProvider,
  ModelSelectSectionData,
} from "./types";

/** The id the recommended section answers to. A section id is also the `data-section` the
 *  rail walks to, so it has to be a string a provider id cannot be. */
const RECOMMENDED = "recommended";

/* -- The picker ----------------------------------------------------------------
 * A catalogue is long, and most of it is never read: a person wants the two or three
 * models that fit what they are making, and wants to know the rest are there. So the
 * surface is one scroll of everything with a rail beside it — and the rail, unlike a
 * filter, never changes what the list holds. It says where you are, it walks you to a
 * maker, and it follows the scroll back.
 *
 * The root owns the state and draws nothing: the trigger, the panel, the field, the rail
 * and the list are parts, and a caller assembles them. Leaving the rail out is a picker
 * for a short list; leaving the panel out is a caller who wants their own. What the root
 * owns instead is the one thing parts cannot hold between them — which model is chosen,
 * what is typed, and which section the list is showing.
 *
 * `cmdk` owns the filtering, the arrow keys and the listbox semantics, because a
 * searchable list is a solved problem and none of it is this component's idea. What is
 * this component's idea is the rail, the recommended section, and the fact that both are
 * derived from the same two props — so the index can never disagree with the list.
 * --------------------------------------------------------------------------- */

export const ModelSelect = ({
  children,
  defaultOpen = false,
  defaultValue,
  disabled = false,
  emptyLabel = "No model matches",
  models,
  onOpenChange,
  onValueChange,
  open,
  providers,
  recommendedHint,
  recommendedIcon,
  recommendedLabel = "Recommended",
  triggerPlaceholder = "Select a model",
  value,
}: ModelSelectProps) => {
  // The pick is the picker's own until `value` is passed, like every other
  // value/defaultValue pair here: a surface that only needs to know which model to call
  // should not have to hold the answer in the page that renders it.
  const [picked, setPicked] = useState(() => defaultValue ?? models[0]?.id);
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [pendingSection, setPendingSection] = useState<string | null>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = value === undefined ? picked : value;
  const openState = open ?? uncontrolledOpen;

  /** The list, as sections: what is recommended first, then a section per maker in the
   *  order `providers` gives them. The rail is this array too, which is what keeps the
   *  two in step. */
  const sections = useMemo(() => {
    const list: ModelSelectSectionData[] = [];
    const recommended = models.filter((model) => model.recommended);
    if (recommended.length) {
      list.push({
        hint: recommendedHint,
        icon: recommendedIcon,
        id: RECOMMENDED,
        label: recommendedLabel,
        models: recommended,
      });
    }

    for (const provider of providers) {
      const owned = models.filter((model) => model.provider === provider.id);
      if (owned.length) {
        list.push({
          id: provider.id,
          label: provider.name,
          models: owned,
          provider,
        });
      }
    }

    // A model whose maker is missing from `providers` would be in the catalogue and
    // nowhere in the list: it gets a section under its own id rather than vanishing.
    const known = new Set(providers.map((provider) => provider.id));
    const orphans = models.filter((model) => !known.has(model.provider));
    for (const id of new Set(orphans.map((model) => model.provider))) {
      list.push({
        id,
        label: id,
        models: orphans.filter((model) => model.provider === id),
      });
    }

    return list;
  }, [models, providers, recommendedHint, recommendedIcon, recommendedLabel]);

  const setOpenState = useCallback(
    (next: boolean) => {
      if (open === undefined) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [onOpenChange, open]
  );

  const select = useCallback(
    (id: string) => {
      if (value === undefined) {
        setPicked(id);
      }
      onValueChange?.(id);
      // A pick ends the question. The trigger is the receipt, and leaving the panel open
      // over the thing it was opened from is a menu that will not get out of the way.
      setOpenState(false);
    },
    [onValueChange, setOpenState, value]
  );

  const walkTo = useCallback((id: string) => {
    // The rail walks the browse list, so a section it is asked for is a section the
    // search has to give back first.
    setQuery("");
    setPendingSection(id);
  }, []);

  const clearPendingSection = useCallback(() => setPendingSection(null), []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpenState(next);
      if (!next) {
        setQuery("");
        setActiveSection(null);
      }
    },
    [setOpenState]
  );

  const state = useMemo<ModelSelectState>(
    () => ({
      activeSection,
      clearPendingSection,
      disabled,
      emptyLabel,
      listRef,
      models,
      pendingSection,
      providers,
      query,
      sections,
      select,
      setActiveSection,
      setQuery,
      triggerPlaceholder,
      value: selected,
      walkTo,
    }),
    [
      activeSection,
      clearPendingSection,
      disabled,
      emptyLabel,
      models,
      pendingSection,
      providers,
      query,
      sections,
      select,
      selected,
      triggerPlaceholder,
      walkTo,
    ]
  );

  return (
    <Popover onOpenChange={handleOpenChange} open={openState}>
      <ModelSelectContext.Provider value={state}>
        {children}
      </ModelSelectContext.Provider>
    </Popover>
  );
};
