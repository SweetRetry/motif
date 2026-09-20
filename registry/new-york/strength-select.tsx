"use client";

import { useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

import { cn } from "@/lib/utils";

/* -- The seats ----------------------------------------------------------------
 * Strength is a level, not a length: the stops have names, and nothing exists between
 * them. So the track takes a slider's gesture without a slider's value — the pointer runs
 * freely along it and the seat it is standing in is the level it lands on. The snap comes
 * from the seats rather than from a length rounded to a step, which is why a press on a
 * name under the track and a drag across it agree: both are asking the same partition.
 *
 * Each level owns a seat, and the fill — the seats up to and including the chosen one — is
 * the amount, drawn as an amount, with the playhead standing on its leading edge. That
 * edge is the chosen seat's boundary, so the playhead sits up to one seat ahead of the
 * pointer that chose it: the seat is what you press, and the level is told once, as a
 * length.
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

/** How far the playhead's bar is held inside the track, so a bar at either end is a whole
 *  bar rather than half of one. The duration slider holds its own back by the same amount:
 *  the two controls stand in the same column of the same form. */
const PLAYHEAD_INSET = 2;

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

/**
 * Where the playhead stands for a percentage of the track, clamped a whole bar inside it.
 * The fill and the seats use the percentage itself: they are the measure, and a measure
 * that stopped short of its own ends would put the playhead a few pixels off the boundary
 * it is supposed to be standing on.
 */
const playheadLeft = (pct: number) =>
  `clamp(${PLAYHEAD_INSET}px, ${pct}%, calc(100% - ${PLAYHEAD_INSET}px))`;

export interface StrengthSelectProps {
  /**
   * Names the track for assistive tech, e.g. `"Strength"` or `"Reasoning effort"`. The
   * heading above the control is the caller's to draw — the component ships no label,
   * because a field's label belongs to the form around it.
   */
  "aria-label"?: string;
  className?: string;
  /**
   * Called with the chosen level as soon as the pointer or a key lands on one. A drag
   * calls it once per seat it crosses and never for a point between two of them — every
   * crossing is a whole named level rather than an intermediate number — so an owning form
   * sees a handful of settled values and no stream of in-flight ones.
   */
  onChange: (value: string) => void;
  /** Levels to offer, weakest first. Five is the designed-for count. */
  options?: readonly string[];
  /** The level currently in effect. */
  value: string;
}

/**
 * Strength as a track you drag: the playhead rides the fill's leading edge, and the seat
 * the pointer is in is the level it lands on. The level names sit under the track, one per
 * seat, where they can be read and pressed. The three ways of choosing are one control —
 * a drag, a press and an arrow key all resolve to a seat.
 */
export const StrengthSelect = ({
  "aria-label": ariaLabel,
  className,
  onChange,
  options = DEFAULT_OPTIONS,
  value,
}: StrengthSelectProps) => {
  const [hoveredSeat, setHoveredSeat] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const selectedIndex = options.indexOf(value);
  const colCount = Math.max(1, options.length);
  // The fill is the amount chosen, so the first seat fills a fifth of the track and the
  // last fills all of it. A value outside the list draws no fill at all.
  const filledPct =
    selectedIndex === -1 ? 0 : ((selectedIndex + 1) / colCount) * 100;
  // The top of the list, wherever the list ends — three levels or nine.
  const isTop = selectedIndex !== -1 && selectedIndex === colCount - 1;

  /**
   * The seat a pointer is standing in. The seats are equal columns of the track and the
   * names under them are the same columns, so a press on a name picks that name's level.
   *
   * It is the inverse of the fill's mapping and deliberately not its mirror: the fill is a
   * length that ends on the chosen seat's far edge, while a point is a seat. Snapping to
   * the nearest edge instead would put the pointer on `Low` at a fifth of the way across
   * the track, which is where the name `Medium` sits.
   */
  const seatAt = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) {
      return null;
    }
    // The track's right edge is the far edge of the last seat, so a pointer held against
    // it lands on the last level rather than one past it.
    const pct = Math.min(
      1,
      Math.max(0, (event.clientX - rect.left) / rect.width)
    );
    return Math.min(colCount - 1, Math.floor(pct * colCount));
  };

  /** A seat asked for that is not the one already chosen. The guard is what keeps a drag
   *  from re-committing the same level on every pointer move inside a seat. */
  const choose = (seat: number) => {
    if (seat !== selectedIndex) {
      onChange(options[seat]);
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const seat = seatAt(event);
    if (seat === null) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    setHoveredSeat(seat);
    // Unguarded, unlike a move: a press on the level already chosen is the press that says
    // "this one", which is how the seats answered before the track could be dragged.
    onChange(options[seat]);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const seat = seatAt(event);
    if (seat === null) {
      return;
    }
    if (seat !== hoveredSeat) {
      setHoveredSeat(seat);
    }
    if (isDragging) {
      choose(seat);
    }
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) {
      return;
    }
    setIsDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer can already be gone; releasing twice is not an error worth surfacing.
    }
  };

  /** The tint is the pointer's, so it goes when the pointer does — but not mid-drag, where
   *  a capture carrying the pointer off the control is still choosing a level. */
  const handlePointerLeave = () => {
    if (!isDragging) {
      setHoveredSeat(null);
    }
  };

  /** The arrows walk the seats, one level a press. The focus stays where it is: the
   *  control is one tab stop and the selection is what moves, so a level is never focused
   *  without being chosen. A value the list no longer holds walks to an end of it. */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = options.length - 1;
    let next: number | null = null;

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowUp": {
        next = Math.max(0, selectedIndex - 1);
        break;
      }
      case "ArrowRight":
      case "ArrowDown": {
        next = Math.min(last, selectedIndex + 1);
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
    // The keyboard has no pointer, and a tint left behind by the mouse would be pointing
    // at a seat the keys have already walked away from.
    setHoveredSeat(null);
    choose(next);
  };

  return (
    <div
      aria-label={ariaLabel}
      aria-valuemax={colCount - 1}
      aria-valuemin={0}
      aria-valuenow={selectedIndex === -1 ? undefined : selectedIndex}
      aria-valuetext={selectedIndex === -1 ? undefined : options[selectedIndex]}
      className={cn(
        "group relative cursor-ew-resize touch-none select-none outline-none",
        className
      )}
      onKeyDown={handleKeyDown}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="slider"
      tabIndex={0}
    >
      {/* The track, drawn behind the seats. The fill is the amount chosen and its leading
          edge is the boundary of the chosen seat — the level is told once, as a length. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-9 overflow-hidden rounded-lg border border-border/50 bg-muted/20 group-focus-visible:ring-1 group-focus-visible:ring-ring"
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 overflow-hidden bg-accent",
            isDragging
              ? "transition-none"
              : "transition-[width] duration-150 ease-out motion-reduce:transition-none"
          )}
          style={{ width: `${filledPct}%` }}
        >
          {/* The drift, and only at the ceiling. Each mote's carrier spans the fill, so
              `100%` of its travel is the fill's own width whatever the level is worth and
              nothing is measured in pixels. `strength-mote` ships with the registry item
              and is in globals.css for this page. */}
          {isTop ? (
            <span className="absolute inset-0 motion-reduce:hidden">
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

        {/* The playhead, standing on the fill's leading edge — the boundary of the level
            chosen — and drawn only when there is a boundary to stand on. It is the bar the
            duration slider carries, in the same place on the same track, because the two
            controls stand in one column of one form. */}
        {selectedIndex === -1 ? null : (
          <div
            className={cn(
              "absolute inset-y-0",
              isDragging
                ? "transition-none"
                : "transition-[left] duration-150 ease-out motion-reduce:transition-none"
            )}
            style={{ left: playheadLeft(filledPct) }}
          >
            <div className="absolute top-1/2 left-1/2 h-6 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-sm" />
          </div>
        )}
      </div>

      {/* The seats, and the names they carry. A seat is the pointer's map of the track and
          the name under it is the level it stands for, so the two halves of the control
          agree about which level is about to be chosen. The names are `aria-hidden`: the
          level they spell is already the slider's `aria-valuetext`, and reading five names
          out around it would name the levels twice. */}
      <div
        aria-hidden="true"
        className="relative grid"
        style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
      >
        {options.map((option, index) => {
          const isSelected = index === selectedIndex;

          return (
            <div
              className="flex flex-col items-center gap-1 text-center"
              key={option}
            >
              {/* The seat. The tint is the foreground token at 5% — the only thing that sits
                  on the fill and the empty track alike, because `muted` and `accent` are the
                  same lightness in light mode, so a `muted` hover would vanish on the part
                  of the track the selection already covers. */}
              <span
                className={cn(
                  "flex h-9 w-full items-center justify-center transition-colors",
                  seatRadius(index, colCount),
                  hoveredSeat === index && "bg-foreground/5"
                )}
              />
              <span
                className={cn(
                  "w-full px-0.5 text-[10px] leading-[1.2] tracking-tight transition-colors",
                  isSelected
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground",
                  !isSelected && hoveredSeat === index && "text-foreground"
                )}
              >
                {option}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
