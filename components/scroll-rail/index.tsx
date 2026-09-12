"use client";

/**
 * The site's copy of the scroll rail, at the path the registry publishes it to.
 * Consumers get the files at `@/components/scroll-rail`; the chat block imports them
 * from there, so this is only here to keep that one path resolvable without keeping a
 * second copy of the source.
 */
export { ScrollRail, ScrollRailPreview } from "@/registry/new-york/scroll-rail";
export type {
  ScrollRailFocus,
  ScrollRailItem,
  ScrollRailPreviewProps,
  ScrollRailProps,
} from "@/registry/new-york/scroll-rail";
