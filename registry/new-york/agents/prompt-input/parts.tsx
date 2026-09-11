"use client";

import { ArrowUp, Plus, Square } from "lucide-react";
import type { ChangeEvent, ComponentProps, KeyboardEvent } from "react";
import { Children, useLayoutEffect, useRef } from "react";

import type { AttachmentProps } from "@/components/ui/attachment";
import { Attachment } from "@/components/ui/attachment";
import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { usePromptInput } from "./context";
import type {
  PromptInputAttachProps,
  PromptInputButtonProps,
  PromptInputTextareaProps,
} from "./types";

/* -- The parts -----------------------------------------------------------------
 * A composer is four decisions stacked — what rides with the message, what it says,
 * what it can be sent with, and how it ends — and each one is a part, so a caller can
 * take the stack apart. A tools menu, a microphone, a quote of the message being
 * answered, a composer with no attach button: all of them are a different arrangement
 * of the same pieces rather than a prop this file has to know about.
 *
 * The parts that need the root's state read it from context and the rest take no
 * context at all, so `PromptInputHeader` and `PromptInputFooter` are ordinary flex rows
 * that happen to be named after where they sit.
 * --------------------------------------------------------------------------- */

/** How tall the field may grow before it scrolls: four lines of `text-base` and a wrap.
 *  Enough for a paragraph, short of half the window. */
const MAX_FIELD_HEIGHT = 200;

/** The field holds at least two lines even when it is empty. One line of text in a box
 *  this wide reads as a single-line input, which is not what this is — the second line is
 *  the room the draft is visibly allowed to grow into. */
const MIN_ROWS = 2;

/** The footer's round controls are the platform button at one size, so the row reads as
 *  one row rather than three buttons that happen to be next to each other. Everything
 *  else — hover, focus ring, the disabled treatment — is the button's own. */
const ROUND_CONTROL = "size-10 shrink-0 rounded-full";

/**
 * The row above the field: what rides with the message. For attachments, quotes of the
 * message being answered, a warning about the draft — anything that is *about* the text
 * rather than part of it.
 *
 * It draws nothing when it holds nothing, so a composer that always renders its header
 * does not pay for one when there is nothing to put in it.
 */
export const PromptInputHeader = ({
  children,
  className,
  ...props
}: ComponentProps<"div">) =>
  Children.toArray(children).length === 0 ? null : (
    <div className={cn("flex flex-wrap gap-2.5 p-1.5", className)} {...props}>
      {children}
    </div>
  );

/**
 * A chip in the header: the attachment card plus the one thing the header adds — it
 * fades in. Chips land one at a time and the row reflows around them, so a chip that
 * appears whole is a tear in the row; the fade is the difference, and it is short enough
 * that a picked file still feels like it landed instantly.
 *
 * The fade is a CSS animation, not a motion one, and that is the point: chips already in
 * the draft when the page loads are in the markup at full opacity, so reopening a thread
 * with five attachments does not replay their arrival, and no inline `opacity: 0` is left
 * waiting on hydration for a script that never runs. It is skipped outright under
 * `prefers-reduced-motion`.
 *
 * Props are the chip's own, so `onRemove` is what makes it removable and `progress`
 * under 100 is what draws the upload ring.
 */
export const PromptInputAttachment = ({
  className,
  ...props
}: AttachmentProps) => (
  <Attachment
    className={cn(
      "animate-in fade-in zoom-in-95 duration-150 motion-reduce:animate-none",
      className
    )}
    {...props}
  />
);

/**
 * The field. It grows to its content and then scrolls instead of pushing the card
 * taller — a composer is anchored to the bottom of the window in every app that has one,
 * and a draft long enough to fill the viewport would otherwise be a draft you cannot see
 * the end of.
 *
 * Enter sends, Shift+Enter breaks the line, and a composition in progress is left alone:
 * an IME's Enter commits the candidate under it, and sending on that key would eat the
 * word the user was still assembling.
 */
export const PromptInputTextarea = ({
  className,
  maxHeight = MAX_FIELD_HEIGHT,
  onKeyDown,
  rows,
  style,
  ...props
}: PromptInputTextareaProps) => {
  const { disabled, field, setValue, submit, value } = usePromptInput();
  // Two empty lines in px, measured once off the field itself so it stays true if the
  // type scale changes.
  const floor = useRef(0);

  useLayoutEffect(() => {
    const node = field.current;
    if (!node) {
      return;
    }
    if (floor.current === 0) {
      const styles = window.getComputedStyle(node);
      const frame =
        Number.parseFloat(styles.paddingTop) +
        Number.parseFloat(styles.paddingBottom);
      floor.current = Number.parseFloat(styles.lineHeight) * MIN_ROWS + frame;
    }
    // `auto` first: a field sitting at its old height cannot report a shorter
    // `scrollHeight`, because its own padding box counts as overflow.
    node.style.height = "auto";
    const wanted = Math.max(node.scrollHeight, floor.current);
    node.style.height = `${Math.min(wanted, maxHeight)}px`;
    node.style.overflowY = node.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [field, maxHeight, value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event);
    if (
      event.defaultPrevented ||
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }
    event.preventDefault();
    submit();
  };

  return (
    <textarea
      {...props}
      className={cn(
        "w-full resize-none bg-transparent px-2 py-2.5 text-base leading-relaxed outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
        className
      )}
      disabled={disabled}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={handleKeyDown}
      ref={field}
      rows={rows ?? MIN_ROWS}
      style={{ maxHeight, ...style }}
      value={value}
    />
  );
};

/** The row under the field: what the message can be sent with, and the button that sends
 *  it. */
export const PromptInputFooter = ({
  className,
  ...props
}: ComponentProps<"div">) => (
  <div className={cn("flex items-center gap-1", className)} {...props} />
);

/** A round control in the footer: the platform `Button` at 40px round, with every
 *  variant, size and feedback prop it already has left intact. */
export const PromptInputButton = ({
  className,
  size = "icon",
  variant = "ghost",
  ...props
}: PromptInputButtonProps) => (
  <Button
    className={cn(ROUND_CONTROL, className)}
    size={size}
    variant={variant}
    {...props}
  />
);

/**
 * The plus: the composer's own file input, opened by a button rather than drawn. It
 * resets the input after a pick, so choosing the same file twice in a row counts twice,
 * and hands focus back to the field, because the next thing the user does is type.
 */
export const PromptInputAttach = ({
  accept,
  onFiles,
  ...props
}: PromptInputAttachProps) => {
  const { field } = usePromptInput();
  const input = useRef<HTMLInputElement>(null);

  if (!onFiles) {
    return null;
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = [...(event.target.files ?? [])];
    if (chosen.length > 0) {
      onFiles(chosen);
    }
    event.target.value = "";
    field.current?.focus();
  };

  return (
    <>
      <PromptInputButton
        aria-label="Attach files"
        onClick={() => input.current?.click()}
        type="button"
        {...props}
      >
        <Plus className="size-5" strokeWidth={1.75} />
      </PromptInputButton>
      <input
        accept={accept}
        className="hidden"
        multiple
        onChange={handleChange}
        ref={input}
        type="file"
      />
    </>
  );
};

/**
 * The one button that ends the turn, taking the trailing edge of the row. While an
 * answer is arriving it becomes stop: the only thing worth doing to the composer then is
 * stopping it, and a second button beside send would make the reader choose between two
 * live actions on every frame.
 *
 * Under `streaming` there is nothing to send, so the arrow is disabled until there is.
 */
export const PromptInputSubmit = ({ className, ...props }: ButtonProps) => {
  const { canSend, stop, streaming } = usePromptInput();

  if (streaming) {
    return (
      <PromptInputButton
        aria-label="Stop"
        className={cn("ml-auto", className)}
        onClick={stop}
        type="button"
        variant="default"
        {...props}
      >
        <Square className="size-3.5 fill-current" strokeWidth={0} />
      </PromptInputButton>
    );
  }

  return (
    <PromptInputButton
      aria-label="Send message"
      className={cn("ml-auto", className)}
      disabled={!canSend}
      type="submit"
      variant="default"
      {...props}
    >
      <ArrowUp className="size-5" strokeWidth={2.25} />
    </PromptInputButton>
  );
};
