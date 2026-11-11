"use client";

/**
 * The site's copy of the resolution control, at the path the registry publishes it to. Consumers get the
 * file at `@/components/ui/motif/resolution-picker`, and the generation canvas imports it from there,
 * so this is only here to keep that one path resolvable without keeping a second copy of
 * the source.
 */
export { ResolutionPicker } from "@/registry/new-york/resolution-picker";
export type { ResolutionPickerProps } from "@/registry/new-york/resolution-picker";
