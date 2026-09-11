"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

import { cn } from "@/lib/utils";

/* -- The track -----------------------------------------------------------------
 * A duration is a length of time, so it is drawn as a length. The filled clip is the
 * amount chosen, the ticks are the steps it is measured in, the handle is where you
 * are, and the HUD carries the number so the track does not have to be measured in
 * pixels. Dragging keeps the in-flight number in local state and a ref, so the track
 * paints on every move while the committed value lands once, on release.
 * --------------------------------------------------------------------------- */

/** The playhead reserves a fixed width at the left of the track, and the clip and the
 *  pointer share the same travel so the handle always sits under the cursor. */
const CLIP_MIN_WIDTH = 12;

/** The most step dots a track will draw. A `1s` step across a minute would otherwise
 *  read as one solid line rather than as intervals. */
const MAX_DOTS = 24;

/**
 * Where a percentage of the range lands on the track — the travel the clip's leading
 * edge and the pointer both use, so a dot and the handle agree on where a step is.
 */
const travelLeft = (pct: number) =>
  `calc(${pct}% + ${CLIP_MIN_WIDTH * (1 - pct / 100)}px)`;

/**
 * The steps, as values to dot along the track. Both ends are left out: the ends are the
 * track's own edges, and half a dot on a rounded corner reads as a rendering bug.
 * When the span holds more steps than the track can show, the steps are thinned to a
 * stride so the dots stay dots and still mark equal intervals.
 */
const stepDots = (min: number, max: number, step: number) => {
  const span = max - min;
  if (!(span > 0) || !(step > 0)) {
    return [];
  }
  const stride = Math.ceil(span / step / MAX_DOTS);
  const values: number[] = [];
  for (let i = stride; i * step < span; i += stride) {
    values.push(min + i * step);
  }
  return values;
};

/** A range value from the outside world, clamped into `[min, max]`; `min` if unusable. */
const asNumber = (value: string | number, min: number, max: number) => {
  const next = typeof value === "number" ? value : Number(value);
  return Number.isFinite(next) && next >= min && next <= max ? next : min;
};

export interface DurationSelectProps {
  /**
   * Names the track for assistive tech, e.g. `"Duration"` or `"Clip length"`. The
   * heading above the control is the caller's to draw — the component ships no label,
   * because a field's label belongs to the form around it.
   */
  "aria-label"?: string;
  className?: string;
  /** Upper bound of the track. */
  max: number;
  /** Lower bound of the track. */
  min: number;
  /**
   * Called with the chosen value once the drag ends or a key is pressed — not on every
   * pointer move. Wire this to the state that owns the value.
   */
  onCommit: (value: string) => void;
  /** Snap interval. Defaults to `1`. */
  step?: number;
  /** Suffix printed after the number. Defaults to `"s"`. */
  unit?: string;
  /** The duration currently in effect. */
  value: string | number;
}

/**
 * Duration as a compact clip on a timeline. Dragging moves the playhead and a HUD
 * carries the live value; the value is only committed on release, so an owning form
 * sees one settled number instead of a stream of intermediate ones.
 */
export const DurationSelect = ({
  "aria-label": ariaLabel,
  className,
  max,
  min,
  onCommit,
  step = 1,
  unit = "s",
  value,
}: DurationSelectProps) => {
  const [draftValue, setDraftValue] = useState(() => asNumber(value, min, max));
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const draftValueRef = useRef(draftValue);
  const isDraggingRef = useRef(isDragging);
  draftValueRef.current = draftValue;
  isDraggingRef.current = isDragging;

  // Follow the value prop when someone else changes it — but never mid-drag, or the
  // track would snap back under the finger.
  useEffect(() => {
    if (isDraggingRef.current) {
      return;
    }
    const next = asNumber(value, min, max);
    setDraftValue(next);
    draftValueRef.current = next;
  }, [value, min, max]);

  const pct = Math.min(
    100,
    Math.max(0, ((draftValue - min) / (max - min)) * 100)
  );
  const dots = stepDots(min, max, step);

  const updateFromPointer = useCallback(
    (clientX: number, target: HTMLElement) => {
      const rect = target.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }
      // `offsetWidth`/`clientLeft` account for the track's own border, so the pointer
      // maps to the same travel the clip uses.
      const relativeX =
        ((clientX - rect.left) / rect.width) * target.offsetWidth -
        target.clientLeft;
      const travelWidth = target.clientWidth - CLIP_MIN_WIDTH;
      if (travelWidth <= 0) {
        return;
      }
      const rawPct = Math.min(
        1,
        Math.max(0, (relativeX - CLIP_MIN_WIDTH) / travelWidth)
      );
      const rawVal = min + rawPct * (max - min);
      const stepped = Math.round((rawVal - min) / step) * step + min;
      const clamped = Math.min(max, Math.max(min, stepped));
      setDraftValue(clamped);
      draftValueRef.current = clamped;
    },
    [max, min, step]
  );

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    updateFromPointer(event.clientX, event.currentTarget);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      updateFromPointer(event.clientX, event.currentTarget);
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
    onCommit(String(draftValueRef.current));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      next = Math.max(min, draftValue - step);
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      next = Math.min(max, draftValue + step);
    }
    if (next === null) {
      return;
    }
    event.preventDefault();
    setDraftValue(next);
    draftValueRef.current = next;
    onCommit(String(next));
  };

  const showHud = isDragging || isHovering;

  return (
    <div className={cn("relative pt-3", className)}>
      {/* The live timecode, parked above the playhead and clamped off the edges. */}
      <div
        className={cn(
          "pointer-events-none absolute -top-3 -translate-x-1/2 rounded bg-foreground px-1.5 py-0.5 font-mono font-semibold text-background text-xs shadow-md transition-all duration-150",
          showHud ? "scale-100 opacity-100" : "scale-95 opacity-0"
        )}
        style={{ left: `${Math.min(92, Math.max(8, pct))}%` }}
      >
        <span>
          {draftValue}
          {unit}
        </span>
        <div className="absolute -bottom-0.5 left-1/2 size-1.5 -translate-x-1/2 rotate-45 bg-foreground" />
      </div>

      <div
        aria-label={ariaLabel}
        aria-valuemax={max}
        aria-valuemin={min}
        aria-valuenow={draftValue}
        className="group relative flex h-9 w-full cursor-ew-resize touch-none select-none items-center overflow-hidden rounded-lg border border-border/50 bg-muted/20 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        ref={trackRef}
        role="slider"
        tabIndex={0}
      >
        {/* The chosen clip. */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-r-lg border border-border/80 bg-accent shadow-xs",
            isDragging
              ? "transition-none"
              : "transition-[width] duration-150 ease-out"
          )}
          style={{ width: travelLeft(pct) }}
        />

        {/* The intervals the value is measured in, dotted along the track. They are
              drawn over the clip rather than under it: the intervals you have already
              covered are still part of the ruler, and a dot that vanishes as the clip
              runs over it reads as a glitch instead of as progress. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          {dots.map((dot) => (
            <span
              className="absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/30"
              key={dot}
              style={{ left: travelLeft(((dot - min) / (max - min)) * 100) }}
            />
          ))}
        </div>

        {/* The playhead, pinned just inside the clip's leading edge and kept above the
              dots so a step it passes over never nicks the handle. */}
        <div
          className={cn(
            "absolute inset-y-0",
            isDragging
              ? "transition-none"
              : "transition-[left] duration-150 ease-out"
          )}
          style={{ left: travelLeft(pct) }}
        >
          <div className="absolute top-1/2 right-1 h-6 w-1 -translate-y-1/2 rounded-full bg-foreground shadow-sm" />
        </div>
        <span className="pointer-events-none relative mx-auto font-medium text-foreground text-sm tabular-nums">
          {draftValue}
          {unit}
        </span>
      </div>

      <div className="flex justify-between px-1 pt-1.5 font-mono text-muted-foreground/60 text-xs">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
};
