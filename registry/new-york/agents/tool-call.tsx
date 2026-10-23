"use client";

import { Check, ChevronDown, X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import { AgentDisclosure } from "@/components/ui/motif/agent-disclosure";
import { LoadingStateMark } from "@/components/ui/motif/loading-state";
import { cn } from "@/lib/utils";

/* -- One call, one row ---------------------------------------------------------
 * A tool call is the unit of "what the agent did": a name, a gist of what it was given,
 * and where it stands. That is a line, not a card. A transcript with a dozen of them in
 * it has to stay a transcript, so the row carries no container of its own and the detail
 * is behind a disclosure: the arguments and the result are for the reader who doubts the
 * line, not for the one who is following along.
 *
 * The root owns the status and whether the detail is open; the parts read them and know
 * nothing of each other. A caller who wants a duration at the end of the row puts it in
 * the header. A caller whose call has no detail leaves the content out, and the row stops
 * being a button.
 * --------------------------------------------------------------------------- */

/** Where a call stands. Five words, because those are the five things a row can say: not
 *  yet started, held at a gate for the reader's yes, in flight, came back, did not come
 *  back. */
export type ToolCallStatusValue =
  | "queued"
  | "approval"
  | "running"
  | "done"
  | "failed";

/** What a part reads from the root. Exported with `useToolCall`, so a caller can draw
 *  a part of their own — a retry button that only exists on a failure — from the same
 *  status the shipped parts use. */
export interface ToolCallState {
  /** Whether the detail is showing. Always `false` when there is no detail. */
  isOpen: boolean;
  status: ToolCallStatusValue;
  toggle: () => void;
}

interface ToolCallInternals extends ToolCallState {
  contentId: string;
  /** Called by the content as it mounts, so the header can tell whether there is
   *  anything to open. Returns the call that undoes it. */
  registerContent: () => () => void;
  hasContent: boolean;
}

export interface ToolCallProps extends Omit<ComponentProps<"div">, "children"> {
  children: ReactNode;
  /** Whether the detail starts open. Ignored when `open` is passed. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Controlled. Passed, the root never opens or closes itself. */
  open?: boolean;
  status: ToolCallStatusValue;
}

export type ToolCallHeaderProps = ComponentProps<"div">;

export interface ToolCallStatusProps extends ComponentProps<"span"> {
  /** Names the status for a screen reader. Defaults to the status word itself. */
  label?: string;
}

export type ToolCallNameProps = ComponentProps<"span">;
export type ToolCallSummaryProps = ComponentProps<"span">;
export type ToolCallContentProps = ComponentProps<"div">;

export interface ToolCallSectionProps extends Omit<
  ComponentProps<"div">,
  "title"
> {
  /** `Input`, `3 results`: what the block under it is. Left out, the block has no label,
   *  which is right for a detail that explains itself, like a picture. */
  title?: ReactNode;
}

/** Nothing to draw: the shapes a conditional leaves behind. A slot with nothing in it
 *  draws nothing, and an empty string is one of those. */
const isEmpty = (children: ReactNode) =>
  children === null ||
  children === undefined ||
  children === false ||
  children === "";

const ToolCallContext = createContext<ToolCallInternals | null>(null);

const useInternals = () => {
  const context = useContext(ToolCallContext);
  if (!context) {
    throw new Error("Tool call parts must be used within a ToolCall.");
  }

  return context;
};

export const useToolCall = (): ToolCallState => {
  const { isOpen, status, toggle } = useInternals();

  return { isOpen, status, toggle };
};

/**
 * The root: it owns the status and the disclosure, and draws nothing but the column the
 * parts stack in.
 */
export const ToolCall = ({
  children,
  className,
  defaultOpen = false,
  onOpenChange,
  open,
  status,
  ...props
}: ToolCallProps) => {
  const contentId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [contentCount, setContentCount] = useState(0);

  const hasContent = contentCount > 0;
  // A row with nothing behind it is never open, whatever `open` says: there is no state
  // for the chevron to point at.
  const isOpen = hasContent && (open ?? uncontrolledOpen);

  const toggle = useCallback(() => {
    const next = !isOpen;

    if (open === undefined) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  }, [isOpen, onOpenChange, open]);

  const registerContent = useCallback(() => {
    setContentCount((count) => count + 1);

    return () => setContentCount((count) => count - 1);
  }, []);

  const state = useMemo<ToolCallInternals>(
    () => ({
      contentId,
      hasContent,
      isOpen,
      registerContent,
      status,
      toggle,
    }),
    [contentId, hasContent, isOpen, registerContent, status, toggle]
  );

  return (
    <ToolCallContext.Provider value={state}>
      <div
        {...props}
        className={cn("group/tool-call flex flex-col", className)}
        data-slot="tool-call"
        data-status={status}
      >
        {children}
      </div>
    </ToolCallContext.Provider>
  );
};

/**
 * The row: status, name, gist, and whatever else the caller puts in it.
 *
 * It is the control that opens the detail, but only while there is detail to open. A
 * chevron that pointed at nothing, on a row that did nothing when pressed, would be a
 * promise the part could not keep, so without content it is a plain row and draws no
 * chevron.
 */
export const ToolCallHeader = ({
  children,
  className,
  ...props
}: ToolCallHeaderProps) => {
  const { contentId, hasContent, isOpen, toggle } = useInternals();

  const row = (
    <>
      {children}
      {hasContent ? (
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none",
            isOpen && "rotate-180"
          )}
        />
      ) : null}
    </>
  );

  const frame = cn(
    "flex min-w-0 items-center gap-2 text-sm",
    "group-data-[status=queued]/tool-call:text-muted-foreground",
    className
  );

  if (!hasContent) {
    return (
      <div {...props} className={frame} data-slot="tool-call-header">
        {row}
      </div>
    );
  }

  return (
    <div {...props} className={frame} data-slot="tool-call-header">
      <button
        aria-controls={contentId}
        aria-expanded={isOpen}
        className="flex w-fit max-w-full min-w-0 cursor-pointer items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={toggle}
        type="button"
      >
        {row}
      </button>
    </div>
  );
};

/**
 * Where the call stands, drawn as one thing in the same place for all five.
 *
 * A running call is the loading mark: it already means "the agent is working", and a
 * second spinner beside it would be the same word in two accents. The other four are
 * still shapes: an empty ring has not started, an amber dot is waiting on the reader, a
 * check came back, a cross did not.
 */
export const ToolCallStatus = ({
  className,
  label,
  ...props
}: ToolCallStatusProps) => {
  const { status } = useInternals();

  return (
    <span
      {...props}
      className={cn(
        "flex size-4 shrink-0 items-center justify-center",
        className
      )}
      data-slot="tool-call-status"
    >
      {status === "queued" ? (
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full border border-muted-foreground/50"
        />
      ) : null}
      {status === "approval" ? (
        <span aria-hidden="true" className="size-2.5 rounded-full bg-warning" />
      ) : null}
      {status === "running" ? (
        <LoadingStateMark className="scale-[0.7]" />
      ) : null}
      {status === "done" ? (
        <Check aria-hidden="true" className="size-3.5 text-success" />
      ) : null}
      {status === "failed" ? (
        <X aria-hidden="true" className="size-3.5 text-destructive" />
      ) : null}
      <span className="sr-only">{label ?? status}</span>
    </span>
  );
};

/** What was called: `read_file`, `web.search`. Mono, because it is an identifier the
 *  reader may need to find in a log. */
export const ToolCallName = ({
  children,
  className,
  ...props
}: ToolCallNameProps) => {
  if (isEmpty(children)) {
    return null;
  }

  return (
    <span
      {...props}
      className={cn("shrink-0 font-medium font-mono text-xs", className)}
      data-slot="tool-call-name"
    >
      {children}
    </span>
  );
};

/** The gist of what the call was given: a path, a query. One line, cut with an ellipsis,
 *  because the full input is in the detail and this is only enough to recognise it. */
export const ToolCallSummary = ({
  children,
  className,
  ...props
}: ToolCallSummaryProps) => {
  if (isEmpty(children)) {
    return null;
  }

  return (
    <span
      {...props}
      className={cn(
        "min-w-0 truncate text-muted-foreground text-xs",
        className
      )}
      data-slot="tool-call-summary"
    >
      {children}
    </span>
  );
};

/**
 * The detail: what the call was given and what came back, behind the row.
 *
 * It indents under the status with a rule on the left, so a stack of calls reads as rows
 * with detail hanging off them rather than as one block of text.
 */
export const ToolCallContent = ({
  children,
  className,
  ...props
}: ToolCallContentProps) => {
  const { contentId, isOpen, registerContent } = useInternals();

  // Before paint, so the header's chevron is there in the first frame rather than a
  // frame after the content that justifies it.
  useLayoutEffect(() => registerContent(), [registerContent]);

  return (
    <AgentDisclosure id={contentId} open={isOpen}>
      <div
        {...props}
        className={cn(
          "ml-2 flex flex-col gap-2 border-border border-l py-2 pl-4",
          className
        )}
        data-slot="tool-call-content"
      >
        {children}
      </div>
    </AgentDisclosure>
  );
};

/**
 * One labelled block of the detail. A string is set as preformatted text, so JSON keeps
 * its indentation; anything else is drawn as given.
 *
 * The block is a recessed field and takes a border, not a fill: a fill that is below the
 * surface in one theme is above it in the other.
 */
export const ToolCallSection = ({
  children,
  className,
  title,
  ...props
}: ToolCallSectionProps) => {
  if (isEmpty(children)) {
    return null;
  }

  return (
    <div
      {...props}
      className={cn("flex min-w-0 flex-col gap-1.5", className)}
      data-slot="tool-call-section"
    >
      {isEmpty(title) ? null : (
        <span className="text-muted-foreground text-xs">{title}</span>
      )}
      {typeof children === "string" ? (
        <pre className="max-h-48 overflow-auto rounded-md border border-border px-3 py-2 font-mono text-xs leading-normal whitespace-pre-wrap break-words">
          {children}
        </pre>
      ) : (
        children
      )}
    </div>
  );
};
