"use client";

import { useState } from "react";

import { GenerationCanvas } from "@/registry/new-york/blocks/generation-canvas/generation-canvas";
import {
  DEMO_MODELS,
  DEMO_PROVIDERS,
  demoGenerate,
  demoGraph,
} from "@/registry/new-york/blocks/generation-canvas/generation-canvas-demo";

/**
 * The block whole: two pictures and a clip started from the first, and a composer under the
 * plane that writes to whichever frame is selected. It sits in a page that scrolls, so the
 * wheel scrolls the page and the plane zooms on Ctrl or Cmd and the wheel; the full-window
 * route lets the wheel zoom.
 */
export const GenerationCanvasDemo = () => {
  const [initial] = useState(demoGraph);

  return (
    <GenerationCanvas
      catalogue={{ models: DEMO_MODELS, providers: DEMO_PROVIDERS }}
      className="h-[50rem] w-full overflow-hidden rounded-xl border border-border"
      generate={demoGenerate}
      initial={initial}
      preventScrolling={false}
    />
  );
};
