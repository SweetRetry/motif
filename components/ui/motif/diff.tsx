"use client";

/**
 * The site's copy of the diff, at the path the registry publishes it to. Consumers get
 * the file at `@/components/ui/motif/diff`; the run block imports it from there, so this
 * is only here to keep that one path resolvable without keeping a second copy of the
 * source.
 */
export {
  Diff,
  DiffContent,
  DiffFile,
  DiffHeader,
  DiffStat,
  compareTexts,
  parsePatch,
  useDiff,
} from "@/registry/new-york/agents/diff";
export type {
  DiffContentProps,
  DiffFileProps,
  DiffHeaderProps,
  DiffLine,
  DiffLineKind,
  DiffProps,
  DiffSegment,
  DiffSource,
  DiffState,
  DiffStatProps,
} from "@/registry/new-york/agents/diff";
