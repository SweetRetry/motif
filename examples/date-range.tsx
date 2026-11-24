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
