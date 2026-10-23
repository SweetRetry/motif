"use client";

import { ChevronDown } from "lucide-react";
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
import {
  LoadingState,
  LoadingStateClock,
  LoadingStateLabel,
  LoadingStateMark,
} from "@/components/ui/motif/loading-state";
import { cn } from "@/lib/utils";

/* -- What the agent did, as one thing ------------------------------------------
 * A run is a dozen steps: thoughts, searches, reads, edits. While it is going, the
 * reader wants to watch them arrive. Once it is over, they want the answer, and the
 * dozen rows are a receipt: still there for the reader who doubts the answer, but not
 * something that should push it off the screen.
 *
 * So this is a header over a timeline, and the header changes with the run. Running, it
 * is the wait (the mark, a word, a clock) and the timeline is open. Done, it is one
 * line, "Worked for 42s", and the timeline folds behind it. The fold follows the run by
 * itself until the reader presses the header; from then on it is theirs, and a run that
 * ends does not close what they opened.
 *
 * The steps are not parts. A step is a Tool Call or a Thinking Block, or anything the
 * caller draws, and they stack in the content as they are given. Wrapping each in a
 * `Step` that drew a dot on the rail would put a second status beside the one the row
 * already has.
 * --------------------------------------------------------------------------- */

/** What a part reads from the root. Exported with `useAgentActivity` so a caller can
 *  draw a part of their own, a stop button that only exists while the run does, from
 *  the same state the shipped parts use. */
export interface AgentActivityState {
  /** Seconds the run took. Only meaningful once it has stopped. */
  duration?: number;
  /** Whether the timeline is showing. Always `false` when there are no steps. */
  isOpen: boolean;
  /** The run is still going. */
  running: boolean;
  toggle: () => void;
}

interface AgentActivityInternals extends AgentActivityState {
  contentId: string;
  hasContent: boolean;
  /** Called by the content as it mounts, so the header can tell whether there is
   *  anything to open. Returns the call that undoes it. */
  registerContent: () => () => void;
  startedAt?: number;
}

export interface AgentActivityProps extends Omit<
  ComponentProps<"div">,
  "children"
> {
  children: ReactNode;
  /** Whether the timeline starts open. Ignored when `open` is passed. Without it the
   *  timeline is open exactly while the run is. */
  defaultOpen?: boolean;
  /** Seconds the run took, for the header once it has stopped. */
  duration?: number;
  onOpenChange?: (open: boolean) => void;
  /** Controlled. Passed, the root never opens or closes itself. */
  open?: boolean;
  /** The run is still going. */
  running: boolean;
  /** Epoch ms the run began, so a remount does not restart the clock. */
  startedAt?: number;
}

export type AgentActivityHeaderProps = ComponentProps<"div">;

export interface AgentActivityTitleProps extends Omit<
  ComponentProps<"span">,
  "children"
> {
  /** The past-tense word once the run has stopped. Defaults to `Worked`. */
  doneLabel?: string;
  /** The present-tense word while it runs. Defaults to `Working`. */
  label?: string;
}

export type AgentActivitySummaryProps = ComponentProps<"span">;
export type AgentActivityContentProps = ComponentProps<"div">;

/** Nothing to draw: the shapes a conditional leaves behind. A slot with nothing in it
 *  draws nothing, and an empty string is one of those. */
const isEmpty = (children: ReactNode) =>
  children === null ||
  children === undefined ||
  children === false ||
  children === "";

/** `42s`, then `1m 05s`. Whole seconds: a run that took minutes has no use for a tenth. */
const formatDuration = (seconds: number) => {
  const whole = Math.max(0, Math.round(seconds));

  return whole < 60
    ? `${whole}s`
    : `${Math.floor(whole / 60)}m ${String(whole % 60).padStart(2, "0")}s`;
};

const AgentActivityContext = createContext<AgentActivityInternals | null>(null);

const useInternals = () => {
  const context = useContext(AgentActivityContext);
  if (!context) {
    throw new Error(
      "Agent activity parts must be used within an AgentActivity."
    );
  }

  return context;
};

export const useAgentActivity = (): AgentActivityState => {
  const { duration, isOpen, running, toggle } = useInternals();

  return { duration, isOpen, running, toggle };
};

/**
 * The root: it owns whether the run is going and whether the timeline is showing, and
 * draws nothing but the column the parts stack in.
 *
 * `picked` is the reader's own choice and starts empty. While it is empty the timeline
 * follows `running`, so the fold at the end of a run needs no effect and no timer: it
 * is the same expression evaluated again. Once the reader has pressed the header it is
 * set, and nothing the run does moves it.
 */
export const AgentActivity = ({
  children,
  className,
  defaultOpen,
  duration,
  onOpenChange,
  open,
  running,
  startedAt,
  ...props
}: AgentActivityProps) => {
  const contentId = useId();
  const [picked, setPicked] = useState<boolean | null>(defaultOpen ?? null);
  const [contentCount, setContentCount] = useState(0);

  const hasContent = contentCount > 0;
  // A run with no steps is never open, whatever `open` says: there is no timeline for
  // the chevron to point at.
  const isOpen = hasContent && (open ?? picked ?? running);

  const toggle = useCallback(() => {
    const next = !isOpen;

    if (open === undefined) {
      setPicked(next);
    }
    onOpenChange?.(next);
  }, [isOpen, onOpenChange, open]);

  const registerContent = useCallback(() => {
    setContentCount((count) => count + 1);

    return () => setContentCount((count) => count - 1);
  }, []);

  const state = useMemo<AgentActivityInternals>(
    () => ({
      contentId,
      duration,
      hasContent,
      isOpen,
      registerContent,
      running,
      startedAt,
      toggle,
    }),
    [
      contentId,
      duration,
      hasContent,
      isOpen,
      registerContent,
      running,
      startedAt,
      toggle,
    ]
  );

  return (
    <AgentActivityContext.Provider value={state}>
      <div
        {...props}
        className={cn("group/agent-activity flex flex-col", className)}
        data-slot="agent-activity"
        data-state={running ? "running" : "done"}
      >
        {children}
      </div>
    </AgentActivityContext.Provider>
  );
};

/**
 * The row: the title, the summary, and whatever else the caller puts in it.
 *
 * It is the control that opens the timeline, but only while there are steps to show. A
 * chevron that pointed at nothing, on a row that did nothing when pressed, would be a
 * promise the part could not keep, so without content it is a plain row and draws no
 * chevron.
 */
export const AgentActivityHeader = ({
  children,
  className,
  ...props
}: AgentActivityHeaderProps) => {
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

  const frame = cn("flex min-w-0 items-center gap-2 text-sm", className);

  if (!hasContent) {
    return (
      <div {...props} className={frame} data-slot="agent-activity-header">
        {row}
      </div>
    );
  }

  return (
    <div {...props} className={frame} data-slot="agent-activity-header">
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
 * The line that says where the run is: the wait while it goes, the receipt after.
 *
 * Running is Loading State, whole: the mark, a word, a clock. It already means "the
 * agent is working", and a second spinner here would be the same word in two accents.
 * Done is plain text, because nothing is happening any more and nothing should look as
 * though it were.
 */
export const AgentActivityTitle = ({
  className,
  doneLabel = "Worked",
  label = "Working",
  ...props
}: AgentActivityTitleProps) => {
  const { duration, running, startedAt } = useInternals();

  if (running) {
    return (
      <LoadingState
        {...props}
        className={cn("shrink-0", className)}
        data-slot="agent-activity-title"
      >
        <LoadingStateMark />
        <LoadingStateLabel>{label}</LoadingStateLabel>
        <LoadingStateClock startedAt={startedAt} />
      </LoadingState>
    );
  }

  return (
    <span
      {...props}
      className={cn("shrink-0 text-muted-foreground", className)}
      data-slot="agent-activity-title"
    >
      {duration === undefined
        ? doneLabel
        : `${doneLabel} for ${formatDuration(duration)}`}
    </span>
  );
};

/** What the run amounted to, in a line: `5 tool calls`, `3 files read`. One line, cut
 *  with an ellipsis. The caller writes it, because only the caller knows what its steps
 *  were. */
export const AgentActivitySummary = ({
  children,
  className,
  ...props
}: AgentActivitySummaryProps) => {
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
      data-slot="agent-activity-summary"
    >
      {children}
    </span>
  );
};

/**
 * The timeline: the steps, in the order they were given, behind the header.
 *
 * It hangs under the title with a rule on the left, so a run reads as a header with its
 * steps attached rather than as a list that happens to have a heading. The steps keep
 * their own rows, so a Tool Call inside it still opens its own detail.
 */
export const AgentActivityContent = ({
  children,
  className,
  ...props
}: AgentActivityContentProps) => {
  const { contentId, isOpen, registerContent } = useInternals();

  // Before paint, so the header's chevron is there in the first frame rather than a
  // frame after the content that justifies it.
  useLayoutEffect(() => registerContent(), [registerContent]);

  return (
    <AgentDisclosure id={contentId} open={isOpen}>
      <div
        {...props}
        className={cn(
          "ml-2.5 flex flex-col gap-3 border-border border-l py-3 pl-4",
          className
        )}
        data-slot="agent-activity-content"
      >
        {children}
      </div>
    </AgentDisclosure>
  );
};
