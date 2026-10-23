"use client";

/**
 * The site's copy of the strength select, at the path the registry publishes it to. Consumers get the
 * file at `@/components/ui/motif/strength-select`, and the generation canvas imports it from there,
 * so this is only here to keep that one path resolvable without keeping a second copy of
 * the source.
 */
export { StrengthSelect } from "@/registry/new-york/strength-select";
export type { StrengthSelectProps } from "@/registry/new-york/strength-select";
