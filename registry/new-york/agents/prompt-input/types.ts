import type { ComponentProps, ReactNode } from "react";

import type { ButtonProps } from "@/components/ui/button";
import type { AttachmentProps } from "@/components/ui/motif/attachment";
import type { ProviderId } from "@/components/ui/motif/provider-mark";

/**
 * A file riding along with the draft, the way a composer usually holds them: the chip's
 * own props plus an `id` for the key. Convenience only — `PromptInputAttachment` takes
 * `AttachmentProps`, so a caller with their own shape can spread it in instead.
 */
export type PromptAttachment = { id: string } & Omit<
  AttachmentProps,
  "className" | "icon" | "onRemove"
>;

/** One model the composer can be pointed at. */
export interface PromptModel {
  /** What `value` and `onValueChange` trade in. */
  id: string;
  name: string;
  provider: ProviderId;
}

export interface ModelPickerProps {
  className?: string;
  /** Model the picker opens on when it holds the choice itself. */
  defaultValue?: string;
  models: PromptModel[];
  onValueChange?: (id: string) => void;
  /** Controlled model id. */
  value?: string;
}

/** The root: the state of the message, and the door out of it. */
export interface PromptInputProps extends Omit<
  ComponentProps<"form">,
  "onSubmit"
> {
  /** Draft the composer starts with. Ignored under a controlled `value`. */
  defaultValue?: string;
  disabled?: boolean;
  /** Pairs with `streaming`: what the submit part's stop face calls. */
  onStop?: () => void;
  /**
   * Called with the trimmed draft — Enter or the submit part. The second argument is the
   * same draft as parts, with every mention still an object: a composer with a plain
   * `PromptInputTextarea` always hands over one text segment.
   */
  onSubmit?: (value: string, segments: PromptSegment[]) => void;
  onValueChange?: (value: string) => void;
  /** Swaps the submit part's arrow for a stop square, and blocks Enter. */
  streaming?: boolean;
  /** Controlled draft. A controlled draft is never cleared by a send. */
  value?: string;
}

export interface PromptInputTextareaProps extends Omit<
  ComponentProps<"textarea">,
  "onChange" | "value"
> {
  /**
   * The field's own props, plus the cap. It is the composer's own primitive: no textarea
   * base exists to build on, and the growth cap, the two-line floor and the Enter binding
   * are the composer's, not the platform's.
   */
  maxHeight?: number;
}

/**
 * The platform button's own props — `variant`, `size`, `sound`, `haptic` — with the row's
 * geometry already applied on top.
 */
export type PromptInputButtonProps = ButtonProps;

export interface PromptInputAttachProps extends Omit<ButtonProps, "onClick"> {
  /** Offered to the file picker, e.g. `"image/*,.pdf"`. */
  accept?: string;
  /**
   * Makes the part real: the composer opens the file dialog and hands the files over.
   * Omit it and nothing is drawn — a composer with nowhere to attach should not offer
   * to attach.
   */
  onFiles?: (files: File[]) => void;
}

/**
 * The draft as the model of the message wants it: runs of text, and the objects the user
 * picked out of a menu. `value` is these joined into one string, with a mention written
 * as its trigger and label; the segments keep the `id` the string cannot.
 */
export type PromptSegment =
  | { type: "text"; text: string }
  | { type: "mention"; trigger: string; id: string; label: string };

/** One row of a trigger menu, and what becomes of it once picked. */
export interface PromptTriggerItem {
  description?: string;
  icon?: ReactNode;
  /** What the picked mention carries into `segments`. */
  id: string;
  /** Written after the trigger, and what the query is matched against. */
  label: string;
}

export interface PromptInputEditorProps extends Omit<
  ComponentProps<"div">,
  "defaultValue" | "onChange" | "onKeyDown" | "onSubmit"
> {
  /**
   * The editor's own props, plus the cap. It replaces `PromptInputTextarea` when the
   * draft needs to hold more than text, and keeps the textarea's rules: it grows then
   * scrolls, never shrinks below two lines, Enter sends and Shift+Enter breaks the line.
   */
  maxHeight?: number;
  placeholder?: string;
}

export interface PromptInputTriggerProps {
  /** The character that opens the menu, e.g. `"@"` or `"/"`. */
  char: string;
  /**
   * The rows to offer. An array is filtered by what follows the trigger; a function gets
   * that query and returns the rows itself, for a list that lives behind a search. Omit it
   * and nothing is drawn — a trigger with nothing to offer should not swallow the key.
   */
  items?:
    | PromptTriggerItem[]
    | ((query: string) => PromptTriggerItem[] | Promise<PromptTriggerItem[]>);
  /** Only opens at the start of a line, the way a command does. */
  lineStart?: boolean;
  /**
   * Called with the picked row. Return `false` to run it without leaving a mention in the
   * draft, for a command that acts on the spot instead of becoming part of the message.
   */
  onSelect?: (item: PromptTriggerItem) => boolean | undefined;
}
