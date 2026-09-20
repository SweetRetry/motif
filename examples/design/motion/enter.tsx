"use client";

import { useState } from "react";

import { DesignCase } from "@/components/design-case";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The same panel entering twice. A long ease-in starts slow and reads as the
 * interface thinking about it, and growing from nothing makes the arrival a zoom
 * rather than a nudge.
 */
const Panel = ({ className, run }: { className: string; run: number }) => (
  <div
    key={run}
    className={cn(
      "bg-popover text-popover-foreground animate-in fade-in-0 flex h-24 w-40 origin-top items-center justify-center rounded-lg border text-xs shadow-md",
      className
    )}
  >
    Menu
  </div>
);

export const EnterMotionDemo = () => {
  const [run, setRun] = useState(0);

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex items-start gap-16">
        <DesignCase note="700ms · ease-in · from 0" verdict="wrong">
          <Panel className="zoom-in-0 duration-700 ease-in" run={run} />
        </DesignCase>
        <DesignCase note="150ms · ease-out · from 95%" verdict="right">
          <Panel className="zoom-in-95 duration-150 ease-out" run={run} />
        </DesignCase>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setRun((current) => current + 1)}
      >
        Replay
      </Button>
    </div>
  );
};
