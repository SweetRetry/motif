import { CornerDownRight, CornerUpLeft, X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Children } from "react";

import { cn } from "@/lib/utils";

/* -- Messages waiting for their turn -------------------------------------------
 * While the agent is running, the user keeps typing. What they send does not interrupt
 * the run, it waits, and until the agent picks it up it is still theirs. The agent takes
 * the queue in order, when its running tool calls finish or the turn ends. Two things can
 * be done with a message before then: take it back, or send it now and not wait for that.
 * Sending now can interrupt the work in flight, which is why it is the host's call and
 * the part only reports the press. A queue says what is waiting, in what order, and
 * offers those two.
 *
 * It has no state to own. The list is the caller's, so the root is a frame and the parts
 * are rows; there is no context for a part to read, and a caller can put a part of their
 * own in a row without it. The order is the order of the children, because that is the
 * order the agent will take them in.
 * --------------------------------------------------------------------------- */

export type QueueProps = ComponentProps<"div">;
export type QueueHeaderProps = ComponentProps<"div">;
export type QueueListProps = ComponentProps<"ol">;
export type QueueItemProps = ComponentProps<"li">;
export type QueueItemMarkerProps = ComponentProps<"span">;
export type QueueItemTextProps = ComponentProps<"span">;
export type QueueItemRemoveProps = Omit<ComponentProps<"button">, "children">;
export type QueueItemSendNowProps = ComponentProps<"button">;

/** Nothing to draw: the shapes a conditional leaves behind. A slot with nothing in it
 *  draws nothing, and an empty string is one of those. */
const isEmpty = (children: ReactNode) =>
  children === null ||
  children === undefined ||
  children === false ||
  children === "";

/**
 * The frame: an in-place container, so it is a card with a border, and it draws nothing
 * at all while there is nothing in it. A queue is something that appears when a message
 * is waiting, not a box that sits empty above the composer.
 */
export const Queue = ({ children, className, ...props }: QueueProps) => {
  if (Children.toArray(children).length === 0) {
    return null;
  }

  return (
    <div
      {...props}
      className={cn(
        "flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground",
        className
      )}
      data-slot="queue"
    >
      {children}
    </div>
  );
};

/** What the queue is, and how many: `2 queued`. The caller writes the words, because the
 *  count is theirs. */
export const QueueHeader = ({
  children,
  className,
  ...props
}: QueueHeaderProps) => {
  if (isEmpty(children)) {
    return null;
  }

  return (
    <div
      {...props}
      className={cn("px-3 pt-2 text-muted-foreground text-xs", className)}
      data-slot="queue-header"
    >
      {children}
    </div>
  );
};

/** The rows, in the order the agent will take them. An ordered list, so a screen reader
 *  hears the position as well as the text. No rules between rows: the frame is the one
 *  line, and the rows are told apart by the space between them. */
export const QueueList = ({ className, ...props }: QueueListProps) => (
  <ol
    {...props}
    className={cn("flex flex-col p-1", className)}
    data-slot="queue-list"
  />
);

/**
 * One waiting message. Its actions are hidden until the pointer or the keyboard is on
 * the row, so a queue of three reads as three messages and not as three toolbars; on a
 * touch screen they are always there, because there is no other way to reach
 * them.
 */
export const QueueItem = ({ className, ...props }: QueueItemProps) => (
  <li
    {...props}
    className={cn(
      "group/queue-item flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent",
      "animate-in fade-in slide-in-from-bottom-1 duration-150 motion-reduce:animate-none",
      className
    )}
    data-slot="queue-item"
  />
);

/** The arrow that says "after this one". Decoration; the list already carries the order. */
export const QueueItemMarker = ({
  children,
  className,
  ...props
}: QueueItemMarkerProps) => (
  <span
    {...props}
    aria-hidden="true"
    className={cn(
      "flex size-5 shrink-0 items-center justify-center text-muted-foreground",
      className
    )}
    data-slot="queue-item-marker"
  >
    {children ?? <CornerDownRight className="size-3.5" />}
  </span>
);

/** What the user sent, on one line. The full text is the `title`, for the reader who
 *  wants the rest of a long message without opening anything. */
export const QueueItemText = ({
  children,
  className,
  ...props
}: QueueItemTextProps) => {
  if (isEmpty(children)) {
    return null;
  }

  return (
    <span
      title={typeof children === "string" ? children : undefined}
      {...props}
      className={cn("min-w-0 flex-1 truncate", className)}
      data-slot="queue-item-text"
    >
      {children}
    </span>
  );
};

/** Shown on the row's hover or focus, always on touch. Shared by the actions, so the
 *  two appear and disappear together. */
const ACTION =
  "flex h-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-opacity hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring opacity-0 group-focus-within/queue-item:opacity-100 group-hover/queue-item:opacity-100 pointer-coarse:opacity-100";

/**
 * Send this message now, without waiting for the agent to reach the queue.
 * Without `onClick` the part is not drawn.
 *
 * What that does to the work in flight is the caller's. A host may let a tool call
 * finish, or interrupt a reply being written. Whether the message leaves the queue is
 * theirs too: one that sends now usually removes it, since it has been sent.
 */
export const QueueItemSendNow = ({
  children,
  className,
  onClick,
  ...props
}: QueueItemSendNowProps) => {
  if (!onClick) {
    return null;
  }

  return (
    <button
      type="button"
      {...props}
      className={cn(ACTION, "gap-1 px-2 text-xs", className)}
      data-slot="queue-item-send-now"
      onClick={onClick}
    >
      <CornerUpLeft aria-hidden="true" className="size-3" />
      {children ?? "Send now"}
    </button>
  );
};

/**
 * Take the message back. A button with no handler would be a button that does nothing,
 * so without `onClick` the part is not drawn.
 */
export const QueueItemRemove = ({
  className,
  onClick,
  ...props
}: QueueItemRemoveProps) => {
  if (!onClick) {
    return null;
  }

  return (
    <button
      aria-label="Remove from queue"
      type="button"
      {...props}
      className={cn(ACTION, "w-6", className)}
      data-slot="queue-item-remove"
      onClick={onClick}
    >
      <X aria-hidden="true" className="size-3.5" />
    </button>
  );
};
