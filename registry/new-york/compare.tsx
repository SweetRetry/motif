"use client";

import { ChevronsLeftRight } from "lucide-react";
import type {
  ComponentProps,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { cn } from "@/lib/utils";

/* -- Two results, one frame ----------------------------------------------------
 * An upscale and its source, a redraw and the draft it came from: the question is never
 * "what does this look like" but "what changed", and that is answered by putting the two
 * in the same place and letting the eye cross between them.
 *
 * A divider does that. Left of it is one picture, right of it is the other, and moving it
 * is the whole interaction. Two pictures side by side cannot — the eye has to carry the
 * detail it was looking at across a gutter, and the pair is each half the size.
 *
 * The root owns the divider's position; the parts read it and know nothing of each other.
 * A layer is whatever the caller puts in it, so an image, a video or a canvas compare the
 * same way. The handle is a part: a caller who sets the position from a button, or draws
 * a read-only before and after, leaves it out.
 * --------------------------------------------------------------------------- */

/** What a part reads from the root. Exported with `useCompare`, so a caller can draw a
 *  control of their own — a "before / after" toggle — from the same position. */
export interface CompareState {
  /** The divider's place across the frame, 0–1. `0` shows only the after layer. */
  position: number;
  /** Move the divider. 0–1, clamped. */
  setPosition: (position: number) => void;
}

export interface CompareProps extends ComponentProps<"div"> {
  /** Where the divider starts, 0–1. Half is the answer when nothing is known about
   *  where the change is. */
  defaultPosition?: number;
}

export interface CompareLayerProps extends ComponentProps<"div"> {
  children: ReactNode;
}

export interface CompareHandleProps extends ComponentProps<"div"> {
  /** Names the slider for a screen reader. */
  label?: string;
}

export type CompareLabelProps = ComponentProps<"span">;

const CompareContext = createContext<CompareState | null>(null);

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error("Compare parts must be used within a Compare.");
  }

  return context;
};

const clamp = (position: number) => Math.min(1, Math.max(0, position));

/** One arrow press is a percent; with Shift, a tenth of the frame. */
const STEP = 0.01;
const COARSE_STEP = 0.1;

/**
 * The root: it owns the position and draws the frame the layers sit in.
 *
 * A press anywhere on the frame moves the divider there and keeps following the pointer
 * until it lifts, so the handle is a mark of where it is rather than the only place it can
 * be grabbed. `touch-action: pan-y` hands vertical scrolling back to the page, which is
 * the gesture a thumb on a tall image means.
 *
 * The frame defaults to 16:9. `className` replaces it, and should: the layers fill the
 * frame, so its shape is the shape of the pictures.
 */
export const Compare = ({
  children,
  className,
  defaultPosition = 0.5,
  ...props
}: CompareProps) => {
  const [position, setPosition] = useState(() => clamp(defaultPosition));
  const [dragging, setDragging] = useState(false);

  const set = useCallback((next: number) => setPosition(clamp(next)), []);

  const state = useMemo<CompareState>(
    () => ({ position, setPosition: set }),
    [position, set]
  );

  const moveTo = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width > 0) {
      set((event.clientX - bounds.left) / bounds.width);
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    props.onPointerDown?.(event);
    if (event.defaultPrevented || event.button !== 0) {
      return;
    }
    // Capture keeps the drag alive when the pointer leaves the frame, which a finger
    // does on every swipe that ends past the edge of the picture.
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    moveTo(event);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    props.onPointerMove?.(event);
    if (dragging) {
      moveTo(event);
    }
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    props.onPointerUp?.(event);
    setDragging(false);
  };

  return (
    <CompareContext.Provider value={state}>
      <div
        {...props}
        className={cn(
          "group/compare relative aspect-video w-full touch-pan-y select-none overflow-hidden rounded-lg border border-border",
          dragging ? "cursor-grabbing" : "cursor-ew-resize",
          className
        )}
        data-dragging={dragging || undefined}
        data-slot="compare"
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
      >
        {children}
      </div>
    </CompareContext.Provider>
  );
};

/**
 * The picture left of the divider.
 *
 * It is the whole frame, cut off at the divider rather than squeezed into the space left
 * of it. A layer that resized would show a different part of the picture at every
 * position, and the two halves would stop being the same place at two moments.
 */
export const CompareBefore = ({
  children,
  className,
  style,
  ...props
}: CompareLayerProps) => {
  const { position } = useCompare();

  return (
    <div
      {...props}
      className={cn("group/layer absolute inset-0", className)}
      data-side="before"
      data-slot="compare-before"
      style={{ ...style, clipPath: `inset(0 ${(1 - position) * 100}% 0 0)` }}
    >
      {children}
    </div>
  );
};

/** The picture right of the divider. Under the before layer, always the whole frame. */
export const CompareAfter = ({
  children,
  className,
  ...props
}: CompareLayerProps) => (
  <div
    {...props}
    className={cn("group/layer absolute inset-0", className)}
    data-side="after"
    data-slot="compare-after"
  >
    {children}
  </div>
);

/**
 * A name for one side, drawn in the corner of the layer it is put in.
 *
 * It belongs inside the layer rather than over the frame because the layer is already cut
 * at the divider: the tag disappears under the other picture on its own, and nothing has
 * to work out when the divider has reached it.
 *
 * The scrim is literal. It is measured against whatever the picture is, which the theme
 * knows nothing about.
 */
export const CompareLabel = ({
  children,
  className,
  ...props
}: CompareLabelProps) => (
  <span
    {...props}
    className={cn(
      "absolute top-3 rounded-full bg-black/50 px-2.5 py-1 font-medium text-white text-xs backdrop-blur-sm group-data-[side=after]/layer:right-3 group-data-[side=before]/layer:left-3",
      className
    )}
    data-slot="compare-label"
  >
    {children}
  </span>
);

/**
 * The divider: a line the height of the frame, a grip on it, and the keyboard.
 *
 * Pointer input is the frame's, so this is a mark of where the divider is that also holds
 * focus. Arrows move it a percent, Shift and an arrow a tenth, Home and End go to either
 * edge.
 *
 * The line is literal white for the reason the label's scrim is: it crosses artwork. The
 * grip is a floating control and takes the floating level.
 */
export const CompareHandle = ({
  className,
  label = "Compare",
  ...props
}: CompareHandleProps) => {
  const { position, setPosition } = useCompare();

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    props.onKeyDown?.(event);
    if (event.defaultPrevented) {
      return;
    }

    const step = event.shiftKey ? COARSE_STEP : STEP;
    let next: number | null = null;

    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      next = position - step;
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      next = position + step;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = 1;
    }

    if (next === null) {
      return;
    }
    event.preventDefault();
    setPosition(next);
  };

  return (
    <div
      aria-label={label}
      aria-orientation="horizontal"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(position * 100)}
      aria-valuetext={`${Math.round(position * 100)}% before`}
      {...props}
      className={cn(
        "group/handle absolute inset-y-0 flex w-8 -translate-x-1/2 items-center justify-center outline-none",
        className
      )}
      data-slot="compare-handle"
      onKeyDown={handleKeyDown}
      role="slider"
      style={{ ...props.style, left: `${position * 100}%` }}
      tabIndex={0}
    >
      <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_4px_rgb(0_0_0/0.4)]" />
      <span
        className="relative flex size-8 items-center justify-center rounded-full border border-border bg-popover text-popover-foreground shadow-md transition-transform group-focus-visible/handle:ring-2 group-focus-visible/handle:ring-ring group-data-[dragging]/compare:scale-110"
        data-slot="compare-grip"
      >
        <ChevronsLeftRight className="size-4" />
      </span>
    </div>
  );
};
