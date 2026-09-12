"use client";

import { createContext, useContext } from "react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/* -- One turn ------------------------------------------------------------------
 * A message is three decisions, and each one is a part: who it is from, the body, and
 * what you can do with the body after reading it. The root's only opinion is the
 * arrangement — a turn from the reader sits against the trailing edge in a filled
 * bubble, a turn to them runs full width on the page's own surface, a system note sits
 * centred and recedes — and it carries that opinion as `data-from` so a caller can
 * restyle a role the registry has not met yet.
 *
 * Alignment is the root's; the shape of the body is the content's. A bubble is a fill
 * *inside* the thread (`muted`), never a surface of its own, so it lands the same way
 * on a page-level thread in either theme.
 *
 * The actions part is revealed on hover and on focus — deliberately, and in CSS. A
 * reader is reading until they are not, and four controls under every answer is four
 * controls of noise; but a tap that reveals them is the right touch gesture, unlike
 * the magnetic pulls elsewhere in this registry, so a sticky `:hover` is a feature
 * here rather than the bug `useHoverCapable` exists to prevent. Nothing is tabbable
 * while it is invisible either: `focus-within` brings the row back the moment a
 * keyboard reaches it.
 * --------------------------------------------------------------------------- */

export type MessageFrom = "assistant" | "system" | "user";

const MessageContext = createContext<MessageFrom | null>(null);

const useMessageFrom = () => {
  const from = useContext(MessageContext);
  if (!from) {
    throw new Error("Message parts must be used within a Message.");
  }

  return from;
};

export interface MessageProps extends ComponentProps<"article"> {
  /** Whose turn it is. Drives the arrangement and the body's shape. */
  from: MessageFrom;
}

export const Message = ({ className, from, ...props }: MessageProps) => (
  <MessageContext.Provider value={from}>
    <article
      className={cn(
        "group/message flex w-full",
        from === "user" && "flex-row-reverse",
        from === "system" && "justify-center",
        className
      )}
      data-from={from}
      data-slot="message"
      {...props}
    />
  </MessageContext.Provider>
);

/**
 * The body. It is a column, so a caller can stack a reasoning block, the answer, and
 * the actions row in the order the answer was written, and it takes its shape from
 * the turn's role: a reader's bubble against the trailing edge, a full-width answer,
 * or a centred system note.
 */
export const MessageContent = ({
  className,
  ...props
}: ComponentProps<"div">) => {
  const from = useMessageFrom();

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1.5 text-sm leading-relaxed",
        from === "user" &&
          "max-w-[85%] rounded-3xl bg-muted px-4 py-2.5 whitespace-pre-wrap break-words",
        from === "assistant" && "flex-1",
        from === "system" && "max-w-[85%] text-center text-muted-foreground",
        className
      )}
      data-slot="message-content"
      {...props}
    />
  );
};

/**
 * The row under the body: copy, retry, a vote, whatever the surface knows how to do
 * with an answer that has already landed. It is an ordinary flex row — the controls
 * that go in it are the platform's — and it draws nothing while it holds nothing.
 *
 * On a device with a fine pointer it stays out of the way until the turn is hovered
 * or something inside it is focused.
 */
export const MessageActions = ({
  className,
  ...props
}: ComponentProps<"div">) => (
  <div
    className={cn(
      "flex items-center gap-0.5 empty:hidden",
      "pointer-events-none opacity-0 transition-opacity duration-150 ease-out",
      "group-hover/message:pointer-events-auto group-hover/message:opacity-100",
      "group-focus-within/message:pointer-events-auto group-focus-within/message:opacity-100",
      "motion-reduce:transition-none",
      className
    )}
    data-slot="message-actions"
    {...props}
  />
);
