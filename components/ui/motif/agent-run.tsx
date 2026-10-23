"use client";

/**
 * The site's copy of the agent run surface, at the path the registry publishes it to.
 * Consumers get the files at `@/components/ui/motif/agent-run`; the installed page imports
 * them from there, so this is only here to keep that one path resolvable without
 * keeping a second copy of the source.
 */
export { AgentRun } from "@/registry/new-york/blocks/agent-run/agent-run";
export type {
  AgentRunProps,
  RunAnswers,
  RunFile,
  RunQuestion,
  RunSource,
  RunStep,
  RunToolStep,
  RunTurn,
  RunUsage,
} from "@/registry/new-york/blocks/agent-run/agent-run";
