"use client";

import { useState } from "react";

import { GenerationCanvas } from "@/components/ui/motif/generation-canvas";
import {
  demoGenerate,
  demoGraph,
} from "@/components/ui/motif/generation-canvas-demo";

/* -- The page ------------------------------------------------------------------
 * The whole canvas in one screen: the plane fills the window and the dock floats over
 * it. The only state above the surface is the graph it opens with, and the transport is
 * the demo one. Swap `demoGenerate` for a call to your own backend and the page is a
 * real canvas.
 * --------------------------------------------------------------------------- */

export default function GenerationCanvasPage() {
  const [initial] = useState(demoGraph);

  return (
    <div className="h-dvh">
      <GenerationCanvas generate={demoGenerate} initial={initial} />
    </div>
  );
}
