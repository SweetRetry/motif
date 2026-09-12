"use client";

/**
 * The site's copy of the thinking block, at the path the registry publishes it to.
 * Consumers get the file at `@/components/agents/thinking-block`; the chat block
 * imports it from there, so this is only here to keep that one path resolvable without
 * keeping a second copy of the source.
 */
export { ThinkingBlock } from "@/registry/new-york/agents/thinking-block";
export type { ThinkingBlockProps } from "@/registry/new-york/agents/thinking-block";
