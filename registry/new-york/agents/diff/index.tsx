"use client";

import { createContext, useContext, useMemo } from "react";
import type { ComponentProps, CSSProperties } from "react";

import { cn } from "@/lib/utils";

import { compareTexts, parsePatch } from "./read";
import type { DiffState } from "./read";

/* -- One file's change ---------------------------------------------------------
 * A diff is what an edit amounts to, and the reader reads it to decide whether to let
 * it stand. So it is drawn the way a reviewer reads one: what went in, in `success`;
 * what came out, in `destructive`; the lines around them as they were.
 *
 * The root takes the change in either of the two shapes agent tools hand it over in:
 * a patch, the unified text `git diff` writes, or the text before and after, the
 * `old_string` and `new_string` of an edit tool. Either is read once into the same
 * lines. The parts read those lines and know nothing of each other: a tool row that
 * already names the file draws the lines alone, a list of changed files draws the
 * header alone, and a review pane draws both.
 *
 * A file header (`--- a/...`, `+++ b/...`) is read for the path and is not drawn as a
 * removal and an addition, which is what it looks like to anything counting first
 * characters. Lines are numbered only when the input says where they are: a hunk header
 * with numbers, or `firstLine` beside a before and after. A snippet's own count is not
 * the file's, and no gutter is better than a column of wrong numbers.
 *
 * A line that was edited rather than replaced, a removal and an addition that share
 * most of their text, also marks the words that changed. Prose is where this earns its
 * keep: a paragraph is one line, and without it a single changed word turns the whole
 * paragraph red and then green.
 * --------------------------------------------------------------------------- */

export { compareTexts, parsePatch } from "./read";
export type { DiffLine, DiffLineKind, DiffSegment, DiffState } from "./read";

export type DiffSource =
  | {
      after?: never;
      before?: never;
      firstLine?: never;
      /** Unified diff text. A bare run of `+`, `-` and ` ` lines is enough. */
      patch: string;
    }
  | {
      /** The text after the change. */
      after: string;
      /** The text before the change. */
      before: string;
      /** The line `before` starts at in its file. Without it the lines are not
       *  numbered. Pass `1` when `before` is the whole file. */
      firstLine?: number;
      patch?: never;
    };

export type DiffProps = ComponentProps<"div"> &
  DiffSource & {
    /** The path to show. Defaults to the one in the patch's `+++` line. */
    file?: string;
  };

export type DiffHeaderProps = ComponentProps<"div">;
export type DiffFileProps = ComponentProps<"span">;
export type DiffStatProps = Omit<ComponentProps<"span">, "children">;
export type DiffContentProps = Omit<ComponentProps<"pre">, "children">;

const DiffContext = createContext<DiffState | null>(null);

export const useDiff = () => {
  const context = useContext(DiffContext);
  if (!context) {
    throw new Error("Diff parts must be used within a Diff.");
  }

  return context;
};

/** The frame. A recessed block inside whatever holds it, so it draws a border and no
 *  fill: a fill reads as sunk in one theme and raised in the other. */
export const Diff = ({
  after,
  before,
  className,
  file,
  firstLine,
  patch,
  ...props
}: DiffProps) => {
  const read = useMemo(
    () =>
      patch === undefined
        ? compareTexts(before ?? "", after ?? "", firstLine)
        : parsePatch(patch),
    [after, before, firstLine, patch]
  );
  const value = useMemo(
    () => ({ ...read, file: file ?? read.file }),
    [read, file]
  );

  return (
    <DiffContext.Provider value={value}>
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-md border border-border",
          className
        )}
        data-slot="diff"
        {...props}
      />
    </DiffContext.Provider>
  );
};

/** The row above the lines. Draws nothing while it holds nothing. */
export const DiffHeader = ({ className, ...props }: DiffHeaderProps) => (
  <div
    className={cn(
      "flex min-w-0 items-center gap-2 border-b border-border px-3 py-1.5 text-xs empty:hidden",
      className
    )}
    data-slot="diff-header"
    {...props}
  />
);

/** The path. Children replace it; with neither a path nor children, nothing is drawn. */
export const DiffFile = ({ children, className, ...props }: DiffFileProps) => {
  const { file } = useDiff();
  const shown = children ?? file;

  if (!shown) {
    return null;
  }

  return (
    <span
      className={cn("min-w-0 flex-1 truncate font-mono", className)}
      data-slot="diff-file"
      title={typeof shown === "string" ? shown : undefined}
      {...props}
    >
      {shown}
    </span>
  );
};

/** `+4 −1`. A side with nothing on it is left out, so a pure addition says only `+4`. */
export const DiffStat = ({ className, ...props }: DiffStatProps) => {
  const { added, removed } = useDiff();

  if (!(added || removed)) {
    return null;
  }

  return (
    <span
      aria-label={`${added} added, ${removed} removed`}
      className={cn("flex shrink-0 gap-1.5 font-mono tabular-nums", className)}
      data-slot="diff-stat"
      {...props}
    >
      {added ? <span className="text-success">+{added}</span> : null}
      {removed ? <span className="text-destructive">−{removed}</span> : null}
    </span>
  );
};

/**
 * The lines. Each is a row of three: its number, its marker, its text. The marker is
 * not selectable, so what a reader copies out of an added line is the line. The words
 * an edited line changed sit on a stronger tint of the line's own colour. Long lines
 * wrap rather than scroll sideways: in a chat column a horizontal scroll hides the end
 * of every line at once.
 */
export const DiffContent = ({
  className,
  style,
  ...props
}: DiffContentProps) => {
  const { lines } = useDiff();
  let widest = 0;
  for (const line of lines) {
    widest = Math.max(widest, line.number ?? 0);
  }
  const gutter = widest ? `${String(widest).length}ch` : "0px";

  if (lines.length === 0) {
    return null;
  }

  return (
    <pre
      className={cn(
        "max-h-64 overflow-auto py-2 font-mono text-xs leading-normal",
        className
      )}
      data-slot="diff-content"
      style={{ "--diff-gutter": gutter, ...style } as CSSProperties}
      {...props}
    >
      {lines.map((line, index) => (
        <span
          className={cn(
            "grid grid-cols-[var(--diff-gutter)_1ch_minmax(0,1fr)] gap-x-2 px-3",
            line.kind === "added" && "bg-success/10 text-success",
            line.kind === "removed" && "bg-destructive/10 text-destructive",
            line.kind === "hunk" && "text-muted-foreground"
          )}
          data-kind={line.kind}
          // Lines of a patch repeat, and they never move: the index is their identity.
          // oxlint-disable-next-line react/no-array-index-key
          key={index}
        >
          <span
            aria-hidden
            className="text-right text-muted-foreground/70 select-none"
          >
            {line.kind === "hunk" ? null : line.number}
          </span>
          <span aria-hidden={line.kind === "hunk"} className="select-none">
            {line.kind === "added" ? "+" : null}
            {line.kind === "removed" ? "-" : null}
          </span>
          <span className="break-words whitespace-pre-wrap">
            {line.segments
              ? line.segments.map((segment, at) => (
                  <span
                    className={cn(
                      segment.changed && "rounded-[2px]",
                      segment.changed &&
                        line.kind === "added" &&
                        "bg-success/25",
                      segment.changed &&
                        line.kind === "removed" &&
                        "bg-destructive/25"
                    )}
                    data-changed={segment.changed || undefined}
                    // A line's segments are fixed once it is read.
                    // oxlint-disable-next-line react/no-array-index-key
                    key={at}
                  >
                    {segment.text}
                  </span>
                ))
              : line.text || " "}
          </span>
        </span>
      ))}
    </pre>
  );
};
