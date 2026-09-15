"use client";

import { useRef } from "react";
import type { KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

/* -- The seats ----------------------------------------------------------------
 * Strength is a level, not a length: the stops have names, and nothing exists between
 * them, so the control is a track you land on rather than a handle you drag. Each level
 * owns a seat of the track, and the fill — the seats up to and including the one chosen —
 * is the amount, drawn as an amount.
 *
 * Only the top level moves. A level is a name, and five of them do not need five
 * animations: the ceiling is the one level worth saying something extra about, and leaving
 * the levels below it still keeps the control usable in a form rather than decorative.
 * --------------------------------------------------------------------------- */

/** Levels offered when the caller does not pass their own, weakest first. */
const DEFAULT_OPTIONS = [
  "Low",
  "Medium",
  "High",
  "Extra high",
  "Ultra",
] as const;

/** How many motes cross the fill of the top level. Enough to read as drift, few enough
 *  that the eye is not counting them. */
const MOTE_COUNT = 12;

/**
 * The corners a seat's highlight carries. It is a slice of the track, so it is square on
 * every edge that meets another seat and wears the track's own radius only on the outside of
 * the row: the first seat's left corners, the last seat's right ones. Rounded everywhere it
 * reads as a pill floating in the track, and where a seat ends at the fill's leading edge
 * that corner pokes past the straight boundary the amount is drawn with.
 */
const seatRadius = (index: number, count: number) => {
  const isFirst = index === 0;
  const isLast = index === count - 1;

  if (isFirst && isLast) {
    return "rounded-lg";
  }
  if (isFirst) {
    return "rounded-l-lg";
  }
  if (isLast) {
    return "rounded-r-lg";
  }
  return "";
};

/** A signed 32-bit product as its unsigned value, so the halves below can be taken by
 *  dividing rather than by a bitwise shift — this project's lint forbids those. */
const unsigned = (value: number) => (value < 0 ? value + 4_294_967_296 : value);

/** The top half of a 32-bit value, as a whole number in `[0, 65_536)`. */
const upperHalf = (value: number) => Math.floor(unsigned(value) / 65_536);

/**
 * A stable pseudo-random in `[0, 1)`, from a mote's index rather than from `Math.random`,
 * so the server and the client draw the same row and nothing has to be generated in an
 * effect.
 *
 * Integers only, and that is the whole point. `Math.sin` is not specified to the last bit:
 * the browser's engine and the one rendering on the server disagree a few ulps out, and a
 * hash built on it wrote that disagreement straight into the `style` attribute —
 * `animation:strength-mote 3.491549070959445s` on the server against
 * `3.4915490709710864s` in the browser — which React reads as a hydration mismatch, since
 * it compares that attribute as text. `Math.imul` is exact, so this is the same number in
 * every engine.
 *
 * Multiply, keep the top half, multiply again: discarding the low half between rounds is
 * what breaks the constant step two neighbouring indices would otherwise share, so the
 * twelve motes read as scattered rather than as a run of near-identical values.
 */
const noise = (seed: number) => {
  const first = upperHalf(Math.imul(seed + 1, 2_654_435_761));
  return upperHalf(Math.imul(first + 1, 2_246_822_519)) / 65_536;
};

/** A number at a fixed precision. Two places is a hundredth of a second on a crossing and
 *  a tenth of a percent on a height — finer than the drift can show, and short enough that
 *  the `style` attribute carries a string rather than a float's full expansion. */
const rounded = (value: number, places: number) =>
  Number(value.toFixed(places));

/**
 * The motes' places, worked out once. Each starts partway through its own crossing — a
 * negative `animation-delay` is how CSS says "this animation has already been running for
 * a while" — so the row is spread across the fill at every instant rather than crossing as
 * one clump. Their crossing times differ as well, so the spread keeps shifting instead of
 * settling into a pattern.
 */
const MOTES = Array.from({ length: MOTE_COUNT }, (_, index) => {
  const duration = rounded(3.4 + noise(index + 1) * 1.6, 2);
  return {
    delay: -rounded(duration * ((index + 0.5) / MOTE_COUNT), 2),
    duration,
    id: `mote-${index}`,
    top: rounded(12 + noise(index + 21) * 76, 1),
  };
});

export interface StrengthSelectProps {
  /**
   * Names the group for assistive tech, e.g. `"Strength"` or `"Reasoning effort"`. The
   * heading above the control is the caller's to draw — the component ships no label,
   * because a field's label belongs to the form around it.
   */
  "aria-label"?: string;
  className?: string;
  /** Called with the chosen level as soon as the click or the key lands. */
  onChange: (value: string) => void;
  /** Levels to offer, weakest first. Five is the designed-for count. */
  options?: readonly string[];
  /** The level currently in effect. */
  value: string;
}

/**
 * Strength as a stepped track: one seat per level, the seats up to the chosen one filled,
 * and a slow drift of motes across the fill of the top level. The level names sit under the
 * track where they can be read and pressed. Nothing is dragged — a level has a name, so a
 * click settles it and an arrow key moves one seat.
 */
export const StrengthSelect = ({
  "aria-label": ariaLabel,
  className,
  onChange,
  options = DEFAULT_OPTIONS,
  value,
}: StrengthSelectProps) => {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.indexOf(value);
  const colCount = Math.max(1, options.length);
  // A value the list no longer holds still leaves the group reachable: Tab lands on the
  // first seat rather than nowhere.
  const tabbableIndex = selectedIndex === -1 ? 0 : selectedIndex;
  // The fill is the amount chosen, so the first seat fills a fifth of the track and the
  // last fills all of it. A value outside the list draws no fill at all.
  const filledPct =
    selectedIndex === -1 ? 0 : ((selectedIndex + 1) / colCount) * 100;
  // The top of the list, wherever the list ends — three levels or nine.
  const isTop = selectedIndex !== -1 && selectedIndex === colCount - 1;

  /** A radiogroup walks with the arrows, and here the selection *is* the focus — so the
   *  key that moves the level is the key that lands on the seat, one press, not two. */
  const move = (index: number) => {
    onChange(options[index]);
    buttonRefs.current[index]?.focus();
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    const last = options.length - 1;
    let next: number | null = null;

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowUp": {
        next = Math.max(0, index - 1);
        break;
      }
      case "ArrowRight":
      case "ArrowDown": {
        next = Math.min(last, index + 1);
        break;
      }
      case "End": {
        next = last;
        break;
      }
      case "Home": {
        next = 0;
        break;
      }
      default: {
        return;
      }
    }

    event.preventDefault();
    move(next);
  };

  return (
    <div className={cn("relative", className)}>
      {/* The track, drawn behind the seats. The fill is the amount chosen and its leading
          edge is the boundary of the chosen seat — the level is told once, as a length. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-9 overflow-hidden rounded-lg border border-border/50 bg-muted/20"
      >
        <div
          className="absolute inset-y-0 left-0 overflow-hidden bg-accent transition-[width] duration-200 ease-out motion-reduce:transition-none"
          style={{ width: `${filledPct}%` }}
        >
          {/* The drift, and only at the ceiling. Each mote's carrier spans the fill, so
              `100%` of its travel is the fill's own width whatever the level is worth and
              nothing is measured in pixels. `strength-mote` ships with the registry item
              and is in globals.css for this page. */}
          {isTop ? (
            <span className="pointer-events-none absolute inset-0 motion-reduce:hidden">
              {MOTES.map((mote) => (
                <span
                  className="absolute inset-0"
                  key={mote.id}
                  style={{
                    animation: `strength-mote ${mote.duration}s linear infinite`,
                    animationDelay: `${mote.delay}s`,
                  }}
                >
                  <span
                    className="absolute left-0 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/60"
                    style={{ top: `${mote.top}%` }}
                  />
                </span>
              ))}
            </span>
          ) : null}
        </div>
      </div>

      <div
        aria-label={ariaLabel}
        className="relative grid"
        role="radiogroup"
        style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
      >
        {options.map((option, index) => {
          const isSelected = index === selectedIndex;

          return (
            <button
              aria-checked={isSelected}
              className="group flex cursor-pointer flex-col items-center gap-1 text-center outline-none"
              key={option}
              onClick={() => onChange(option)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              ref={(node) => {
                buttonRefs.current[index] = node;
              }}
              role="radio"
              tabIndex={index === tabbableIndex ? 0 : -1}
              type="button"
            >
              {/* The seat. The pointer and the keyboard answer here, and the tint is the
                  foreground token at 5% — the only thing that sits on the fill and the
                  empty track alike, because `muted` and `accent` are the same lightness in
                  light mode, so a `muted` hover would vanish on the part of the track the
                  selection already covers. */}
              <span
                className={cn(
                  "flex h-9 w-full items-center justify-center transition-colors group-hover:bg-foreground/5 group-focus-visible:bg-foreground/5 group-focus-visible:outline-2 group-focus-visible:-outline-offset-2 group-focus-visible:outline-ring",
                  seatRadius(index, colCount)
                )}
              />
              <span
                className={cn(
                  "w-full px-0.5 text-[10px] leading-[1.2] tracking-tight transition-colors group-hover:text-foreground group-focus-visible:text-foreground",
                  isSelected
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {option}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
