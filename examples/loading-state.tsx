"use client";

import { useEffect, useState } from "react";

import { LoadingState } from "@/registry/new-york/loading-state";

export const LoadingStateDemo = () => <LoadingState label="Thinking" />;

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
export const LoadingStateClockDemo = () => {
  const seconds = useDemoClock(4);

  return (
    <div className="flex flex-col items-start gap-6">
      <LoadingState elapsed={seconds} label="Thinking" />
      <LoadingState elapsed={seconds + 55} label="Thinking" />
      <LoadingState elapsed={seconds + 539} label="Thinking" />
    </div>
  );
};
