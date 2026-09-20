"use client";

import { useEffect, useState } from "react";

import { DesignCase } from "@/components/design-case";
import { cn } from "@/lib/utils";

/** Readings whose digits differ in width, so the figure set is the only thing
 *  changing on screen. */
const READINGS = ["1,111", "9,999", "1,717", "4,040"];

const useTicker = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % READINGS.length),
      1100
    );
    return () => window.clearInterval(timer);
  }, []);

  return READINGS[index];
};

const Readout = ({ tabular, value }: { tabular?: boolean; value: string }) => (
  <span
    className={cn(
      "bg-muted inline-block rounded-md px-3 py-1.5 text-sm font-medium",
      tabular && "tabular-nums"
    )}
  >
    {value}
  </span>
);

export const TabularNumbersDemo = () => {
  const value = useTicker();

  return (
    <div className="flex items-start gap-12">
      <DesignCase note="Proportional" verdict="wrong">
        <Readout value={value} />
      </DesignCase>
      <DesignCase note="tabular-nums" verdict="right">
        <Readout tabular value={value} />
      </DesignCase>
    </div>
  );
};
