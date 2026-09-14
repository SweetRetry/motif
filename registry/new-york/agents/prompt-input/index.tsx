"use client";

import type { FormEvent } from "react";
import { useCallback, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { PromptInputContext } from "./context";
import type { PromptInputState } from "./context";
import type { PromptInputProps } from "./types";

export {
  PromptInputAttach,
  PromptInputAttachment,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
} from "./parts";
export { ModelPicker } from "./model-picker";
// Re-exported so a composer that hands its own model list over does not have to reach
// for a second import path to draw the marks on it.
export { PROVIDER_NAMES, ProviderMark } from "@/components/ui/provider-mark";
export type {
  ModelPickerProps,
  PromptAttachment,
  PromptInputAttachProps,
  PromptInputButtonProps,
  PromptInputProps,
  PromptInputTextareaProps,
  PromptModel,
} from "./types";
export type {
  ProviderId,
  ProviderMarkProps,
} from "@/components/ui/provider-mark";

/* -- The composer --------------------------------------------------------------
 * Everything an agent surface asks for passes through one box, so the box is mostly the
 * sentence: the field owns the middle, and the row under it holds only the things a
 * message can carry besides its text — what rides with it, and who answers it — plus the
 * one action that ends the turn.
 *
 * The root owns the state and draws nothing but the card. What goes in it is assembled
 * from parts: `PromptInputHeader`, `PromptInputTextarea`, `PromptInputFooter`, and
 * whatever is dropped into them. A composer is where a surface grows its own
 * conventions — a tools menu, a microphone, a quoted reply, no attach button at all —
 * and every one of those is an arrangement of these pieces rather than a prop this
 * component has to learn about first.
 *
 * Four decisions the parts inherit:
 *
 *  - Enter sends, Shift+Enter breaks the line. A composer is typed into and then sent
 *    far more often than it is made to hold a second line; the reverse is right for a
 *    form, not for this. The composition guard matters as much as the binding: an IME's
 *    Enter commits the candidate under it, and sending on that key would eat the word
 *    the user was still assembling.
 *
 *  - The field grows to its content and then scrolls, instead of pushing the card
 *    taller, and it never shrinks below two lines.
 *
 *  - Nothing is drawn that cannot do anything: no attach button without `onFiles`, no
 *    header without chips. A dead control is worse than a missing one — it costs a click
 *    to find out, and it teaches the user that this surface has parts that lie.
 *
 *  - The draft is the composer's own until `value` is passed, and a send clears it. A
 *    controlled draft belongs to the caller, who knows where the sentence goes next.
 * --------------------------------------------------------------------------- */

export const PromptInput = ({
  children,
  className,
  defaultValue,
  disabled = false,
  onStop,
  onSubmit,
  onValueChange,
  streaming = false,
  value,
  ...props
}: PromptInputProps) => {
  const [draft, setDraft] = useState(defaultValue ?? "");
  const field = useRef<HTMLTextAreaElement>(null);

  // Controlled when the caller passes `value`; otherwise the root keeps the draft and
  // clears it after a send.
  const controlled = value !== undefined;
  const text = controlled ? value : draft;

  const setValue = useCallback(
    (next: string) => {
      if (!controlled) {
        setDraft(next);
      }
      onValueChange?.(next);
    },
    [controlled, onValueChange]
  );

  const submit = useCallback(() => {
    const message = text.trim();
    if (message.length === 0 || disabled || streaming) {
      return;
    }
    onSubmit?.(message);
    if (!controlled) {
      setValue("");
    }
    field.current?.focus();
  }, [controlled, disabled, onSubmit, setValue, streaming, text]);

  const state = useMemo<PromptInputState>(
    () => ({
      canSend: text.trim().length > 0 && !disabled,
      disabled,
      field,
      setValue,
      stop: onStop,
      streaming,
      submit,
      value: text,
    }),
    [disabled, field, onStop, setValue, streaming, submit, text]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  return (
    <PromptInputContext.Provider value={state}>
      <form
        className={cn(
          "flex w-full max-w-2xl flex-col rounded-3xl border border-border bg-card p-2.5 transition-colors duration-150 ease-out focus-within:border-ring/50",
          disabled && "opacity-60",
          className
        )}
        onSubmit={handleSubmit}
        {...props}
      >
        {children}
      </form>
    </PromptInputContext.Provider>
  );
};
