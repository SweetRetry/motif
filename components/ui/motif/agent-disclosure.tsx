"use client";

import { motion, useReducedMotion } from "motion/react";
import type { HTMLMotionProps } from "motion/react";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

// Motion tokens, kept in this file so it installs on its own.
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export interface AgentDisclosureProps extends Omit<
  HTMLMotionProps<"div">,
  "animate" | "initial"
> {
  open: boolean;
  openHeight?: CSSProperties["height"];
}

/** Shared reveal for collapsible agent content. The height moves with it, both ways: a
 *  height that snapped shut would drop whatever is below it the instant the header is
 *  pressed, and the fade would play on a box that is already gone. */
export function AgentDisclosure({
  open,
  openHeight = "auto",
  className,
  style,
  transition,
  ...props
}: AgentDisclosureProps) {
  const reduce = useReducedMotion() ?? false;

  return (
    <motion.div
      {...props}
      aria-hidden={!open}
      inert={!open}
      initial={false}
      animate={
        reduce
          ? { height: open ? openHeight : 0, opacity: open ? 1 : 0 }
          : {
              height: open ? openHeight : 0,
              opacity: open ? 1 : 0,
              y: open ? 0 : -4,
            }
      }
      transition={
        transition ?? {
          duration: reduce ? 0 : open ? 0.22 : 0.14,
          ease: EASE_OUT,
        }
      }
      // The reveal clips, and a clip has no room around it for a ring: a full-bleed child
      // that draws 3px outside itself - a focused input, the platform one especially -
      // loses the two runs of its ring that lie along the sides of this box. So the box
      // is grown 4px and padded straight back: the children sit exactly where they did,
      // and only the clip moves out.
      className={cn("-mx-1 overflow-hidden px-1", className)}
      style={{
        ...style,
        pointerEvents: open ? undefined : "none",
        transformOrigin: "top",
      }}
    />
  );
}
