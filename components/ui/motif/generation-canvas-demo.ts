"use client";

/**
 * The site's copy of the canvas demo transport, at the path the registry publishes it
 * to. Consumers get the file at `@/components/ui/motif/generation-canvas-demo`; the
 * installed page imports it from there, so this is only here to keep that one path
 * resolvable without keeping a second copy of the source.
 */
export {
  artFor,
  DEMO_CLIP,
  demoGenerate,
  demoGraph,
} from "@/registry/new-york/blocks/generation-canvas/generation-canvas-demo";
