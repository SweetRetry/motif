import type { ReactNode } from "react";
import type { DayPickerLocale } from "react-day-picker";

/** A finished range: both ends are days, and `from` is never after `to`. A half-picked
 *  range is the picker's own state and never reaches `onValueChange`. */
export interface DateRangeValue {
  from: Date;
  to: Date;
}

/** A shortcut: one press chooses a whole range. `range` is handed today's date, so a
 *  preset written as "the last 7 days" is still right the next morning. */
export interface DateRangePreset {
  id: string;
  label: string;
  range: (today: Date) => DateRangeValue;
}

export interface DateRangePickerProps {
  children?: ReactNode;
  defaultOpen?: boolean;
  defaultValue?: DateRangeValue;
  /** A `react-day-picker` locale, e.g. `zhCN` from `react-day-picker/locale`. It sets the
   *  month and weekday names and the first day of the week. The range itself is always
   *  written `yyyy-MM-dd`. Left out, everything is `en-US`. */
  locale?: DayPickerLocale;
  /** The last day that can be picked. Later days are drawn but cannot be chosen. */
  max?: Date;
  /** The first day that can be picked. */
  min?: Date;
  onOpenChange?: (open: boolean) => void;
  onValueChange?: (value: DateRangeValue) => void;
  open?: boolean;
  /** The shortcuts. Pass `[]` for a picker with none. */
  presets?: DateRangePreset[];
  value?: DateRangeValue;
}
