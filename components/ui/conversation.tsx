"use client";

/**
 * The site's copy of the conversation frame, at the path the registry publishes it to.
 * Consumers get the file at `@/components/ui/conversation`; the docs demo it from
 * `registry/new-york`, so this is only here to keep that one path resolvable without
 * keeping a second copy of the source.
 */
export {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  useConversation,
} from "@/registry/new-york/conversation";
export type {
  ConversationContentProps,
  ConversationProps,
} from "@/registry/new-york/conversation";
