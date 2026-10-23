"use client";

/**
 * The site's copy of the tool call row, at the path the registry publishes it to.
 * Consumers get the files at `@/components/ui/motif/tool-call`; the run block imports
 * them from there, so this is only here to keep that one path resolvable without
 * keeping a second copy of the source.
 */
export {
  ToolCall,
  ToolCallContent,
  ToolCallHeader,
  ToolCallName,
  ToolCallSection,
  ToolCallStatus,
  ToolCallSummary,
  useToolCall,
} from "@/registry/new-york/agents/tool-call";
export type {
  ToolCallProps,
  ToolCallState,
  ToolCallStatusValue,
} from "@/registry/new-york/agents/tool-call";
