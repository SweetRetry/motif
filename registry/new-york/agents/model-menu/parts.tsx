"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";

import {
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProviderLogo } from "@/components/ui/motif/provider-logo";
import { cn } from "@/lib/utils";

import { ModelMenuContext, useModelMenu } from "./context";
import type { ReasoningEffort } from "./types";

/** How each step reads on screen. */
export const EFFORT_LABELS: Record<ReasoningEffort, string> = {
  high: "High",
  low: "Low",
  max: "Max",
  medium: "Medium",
  minimal: "Minimal",
  off: "Off",
  xhigh: "Extra high",
};

const LABEL = "px-2 pt-2 pb-1 font-normal text-muted-foreground text-xs";

/** A radio row with its mark at the end. The stock row keeps a gutter on the left for its
 *  dot, which pushes every row off the axis the headings and the thinking row sit on; so
 *  the stock dot is hidden and a check trails the row instead. */
const PICK = "gap-2.5 py-2 pl-2 [&>span:first-child]:hidden";

const Picked = ({ on }: { on: boolean }) =>
  on ? <Check className="ml-auto size-4 text-foreground" /> : null;

/* -- Trigger -------------------------------------------------------------------
 * Mark, name, step, chevron. The mark is read at a glance, the name is the part that
 * changes and so the part that truncates, and the step trails in the muted tone because
 * it qualifies the model rather than competing with it.
 * --------------------------------------------------------------------------- */

export interface ModelMenuTriggerProps extends ComponentProps<"button"> {
  /** Replaces the face. The button, its states and its label stay. */
  children?: ReactNode;
}

export const ModelMenuTrigger = ({
  children,
  className,
  ...props
}: ModelMenuTriggerProps) => {
  const { active, disabled, effort } = useModelMenu();
  const step = effort ? EFFORT_LABELS[effort] : null;

  return (
    <DropdownMenuTrigger asChild disabled={disabled}>
      <button
        aria-label={
          step
            ? `Model: ${active.name}, thinking ${step.toLowerCase()}`
            : `Model: ${active.name}`
        }
        className={cn(
          "flex h-10 min-w-0 max-w-64 shrink cursor-pointer items-center gap-2 rounded-full pr-2 pl-2.5 text-sm outline-none transition-colors duration-150 ease-out hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-accent",
          className
        )}
        type="button"
        {...props}
      >
        {children ?? (
          <>
            <ProviderLogo
              className="size-5 text-foreground"
              provider={active.provider}
            />
            <span className="truncate text-foreground">{active.name}</span>
            {step ? (
              <span className="shrink-0 text-muted-foreground">{step}</span>
            ) : null}
            <ChevronDown className="size-4 shrink-0 text-muted-foreground/60" />
          </>
        )}
      </button>
    </DropdownMenuTrigger>
  );
};

/* -- Content -------------------------------------------------------------------
 * Opens upward: the menu sits in a composer at the foot of the window, and unfolding over
 * the draft would cover the thing being decided about. Radix flips it when there is no
 * room above.
 *
 * A pick closes the menu, and the same click changes what it would draw. Drawn live, the
 * menu rewrites itself while it fades, and if its height changes, opening upward, its top
 * edge jumps. So the content holds the state it showed while
 * open and lets the trigger alone answer the pick. The thinking row needs it too: its
 * step changes with the model, and it vanishes for a model with nothing to choose.
 * --------------------------------------------------------------------------- */

export type ModelMenuContentProps = ComponentProps<typeof DropdownMenuContent>;

export const ModelMenuContent = ({
  align = "start",
  className,
  side = "top",
  ...props
}: ModelMenuContentProps) => {
  const live = useModelMenu();
  const [held, setHeld] = useState(live);
  if (live.open && held !== live) {
    setHeld(live);
  }

  return (
    <ModelMenuContext.Provider value={live.open ? live : held}>
      <DropdownMenuContent
        align={align}
        className={cn("w-60", className)}
        side={side}
        {...props}
      />
    </ModelMenuContext.Provider>
  );
};

/* -- Models --------------------------------------------------------------------
 * Every model, in the caller's order. Under a family lock the ones that cannot take the
 * conversation over stay where they are, disabled, and the heading names the reason.
 * --------------------------------------------------------------------------- */

export interface ModelMenuModelsProps {
  className?: string;
  /** Heading over the list. */
  label?: string;
  /** Heading while a lock greys models out: the reason, said once for all of them. */
  lockedLabel?: string;
}

export const ModelMenuModels = ({
  className,
  label = "Model",
  lockedLabel = "Same protocol as this conversation",
}: ModelMenuModelsProps) => {
  const { active, allows, locked, models, pickModel } = useModelMenu();

  return (
    <DropdownMenuGroup className={className}>
      <DropdownMenuLabel className={LABEL}>
        {locked ? lockedLabel : label}
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup onValueChange={pickModel} value={active.id}>
        {models.map((model) => (
          <DropdownMenuRadioItem
            className={PICK}
            disabled={!allows(model)}
            key={model.id}
            value={model.id}
          >
            <ProviderLogo
              className="size-4.5 text-foreground"
              provider={model.provider}
            />
            <span className="truncate">{model.name}</span>
            <Picked on={model.id === active.id} />
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
  );
};

/* -- Thinking ------------------------------------------------------------------
 * One row under the models: the heading, the step in use, and a submenu of the steps the
 * model offers, weakest first, as the vendor lists them. Folded away, the step list no
 * longer sets the menu's height, so switching between models of three and five steps
 * leaves the menu the same size. A model with one step or none has nothing to choose, so
 * the part draws nothing, not even its rule.
 * --------------------------------------------------------------------------- */

export interface ModelMenuEffortProps {
  className?: string;
  /** Heading on the row that opens the steps. */
  label?: string;
}

export const ModelMenuEffort = ({
  className,
  label = "Thinking",
}: ModelMenuEffortProps) => {
  const { active, effort, pickEffort } = useModelMenu();
  const options = active.thinking?.options ?? [];

  if (!effort || options.length < 2) {
    return null;
  }

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className={cn("gap-2 py-2", className)}>
          <span className="flex-1">{label}</span>
          <span className="text-muted-foreground">{EFFORT_LABELS[effort]}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-36">
          <DropdownMenuRadioGroup
            onValueChange={(next) => pickEffort(next as ReasoningEffort)}
            value={effort}
          >
            {options.map((option) => (
              <DropdownMenuRadioItem
                className={PICK}
                key={option}
                value={option}
              >
                {EFFORT_LABELS[option]}
                <Picked on={option === effort} />
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
};
