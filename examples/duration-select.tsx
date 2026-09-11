"use client";

import { useState } from "react";

import { DurationSelect } from "@/registry/new-york/duration-select";

export const DurationSelectDemo = () => {
  const [duration, setDuration] = useState("5");

  return (
    <div className="w-full max-w-sm">
      <DurationSelect
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
    <DurationSelect
      label="Clip length"
      max={30}
      min={5}
      // eslint-disable-next-line no-empty-function -- the range is the point; nothing to commit
      onCommit={() => {}}
      step={5}
      value={10}
    />
  </div>
);
