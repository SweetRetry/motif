"use client";

/**
 * The site's copy of the source tag, at the path the registry publishes it to.
 * Consumers get the files at `@/components/ui/motif/source`; the run block imports
 * them from there, so this is only here to keep that one path resolvable without
 * keeping a second copy of the source.
 */
export {
  Source,
  SourceLabel,
  SourceList,
  SourceMark,
  useSource,
} from "@/registry/new-york/agents/source";
export type {
  SourceProps,
  SourceState,
} from "@/registry/new-york/agents/source";
