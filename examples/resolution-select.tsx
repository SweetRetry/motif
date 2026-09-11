"use client";

import { useState } from "react";

import { ResolutionSelect } from "@/registry/new-york/resolution-select";

export const ResolutionSelectDemo = () => {
  const [resolution, setResolution] = useState("2K");

  return (
    <div className="w-full max-w-sm">
      <ResolutionSelect value={resolution} onChange={setResolution} />
      <p className="mt-3 font-mono text-muted-foreground text-xs">
        value: {resolution}
      </p>
    </div>
  );
};

/** Two stops skip the middle tier, and the glyphs fall back to the endpoints. */
export const ResolutionSelectPairDemo = () => (
  <div className="w-full max-w-sm">
    <ResolutionSelect
      label="Output"
      options={["standard", "high"]}
      // eslint-disable-next-line no-empty-function -- the value is pinned; the demo is the glyphs
      onChange={() => {}}
      value="standard"
    />
  </div>
);
