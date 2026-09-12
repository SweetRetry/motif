"use client";

/**
 * The site's copy of the chat surface, at the path the registry publishes it to.
 * Consumers get the files at `@/components/chat/chat-app`; the installed page imports
 * them from there, so this is only here to keep that one path resolvable without
 * keeping a second copy of the source.
 */
export { ChatApp } from "@/registry/new-york/blocks/chat-app/chat-app";
export type {
  ChatAppProps,
  ChatFile,
  ChatTurn,
} from "@/registry/new-york/blocks/chat-app/chat-app";
