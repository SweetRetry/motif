import type { MotionValue } from "motion/react";
import type { ReactNode } from "react";

/** One tick on the rail — a message, a section, a screen. */
export interface ScrollRailItem {
  id: string;
  /** Preview shown in the popover while the tick is hovered or focused. */
  preview?: ReactNode;
  /** Accessible name for the tick. Falls back to its position. */
  label?: string;
}

/** Focus is a continuous tick index. Pass a number for a static rail, or the motion
 *  value that `useMessageFocus` / `useScrollProgress` hand back to follow a scroll
 *  container. */
export type ScrollRailFocus = number | MotionValue<number>;

export interface ScrollRailProps {
  items: ScrollRailItem[];
  focus?: ScrollRailFocus;
  onSelect?: (index: number, item: ScrollRailItem) => void;
  /** Which edge of the content the rail sits on. Also flips the popover side and the
   *  direction the ticks grow in. */
  side?: "left" | "right";
  /** Accessible name for the rail. */
  label?: string;
  /** Distance between two ticks, in px. */
  pitch?: number;
  /** Tick thickness, in px. */
  thickness?: number;
  /** Length of a tick that is nowhere near the focus, in px. */
  minLength?: number;
  /** Length of the focused tick, in px. */
  maxLength?: number;
  /** How far the lengthening reaches, in ticks. `1` keeps it to immediate
   *  neighbours, `3` stretches the peak across the whole rail. */
  spread?: number;
  /** How far the brightening reaches, in ticks. Keep it smaller than `spread`: the
   *  width is the read-out, the colour is the pointer. */
  highlight?: number;
  /** Opacity of a tick that is nowhere near the focus. */
  minOpacity?: number;
  className?: string;
}

export interface ScrollRailPreviewProps {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}
