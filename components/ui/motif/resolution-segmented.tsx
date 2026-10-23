"use client";

/**
 * The site's copy of the resolution control, at the path the registry publishes it to. Consumers get the
 * file at `@/components/ui/motif/resolution-segmented`, and the generation canvas imports it from there,
 * so this is only here to keep that one path resolvable without keeping a second copy of
 * the source.
 */
export { ResolutionSegmented } from "@/registry/new-york/resolution-segmented";
export type { ResolutionSegmentedProps } from "@/registry/new-york/resolution-segmented";
