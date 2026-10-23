import type { JSONContent } from "@tiptap/core";

import type { PromptSegment } from "./types";

/* -- The draft, three ways -------------------------------------------------------
 * The editor holds a document, the root holds a string, and the caller wants parts. This
 * file is the only place the three meet, and it works on plain JSON so it can be run
 * without an editor: the document is paragraphs, a paragraph is text and mentions, and
 * a break between paragraphs is a newline everywhere else.
 * --------------------------------------------------------------------------- */

/** The document as segments, adjacent text merged across paragraph breaks. */
export const docToSegments = (doc: JSONContent): PromptSegment[] => {
  const segments: PromptSegment[] = [];
  const pushText = (text: string) => {
    if (text.length === 0) {
      return;
    }
    const last = segments.at(-1);
    if (last?.type === "text") {
      last.text += text;
    } else {
      segments.push({ text, type: "text" });
    }
  };

  for (const [index, paragraph] of (doc.content ?? []).entries()) {
    if (index > 0) {
      pushText("\n");
    }
    for (const node of paragraph.content ?? []) {
      if (node.type === "mention") {
        segments.push({
          id: String(node.attrs?.id),
          label: String(node.attrs?.label),
          trigger: String(node.attrs?.trigger),
          type: "mention",
        });
      } else {
        pushText(node.text ?? "");
      }
    }
  }
  return segments;
};

/** What the root keeps as `value`: a mention is written as its trigger and label. */
export const segmentsToText = (segments: PromptSegment[]) =>
  segments
    .map((segment) =>
      segment.type === "text"
        ? segment.text
        : `${segment.trigger}${segment.label}`
    )
    .join("");

/** The same trim `submit` gives the string, applied to the ends of the segments. */
export const trimSegments = (segments: PromptSegment[]): PromptSegment[] => {
  const trimmed = [...segments];
  const [first] = trimmed;
  if (first?.type === "text") {
    trimmed[0] = { ...first, text: first.text.trimStart() };
  }
  const last = trimmed.at(-1);
  if (last?.type === "text") {
    trimmed[trimmed.length - 1] = { ...last, text: last.text.trimEnd() };
  }
  return trimmed.filter(
    (segment) => segment.type === "mention" || segment.text.length > 0
  );
};

/** A string as a document, one paragraph per line. Mentions do not survive the trip. */
export const textToDoc = (text: string): JSONContent => ({
  content: text.split("\n").map((line) =>
    line.length > 0
      ? {
          content: [{ text: line, type: "text" }],
          type: "paragraph",
        }
      : { type: "paragraph" }
  ),
  type: "doc",
});
