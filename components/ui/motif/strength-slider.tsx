"use client";

/**
 * The site's copy of the strength select, at the path the registry publishes it to. Consumers get the
 * file at `@/components/ui/motif/strength-slider`, and the generation canvas imports it from there,
 * so this is only here to keep that one path resolvable without keeping a second copy of
 * the source.
 */
export { StrengthSlider } from "@/registry/new-york/strength-slider";
export type { StrengthSliderProps } from "@/registry/new-york/strength-slider";
