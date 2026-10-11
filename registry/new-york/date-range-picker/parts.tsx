"use client";

import { CalendarIcon } from "lucide-react";
import { useRef } from "react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { withinBounds } from "./bounds";
import { useDateRangePicker } from "./context";

/** The caller's handler runs first, and `preventDefault` in it keeps the picker's own from
 *  running — the rule Radix uses. A part spreads the caller's props last, so a handler
 *  passed in would otherwise replace the one the picker depends on. */
const compose =
  <E extends { defaultPrevented: boolean }>(
    theirs: ((event: E) => void) | undefined,
    ours: (event: E) => void
  ) =>
  (event: E) => {
    theirs?.(event);
    if (!event.defaultPrevented) {
      ours(event);
    }
  };

/* -- The field -----------------------------------------------------------------
 * The range, written out and typeable: `2026-10-05 ~ 2026-10-11`. It is the one place
 * that always says what is chosen, so nothing else repeats it — not the panel, not a
 * label naming the shortcut. Focusing it opens the panel; the icon opens it too, for a
 * person who is not going to type.
 * --------------------------------------------------------------------------- */

export type DateRangePickerTriggerProps = Omit<
  ComponentProps<typeof Input>,
  "onChange" | "value"
> & {
  /** The name of the icon button, for assistive tech. */
  calendarLabel?: string;
};

/** `className` sizes the field's box, the input and the icon together; it is `w-64` until
 *  a caller says otherwise. Every other prop is the input's. */
export const DateRangePickerTrigger = ({
  calendarLabel = "Open calendar",
  className,
  onBlur,
  onFocus,
  onKeyDown,
  placeholder = "yyyy-MM-dd ~ yyyy-MM-dd",
  ...props
}: DateRangePickerTriggerProps) => {
  const { fieldRef, invalid, open, setOpen, settle, submit, text, type } =
    useDateRangePicker();

  return (
    <PopoverAnchor asChild>
      <div
        className={cn("relative w-64", className)}
        data-slot="date-range-picker-trigger"
        ref={fieldRef}
      >
        <Input
          aria-invalid={invalid || undefined}
          autoComplete="off"
          className={cn(
            "pr-10 tabular-nums",
            open && "border-ring ring-[3px] ring-ring/50"
          )}
          data-slot="date-range-picker-input"
          inputMode="numeric"
          onBlur={compose(onBlur, settle)}
          onChange={(event) => type(event.target.value)}
          onFocus={compose(onFocus, () => setOpen(true))}
          onKeyDown={compose(onKeyDown, (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          })}
          placeholder={placeholder}
          value={text}
          {...props}
        />
        <PopoverTrigger asChild>
          <Button
            aria-label={calendarLabel}
            className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
            size="icon-sm"
            variant="ghost"
          >
            <CalendarIcon />
          </Button>
        </PopoverTrigger>
      </div>
    </PopoverAnchor>
  );
};

/* -- The panel -----------------------------------------------------------------
 * As wide as its calendar: two 16rem months and the line between them. On a phone it
 * shows the second month alone, and the arrows walk back from it.
 * --------------------------------------------------------------------------- */

export type DateRangePickerContentProps = ComponentProps<typeof PopoverContent>;

export const DateRangePickerContent = ({
  className,
  onInteractOutside,
  onOpenAutoFocus,
  ...props
}: DateRangePickerContentProps) => {
  const { fieldRef } = useDateRangePicker();
  const ref = useRef<HTMLDivElement>(null);

  return (
    <PopoverContent
      align="start"
      className={cn(
        "max-h-(--radix-popover-content-available-height) w-fit gap-0 overflow-y-auto p-0",
        className
      )}
      onInteractOutside={compose(onInteractOutside, (event) => {
        // The field is outside the panel but it is the picker's own: pressing in it to
        // place the caret must not close what focusing it just opened.
        if (
          event.target instanceof Node &&
          fieldRef.current?.contains(event.target)
        ) {
          event.preventDefault();
        }
      })}
      onOpenAutoFocus={compose(onOpenAutoFocus, (event) => {
        const active = document.activeElement;
        if (
          active instanceof HTMLInputElement &&
          fieldRef.current?.contains(active)
        ) {
          // Opened by focusing the field: leave the caret where it is.
          event.preventDefault();
          return;
        }

        // Otherwise land on the day the arrow keys will move from, not on the first
        // button in the panel. With no calendar inside, the default focus is kept.
        const day = ref.current?.querySelector<HTMLElement>(
          "button[data-day][tabindex='0']"
        );
        if (day) {
          event.preventDefault();
          day.focus();
        }
      })}
      ref={ref}
      {...props}
    />
  );
};

/* -- The footer ----------------------------------------------------------------
 * A row under the calendar: names on the left, OK on the right. It is a part of its own
 * so that the shortcuts and OK can be dropped separately, and so that the rule above it
 * is drawn once, whichever of them stays.
 * --------------------------------------------------------------------------- */

export type DateRangePickerFooterProps = ComponentProps<"div">;

export const DateRangePickerFooter = ({
  className,
  ...props
}: DateRangePickerFooterProps) => (
  <div
    className={cn(
      "flex items-center justify-between gap-2 border-t px-3 py-2",
      className
    )}
    data-slot="date-range-picker-footer"
    {...props}
  />
);

export type DateRangePickerShortcutsProps = ComponentProps<"div">;

export const DateRangePickerShortcuts = ({
  className,
  ...props
}: DateRangePickerShortcutsProps) => {
  const { activePresetId, choose, max, min, presets } = useDateRangePicker();
  // With no presets there is nothing to draw: an empty slot draws nothing.
  if (presets.length === 0) {
    return null;
  }

  const today = new Date();

  return (
    <div
      aria-label="Shortcuts"
      className={cn("flex gap-1", className)}
      data-slot="date-range-picker-shortcuts"
      role="group"
      {...props}
    >
      {presets.map((preset) => {
        const range = preset.range(today);
        // A shortcut that would choose days the calendar refuses is not offered.
        const active = activePresetId === preset.id;

        return (
          <Button
            aria-pressed={active}
            className={cn(
              "px-2 text-[13px] font-normal",
              active && "bg-accent font-medium"
            )}
            disabled={!withinBounds(range, { max, min })}
            key={preset.id}
            onClick={() => choose(range)}
            size="sm"
            variant="ghost"
          >
            {preset.label}
          </Button>
        );
      })}
    </div>
  );
};

export type DateRangePickerConfirmProps = Omit<
  ComponentProps<typeof Button>,
  "disabled" | "onClick"
>;

/** Commits the draft. Disabled until there is a whole range to commit, which is the
 *  one thing it says about the state of the picker. */
export const DateRangePickerConfirm = ({
  children = "OK",
  ...props
}: DateRangePickerConfirmProps) => {
  const { canConfirm, confirm } = useDateRangePicker();

  return (
    <Button disabled={!canConfirm} onClick={confirm} size="sm" {...props}>
      {children}
    </Button>
  );
};
