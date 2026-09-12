"use client";

/**
 * The site's copy of the chat transport, at the path the registry publishes it to.
 * Consumers get the files at `@/components/chat/use-demo-chat`; the installed page
 * imports it from there, so this is only here to keep that one path resolvable without
 * keeping a second copy of the source.
 */
export {
  DEMO_MODELS,
  useDemoChat,
} from "@/registry/new-york/blocks/chat-app/use-demo-chat";
export type { DemoChat } from "@/registry/new-york/blocks/chat-app/use-demo-chat";
