import type { ComponentProps } from "react";

import type { AttachmentProps } from "@/components/ui/attachment";
import type { ButtonProps } from "@/components/ui/button";
import type { ProviderId } from "@/components/ui/provider-mark";

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
  /** Called with the trimmed draft — Enter or the submit part. */
  onSubmit?: (value: string) => void;
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
