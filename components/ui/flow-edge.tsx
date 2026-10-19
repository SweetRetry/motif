"use client";

/**
 * The site's copy of the flow edge, at the path the registry publishes it to. Consumers
 * get the file at `@/components/ui/flow-edge`, and the generation canvas imports it from
 * there, so this is only here to keep that one path resolvable without keeping a second
 * copy of the source.
 */
export { FlowEdge } from "@/registry/new-york/flow-edge";
export type { FlowEdgeProps } from "@/registry/new-york/flow-edge";
