"use client";

import { useState } from "react";

import { AspectRatioPicker } from "@/registry/new-york/aspect-ratio-picker";

export const AspectRatioPickerDemo = () => {
  const [ratio, setRatio] = useState("16:9");

  return (
    <div className="w-full max-w-sm">
      {/* The heading is the caller's: the control ships none, so the words on screen
          and the words a screen reader hears are written in one place. */}
      <div className="mb-2 font-medium text-muted-foreground text-xs">
        Aspect ratio
      </div>
      <AspectRatioPicker
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

/** The glyphs on their own, to show the fixed window the shapes are drawn in. */
export const AspectRatioPickerAdaptiveDemo = () => (
  <div className="w-full max-w-sm">
    <div className="mb-2 font-medium text-muted-foreground text-xs">Canvas</div>
    <AspectRatioPicker
      aria-label="Canvas"
      options={["1:1", "16:9", "9:16", "adaptive"]}
      // eslint-disable-next-line no-empty-function -- the value is pinned; the demo is the glyphs
      onChange={() => {}}
      value="adaptive"
    />
  </div>
);
