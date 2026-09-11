"use client";

import { useState } from "react";

import { DurationSelect } from "@/registry/new-york/duration-select";

export const DurationSelectDemo = () => {
  const [duration, setDuration] = useState("5");

  return (
    <div className="w-full max-w-sm">
      {/* The heading is the caller's: the control ships none, so the words on screen
          and the words a screen reader hears are written in one place. */}
      <div className="mb-2 font-medium text-muted-foreground text-xs">
        Duration
      </div>
      <DurationSelect
        aria-label="Duration"
        max={15}
        min={1}
        onCommit={setDuration}
        value={duration}
      />
      <p className="mt-3 font-mono text-muted-foreground text-xs">
        committed: {duration}s
      </p>
    </div>
  );
};

/** A tighter range, to show the track reads at any span. */
export const DurationSelectSecondsDemo = () => (
  <div className="w-full max-w-sm">
    <div className="mb-2 font-medium text-muted-foreground text-xs">
      Clip length
    </div>
    <DurationSelect
      aria-label="Clip length"
      max={30}
      min={5}
      // eslint-disable-next-line no-empty-function -- the range is the point; nothing to commit
      onCommit={() => {}}
      step={5}
      value={10}
    />
  </div>
);
