"use client";

/**
 * The site's copy of the generation canvas, at the path the registry publishes it to. Consumers get the
 * file at `@/components/ui/motif/generation-canvas`, and the generation canvas imports it from there,
 * so this is only here to keep that one path resolvable without keeping a second copy of
 * the source.
 */
export { GenerationCanvas } from "@/registry/new-york/blocks/generation-canvas/generation-canvas";
export type { GenerationCanvasProps } from "@/registry/new-york/blocks/generation-canvas/generation-canvas";
