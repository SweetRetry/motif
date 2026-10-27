"use client";

import { useState } from "react";

import { GenerationCanvas } from "@/components/ui/motif/generation-canvas";
import {
  DEMO_MODELS,
  DEMO_PROVIDERS,
  demoGenerate,
  demoGraph,
} from "@/components/ui/motif/generation-canvas-demo";

/* -- The page ------------------------------------------------------------------
 * The whole canvas in one screen: the plane fills the window and the composer floats over
 * it. The only state above the surface is the graph it opens with, and the transport is
 * the demo one. Swap `demoGenerate` for a call to your own backend and the page is a
 * real canvas.
 * --------------------------------------------------------------------------- */

export default function GenerationCanvasPage() {
  const [initial] = useState(demoGraph);

  return (
    <div className="h-dvh">
      <GenerationCanvas
        catalogue={{ models: DEMO_MODELS, providers: DEMO_PROVIDERS }}
        generate={demoGenerate}
        initial={initial}
      />
    </div>
  );
}
