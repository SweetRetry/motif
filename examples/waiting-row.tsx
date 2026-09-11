"use client";

import { useEffect, useState } from "react";

import { WaitingRow } from "@/registry/new-york/waiting-row";

export const WaitingRowDemo = () => <WaitingRow label="Thinking" />;

/** A clock the demo owns, so every row starts where the demo says it does instead of
 *  where the page happened to hydrate. */
const useDemoClock = (from: number) => {
  const [seconds, setSeconds] = useState(from);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return seconds;
};

/** The same row at three points on the clock, so the read-out can be read in one go
 *  instead of waited for. */
export const WaitingRowClockDemo = () => {
  const seconds = useDemoClock(4);

  return (
    <div className="flex flex-col items-start gap-6">
      <WaitingRow elapsed={seconds} label="Thinking" />
      <WaitingRow elapsed={seconds + 55} label="Thinking" />
      <WaitingRow elapsed={seconds + 539} label="Thinking" />
    </div>
  );
};
