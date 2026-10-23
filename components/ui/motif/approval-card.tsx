"use client";

/**
 * The site's copy of the approval card, at the path the registry publishes it to.
 * Consumers get the file at `@/components/ui/motif/approval-card`; the run block
 * imports it from there, so this is only here to keep that one path resolvable
 * without keeping a second copy of the source.
 */
export { ApprovalCard } from "@/registry/new-york/agents/approval-card";
export type { ApprovalCardProps } from "@/registry/new-york/agents/approval-card";
