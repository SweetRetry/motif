"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import { cn } from "@/lib/utils";

/* -- The wave -----------------------------------------------------------------
 * One idea, used twice. A point on a sampling of `cos` decides how bright a thing
 * is, and where that point starts decides when. The grid offsets it by the
 * anti-diagonal a cell sits on; the label offsets it by the letter's position. The
 * only thing either of them animates is `opacity`, which the compositor owns — so
 * nothing here repaints the page on a frame.
 * --------------------------------------------------------------------------- */

/** The grid's cycle, in ms. This number is a compromise between two floors, not a taste.
 *
 *  The low one is stillness. A cosine is flat at both ends, so a cell spends the middle
 *  of its cycle holding a tone to within a hair — and a still image outlasts roughly half
 *  a second before the eye stops reading it as a mark mid-motion and starts reading it as
 *  a mark that has stopped. At 2000ms that flat top ran longer than that, which is why the
 *  old tempo could be watched for a while and still feel like nothing was happening.
 *
 *  The high one is composure: much under a second and nine cells stop reading as one
 *  travelling crest and start reading as a lattice blinking. 1200ms keeps the crest
 *  something you follow from corner to corner, which is the point of drawing it. */
const WAVE_MS = 1200;

/** Keyframe resolution. Sampling the cosine this many times is smoother than any easing
 *  curve a browser ships, and it keeps every mark honest to the curve it came from. */
const WAVE_SAMPLES = 16;

/**
 * A full cycle of the cosine, as opacity keyframes between a trough and a crest.
 * `turn` is 0…1: the trough at both ends, the crest in the middle.
 *
 * `focus` raises the cosine to a power before it is used. At `1` the crest is half the
 * cycle wide, which on a short word is a slow swell rather than a sweep; a higher power
 * pulls the bright part in until it is a band you can watch travel.
 */
const waveKeyframes = (trough: number, crest: number, focus = 1) =>
  Array.from({ length: WAVE_SAMPLES + 1 }, (_, index) => {
    const turn = index / WAVE_SAMPLES;
    const cosine = (0.5 - 0.5 * Math.cos(turn * Math.PI * 2)) ** focus;
    return { offset: turn, opacity: trough + (crest - trough) * cosine };
  });

/**
 * A negative delay parks an animation part-way through its first cycle, so the wave is
 * already travelling on the first frame instead of easing in from a standstill. The
 * offset is subtracted rather than added, which is what sends both waves down and to
 * the right.
 */
const lead = (offset: number, period: number) => (offset % period) - period;

/* -- The grid ----------------------------------------------------------------- */

/** Side of the lattice. Nine cells is the smallest square a diagonal can travel in. */
const GRID = 3;

/** Anti-diagonals a cycle takes to come back around. The lattice only spans five of
 *  them (0…4), so a little under a whole wave is ever on screen — which is what makes
 *  the pulse travel instead of nine cells blinking together. */
const WAVE_SPREAD = 5.5;

/** Cell opacity at the trough and at the crest. */
const CELL_TROUGH = 0.2;
const CELL_CREST = 0.6;

const CELL_KEYFRAMES = waveKeyframes(CELL_TROUGH, CELL_CREST);

/** How far into the cycle a cell starts, read off the anti-diagonal it sits on. */
const phase = (index: number) =>
  (Math.floor(index / GRID) + (index % GRID)) / WAVE_SPREAD;

/** The resting opacity of a cell: the wave at `t = 0`. Drawn under the animation, and
 *  the only thing left when motion is turned down. */
const restingOpacity = (index: number) => {
  const turn = phase(index) % 1;
  const cosine = 0.5 - 0.5 * Math.cos(turn * Math.PI * 2);
  return CELL_TROUGH + (CELL_CREST - CELL_TROUGH) * cosine;
};

/* -- The label ---------------------------------------------------------------- */

/** The label's own cycle, in ms — shorter than the grid's, because a shimmer is read at
 *  the speed it crosses the word and this word is short. Shortened with the grid rather
 *  than instead of it: a quick band that only comes round every second and a half still
 *  leaves the word sitting flat between passes, and flat is the thing being fixed. */
const LETTER_WAVE_MS = 900;

/** Milliseconds each letter trails the one before it by — the launch interval rather than
 *  the fade: what a letter does takes most of a cycle, and only the crest's arrival is this
 *  quick. At 90ms a six-letter label is crossed in half a second, so the band is gone from
 *  the word and back again before a glance can arrive twice in the same place. */
const LETTER_MS = 90;

/** How hard the crest is pulled in. `3` leaves a band about two letters wide with a rest
 *  on either side of it, instead of a swell that never quite leaves. */
const LETTER_FOCUS = 3;

/** Letter opacity at the trough and at the crest. The dim end stays high enough that
 *  the word is readable the whole way through. */
const LETTER_TROUGH = 0.55;
const LETTER_CREST = 1;

const LETTER_KEYFRAMES = waveKeyframes(
  LETTER_TROUGH,
  LETTER_CREST,
  LETTER_FOCUS
);

/* -- The clock ---------------------------------------------------------------- */

/**
 * Whole seconds with an `s` on the end: `4s`, `59s`, `543s`.
 *
 * This is the half of the no-jitter work that the format can do. One unit means there is
 * no rollover to gain or lose a character at — `1m 0s` → `1m 10s` → `2m 0s` gains one
 * and hands it back every minute. What is left is the step at ten seconds and the one at
 * a hundred, and both are rare enough to live with. The other half is `tabular-nums`,
 * which stops a *single* digit changing width when it changes value, and lives on the
 * element below.
 *
 * Exported because a finished row still owes the reader the number: the thinking block
 * prints "Thought for 9s" off the same count, so the two can never disagree about a
 * second.
 */
export const formatDuration = (total: number) =>
  `${Math.max(0, Math.floor(total))}s`;

/**
 * Writes the clock straight into the DOM. React is not involved: re-rendering a tree
 * once a second to change four characters is work the browser has no reason to do, and
 * a re-render mid-wave is the kind of thing that turns a smooth animation into a
 * stutter. `controlled` is rendered by React instead, because then the value is an
 * ordinary prop.
 */
const useClock = (
  node: RefObject<HTMLSpanElement | null>,
  startedAt?: number,
  controlled?: number
) => {
  useEffect(() => {
    const element = node.current;
    if (!element || controlled !== undefined) {
      return;
    }

    const origin = startedAt ?? Date.now();
    let timeout = 0;

    const tick = () => {
      const passed = Date.now() - origin;
      element.textContent = formatDuration(passed / 1000);
      // Land on the next whole second, so the number turns over when the second does
      // rather than whenever the timer happened to fire.
      timeout = window.setTimeout(tick, 1000 - (passed % 1000));
    };

    tick();
    return () => window.clearTimeout(timeout);
  }, [controlled, node, startedAt]);
};

export interface LoadingGridProps {
  className?: string;
}

/**
 * The nine-square wave on its own, for the times the text is somewhere else on the page.
 * Decorative, and one fixed size: 5px cells and 2.5px gutters, so the lattice comes out
 * at 20px — a good deal larger than the 14px label and clock beside it, because it is the
 * mark the row is recognised by and they are only the caption under it.
 */
export const LoadingGrid = ({ className }: LoadingGridProps) => {
  const reduce = useReducedMotion() ?? false;
  const grid = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = grid.current;
    if (!node || reduce) {
      return;
    }

    // Every cell runs the same keyframes; the diagonal only shifts where it starts.
    const animations = [...node.children].map((cell, index) =>
      (cell as HTMLElement).animate(CELL_KEYFRAMES, {
        delay: lead(phase(index) * WAVE_MS, WAVE_MS),
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
      aria-hidden="true"
      className={cn("inline-grid grid-cols-3 gap-[2.5px]", className)}
      ref={grid}
    >
      {Array.from({ length: GRID * GRID }, (_, index) => (
        <span
          className="size-[5px] rounded-[1.3px] bg-current"
          key={index}
          // Without motion this is the frozen frame of the wave at t = 0, so the shape
          // of the animation survives instead of collapsing into a flat grid.
          style={{ opacity: restingOpacity(index) }}
        />
      ))}
    </span>
  );
};

export interface ShimmerTextProps {
  children: string;
  className?: string;
}

/**
 * The label as letters, each one running the grid's cosine offset by where it sits in
 * the word — the same wave, one dimension down. Opacity is the only property touched,
 * so the sweep is composited and never repaints the glyphs.
 */
export const ShimmerText = ({ children, className }: ShimmerTextProps) => {
  const reduce = useReducedMotion() ?? false;
  const node = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = node.current;
    if (!element || reduce) {
      return;
    }

    const animations = [...element.children].map((letter, index) =>
      (letter as HTMLElement).animate(LETTER_KEYFRAMES, {
        delay: lead(index * LETTER_MS, LETTER_WAVE_MS),
        duration: LETTER_WAVE_MS,
        easing: "linear",
        iterations: Number.POSITIVE_INFINITY,
      })
    );

    return () => {
      for (const animation of animations) {
        animation.cancel();
      }
    };
  }, [children, reduce]);

  return (
    // One span per character, spaces included, so the animation has something per
    // letter-shaped thing to write to. Element boundaries do not create line-break
    // opportunities, so words still wrap only at their spaces.
    <span className={cn("whitespace-pre-wrap", className)} ref={node}>
      {[...children].map((letter, index) => (
        // eslint-disable-next-line react/no-array-index-key -- letters never reorder
        <span key={index} style={{ opacity: 1 }}>
          {letter}
        </span>
      ))}
    </span>
  );
};

export interface LoadingStateProps {
  className?: string;
  /** Seconds elapsed, when something else already owns the clock. */
  elapsed?: number;
  /** What is being waited on. Shimmers. */
  label?: string;
  /** Hide the duration and leave the grid and the label. */
  showDuration?: boolean;
  /** Epoch ms the work started. Defaults to mount. */
  startedAt?: number;
}

/**
 * A row that says work is happening: the nine-square wave, the label, and how long it
 * has been going. The duration is the only part that is information, so it is the only
 * part that holds still.
 */
export const LoadingState = ({
  className,
  elapsed,
  label,
  showDuration = true,
  startedAt,
}: LoadingStateProps) => {
  const clock = useRef<HTMLSpanElement>(null);
  useClock(clock, startedAt, elapsed);

  return (
    <span
      // The tone is set here rather than inherited: a loading row dropped into muted
      // body copy would otherwise compute its whole palette off a grey and wash out.
      className={cn(
        "inline-flex items-center gap-2 text-sm text-foreground",
        className
      )}
      role="status"
    >
      <LoadingGrid />
      {label ? (
        // The live region takes a clean copy of the label, and the split-into-letters
        // one — eight text nodes in a row — is kept out of the accessibility tree.
        <>
          <span className="sr-only">{label}</span>
          <span aria-hidden="true">
            <ShimmerText>{label}</ShimmerText>
          </span>
        </>
      ) : (
        <span className="sr-only">Loading</span>
      )}
      {showDuration ? (
        // `tabular-nums` is the whole reason a single digit can change without the row
        // moving: it swaps the font's proportional figures for the tabular set, where
        // `1` is as wide as `2`. Without it the clock reflows on every tick — the exact
        // jitter that a second-by-second read-out cannot afford.
        <span
          aria-hidden="true"
          className="text-muted-foreground tabular-nums"
          ref={clock}
        >
          {formatDuration(elapsed ?? 0)}
        </span>
      ) : null}
    </span>
  );
};
