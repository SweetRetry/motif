"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

export type AgentState = "idle" | "thinking" | "tool-call" | "streaming";

/* -- Grid geometry ---------------------------------------------------------- */

const GRID = 3;
const CELLS = GRID * GRID;

/* -- Keyframe helpers ------------------------------------------------------- */

const SAMPLES = 16;

const cosineFrames = (trough: number, crest: number, power = 1): Keyframe[] =>
  Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const t = i / SAMPLES;
    const v = (0.5 - 0.5 * Math.cos(t * Math.PI * 2)) ** power;
    return { offset: t, opacity: trough + (crest - trough) * v };
  });

const lead = (offset: number, period: number) => (offset % period) - period;

/* -- Shapes ----------------------------------------------------------------- */

const ALL = Array.from({ length: CELLS }, () => true);

/*
 * Tool-call alternates between a cross and four corners:
 *   cross:    corners:
 *   · ■ ·     ■ · ■
 *   ■ ■ ■     · · ·
 *   · ■ ·     ■ · ■
 */
const TC_CROSS = [false, true, false, true, true, true, false, true, false];

/* -- Thinking: diagonal wave ------------------------------------------------ */

const TH_MS = 1200;
const TH_SPREAD = 5.5;
const TH_TROUGH = 0.2;
const TH_CREST = 0.6;
const TH_KF = cosineFrames(TH_TROUGH, TH_CREST);
const TH_REST = [0.2, 0.317, 0.531, 0.592, 0.429];

const thAntiDiag = (i: number) => Math.floor(i / GRID) + (i % GRID);

/* -- Tool-call: cross ↔ corners --------------------------------------------- */

const TC_MS = 800;
const TC_DIM = 0.1;
const TC_BRIGHT = 0.65;
const TC_KF_ON: Keyframe[] = [
  { offset: 0, opacity: TC_BRIGHT },
  { offset: 0.45, opacity: TC_BRIGHT },
  { offset: 0.5, opacity: TC_DIM },
  { offset: 0.95, opacity: TC_DIM },
  { offset: 1, opacity: TC_BRIGHT },
];
const TC_KF_OFF: Keyframe[] = [
  { offset: 0, opacity: TC_DIM },
  { offset: 0.45, opacity: TC_DIM },
  { offset: 0.5, opacity: TC_BRIGHT },
  { offset: 0.95, opacity: TC_BRIGHT },
  { offset: 1, opacity: TC_DIM },
];

/* -- Streaming: column wave left → right ------------------------------------ */

const ST_MS = 900;
const ST_SPREAD = 4;
const ST_TROUGH = 0.2;
const ST_CREST = 0.7;
const ST_KF = cosineFrames(ST_TROUGH, ST_CREST);
const ST_REST = [0.2, 0.452, 0.665];

/* -- Per-state definition --------------------------------------------------- */

interface StateSpec {
  colorClass: string;
  mask: boolean[];
  rest: (i: number) => number;
  run?: (cells: HTMLElement[]) => Animation[];
}

const STATES: Record<AgentState, StateSpec> = {
  idle: {
    colorClass: "text-muted-foreground",
    mask: ALL,
    rest: () => 0.25,
  },

  streaming: {
    colorClass: "text-success",
    mask: ALL,
    rest: (i) => ST_REST[i % GRID],
    run: (cells) =>
      cells.map((el, i) =>
        el.animate(ST_KF, {
          delay: lead(((i % GRID) / ST_SPREAD) * ST_MS, ST_MS),
          duration: ST_MS,
          easing: "linear",
          iterations: Infinity,
        })
      ),
  },

  thinking: {
    colorClass: "text-info",
    mask: ALL,
    rest: (i) => TH_REST[thAntiDiag(i) % TH_REST.length],
    run: (cells) =>
      cells.map((el, i) =>
        el.animate(TH_KF, {
          delay: lead((thAntiDiag(i) / TH_SPREAD) * TH_MS, TH_MS),
          duration: TH_MS,
          easing: "linear",
          iterations: Infinity,
        })
      ),
  },

  "tool-call": {
    colorClass: "text-foreground",
    mask: ALL,
    rest: (i) => (TC_CROSS[i] ? TC_BRIGHT : TC_DIM),
    run: (cells) =>
      cells.map((el, i) =>
        el.animate(TC_CROSS[i] ? TC_KF_ON : TC_KF_OFF, {
          duration: TC_MS,
          easing: "linear",
          iterations: Infinity,
        })
      ),
  },
};

/* -- Component -------------------------------------------------------------- */

export interface AgentIndicatorProps {
  className?: string;
  state: AgentState;
}

export const AgentIndicator = ({ className, state }: AgentIndicatorProps) => {
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLSpanElement>(null);
  const spec = STATES[state];

  useEffect(() => {
    const node = ref.current;
    if (!node || reduce || !spec.run) {return;}

    const animations = spec.run([...node.children] as HTMLElement[]);
    return () => {
      for (const a of animations) {a.cancel();}
    };
  }, [spec, reduce]);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-grid grid-cols-3 gap-[2.5px]",
        spec.colorClass,
        className
      )}
      data-slot="agent-indicator"
      data-state={state}
      ref={ref}
    >
      {Array.from({ length: CELLS }, (_, i) => (
        <span
          className="size-[5px] rounded-[1.3px] bg-current"
          key={i}
          style={{ opacity: spec.mask[i] ? spec.rest(i) : 0 }}
        />
      ))}
    </span>
  );
};
