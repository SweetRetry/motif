"use client";

import { useReducedMotion } from "motion/react";
import type { ComponentProps } from "react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/* -- A wait, said once ---------------------------------------------------------
 * The agent is working and nothing has come back yet. That is one state, not several:
 * the reader needs to know it is alive and how long it has been, and a mark that changed
 * shape for thinking, calling a tool and streaming would be asking them to learn a
 * vocabulary to read a spinner. What the agent is doing is a word, and the word is the
 * label.
 *
 * So the row is three parts: the mark, the word, the clock. A caller who has no word
 * draws the mark alone; one who has no use for a count leaves the clock out.
 * --------------------------------------------------------------------------- */

export type LoadingStateProps = ComponentProps<"span">;
export type LoadingStateMarkProps = Omit<ComponentProps<"span">, "children">;
export type LoadingStateLabelProps = ComponentProps<"span">;

export interface LoadingStateClockProps extends Omit<
  ComponentProps<"span">,
  "children"
> {
  /** Epoch ms the wait began, so a remount does not restart the count. Defaults to the
   *  moment the clock mounts. */
  startedAt?: number;
}

/* -- Keyframe helpers ------------------------------------------------------- */

const GRID = 3;
const CELLS = GRID * GRID;
const SAMPLES = 16;

const cosineFrames = (trough: number, crest: number): Keyframe[] =>
  Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const t = i / SAMPLES;
    const v = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
    return { offset: t, opacity: trough + (crest - trough) * v };
  });

/** A negative delay starts every cell part-way through its cycle, so the wave is
 *  already travelling on the first frame instead of building up from rest. */
const lead = (offset: number, period: number) => (offset % period) - period;

/* -- The wave: a diagonal sweep ---------------------------------------------
 * Nine cells, one sampled curve, the phase of each read off the anti-diagonal it sits
 * on. Opacity only: nothing here repaints the page on a frame.
 * --------------------------------------------------------------------------- */

const WAVE_MS = 1200;
const WAVE_SPREAD = 5.5;
const WAVE_KF = cosineFrames(0.2, 0.6);

/** The frozen first frame of the wave, for a reader who has asked for no motion. */
const REST = [0.2, 0.317, 0.531, 0.592, 0.429];

const antiDiagonal = (i: number) => Math.floor(i / GRID) + (i % GRID);

/**
 * The root: the row the parts sit in. It is a live region, so the label is read when it
 * appears. The clock is hidden from it, since a count that announced itself every tenth
 * of a second would be the only thing a screen reader said.
 */
export const LoadingState = ({ className, ...props }: LoadingStateProps) => (
  <span
    {...props}
    className={cn(
      "inline-flex items-center gap-2 text-muted-foreground text-sm",
      className
    )}
    data-slot="loading-state"
    role="status"
  />
);

/** The 3×3 grid and its wave. Coloured by the text colour, so a `text-*` class recolours
 *  it. */
export const LoadingStateMark = ({
  className,
  ...props
}: LoadingStateMarkProps) => {
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || reduce) {
      return;
    }

    const animations = [...node.children].map((cell, i) =>
      cell.animate(WAVE_KF, {
        delay: lead((antiDiagonal(i) / WAVE_SPREAD) * WAVE_MS, WAVE_MS),
        duration: WAVE_MS,
        easing: "linear",
        iterations: Number.POSITIVE_INFINITY,
      })
    );

    return () => {
      for (const animation of animations) {
        animation.cancel();
      }
    };
  }, [reduce]);

  return (
    <span
      {...props}
      aria-hidden="true"
      className={cn(
        "inline-grid grid-cols-3 gap-[2.5px] text-foreground",
        className
      )}
      data-slot="loading-state-mark"
      ref={ref}
    >
      {Array.from({ length: CELLS }, (_, i) => (
        <span
          className="size-[5px] rounded-[1.3px] bg-current"
          key={i}
          style={{ opacity: REST[antiDiagonal(i) % REST.length] }}
        />
      ))}
    </span>
  );
};

/** What the agent is doing, in a word. Present tense: it is not finished. */
export const LoadingStateLabel = ({
  children,
  className,
  ...props
}: LoadingStateLabelProps) => {
  if (children === null || children === undefined || children === false) {
    return null;
  }

  return (
    <span {...props} className={className} data-slot="loading-state-label">
      {children}
    </span>
  );
};

/* -- The count ---------------------------------------------------------------
 * Tenths under a minute, because a wait that is ten seconds old is told apart from one
 * that is twenty by the digit that moves, and a whole-second count only moves once a
 * second. From a minute on, whole seconds: nobody reads the tenth of a minute-long wait.
 *
 * Tenths are floored rather than rounded, so the count never reads `60.0s` a moment
 * before it reads `1m 0s`.
 * --------------------------------------------------------------------------- */
const TICK_MS = 100;

const clockText = (elapsed: number) => {
  const ms = Math.max(0, elapsed);

  if (ms < 60_000) {
    return `${(Math.floor(ms / TICK_MS) / 10).toFixed(1)}s`;
  }

  const whole = Math.floor(ms / 1000);

  return `${Math.floor(whole / 60)}m ${String(whole % 60).padStart(2, "0")}s`;
};

/**
 * How long it has been. Written straight into the DOM, because it ticks ten times a
 * second and a count that went through React would re-render the row under it each time.
 * Mono, so the digits hold still instead of the row twitching as they change.
 */
export const LoadingStateClock = ({
  className,
  startedAt,
  ...props
}: LoadingStateClockProps) => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const origin = startedAt ?? Date.now();
    let timeout = 0;

    const tick = () => {
      const passed = Date.now() - origin;
      node.textContent = clockText(passed);
      timeout = window.setTimeout(tick, TICK_MS - (passed % TICK_MS));
    };

    tick();

    return () => window.clearTimeout(timeout);
  }, [startedAt]);

  return (
    <span
      {...props}
      aria-hidden="true"
      className={cn("font-mono tabular-nums", className)}
      data-slot="loading-state-clock"
      ref={ref}
    >
      {clockText(0)}
    </span>
  );
};
