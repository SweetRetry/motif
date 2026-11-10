/* -- Reading a change into lines ----------------------------------------------
 * Both inputs, a patch and a before and after, are read here into the same lines, so
 * the drawing never asks which one it was given. Pure and React-free, so a list that
 * sums several files can call it without drawing anything, and a test can call it the
 * way the component does.
 * --------------------------------------------------------------------------- */

import { diffWordsWithSpace, structuredPatch } from "diff";

export type DiffLineKind = "added" | "context" | "hunk" | "removed";

/** A run of a line's text, and whether it is the part that changed. */
export interface DiffSegment {
  changed: boolean;
  text: string;
}

export interface DiffLine {
  kind: DiffLineKind;
  /** The line's number in the file it now belongs to: the new file for an added or
   *  unchanged line, the old one for a removed line. Absent when the input does not
   *  say where the lines are. */
  number?: number;
  /** The line split where its words changed. Absent on a line that was not edited
   *  in place, which is drawn whole. */
  segments?: DiffSegment[];
  /** The line without its marker, so a copied selection is code, not patch. */
  text: string;
}

/** What a part reads from the root. Exported with `useDiff` so a caller can draw a part
 *  of their own, an "apply" button that only shows on a small change, from the same
 *  counts the shipped parts use. */
export interface DiffState {
  added: number;
  /** The path the patch names, or the one passed to the root. */
  file?: string;
  lines: DiffLine[];
  removed: number;
}

const HUNK = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;
/** Lines `git diff` writes before the first hunk, none of which are the change. */
const META =
  /^(diff |index |--- |\+\+\+ |new file|deleted file|similarity |rename |old mode|new mode)/;
/** How much of a pair of lines has to survive for it to read as one line edited. Below
 *  it, marking the changed words would mark nearly all of them. */
const SAME_ENOUGH = 0.5;
/** Unchanged lines kept around each change when the root works the diff out itself. */
const CONTEXT = 3;

/** The path a `---` or `+++` line names. `/dev/null`, the side of a new or deleted
 *  file that does not exist, names none. */
const pathOf = (header: string) => {
  const [path] = header.slice(4).split("\t");
  const trimmed = path.trim();

  return trimmed === "/dev/null" ? null : trimmed.replace(/^[ab]\//, "");
};

const next = (line: number | undefined) =>
  line === undefined ? undefined : line + 1;

/** Marks the changed words of one removed line and the added line that replaced it,
 *  when they share enough to be one line edited. */
const markWords = (before: DiffLine, after: DiffLine) => {
  const parts = diffWordsWithSpace(before.text, after.text);
  let same = 0;
  for (const part of parts) {
    if (!(part.added || part.removed)) {
      same += part.value.length;
    }
  }

  const longest = Math.max(before.text.length, after.text.length, 1);
  if (same / longest < SAME_ENOUGH) {
    return;
  }

  before.segments = parts
    .filter((part) => !part.added)
    .map((part) => ({ changed: part.removed, text: part.value }));
  after.segments = parts
    .filter((part) => !part.removed)
    .map((part) => ({ changed: part.added, text: part.value }));
};

/** Pairs each run of removals with the run of additions right after it, line by line in
 *  order, the way a reviewer lines them up, and marks the words of each pair. */
const pairWords = (lines: DiffLine[]) => {
  let at = 0;
  while (at < lines.length) {
    if (lines[at].kind !== "removed") {
      at += 1;
      continue;
    }

    let added = at;
    while (added < lines.length && lines[added].kind === "removed") {
      added += 1;
    }
    let end = added;
    while (end < lines.length && lines[end].kind === "added") {
      end += 1;
    }

    const pairs = Math.min(added - at, end - added);
    for (let index = 0; index < pairs; index += 1) {
      markWords(lines[at + index], lines[added + index]);
    }
    at = end;
  }
};

/** Reads the body of a patch, one row at a time, into lines and counts. Both inputs end
 *  up here, so a patch and a before and after with the same change draw the same. */
const createReader = () => {
  const lines: DiffLine[] = [];
  let added = 0;
  let removed = 0;
  let oldLine: number | undefined;
  let newLine: number | undefined;

  return {
    done: () => {
      pairWords(lines);
      return { added, lines, removed };
    },
    /** Starts a hunk. `text` is the row to draw for it, `null` for none. */
    hunk: (text: string | null, oldStart?: number, newStart?: number) => {
      oldLine = oldStart;
      newLine = newStart;
      if (text !== null) {
        lines.push({ kind: "hunk", text });
      }
    },
    row: (row: string) => {
      if (row.startsWith("\\")) {
        // "\ No newline at end of file" is about the bytes, not the code.
        return;
      }

      const [marker] = row;
      if (marker === "+") {
        added += 1;
        lines.push({ kind: "added", number: newLine, text: row.slice(1) });
        newLine = next(newLine);
      } else if (marker === "-") {
        removed += 1;
        lines.push({ kind: "removed", number: oldLine, text: row.slice(1) });
        oldLine = next(oldLine);
      } else {
        lines.push({
          kind: "context",
          number: newLine,
          text: marker === " " ? row.slice(1) : row,
        });
        oldLine = next(oldLine);
        newLine = next(newLine);
      }
    },
  };
};

/** Reads unified diff text into lines and counts. Exported for a caller that needs the
 *  numbers without the drawing, a file list that sums several patches. */
export const parsePatch = (patch: string): DiffState => {
  const reader = createReader();
  let file: string | null = null;
  let fromFile: string | null = null;
  let inBody = false;

  const rows = patch.split("\n");
  if (rows.at(-1) === "") {
    rows.pop();
  }

  for (const row of rows) {
    if (!inBody && META.test(row)) {
      if (row.startsWith("+++ ")) {
        file = pathOf(row);
      } else if (row.startsWith("--- ")) {
        fromFile = pathOf(row);
      }
      continue;
    }

    inBody = true;
    if (row.startsWith("@@")) {
      const numbers = HUNK.exec(row);
      reader.hunk(
        row,
        numbers ? Number(numbers[1]) : undefined,
        numbers ? Number(numbers[2]) : undefined
      );
    } else {
      reader.row(row);
    }
  }

  return { ...reader.done(), file: file ?? fromFile ?? undefined };
};

/** Works out the change from the text before and after it, into the same lines a patch
 *  reads into. Unchanged stretches longer than a few lines fold to a marker row, so a
 *  one-line edit in a long file is a few lines to read. Exported beside `parsePatch`. */
export const compareTexts = (
  before: string,
  after: string,
  firstLine?: number
): DiffState => {
  const reader = createReader();
  const { hunks } = structuredPatch(
    "",
    "",
    before,
    after,
    undefined,
    undefined,
    {
      context: CONTEXT,
    }
  );
  const shift = firstLine === undefined ? undefined : firstLine - 1;

  for (const [index, hunk] of hunks.entries()) {
    const oldStart = shift === undefined ? undefined : hunk.oldStart + shift;
    const newStart = shift === undefined ? undefined : hunk.newStart + shift;
    // A marker row says lines were left out. Above a first hunk that starts at the top,
    // nothing was.
    const folded = index > 0 || hunk.oldStart > 1;
    let text: string | null = null;
    if (folded) {
      text =
        oldStart === undefined
          ? "\u22EF"
          : `@@ -${oldStart},${hunk.oldLines} +${newStart},${hunk.newLines} @@`;
    }

    reader.hunk(text, oldStart, newStart);
    for (const row of hunk.lines) {
      reader.row(row);
    }
  }

  return reader.done();
};
