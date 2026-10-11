import { format, isValid, parse } from "date-fns";

import { withinBounds } from "./bounds";
import type { DateRangeValue } from "./types";

/** The one way a range is written, in the trigger and in what a person can type. It is
 *  ISO order and not the locale's, so the text means the same thing everywhere and the
 *  server and the client write the same string. */
const DAY = "yyyy-MM-dd";
const SEPARATOR = "~";
const RANGE = /^\s*(\d{4}-\d{2}-\d{2})\s*[~–—]\s*(\d{4}-\d{2}-\d{2})\s*$/;

export const formatDay = (day: Date) => format(day, DAY);

export const formatRange = (range: DateRangeValue | null | undefined) =>
  range ? `${formatDay(range.from)} ${SEPARATOR} ${formatDay(range.to)}` : "";

/** What a person typed, as a range — or `null` when it is not one the picker would
 *  accept: not that shape, not a real day (`2026-02-31`), backwards, or outside the
 *  bounds the calendar would refuse. */
export const parseRange = (
  text: string,
  { max, min }: { max?: Date; min?: Date }
): DateRangeValue | null => {
  const match = RANGE.exec(text);
  if (!match) {
    return null;
  }

  const from = parse(match[1], DAY, new Date());
  const to = parse(match[2], DAY, new Date());
  if (!(isValid(from) && isValid(to)) || from > to) {
    return null;
  }

  const range = { from, to };
  return withinBounds(range, { max, min }) ? range : null;
};
