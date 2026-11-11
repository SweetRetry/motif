"use client";

import { startOfToday } from "date-fns";
import { useEffect, useState } from "react";
import { zhCN } from "react-day-picker/locale";

import {
  DateRange,
  DateRangeCalendar,
  DateRangeConfirm,
  DateRangeContent,
  DateRangeFooter,
  DateRangeShortcuts,
  DateRangeTrigger,
  lastDays,
} from "@/registry/new-york/date-range";
import type { DateRangeValue } from "@/registry/new-york/date-range";

/** The range the demos open on: "today" is the reader's, so it cannot be written down
 *  ahead of time, and computing it while rendering would make the server's day and the
 *  client's differ near midnight. It is set once the page is on the client. */
const useLastWeek = () => {
  const [value, setValue] = useState<DateRangeValue>();
  useEffect(() => {
    setValue(lastDays("7d", "Last 7 days", 7).range(new Date()));
  }, []);

  return [value, setValue] as const;
};

export const DateRangeDemo = () => {
  const [value, setValue] = useLastWeek();

  return (
    // The days after today are drawn but not offered: a report has nothing in them yet.
    <DateRange max={startOfToday()} onValueChange={setValue} value={value}>
      <DateRangeTrigger />
      <DateRangeContent>
        <DateRangeCalendar />
        <DateRangeFooter>
          <DateRangeShortcuts />
          <DateRangeConfirm />
        </DateRangeFooter>
      </DateRangeContent>
    </DateRange>
  );
};

/** The same parts in another language. The locale carries the month and weekday names and
 *  the Monday start; the shortcuts' labels are the caller's, because they are words the
 *  component does not own. */
const PRESETS = [
  lastDays("today", "今天", 1),
  lastDays("7d", "最近 7 天", 7),
  lastDays("30d", "最近 30 天", 30),
];

export const DateRangeChineseDemo = () => {
  const [value, setValue] = useLastWeek();

  return (
    <DateRange
      locale={zhCN}
      max={startOfToday()}
      onValueChange={setValue}
      presets={PRESETS}
      value={value}
    >
      <DateRangeTrigger calendarLabel="打开日历" />
      <DateRangeContent>
        <DateRangeCalendar />
        <DateRangeFooter>
          <DateRangeShortcuts aria-label="快捷选择" />
          <DateRangeConfirm>确定</DateRangeConfirm>
        </DateRangeFooter>
      </DateRangeContent>
    </DateRange>
  );
};

/** Without the shortcuts the panel is a bare range calendar with OK under it. Leaving the
 *  whole footer out is a picker that only Enter in the field can commit. */
export const DateRangeCalendarDemo = () => (
  <DateRange max={startOfToday()}>
    <DateRangeTrigger />
    <DateRangeContent>
      <DateRangeCalendar />
      <DateRangeFooter className="justify-end">
        <DateRangeConfirm />
      </DateRangeFooter>
    </DateRangeContent>
  </DateRange>
);
