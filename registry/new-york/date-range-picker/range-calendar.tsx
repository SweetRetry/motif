"use client";

import { addMonths, isSameDay, subMonths } from "date-fns";
import { useSyncExternalStore } from "react";
import type { ComponentProps } from "react";
import type { DayProps, RootProps } from "react-day-picker";

import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

import { disabledDays } from "./bounds";
import { useDateRangePicker } from "./context";

/* -- The calendar --------------------------------------------------------------
 * The shadcn calendar, dressed as a range: two months with a line between, the days with
 * no gap between rows, and a band that runs behind them. The band is drawn by the day,
 * not the cell, because it has to start at the middle of the first day and stop at the
 * middle of the last — the filled square sits on the band, not at the end of it.
 *
 * The band has no corners of its own. Its two ends are the filled squares, and anywhere
 * else it is a continuation: the row wraps, or the month ends and the range carries on in
 * the other grid. Rounding a wrap would draw a stack of separate pills, each saying the
 * range stops at the edge of the row, with a notch where two of them meet.
 * --------------------------------------------------------------------------- */

/** The day's own look is `RangeDayButton`; the cell only has to hold it. The arrows sit
 *  at the two outer edges of the grid, one pair for both months. */
const CLASS_NAMES = {
  button_next: "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
  button_previous:
    "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
  caption_label: "text-sm font-medium select-none",
  day: "group/day relative h-(--cell-size) w-full p-0 text-center select-none",
  disabled: "text-muted-foreground/40",
  month: "flex w-64 flex-col gap-1 p-3 not-first:border-s",
  month_caption: "flex h-(--cell-size) w-full items-center justify-center",
  months: "relative flex",
  nav: "absolute inset-x-3 top-3 z-10 flex items-center justify-between",
  outside: "text-muted-foreground/60",
  range_end: "",
  range_middle: "",
  range_start: "",
  today: "",
  week: "flex w-full",
  weekday:
    "grid h-7 flex-1 place-items-center text-xs font-normal text-muted-foreground/70 select-none",
};

/** The band behind a day. It starts at the middle of the first day and stops at the middle
 *  of the last, because the filled square sits on the band, not at the end of it. */
const RangeBand = ({ end, start }: { end: boolean; start: boolean }) => (
  <span
    aria-hidden="true"
    className={cn(
      "absolute inset-y-0 bg-accent",
      start ? "left-1/2" : "left-0",
      end ? "right-1/2" : "right-0",
      // An end at the start of a row (or a start at the end of one) has no neighbour
      // for its half to reach. What is left of it past the square is a sliver of
      // band, an ear on the square.
      end && "group-first/day:hidden",
      start && "group-last/day:hidden"
    )}
  />
);

/** The cell around a day. The grid marks a cell as a selected gridcell by the day it holds,
 *  and a neighbouring month's day is not a day of this grid — its real cell is in the other
 *  month — so that cell is only a place where a number sits. */
const RangeDay = ({ day: _day, modifiers, ...props }: DayProps) =>
  modifiers.outside ? (
    <td
      className={props.className}
      data-slot="date-range-picker-outside-day"
      role="presentation"
    >
      {props.children}
    </td>
  ) : (
    <td {...props} />
  );

const RangeDayButton = ({
  children,
  className,
  day,
  modifiers,
  ...props
}: ComponentProps<typeof CalendarDayButton>) => {
  const { anchor } = useDateRangePicker();
  // With two months on screen, the grid pads each month with the days of its neighbours,
  // and those days are on screen twice. Drawn as days they would be selected twice, hovered
  // twice, and a press on the copy would focus the copy. They are only a number, faint:
  // the real day is in its own month.
  if (modifiers.outside) {
    return (
      <span
        aria-hidden="true"
        className="mx-auto grid size-(--cell-size) place-items-center text-sm tabular-nums"
      >
        {children}
      </span>
    );
  }

  const start = Boolean(modifiers.range_start);
  const end = Boolean(modifiers.range_end);
  const edge = start || end;
  // While a range waits for its other end, the end under the pointer is a question, not
  // an answer: drawn as an outline, it says one more press makes it a range.
  const question =
    anchor !== null && edge && !(start && end) && !isSameDay(day.date, anchor);

  return (
    <>
      {modifiers.selected && !(start && end) ? (
        <RangeBand end={end} start={start} />
      ) : null}
      <CalendarDayButton
        className={cn(
          // A day changes its look under the pointer many times a second as the preview
          // follows it, so it changes at once: the button's own `transition-all` would
          // draw every one of those changes as a fade.
          "relative mx-auto aspect-auto size-(--cell-size) w-(--cell-size) min-w-0 text-sm tabular-nums transition-none data-[range-middle=true]:rounded-md data-[range-middle=true]:hover:bg-foreground/10",
          // The grid's own focus ring is a 3px halo that also stays after a press; the
          // ring a key press draws is the button's `focus-visible` one, thinner.
          "group-data-[focused=true]/day:ring-0 focus-visible:ring-2 focus-visible:ring-ring/70",
          modifiers.today && !edge && "ring-1 ring-ring ring-inset",
          // The ghost button's hover fill is translucent and outranks the range fill, so
          // a hovered start would turn grey with the band showing through its half.
          edge &&
            !question &&
            "hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground",
          // The question end is always under the pointer, so it is always hovered: the
          // ghost button's translucent hover fill would let the band behind it show
          // through on one half, and every hover state is restated opaque.
          question &&
            "bg-popover text-foreground ring-1 ring-foreground ring-inset hover:bg-popover hover:text-foreground dark:hover:bg-popover",
          className
        )}
        day={day}
        modifiers={
          question
            ? {
                ...modifiers,
                range_end: false,
                range_start: false,
                selected: false,
              }
            : modifiers
        }
        {...props}
      >
        {children}
      </CalendarDayButton>
    </>
  );
};

/** A phone has room for one month, not two. It is rendered as one rather than hidden with
 *  CSS: the grid picks the day the Tab key lands on from the days it holds, and a day in a
 *  hidden month is a target nobody can reach. */
const NARROW = "(max-width: 639px)";
const subscribeNarrow = (notify: () => void) => {
  const query = window.matchMedia(NARROW);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const useNarrow = () =>
  useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW).matches,
    () => false
  );

/** The shadcn calendar writes its root inline in `components={{ … }}`, so it is a new
 *  component type on every render, and React remounts the whole grid under it. The picker
 *  re-renders on every day the pointer crosses, so it hands in a root of its own. */
const RangeRoot = ({ className, rootRef, ...props }: RootProps) => (
  <div
    className={cn(className)}
    data-slot="calendar"
    ref={rootRef}
    {...props}
  />
);

/** `react-day-picker` treats `selected` as controlled only when it is also given an
 *  `onSelect`. Without one it keeps a selection of its own and reads `selected` once, on
 *  the first render — so a range typed into the field, or drawn by a preview, never
 *  reached the grid. The draft is the selection and `onDayClick` is how it changes, so
 *  this is a receiver that does nothing. */
const ignoreSelect = () => null;

export interface DateRangePickerCalendarProps {
  className?: string;
}

export const DateRangePickerCalendar = ({
  className,
}: DateRangePickerCalendarProps) => {
  const { hover, locale, max, min, month, pick, selected, setMonth } =
    useDateRangePicker();
  const narrow = useNarrow();

  return (
    <Calendar
      className={cn("p-0", className)}
      classNames={CLASS_NAMES}
      components={{ Day: RangeDay, DayButton: RangeDayButton, Root: RangeRoot }}
      disabled={disabledDays({ max, min })}
      endMonth={max}
      fixedWeeks
      locale={locale}
      mode="range"
      // `month` is the first month on show: the one before the range's end. One month
      // on a phone shows the end's own.
      month={narrow ? addMonths(month, 1) : month}
      numberOfMonths={narrow ? 1 : 2}
      onDayClick={pick}
      onDayFocus={hover}
      onDayMouseEnter={hover}
      onDayMouseLeave={() => hover(null)}
      onSelect={ignoreSelect}
      onMonthChange={(next) => setMonth(narrow ? subMonths(next, 1) : next)}
      selected={selected}
      startMonth={min}
    />
  );
};
