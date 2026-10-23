"use client";

import { useState } from "react";

import { GenerationCanvas } from "@/registry/new-york/blocks/generation-canvas/generation-canvas";
import {
  demoGenerate,
  demoGraph,
} from "@/registry/new-york/blocks/generation-canvas/generation-canvas-demo";

/**
 * The block whole: a prompt and settings feeding an image, that image and a second
 * prompt feeding a video, and a dock to add nodes and run them. It sits in a page that
 * scrolls, so the wheel scrolls the page and the plane zooms on Ctrl or Cmd and the
 * wheel; the full-window route lets the wheel zoom.
 */
export const GenerationCanvasDemo = () => {
  const [initial] = useState(demoGraph);

  return (
    <GenerationCanvas
      className="h-[40rem] w-full overflow-hidden rounded-xl border border-border"
      generate={demoGenerate}
      initial={initial}
      preventScrolling={false}
    />
  );
};
