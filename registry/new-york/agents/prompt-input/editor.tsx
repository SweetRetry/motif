"use client";

import { Extension, Node, mergeAttributes } from "@tiptap/core";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { Placeholder, UndoRedo } from "@tiptap/extensions";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
import { useEffect, useMemo, useRef } from "react";

import { cn } from "@/lib/utils";

import { usePromptInput } from "./context";
import {
  docToSegments,
  segmentsToText,
  textToDoc,
  trimSegments,
} from "./segments";
import type { PromptInputEditorProps } from "./types";

/** Same ceiling as the textarea: four lines of `text-base` and a wrap. */
const MAX_FIELD_HEIGHT = 200;

/* -- A mention is one thing ----------------------------------------------------
 * An atom: the caret cannot stop inside it, Backspace takes it whole, and a selection
 * either holds all of it or none. That is the whole reason this field is not a textarea.
 * The attributes ride in `data-*` so a copy and paste inside the editor keeps the `id`.
 * --------------------------------------------------------------------------- */

const attribute = (name: string) => ({
  default: "",
  parseHTML: (element: HTMLElement) =>
    element.getAttribute(`data-${name}`) ?? "",
  renderHTML: (attributes: Record<string, string>) => ({
    [`data-${name}`]: attributes[name],
  }),
});

const Mention = Node.create({
  addAttributes: () => ({
    id: attribute("id"),
    label: attribute("label"),
    trigger: attribute("trigger"),
  }),
  atom: true,
  group: "inline",
  inline: true,
  name: "mention",
  parseHTML: () => [{ tag: "span[data-mention]" }],
  renderHTML: ({ HTMLAttributes, node }) => [
    "span",
    mergeAttributes(HTMLAttributes, {
      class: "rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground",
      "data-mention": "",
    }),
    `${node.attrs.trigger}${node.attrs.label}`,
  ],
  renderText: ({ node }) => `${node.attrs.trigger}${node.attrs.label}`,
  selectable: true,
});

/** Enter sends and Shift+Enter breaks the line, as in the textarea. A menu that is open
 *  has already taken the key by the time this runs. */
const Keys = Extension.create<{ submit: () => void }>({
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        this.options.submit();
        return true;
      },
      "Shift-Enter": ({ editor }) => editor.commands.splitBlock(),
    };
  },
  name: "promptKeys",
});

/** The empty paragraph carries the placeholder as a `before` pseudo-element, which keeps
 *  it out of the document and out of the caret's way. */
const PLACEHOLDER = [
  "[&_p.is-editor-empty:first-child]:before:pointer-events-none",
  "[&_p.is-editor-empty:first-child]:before:float-left",
  "[&_p.is-editor-empty:first-child]:before:h-0",
  "[&_p.is-editor-empty:first-child]:before:text-muted-foreground",
  "[&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
].join(" ");

/**
 * The field, when the draft holds more than text. It is `PromptInputTextarea` with a
 * document under it: the same growth cap, two-line floor and Enter binding, and a draft
 * that can hold mentions — chips the user picked from a menu, which the message carries
 * as objects instead of as the characters that spelled them.
 *
 * `PromptInputTrigger` parts go inside it. The root's `value` stays a plain string (a
 * mention written as its trigger and label), so everything that reads the draft as text
 * keeps working; `onSubmit`'s second argument is where the mentions arrive with their ids.
 * What the root hands back as `value` is text, so a mention does not survive being set
 * from outside.
 */
export const PromptInputEditor = ({
  children,
  className,
  maxHeight = MAX_FIELD_HEIGHT,
  placeholder,
  style,
  ...props
}: PromptInputEditorProps) => {
  const { disabled, field, segments, setValue, submit, value } =
    usePromptInput();

  // The editor is built once, so what it calls back into is read through here.
  const latest = useRef({ placeholder, setValue, submit });
  useEffect(() => {
    latest.current = { placeholder, setValue, submit };
  });

  const editor = useEditor(
    {
      content: textToDoc(value),
      editable: !disabled,
      editorProps: {
        attributes: {
          "aria-multiline": "true",
          class:
            "min-h-18 whitespace-pre-wrap break-words px-2 py-2.5 text-base leading-relaxed outline-none",
          role: "textbox",
        },
      },
      extensions: [
        Document,
        Paragraph,
        Text,
        UndoRedo,
        Mention,
        Placeholder.configure({
          placeholder: () => latest.current.placeholder ?? "",
        }),
        Keys.configure({ submit: () => latest.current.submit() }),
      ],
      // The server has no document to measure, and the first paint has no draft yet.
      immediatelyRender: false,
      onUpdate: ({ editor: current }) =>
        latest.current.setValue(
          segmentsToText(docToSegments(current.getJSON()))
        ),
    },
    []
  );

  // The root reaches the field through these two, the way it reaches a textarea.
  useEffect(() => {
    if (!editor) {
      return;
    }
    field.current = editor.view.dom;
    segments.current = () => trimSegments(docToSegments(editor.getJSON()));
    return () => {
      field.current = null;
      segments.current = null;
    };
  }, [editor, field, segments]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  // The draft changed from outside: a send cleared it, or a prompt card filled it.
  // Anything the editor itself typed already matches and is left alone.
  useEffect(() => {
    if (!editor || segmentsToText(docToSegments(editor.getJSON())) === value) {
      return;
    }
    editor.commands.setContent(textToDoc(value), { emitUpdate: false });
    if (editor.isFocused) {
      editor.commands.focus("end");
    }
  }, [editor, value]);

  const context = useMemo(() => ({ editor }), [editor]);

  return (
    <EditorContext.Provider value={context}>
      <div
        {...props}
        className={cn(
          "w-full overflow-y-auto [&_.ProseMirror-selectednode]:bg-accent [&_.ProseMirror-selectednode]:text-accent-foreground",
          PLACEHOLDER,
          disabled && "cursor-not-allowed",
          className
        )}
        style={{ maxHeight, ...style }}
      >
        <EditorContent editor={editor} />
        {children}
      </div>
    </EditorContext.Provider>
  );
};
