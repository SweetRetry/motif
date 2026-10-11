"use client";

import { createContext, useContext } from "react";
import type { RefObject } from "react";
import type { DateRange, DayPickerLocale } from "react-day-picker";

import type { DateRangePreset, DateRangeValue } from "./types";

/**
 * What a part needs from the root. The calendar, the shortcuts and the typed field are
 * three ways of making one range, so none of them can hold its own half of it: the root
 * keeps the draft, the pending first day, the text, and the month the calendar shows.
 */
export interface DateRangePickerState {
  /** The shortcut the draft equals, if any. */
  activePresetId: string | undefined;
  /** The first day of a range that is still waiting for its other end. */
  anchor: Date | null;
  /** The draft is a finished range, and the text, if typed, is one too. */
  canConfirm: boolean;
  /** Commit a range and close. A shortcut does this in one press. */
  choose: (range: DateRangeValue) => void;
  /** Commit the draft and close. */
  confirm: () => void;
  /** This picker's field. The panel asks it, not the page, whether a press or the focus
   *  is the picker's own: another picker's field is outside this one. */
  fieldRef: RefObject<HTMLDivElement | null>;
  /** The text in the field: what was typed, or the draft written out. */
  text: string;
  /** Typed text that is not a range, once the person has left the field or pressed
   *  Enter. While they are still typing it is not a fault yet. */
  invalid: boolean;
  /** The day the pointer or the keyboard is on while a range is pending. */
  hover: (day: Date | null) => void;
  locale?: DayPickerLocale;
  max?: Date;
  min?: Date;
  month: Date;
  open: boolean;
  /** A day was pressed: the first press starts a range, the second finishes it. */
  pick: (day: Date) => void;
  presets: DateRangePreset[];
  /** What the calendar draws: the pending pick, or the draft. */
  selected: DateRange | undefined;
  setMonth: (month: Date) => void;
  setOpen: (open: boolean) => void;
  /** The person left the field, or pressed Enter in it: say so if it is not a range. */
  settle: () => void;
  /** Enter in the field: commit if the text is a range, flag it if not. */
  submit: () => void;
  /** The text changed. A whole range moves the calendar to it. */
  type: (text: string) => void;
  /** The committed range. */
  value?: DateRangeValue;
}

export const DateRangePickerContext =
  createContext<DateRangePickerState | null>(null);

export const useDateRangePicker = () => {
  const context = useContext(DateRangePickerContext);
  if (!context) {
    throw new Error(
      "DateRangePicker parts must be used within a DateRangePicker."
    );
  }

  return context;
};
