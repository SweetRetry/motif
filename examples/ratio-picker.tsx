"use client";

import { useState } from "react";

import { RatioPicker } from "@/registry/new-york/ratio-picker";

export const RatioPickerDemo = () => {
  const [ratio, setRatio] = useState("16:9");

  return (
    <div className="w-full max-w-sm">
      <div className="mb-2 font-medium text-muted-foreground text-xs">
        Aspect ratio
      </div>
      <RatioPicker
        aria-label="Aspect ratio"
        onChange={setRatio}
        value={ratio}
      />
      <p className="mt-3 font-mono text-muted-foreground text-xs">
        value: {ratio}
      </p>
    </div>
  );
};

export const RatioPickerAdaptiveDemo = () => (
  <div className="w-full max-w-sm">
    <div className="mb-2 font-medium text-muted-foreground text-xs">Canvas</div>
    <RatioPicker
      aria-label="Canvas"
      options={["1:1", "16:9", "9:16", "adaptive"]}
      // eslint-disable-next-line no-empty-function -- the value is pinned; the demo is the glyphs
      onChange={() => {}}
      value="adaptive"
    />
  </div>
);
