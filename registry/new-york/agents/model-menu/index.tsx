"use client";

import { useCallback, useMemo, useState } from "react";

import { DropdownMenu } from "@/components/ui/dropdown-menu";

import { ModelMenuContext } from "./context";
import type { ModelMenuState } from "./context";
import type { ChatModel, ModelMenuProps, ReasoningEffort } from "./types";

export {
  ModelMenuContent,
  ModelMenuEffort,
  ModelMenuModels,
  ModelMenuTrigger,
  EFFORT_LABELS,
} from "./parts";
export type {
  ModelMenuContentProps,
  ModelMenuEffortProps,
  ModelMenuModelsProps,
  ModelMenuTriggerProps,
} from "./parts";
export { useModelMenu } from "./context";
export type { ModelMenuState } from "./context";
export { REASONING_EFFORTS } from "./types";
export type { ChatModel, ModelMenuProps, ReasoningEffort } from "./types";

/** The step a turn runs at: the pick when the model offers it, else the model's default. */
export const effortOf = (
  model: ChatModel,
  wanted: ReasoningEffort | null | undefined
): ReasoningEffort | null => {
  if (!model.thinking) {
    return null;
  }
  const { options, default: start } = model.thinking;
  return wanted && options.includes(wanted) ? wanted : start;
};

/* -- Which model answers, and how hard it thinks ------------------------------
 * A chat model is two choices that read as one: the model, and the thinking step it runs
 * at. They live in one menu because the second depends on the first: each vendor tells a
 * different set of steps apart, so the thinking control lists the steps of the model in
 * use and nothing else.
 *
 * The thinking pick is held as a wish. Switch to a model that lacks the step and the
 * trigger shows that model's default; switch back and the pick returns. A pick that was
 * silently rewritten on every model change would lose the user's intent on the first hop.
 *
 * A conversation that has a turn is stored in its protocol's shape, so it can move only
 * between models of the same `family`. The others stay in the list, disabled, under a
 * heading that says why: a model that vanished would read as a model that does not exist.
 *
 * The root owns the state and draws nothing but the menu shell. The trigger, the model
 * list and the thinking control are parts, and a caller leaves out whichever it has no
 * use for.
 * --------------------------------------------------------------------------- */

export const ModelMenu = ({
  children,
  defaultEffort = null,
  defaultValue,
  disabled = false,
  effort,
  family,
  models,
  onEffortChange,
  onValueChange,
  value,
}: ModelMenuProps) => {
  const [picked, setPicked] = useState(() => defaultValue ?? models[0]?.id);
  const [wished, setWished] = useState(defaultEffort);
  const [open, setOpen] = useState(false);
  const selected = value === undefined ? picked : value;
  const wanted = effort === undefined ? wished : effort;

  const active = models.find((model) => model.id === selected) ?? models[0];

  const allows = useCallback(
    (model: ChatModel) =>
      family === undefined ||
      model.family === undefined ||
      model.family === family,
    [family]
  );

  const pickModel = useCallback(
    (id: string) => {
      if (value === undefined) {
        setPicked(id);
      }
      onValueChange?.(id);
    },
    [onValueChange, value]
  );

  const pickEffort = useCallback(
    (next: ReasoningEffort) => {
      if (effort === undefined) {
        setWished(next);
      }
      onEffortChange?.(next);
    },
    [effort, onEffortChange]
  );

  const state = useMemo<ModelMenuState | null>(
    () =>
      active
        ? {
            active,
            allows,
            disabled,
            effort: effortOf(active, wanted),
            locked: models.some((model) => !allows(model)),
            models,
            open,
            pickEffort,
            pickModel,
          }
        : null,
    [active, allows, disabled, models, open, pickEffort, pickModel, wanted]
  );

  // A menu with no model in it has nothing to say and nothing to pick.
  if (!state) {
    return null;
  }

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <ModelMenuContext.Provider value={state}>
        {children}
      </ModelMenuContext.Provider>
    </DropdownMenu>
  );
};
