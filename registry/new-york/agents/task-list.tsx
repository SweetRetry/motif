"use client";

import { Check, ChevronDown } from "lucide-react";
import { useReducedMotion } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import {
  Children,
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AgentDisclosure } from "@/components/ui/motif/agent-disclosure";
import { LoadingStateMark } from "@/components/ui/motif/loading-state";
import { cn } from "@/lib/utils";

export type TaskStatus = "todo" | "active" | "done";

export interface TaskListState {
  isOpen: boolean;
  running: boolean;
  toggle: () => void;
}

interface TaskListInternals extends TaskListState {
  contentId: string;
  hasContent: boolean;
  registerContent: () => () => void;
}

export interface TaskListProps extends ComponentProps<"div"> {
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  running?: boolean;
}

export type TaskListHeaderProps = ComponentProps<"div">;

export interface TaskListProgressProps extends Omit<
  ComponentProps<"span">,
  "children"
> {
  done: number;
  total: number;
}

export type TaskListTitleProps = ComponentProps<"span">;
export type TaskListContentProps = ComponentProps<"ol">;

export interface TaskListItemProps extends ComponentProps<"li"> {
  status: TaskStatus;
}

export interface TaskListStatusProps extends Omit<
  ComponentProps<"span">,
  "children"
> {
  label?: string;
  status: TaskStatus;
}

export type TaskListItemMarkerProps = Omit<TaskListStatusProps, "status">;

export type TaskListItemTextProps = ComponentProps<"span">;

const STATUS_LABEL: Record<TaskStatus, string> = {
  active: "In progress",
  done: "Done",
  todo: "To do",
};

const isEmpty = (children: ReactNode) =>
  children === null ||
  children === undefined ||
  children === false ||
  children === "";

const TaskListContext = createContext<TaskListInternals | null>(null);
const TaskListItemContext = createContext<TaskStatus | null>(null);

const useInternals = () => {
  const context = useContext(TaskListContext);
  if (!context) {
    throw new Error("Task list parts must be used within a TaskList.");
  }

  return context;
};

const useItemStatus = () => {
  const status = useContext(TaskListItemContext);
  if (!status) {
    throw new Error("Task list item parts must be used within a TaskListItem.");
  }

  return status;
};

export const useTaskList = (): TaskListState => {
  const { isOpen, running, toggle } = useInternals();

  return { isOpen, running, toggle };
};

export const TaskList = ({
  children,
  className,
  defaultOpen = false,
  onOpenChange,
  open,
  running = true,
  ...props
}: TaskListProps) => {
  const contentId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [contentCount, setContentCount] = useState(0);

  const hasContent = contentCount > 0;
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

  const state = useMemo<TaskListInternals>(
    () => ({ contentId, hasContent, isOpen, registerContent, running, toggle }),
    [contentId, hasContent, isOpen, registerContent, running, toggle]
  );

  if (Children.toArray(children).length === 0) {
    return null;
  }

  return (
    <TaskListContext.Provider value={state}>
      <div
        {...props}
        className={cn(
          "flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground",
          className
        )}
        data-running={running}
        data-slot="task-list"
        data-state={isOpen ? "open" : "closed"}
      >
        {children}
      </div>
    </TaskListContext.Provider>
  );
};

export const TaskListHeader = ({
  children,
  className,
  ...props
}: TaskListHeaderProps) => {
  const { contentId, hasContent, isOpen, toggle } = useInternals();

  const frame = cn("flex min-w-0 items-center text-sm", className);
  const row = "flex min-w-0 flex-1 items-center gap-2 px-3 py-2";

  if (!hasContent) {
    return (
      <div {...props} className={frame} data-slot="task-list-header">
        <div className={row}>{children}</div>
      </div>
    );
  }

  return (
    <div {...props} className={frame} data-slot="task-list-header">
      <button
        aria-controls={contentId}
        aria-expanded={isOpen}
        className={cn(
          row,
          "group/task-header cursor-pointer rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        )}
        onClick={toggle}
        type="button"
      >
        {children}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-[rotate,color] duration-200 ease-out group-hover/task-header:text-foreground motion-reduce:transition-none",
            isOpen && "rotate-180"
          )}
        />
      </button>
    </div>
  );
};

export const TaskListProgress = ({
  className,
  done,
  total,
  ...props
}: TaskListProgressProps) => (
  <span
    {...props}
    className={cn(
      "shrink-0 text-muted-foreground text-xs tabular-nums",
      className
    )}
    data-slot="task-list-progress"
  >
    {`${done}/${total}`}
  </span>
);

export const TaskListTitle = ({
  children,
  className,
  ...props
}: TaskListTitleProps) => {
  if (isEmpty(children)) {
    return null;
  }

  return (
    <span
      aria-live="polite"
      title={typeof children === "string" ? children : undefined}
      {...props}
      className={cn("min-w-0 flex-1 truncate", className)}
      data-slot="task-list-title"
    >
      {children}
    </span>
  );
};

export const TaskListContent = ({
  className,
  ...props
}: TaskListContentProps) => {
  const { contentId, isOpen, registerContent } = useInternals();

  useLayoutEffect(() => registerContent(), [registerContent]);

  return (
    <AgentDisclosure id={contentId} open={isOpen}>
      <ol
        {...props}
        className={cn(
          "relative flex max-h-72 flex-col gap-0.5 overflow-y-auto overscroll-contain px-1 pb-2",
          className
        )}
        data-slot="task-list-content"
      />
    </AgentDisclosure>
  );
};

export const TaskListItem = ({
  className,
  status,
  ...props
}: TaskListItemProps) => {
  const { isOpen } = useInternals();
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const item = ref.current;
    const list = item?.parentElement;
    if (!(item && list) || status !== "active" || !isOpen) {
      return;
    }

    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;
    const hidden =
      top < list.scrollTop || bottom > list.scrollTop + list.clientHeight;

    if (hidden) {
      list.scrollTo({
        behavior: reduce ? "auto" : "smooth",
        top: top - (list.clientHeight - item.offsetHeight) / 2,
      });
    }
  }, [isOpen, reduce, status]);

  return (
    <TaskListItemContext.Provider value={status}>
      <li
        aria-current={status === "active" ? "step" : undefined}
        {...props}
        className={cn(
          "group/task-item flex min-w-0 items-start gap-2 px-2 py-1 text-sm",
          className
        )}
        data-slot="task-list-item"
        data-status={status}
        ref={ref}
      />
    </TaskListItemContext.Provider>
  );
};

const ActiveMark = () => {
  const running = useContext(TaskListContext)?.running ?? true;

  return running ? (
    <LoadingStateMark className="scale-[0.7]" />
  ) : (
    <span aria-hidden="true" className="size-2 rounded-full bg-foreground" />
  );
};

const StatusMark = ({
  className,
  label,
  status,
  ...props
}: TaskListStatusProps) => (
  <span
    {...props}
    className={cn(
      "flex h-5 w-4 shrink-0 items-center justify-center",
      className
    )}
  >
    {status === "todo" ? (
      <span
        aria-hidden="true"
        className="size-2.5 rounded-full border border-muted-foreground/50"
      />
    ) : null}
    {status === "active" ? <ActiveMark /> : null}
    {status === "done" ? (
      <Check
        aria-hidden="true"
        className="size-3.5 text-muted-foreground animate-in zoom-in-50 fade-in duration-200 motion-reduce:animate-none"
      />
    ) : null}
    <span className="sr-only">{label ?? STATUS_LABEL[status]}</span>
  </span>
);

export const TaskListStatus = (props: TaskListStatusProps) => (
  <StatusMark {...props} data-slot="task-list-status" />
);

export const TaskListItemMarker = (props: TaskListItemMarkerProps) => {
  const status = useItemStatus();

  return (
    <StatusMark {...props} data-slot="task-list-item-marker" status={status} />
  );
};

export const TaskListItemText = ({
  children,
  className,
  ...props
}: TaskListItemTextProps) => {
  if (isEmpty(children)) {
    return null;
  }

  return (
    <span
      {...props}
      className={cn(
        "min-w-0 flex-1 break-words transition-colors duration-200",
        "group-data-[status=active]/task-item:font-medium",
        "group-data-[status=done]/task-item:text-muted-foreground",
        className
      )}
      data-slot="task-list-item-text"
    >
      {children}
    </span>
  );
};
