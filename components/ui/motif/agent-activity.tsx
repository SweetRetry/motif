"use client";

/**
 * The site's copy of the agent activity, at the path the registry publishes it to.
 * Consumers get the files at `@/components/ui/motif/agent-activity`; the run block imports
 * them from there, so this is only here to keep that one path resolvable without
 * keeping a second copy of the source.
 */
export {
  AgentActivity,
  AgentActivityContent,
  AgentActivityHeader,
  AgentActivitySummary,
  AgentActivityTitle,
  useAgentActivity,
} from "@/registry/new-york/agents/agent-activity";
export type {
  AgentActivityProps,
  AgentActivityState,
} from "@/registry/new-york/agents/agent-activity";
