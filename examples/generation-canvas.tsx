"use client";

import { useState } from "react";

import { GenerationCanvas } from "@/registry/new-york/blocks/generation-canvas/generation-canvas";
import {
  DEMO_MODELS,
  DEMO_PROVIDERS,
  demoGenerate,
  demoGraph,
} from "@/registry/new-york/blocks/generation-canvas/generation-canvas-demo";

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
