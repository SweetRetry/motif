"use client";

/**
 * The site's copy of the generation overlay, at the path the registry publishes it to.
 * Consumers get the file at `@/components/ui/motif/generation-overlay`, and the generation
 * canvas imports it from there, so this is only here to keep that one path resolvable
 * without keeping a second copy of the source.
 */
export {
  GenerationOverlay,
  useMediaReveal,
} from "@/registry/new-york/generation-overlay";
export type { GenerationOverlayProps } from "@/registry/new-york/generation-overlay";
