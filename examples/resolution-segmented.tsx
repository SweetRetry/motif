"use client";

import { useState } from "react";

import { ResolutionSegmented } from "@/registry/new-york/resolution-segmented";

export const ResolutionSegmentedDemo = () => {
  const [resolution, setResolution] = useState("2K");

  return (
    <div className="w-full max-w-sm">
      {/* The heading is the caller's: the control ships none, so the words on screen
          and the words a screen reader hears are written in one place. */}
      <div className="mb-2 font-medium text-muted-foreground text-xs">
        Resolution
      </div>
      <ResolutionSegmented
        aria-label="Resolution"
        onChange={setResolution}
        value={resolution}
      />
      <p className="mt-3 font-mono text-muted-foreground text-xs">
        value: {resolution}
      </p>
    </div>
  );
};

/** Two stops skip the middle tier, and the glyphs fall back to the endpoints. */
export const ResolutionSegmentedPairDemo = () => (
  <div className="w-full max-w-sm">
    <div className="mb-2 font-medium text-muted-foreground text-xs">Output</div>
    <ResolutionSegmented
      aria-label="Output"
      options={["standard", "high"]}
      // eslint-disable-next-line no-empty-function -- the value is pinned; the demo is the glyphs
      onChange={() => {}}
      value="standard"
    />
  </div>
);
