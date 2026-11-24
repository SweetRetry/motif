"use client";

import { useState } from "react";

import { ResolutionPicker } from "@/registry/new-york/resolution-picker";

export const ResolutionPickerDemo = () => {
  const [resolution, setResolution] = useState("2K");

  return (
    <div className="w-full max-w-sm">
      <div className="mb-2 font-medium text-muted-foreground text-xs">
        Resolution
      </div>
      <ResolutionPicker
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

export const ResolutionPickerPairDemo = () => (
  <div className="w-full max-w-sm">
    <div className="mb-2 font-medium text-muted-foreground text-xs">Output</div>
    <ResolutionPicker
      aria-label="Output"
      options={["standard", "high"]}
      // eslint-disable-next-line no-empty-function -- the value is pinned; the demo is the glyphs
      onChange={() => {}}
      value="standard"
    />
  </div>
);
