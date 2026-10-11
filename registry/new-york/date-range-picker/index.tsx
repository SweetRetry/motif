"use client";

import { isSameDay, startOfDay, startOfMonth, subMonths } from "date-fns";
import { useRef, useState } from "react";

import { Popover } from "@/components/ui/popover";

import { DateRangePickerContext } from "./context";
import type { DateRangePickerState } from "./context";
import { formatDay, formatRange, parseRange } from "./format";
import { defaultDateRangePresets } from "./presets";
import type {
  DateRangePickerProps,
  DateRangePreset,
  DateRangeValue,
} from "./types";

export {
  DateRangePickerConfirm,
  DateRangePickerContent,
  DateRangePickerFooter,
  DateRangePickerShortcuts,
  DateRangePickerTrigger,
} from "./parts";
export type {
  DateRangePickerConfirmProps,
  DateRangePickerContentProps,
  DateRangePickerFooterProps,
  DateRangePickerShortcutsProps,
  DateRangePickerTriggerProps,
} from "./parts";
export { DateRangePickerCalendar } from "./range-calendar";
export type { DateRangePickerCalendarProps } from "./range-calendar";
export { useDateRangePicker } from "./context";
export type { DateRangePickerState } from "./context";
export { defaultDateRangePresets, lastDays } from "./presets";
export type {
  DateRangePickerProps,
  DateRangePreset,
  DateRangeValue,
} from "./types";

const orderRange = (a: Date, b: Date): DateRangeValue =>
  a <= b ? { from: a, to: b } : { from: b, to: a };

const sameRange = (a: DateRangeValue, b: DateRangeValue) =>
  isSameDay(a.from, b.from) && isSameDay(a.to, b.to);

/** The shortcut the draft equals — and none while a first day is waiting, because then
 *  there is no draft yet, only the start of one. */
const activePreset = (
  presets: DateRangePreset[],
  draft: DateRangeValue | null,
  anchor: Date | null
) => {
  if (!draft || anchor) {
    return;
  }

  const today = new Date();
  return presets.find((preset) => sameRange(preset.range(today), draft))?.id;
};

/** Closed, the field says the value. Open, it says the draft, and a first day waits for
 *  its partner with a dangling separator. */
const fieldText = ({
  anchor,
  current,
  draft,
  isOpen,
}: {
  anchor: Date | null;
  current: DateRangeValue | undefined;
  draft: DateRangeValue | null;
  isOpen: boolean;
}) => {
  if (!isOpen) {
    return formatRange(current);
  }

  return anchor ? `${formatDay(anchor)} ~ ` : formatRange(draft);
};

/** The calendar draws two months, and the range ends in the second: the end is the part
 *  a person is changing most, and the month it sits in is the one they need to see. */
const monthFor = (end?: Date) => startOfMonth(subMonths(end ?? new Date(), 1));

/* -- The picker ----------------------------------------------------------------
 * A date range is made one of three ways: by name ("the last 7 days"), by drawing it on
 * a calendar, or by typing it. They do not compete — they are one range, edited from
 * three places — so they share one draft, and the field, the calendar and the shortcuts
 * all read it.
 *
 * Two of them end the moment they are done. A shortcut commits in one press, because a
 * name is already a whole range. Drawing and typing are different: the second day and
 * the last typed digit are not "done", only complete, so those two end with OK.
 *
 * The root owns the state and draws nothing but the popover. The field, the panel, the
 * calendar, the shortcuts and OK are parts, and a caller assembles them. Leaving out the
 * shortcuts is a bare range calendar; leaving out OK is a picker that commits only
 * through a shortcut or Enter.
 *
 * `react-day-picker` owns the grid, the arrow keys and the labels, because a calendar is
 * a solved problem. What is this component's idea is the shared draft, and the order of
 * the two presses with a preview between them.
 * --------------------------------------------------------------------------- */

export const DateRangePicker = ({
  children,
  defaultOpen = false,
  defaultValue,
  locale,
  max,
  min,
  onOpenChange,
  onValueChange,
  open,
  presets = defaultDateRangePresets,
  value,
}: DateRangePickerProps) => {
  const [ownValue, setOwnValue] = useState(defaultValue);
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  /** The range being made. It starts as the value, and only OK or a shortcut turns it
   *  back into one. */
  const [draft, setDraft] = useState<DateRangeValue | null>(null);
  const [anchor, setAnchor] = useState<Date | null>(null);
  const [hovered, setHovered] = useState<Date | null>(null);
  const [typed, setTyped] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const current = value === undefined ? ownValue : value;
  const isOpen = open ?? ownOpen;
  const [month, setMonth] = useState(() => monthFor(current?.to));

  // Each time the panel opens or closes, the draft starts over from the value. Held in
  // state rather than an effect, so the first frame of an open panel is already right.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    setDraft(isOpen ? (current ?? null) : null);
    setAnchor(null);
    setHovered(null);
    setTyped(null);
    setInvalid(false);
    setMonth(monthFor(current?.to));
  }

  const setOpen = (next: boolean) => {
    if (open === undefined) {
      setOwnOpen(next);
    }
    onOpenChange?.(next);
  };

  const choose = (range: DateRangeValue) => {
    const next = { from: startOfDay(range.from), to: startOfDay(range.to) };
    if (value === undefined) {
      setOwnValue(next);
    }
    onValueChange?.(next);
    setOpen(false);
  };

  const typedRange = typed === null ? null : parseRange(typed, { max, min });
  // Empty text is a cleared field, not a mistake: it just has no range to confirm.
  const typedWrong = typed !== null && typed.trim() !== "" && !typedRange;
  const canConfirm = Boolean(draft) && !anchor && !typedWrong;

  const confirm = () => {
    if (draft && canConfirm) {
      choose(draft);
    }
  };

  const pick = (day: Date) => {
    const picked = startOfDay(day);
    setTyped(null);
    setInvalid(false);
    if (anchor) {
      setDraft(orderRange(anchor, picked));
      setAnchor(null);
      setHovered(null);
      return;
    }

    setAnchor(picked);
    setHovered(picked);
  };

  const type = (text: string) => {
    setTyped(text);
    setInvalid(false);
    const range = parseRange(text, { max, min });
    if (range) {
      setDraft(range);
      setAnchor(null);
      setHovered(null);
      setMonth(monthFor(range.to));
    } else if (text.trim() === "") {
      setDraft(null);
      setAnchor(null);
      setHovered(null);
    }
  };

  const settle = () => {
    if (typedWrong) {
      setInvalid(true);
    }
  };

  const submit = () => {
    if (typedWrong) {
      setInvalid(true);
      return;
    }

    confirm();
  };

  // Same day, same state: `onDayFocus` and `onDayMouseEnter` both fire for a day that is
  // already hovered, and a fresh `Date` for it would re-render the calendar every time.
  const hover = (day: Date | null) =>
    setHovered((previous) => {
      const next = day && startOfDay(day);
      return previous && next && isSameDay(previous, next) ? previous : next;
    });

  const shown = anchor
    ? orderRange(anchor, hovered ?? anchor)
    : (draft ?? undefined);

  const state: DateRangePickerState = {
    activePresetId: activePreset(presets, draft, anchor),
    anchor,
    canConfirm,
    choose,
    confirm,
    fieldRef,
    hover,
    invalid,
    locale,
    max,
    min,
    month,
    open: isOpen,
    pick,
    presets,
    selected: shown,
    setMonth,
    setOpen,
    settle,
    submit,
    text: typed ?? fieldText({ anchor, current, draft, isOpen }),
    type,
    value: current,
  };

  return (
    <DateRangePickerContext.Provider value={state}>
      <Popover onOpenChange={setOpen} open={isOpen}>
        {children}
      </Popover>
    </DateRangePickerContext.Provider>
  );
};
