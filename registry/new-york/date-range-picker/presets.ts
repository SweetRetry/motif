import { startOfDay, subDays } from "date-fns";

import type { DateRangePreset } from "./types";

/** The `days` days ending today, today included: `lastDays("7d", "Last 7 days", 7)` on a
 *  Sunday runs from the Monday before to that Sunday. */
export const lastDays = (
  id: string,
  label: string,
  days: number
): DateRangePreset => ({
  id,
  label,
  range: (today) => ({
    from: subDays(startOfDay(today), days - 1),
    to: startOfDay(today),
  }),
});

export const defaultDateRangePresets: DateRangePreset[] = [
  lastDays("today", "Today", 1),
  lastDays("7d", "Last 7 days", 7),
  lastDays("30d", "Last 30 days", 30),
];
