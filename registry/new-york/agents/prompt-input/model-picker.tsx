"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { PROVIDER_NAMES, ProviderMark } from "./provider-icons";
import type { ModelPickerProps } from "./types";

/* -- Which model answers -------------------------------------------------------
 * One mark, one name, one chevron. The mark is the loud part because it is the part read
 * at a glance; the name sits in the muted tone the rest of the composer's row uses, so
 * the row has one subject instead of two.
 *
 * The menu opens upward: a composer lives at the bottom of the window, and a menu that
 * unfolds over the message you are about to send is a menu covering the thing you are
 * deciding about. Radix flips it on its own if there is no room above.
 *
 * The pick is the picker's own until `value` is passed, like every other
 * value/defaultValue pair here: a composer that only needs to know which model to call
 * should not have to hold the answer in the page that renders it.
 * --------------------------------------------------------------------------- */

export const ModelPicker = ({
  className,
  defaultValue,
  models,
  onValueChange,
  value,
}: ModelPickerProps) => {
  const [picked, setPicked] = useState(defaultValue ?? models[0]?.id);
  const controlled = value !== undefined;
  const activeId = controlled ? value : picked;

  const active = models.find((model) => model.id === activeId) ?? models[0];

  if (!active) {
    return null;
  }

  const pick = (id: string) => {
    if (!controlled) {
      setPicked(id);
    }
    onValueChange?.(id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Model: ${active.name}`}
          className={cn(
            "flex h-10 max-w-52 shrink-0 cursor-pointer items-center gap-2 rounded-full pr-2 pl-2.5 outline-none transition-colors duration-150 ease-out hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent",
            className
          )}
          type="button"
        >
          <ProviderMark
            className="size-5 text-foreground"
            provider={active.provider}
          />
          {/* The name is the part that changes, so it is the part that truncates. */}
          <span className="truncate text-sm text-muted-foreground">
            {active.name}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground/60" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-56" side="top">
        <DropdownMenuRadioGroup onValueChange={pick} value={active.id}>
          {models.map((model) => (
            <DropdownMenuRadioItem
              className="gap-2.5 py-2"
              key={model.id}
              value={model.id}
            >
              <ProviderMark
                className="size-4.5 text-foreground"
                provider={model.provider}
              />
              <span className="truncate">{model.name}</span>
              {/* The maker, on the far side, where it answers a question the name
                  alone leaves open: two vendors ship a model called `Pro`. */}
              <span className="ml-auto pl-4 text-muted-foreground text-xs">
                {PROVIDER_NAMES[model.provider]}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
