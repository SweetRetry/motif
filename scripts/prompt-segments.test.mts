import assert from "node:assert/strict";
import { test } from "node:test";

import {
  docToSegments,
  segmentsToText,
  textToDoc,
  trimSegments,
} from "../registry/new-york/agents/prompt-input/segments.ts";

const mention = (trigger: string, id: string, label: string) => ({
  attrs: { id, label, trigger },
  type: "mention",
});
const text = (value: string) => ({ text: value, type: "text" });

test("a mention keeps its id and is written as trigger plus label", () => {
  const doc = {
    content: [
      {
        content: [
          text("look at "),
          mention("@", "f1", "app.tsx"),
          text(" now"),
        ],
        type: "paragraph",
      },
    ],
    type: "doc",
  };
  const segments = docToSegments(doc);
  assert.deepEqual(segments, [
    { text: "look at ", type: "text" },
    { id: "f1", label: "app.tsx", trigger: "@", type: "mention" },
    { text: " now", type: "text" },
  ]);
  assert.equal(segmentsToText(segments), "look at @app.tsx now");
});

test("paragraph breaks become newlines inside one text run", () => {
  const doc = {
    content: [
      { content: [text("one")], type: "paragraph" },
      { type: "paragraph" },
      { content: [text("three")], type: "paragraph" },
    ],
    type: "doc",
  };
  assert.deepEqual(docToSegments(doc), [
    { text: "one\n\nthree", type: "text" },
  ]);
});

test("trim drops the whitespace a mention leaves behind and matches String.trim", () => {
  const segments = trimSegments([
    { text: "  ", type: "text" },
    { id: "r", label: "review", trigger: "/", type: "mention" },
    { text: " this \n", type: "text" },
  ]);
  assert.deepEqual(segments, [
    { id: "r", label: "review", trigger: "/", type: "mention" },
    { text: " this", type: "text" },
  ]);
  assert.equal(segmentsToText(segments), "  /review this \n".trim());
});

test("text round-trips through a document", () => {
  const source = "a\n\nb c";
  assert.equal(segmentsToText(docToSegments(textToDoc(source))), source);
  assert.deepEqual(docToSegments(textToDoc("")), []);
});
