"use client";

import { startOfToday } from "date-fns";
import { useEffect, useState } from "react";
import { zhCN } from "react-day-picker/locale";

import {
  DateRangePicker,
  DateRangePickerCalendar,
  DateRangePickerConfirm,
  DateRangePickerContent,
  DateRangePickerFooter,
  DateRangePickerShortcuts,
  DateRangePickerTrigger,
  lastDays,
} from "@/registry/new-york/date-range-picker";
import type { DateRangeValue } from "@/registry/new-york/date-range-picker";

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

export const DateRangePickerDemo = () => {
  const [value, setValue] = useLastWeek();

  return (
    // The days after today are drawn but not offered: a report has nothing in them yet.
    <DateRangePicker
      max={startOfToday()}
      onValueChange={setValue}
      value={value}
    >
      <DateRangePickerTrigger />
      <DateRangePickerContent>
        <DateRangePickerCalendar />
        <DateRangePickerFooter>
          <DateRangePickerShortcuts />
          <DateRangePickerConfirm />
        </DateRangePickerFooter>
      </DateRangePickerContent>
    </DateRangePicker>
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

export const DateRangePickerChineseDemo = () => {
  const [value, setValue] = useLastWeek();

  return (
    <DateRangePicker
      locale={zhCN}
      max={startOfToday()}
      onValueChange={setValue}
      presets={PRESETS}
      value={value}
    >
      <DateRangePickerTrigger calendarLabel="打开日历" />
      <DateRangePickerContent>
        <DateRangePickerCalendar />
        <DateRangePickerFooter>
          <DateRangePickerShortcuts aria-label="快捷选择" />
          <DateRangePickerConfirm>确定</DateRangePickerConfirm>
        </DateRangePickerFooter>
      </DateRangePickerContent>
    </DateRangePicker>
  );
};

/** Without the shortcuts the panel is a bare range calendar with OK under it. Leaving the
 *  whole footer out is a picker that only Enter in the field can commit. */
export const DateRangePickerCalendarDemo = () => (
  <DateRangePicker max={startOfToday()}>
    <DateRangePickerTrigger />
    <DateRangePickerContent>
      <DateRangePickerCalendar />
      <DateRangePickerFooter className="justify-end">
        <DateRangePickerConfirm />
      </DateRangePickerFooter>
    </DateRangePickerContent>
  </DateRangePicker>
);
