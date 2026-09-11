"use client";

/**
 * The site's copy of the loading row, at the path the registry publishes it to. Consumers
 * get the file at `@/components/ui/waiting-row`; the docs demo it from
 * `registry/new-york`, so this is only here to keep that one path resolvable without
 * keeping a second copy of the source.
 */
export {
  LoadingGrid,
  WaitingRow,
  ShimmerText,
  formatDuration,
} from "@/registry/new-york/waiting-row";
export type {
  LoadingGridProps,
  WaitingRowProps,
  ShimmerTextProps,
} from "@/registry/new-york/waiting-row";
