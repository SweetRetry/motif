import { startOfDay } from "date-fns";
import type { Matcher } from "react-day-picker";

import type { DateRangeValue } from "./types";

interface Bounds {
  max?: Date;
  min?: Date;
}

/** The days the calendar refuses, as `react-day-picker` matchers: before `min`, after
 *  `max`. `withinBounds` below asks the same question of a whole range. */
export const disabledDays = ({ max, min }: Bounds): Matcher[] => [
  ...(min ? [{ before: startOfDay(min) }] : []),
  ...(max ? [{ after: startOfDay(max) }] : []),
];

/** Whether every day of the range is one the calendar lets a person pick. The typed field
 *  and the shortcuts both ask it, so a range cannot get in by a route the grid refuses. */
export const withinBounds = (range: DateRangeValue, { max, min }: Bounds) =>
  !(
    (min && range.from < startOfDay(min)) ||
    (max && range.to > startOfDay(max))
  );
