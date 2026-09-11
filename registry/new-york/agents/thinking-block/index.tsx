"use client";

import { ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Streamdown } from "streamdown";

import { AgentDisclosure } from "@/components/agents/agent-disclosure";
import { WaitingRow, formatDuration } from "@/components/ui/waiting-row";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

/* -- The window ---------------------------------------------------------------
 * Reasoning arrives longer than anyone wants to read it and slower than the answer
 * it is reasoning towards. So the block is a short window onto a long stream: a
 * fixed height, a mask that says there is more below, and a follow that keeps the
 * newest line where the eye already is.
 *
 * The follow is the part worth being careful about. Appending a line and pinning
 * `scrollTop` to the bottom is what every transcript does, and it is a visible step:
 * the scroll jumps by the height of the new lines and the whole passage lurches up.
 * Instead the jump is taken and immediately cancelled — the window is re-pinned, the
 * stream is translated down by exactly what the pin took, and that transform is left
 * to relax to zero. The eye never sees a step, only a rise, and the transform is
 * composited rather than laid out. An interrupted rise is picked up where it stopped,
 * so a fast stream reads as one glide instead of a stutter per line.
 *
 * Two things about that are easy to get wrong, and both of them read as the block
 * twitching on every wrap:
 *
 *  - The rise is sized by what the *scroll* took, not by how much the text grew. Under
 *    the window's height there is nothing to scroll, the pin takes nothing, and the
 *    passage must not move at all — a block that rises here is rising at nothing.
 *  - Growth, position and the mask are all read off the laid-out height of the stream,
 *    never off `scrollHeight`. A rise in flight really has translated the stream past
 *    the bottom of its box, and the browser counts that as overflow; a follow that
 *    believed it would be chasing the animation that is trying to hide the movement.
 * --------------------------------------------------------------------------- */

/** The window's height when the caller has no opinion: nine lines of `text-sm`
 *  reasoning and a wrap. Enough that a thought can be read in one go, short enough
 *  that the block never becomes the answer it is attached to. */
const DEFAULT_HEIGHT = 208;

/** How much of an edge the mask spends on its ramp, in px. Also the distance over
 *  which the ramp is eased in, which is what keeps the mask from snapping off the
 *  moment the last line comes into view. */
const FADE = 28;

/** A scroll position this close to the bottom still counts as following the stream.
 *  Sub-pixel layout means "at the bottom" is rarely exactly zero. */
const SLACK = 8;

/** One rise, in ms. Long enough to read as motion rather than a repaint, short enough
 *  that a line arriving mid-rise is not still travelling when the next one lands. */
const RISE_MS = 240;

/** `EASE_OUT`, spelled the way the Web Animations API wants it. */
const RISE_EASING = `cubic-bezier(${EASE_OUT.join(", ")})`;

/**
 * The mask, as two ramps off one constant. Each edge fades in over the last `FADE` px
 * of hidden content, so a window that has nothing above it — or below it — has no
 * gradient at all, and the two states meet without a snap. Only the bottom edge is the
 * sign the block is known for; the top one is there so a window scrolled into the
 * middle of a thought does not shear the previous line off at the lid.
 */
const edgeMask = (above: number, below: number) => {
  const top = Math.round(Math.min(1, above / FADE) * FADE);
  const bottom = Math.round(Math.min(1, below / FADE) * FADE);

  return `linear-gradient(to bottom, rgb(0 0 0 / 0) 0, black ${top}px, black calc(100% - ${bottom}px), rgb(0 0 0 / 0) 100%)`;
};

/** Where an in-flight rise currently has the stream, in px. `getComputedStyle` reads
 *  the animated value, which is what lets a second rise start from the first one's
 *  position instead of from rest. */
const riseOffset = (node: HTMLElement) => {
  const { transform } = getComputedStyle(node);

  return transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42;
};

/**
 * How much of the stream sits below the window's bottom edge, in px.
 *
 * Read off the laid-out height rather than `scrollHeight`, which is the tempting one and
 * the wrong one: a rise in flight really has translated the stream past the bottom of its
 * box, the browser counts that as overflow, and following it would mean chasing the very
 * animation that is trying to hide the movement.
 */
const hiddenBelow = (node: HTMLDivElement, height: number) =>
  Math.max(0, height - node.clientHeight - node.scrollTop);

export interface ThinkingBlockProps {
  /** The reasoning so far, as markdown. Unfinished markdown is expected — that is what
   *  Streamdown is here for. */
  children: string;
  className?: string;
  /** Whether it starts open. Open is the useful default: the block is only interesting
   *  while it is still being written. */
  defaultOpen?: boolean;
  /** What to call a finished pass. Present tense for `label`, past for this. */
  doneLabel?: string;
  /** Seconds the pass took, when the caller owns the number. Otherwise the block
   *  measures its own — the same count the row was already showing. */
  duration?: number;
  /** The window's height. A number is px. */
  height?: number | string;
  /** What the row says while it waits. */
  label?: string;
  onOpenChange?: (open: boolean) => void;
  /** Controlled. Pair with `onOpenChange`. */
  open?: boolean;
  /** Epoch ms the pass started, so a remount does not restart the count. */
  startedAt?: number;
  /** Still arriving. Reads as a live row, follows its own tail, and holds the finished
   *  count when it stops. */
  streaming?: boolean;
}

export const ThinkingBlock = ({
  children,
  className,
  defaultOpen = true,
  doneLabel = "Thought",
  duration,
  height = DEFAULT_HEIGHT,
  label = "Thinking",
  onOpenChange,
  open,
  startedAt,
  streaming = false,
}: ThinkingBlockProps) => {
  const reduce = useReducedMotion() ?? false;
  const bodyId = useId();
  const mountedAt = useRef(Date.now());
  const origin = startedAt ?? mountedAt.current;

  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = open ?? uncontrolledOpen;

  // The count the row froze on, captured off the falling edge of `streaming` rather
  // than ticked in state: a second-by-second re-render would land in the middle of the
  // rise below, which is the one thing that must not stutter. `null` means nothing
  // streamed here, so there is no honest number to print and the label stands alone.
  const [held, setHeld] = useState<number | null>(null);
  const wasStreaming = useRef(streaming);

  useEffect(() => {
    if (streaming) {
      wasStreaming.current = true;
      setHeld(null);
      return;
    }

    if (wasStreaming.current) {
      setHeld(Math.max(0, Math.floor((Date.now() - origin) / 1000)));
    }

    wasStreaming.current = false;
  }, [origin, streaming]);

  const seconds = duration ?? held;

  const windowRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  /** The stream's laid-out height. Negative until the first measurement, which is what
   *  keeps the mount itself from being read as growth and rising into place. */
  const layout = useRef(-1);
  const following = useRef(true);
  const rise = useRef<Animation | null>(null);

  /**
   * Pins the window to the bottom of the *laid out* stream, and hands back what the
   * scroll actually took. Under the window's height there is nothing to scroll, so this
   * is zero and appending to the text must move nothing at all — which is the whole
   * difference between a passage growing and a passage lurching.
   */
  const pinToBottom = () => {
    const node = windowRef.current;
    if (!node) {
      return 0;
    }

    const before = node.scrollTop;
    node.scrollTop = Math.max(0, layout.current - node.clientHeight);

    return node.scrollTop - before;
  };

  /**
   * Painted straight into the DOM, because this runs on every scroll frame and a mask
   * that went through React would re-render the markdown under it — the same reason the
   * loading row writes its clock by hand.
   */
  const paintMask = useCallback(() => {
    const node = windowRef.current;
    if (!node) {
      return;
    }

    const mask = edgeMask(node.scrollTop, hiddenBelow(node, layout.current));

    node.style.maskImage = mask;
    node.style.setProperty("-webkit-mask-image", mask);
  }, []);

  useLayoutEffect(() => {
    const node = windowRef.current;
    const stream = streamRef.current;
    if (!(node && stream)) {
      return;
    }

    const { height } = stream.getBoundingClientRect();
    const grown = layout.current < 0 ? 0 : height - layout.current;
    layout.current = height;

    // A token that only lengthens a line changes nothing below it, and a reader who has
    // scrolled up has asked not to be dragged along. Neither is a reason to move.
    if (grown <= 0 || !following.current) {
      paintMask();
      return;
    }

    // Under the window's height this takes nothing, which is what keeps a passage that
    // still fits in its window from bobbing on every wrap.
    const moved = pinToBottom();

    if (moved > 0 && !reduce) {
      // The pin has just moved the passage up by `moved`. The rise starts by moving it
      // back down by the same amount — plus whatever a previous rise had left over — and
      // is then left to relax, so there is no frame in which the step is on screen.
      const from = riseOffset(stream) + moved;

      rise.current?.cancel();
      rise.current = stream.animate(
        [
          { transform: `translateY(${from}px)` },
          { transform: "translateY(0)" },
        ],
        { duration: RISE_MS, easing: RISE_EASING }
      );
    }

    paintMask();
  }, [children, paintMask, reduce]);

  useEffect(() => {
    const node = windowRef.current;
    if (!node) {
      return;
    }

    // The disclosure grows the window from nothing, the viewport changes, the reader's
    // own font size changes — the ramp is drawn against the box, so it is repainted
    // whenever the box is not what it was. The stream is re-measured here too, because
    // its height changes for reasons that are not new text: a narrower window re-wraps
    // every line.
    const observer = new ResizeObserver(() => {
      const stream = streamRef.current;
      if (stream) {
        const { height } = stream.getBoundingClientRect();
        layout.current = height;
      }

      if (following.current) {
        pinToBottom();
      }
      paintMask();
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, [paintMask]);

  useEffect(() => () => rise.current?.cancel(), []);

  // Opened mid-stream, the block should show the tail of the thought rather than the
  // first line of it — the newest text is the whole reason to look.
  useEffect(() => {
    if (!(isOpen && streaming)) {
      return;
    }

    following.current = true;
    pinToBottom();
    paintMask();
  }, [isOpen, paintMask, streaming]);

  const readScroll = () => {
    const node = windowRef.current;
    if (!node) {
      return;
    }

    following.current = hiddenBelow(node, layout.current) <= SLACK;
    paintMask();
  };

  const toggle = () => {
    const next = !isOpen;

    if (open === undefined) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  };

  return (
    <div
      className={cn("group/thinking flex flex-col", className)}
      data-slot="thinking-block"
      data-streaming={streaming}
    >
      <button
        aria-controls={bodyId}
        aria-expanded={isOpen}
        className={cn(
          "flex w-fit max-w-full cursor-pointer items-center gap-1.5 rounded-md text-left outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring"
        )}
        onClick={toggle}
        type="button"
      >
        {streaming ? (
          <WaitingRow
            className="text-muted-foreground transition-colors group-hover/thinking:text-foreground"
            label={label}
            startedAt={startedAt}
          />
        ) : (
          <span className="text-muted-foreground text-sm transition-colors group-hover/thinking:text-foreground">
            {seconds === null
              ? doneLabel
              : `${doneLabel} for ${formatDuration(seconds)}`}
          </span>
        )}

        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="flex shrink-0 items-center"
          initial={false}
          transition={
            reduce ? { duration: 0 } : { duration: 0.2, ease: EASE_OUT }
          }
        >
          <ChevronDown
            aria-hidden="true"
            className="size-3.5 text-muted-foreground"
          />
        </motion.span>
      </button>

      <AgentDisclosure id={bodyId} open={isOpen}>
        {/* Padding lives here rather than on the disclosure, which is `height: 0` when
            closed and would still show it. */}
        <div className="pt-3">
          <div
            // Hidden scrollbar, deliberately: the ramp below is the affordance, and a
            // second one — one that appears and disappears with the content — is noise
            // over the text. `overscroll-contain` keeps the page still when a reader
            // scrolls the window to its end, and `overflow-anchor` is off because the
            // position is ours to hold: the browser's own anchoring would adjust it
            // again behind the pin, by a different amount, every time a line wraps.
            className="no-scrollbar overflow-y-auto overscroll-contain [overflow-anchor:none]"
            data-slot="thinking-window"
            onScroll={readScroll}
            ref={windowRef}
            style={{ height }}
          >
            <div className="flow-root" ref={streamRef}>
              <Streamdown
                className="text-sm leading-relaxed text-muted-foreground"
                controls={false}
                lineNumbers={false}
                mode={streaming ? "streaming" : "static"}
              >
                {children}
              </Streamdown>
            </div>
          </div>
        </div>
      </AgentDisclosure>
    </div>
  );
};
