import assert from "node:assert/strict";
import { test } from "node:test";

import {
  compareTexts,
  parsePatch,
} from "../registry/new-york/agents/diff/read.ts";
import type { DiffState } from "../registry/new-york/agents/diff/read.ts";

/** A line as a row a test can compare: its kind, its number, its text with the changed
 *  words in brackets. */
const view = (s: DiffState) =>
  s.lines.map((line) => [
    line.kind,
    line.number ?? null,
    line.segments
      ? line.segments
          .map((segment) =>
            segment.changed ? `[${segment.text}]` : segment.text
          )
          .join("")
      : line.text,
  ]);

test("git file headers are read, not drawn", () => {
  const s = parsePatch("--- a/x.ts\n+++ b/x.ts\n@@ -1,2 +1,2 @@\n a\n-b\n+c\n");
  assert.equal(s.file, "x.ts");
  assert.deepEqual([s.added, s.removed], [1, 1]);
  assert.deepEqual(view(s), [
    ["hunk", null, "@@ -1,2 +1,2 @@"],
    ["context", 1, "a"],
    ["removed", 2, "b"],
    ["added", 2, "c"],
  ]);
});

test("a bare snippet before and after has no numbers", () => {
  const s = compareTexts("a\nb\nc\n", "a\nB\nc\n");
  assert.deepEqual(view(s), [
    ["context", null, "a"],
    ["removed", null, "b"],
    ["added", null, "B"],
    ["context", null, "c"],
  ]);
});

test("firstLine numbers the snippet in its file", () => {
  const s = compareTexts("a\nb\n", "a\nc\n", 40);
  assert.deepEqual(
    view(s).map((row) => row[1]),
    [40, 41, 41]
  );
});

test("a one-word prose edit marks the word, not the paragraph", () => {
  const s = compareTexts(
    "The quick brown fox jumps over the lazy dog.\n",
    "The quick red fox jumps over the lazy dog.\n"
  );
  assert.deepEqual(view(s), [
    ["removed", null, "The quick [brown] fox jumps over the lazy dog."],
    ["added", null, "The quick [red] fox jumps over the lazy dog."],
  ]);
});

test("a line replaced outright is drawn whole", () => {
  const s = compareTexts("alpha beta\n", "totally different words\n");
  assert.deepEqual(view(s), [
    ["removed", null, "alpha beta"],
    ["added", null, "totally different words"],
  ]);
});

test("a long unchanged stretch folds to a marker", () => {
  const before = Array.from(
    { length: 20 },
    (_, index) => `line ${index + 1}\n`
  ).join("");
  const after = before
    .replace("line 2\n", "line two\n")
    .replace("line 18\n", "line eighteen\n");
  const s = compareTexts(before, after, 1);
  assert.deepEqual(
    s.lines.filter((line) => line.kind === "hunk").map((line) => line.text),
    ["@@ -15,6 +15,6 @@"]
  );
  assert.deepEqual([s.added, s.removed], [2, 2]);
});

test("the same change reads the same from either input", () => {
  const a = compareTexts("a\nb\n", "a\nc\n", 1);
  const p = parsePatch("@@ -1,2 +1,2 @@\n a\n-b\n+c\n");
  assert.deepEqual(view(a), view(p).slice(1));
});
