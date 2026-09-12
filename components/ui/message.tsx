"use client";

/**
 * The site's copy of the message row, at the path the registry publishes it to.
 * Consumers get the file at `@/components/ui/message`; the docs demo it from
 * `registry/new-york`, so this is only here to keep that one path resolvable without
 * keeping a second copy of the source.
 */
export {
  Message,
  MessageActions,
  MessageContent,
} from "@/registry/new-york/message";
export type { MessageFrom, MessageProps } from "@/registry/new-york/message";
