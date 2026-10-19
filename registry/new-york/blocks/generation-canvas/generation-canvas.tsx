"use client";

import type { CSSProperties, ReactNode } from "react";

import { FlowEdge } from "@/components/ui/flow-edge";
import { GenerationOverlay } from "@/components/ui/generation-overlay";
import { cn } from "@/lib/utils";

/* -- The plane ---------------------------------------------------------------
 * A generation canvas is three things on a dotted plane: nodes that hold work,
 * edges that say which work feeds which, and a dock that floats above the plane
 * rather than riding on it. Each is a part of its own, so a caller can lay out
 * two nodes or twenty, leave the dock out, or draw the edges from their own data.
 *
 * Nothing here pans, zooms or drags. A node is a box at a pixel position, an edge
 * is a curve between two points, and the plane scrolls when the nodes outgrow
 * it. A graph editor that needs more can keep these parts and put its own
 * viewport around them — the parts do not know what is moving them.
 * --------------------------------------------------------------------------- */

/** Where a port sits from the top of its node: the middle of the 40px header, so the
 *  line meets the node at the same height whether or not the header is drawn. */
export const PORT_OFFSET = 20;

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface CanvasBox {
  /** Left edge of the node, in plane pixels. */
  x: number;
  /** Top edge of the node, in plane pixels. */
  y: number;
  width: number;
}

/** The point an edge should leave from (`"out"`) or arrive at (`"in"`) on a node. */
export const portOf = (node: CanvasBox, side: "in" | "out"): CanvasPoint => ({
  x: side === "out" ? node.x + node.width : node.x,
  y: node.y + PORT_OFFSET,
});

const DOTS: CSSProperties = {
  backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
  backgroundSize: "20px 20px",
};

export interface GenerationCanvasProps {
  children?: ReactNode;
  className?: string;
  /** Floats at the bottom centre, above the plane — a `Toolbar`, usually. It stays
   *  put while the plane scrolls, and draws nothing when omitted. */
  dock?: ReactNode;
  /** Height of the plane, when the nodes need more room than the frame gives them. */
  height?: number | string;
  /** Width of the plane, when the nodes need more room than the frame gives them. */
  width?: number | string;
}

/**
 * The frame and the plane. The frame takes the size its parent gives it; the plane
 * inside is at least that big and scrolls when `width` or `height` ask for more.
 */
export const GenerationCanvas = ({
  children,
  className,
  dock,
  height = "100%",
  width = "100%",
}: GenerationCanvasProps) => (
  <div
    className={cn(
      "relative isolate overflow-hidden bg-background text-foreground",
      className
    )}
  >
    <div className="absolute inset-0 overflow-auto">
      <div
        className="relative min-h-full min-w-full"
        style={{ ...DOTS, height, width }}
      >
        {children}
      </div>
    </div>
    {dock ? (
      <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
        {dock}
      </div>
    ) : null}
  </div>
);

export interface CanvasNodeProps extends CanvasBox {
  children?: ReactNode;
  className?: string;
  /** Which ports to draw. A node with no edge on a side has none on it. */
  ports?: readonly ("in" | "out")[];
  /** Names the node in a header row. Omit it and the node is only its content. */
  title?: ReactNode;
}

const PORT =
  "absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-card";

/** One box of work on the plane: a card at a pixel position, with ports where edges
 *  attach. It is a `card` however the plane is themed — the plane is the page. */
export const CanvasNode = ({
  children,
  className,
  ports = [],
  title,
  width,
  x,
  y,
}: CanvasNodeProps) => (
  <section
    className={cn(
      "absolute rounded-xl border border-border bg-card text-card-foreground",
      className
    )}
    style={{ left: x, top: y, width }}
  >
    {title ? (
      <header className="flex h-10 items-center px-3 font-medium text-muted-foreground text-xs">
        {title}
      </header>
    ) : null}
    {children}
    {ports.includes("in") ? (
      <span
        aria-hidden="true"
        className={PORT}
        style={{ left: 0, top: PORT_OFFSET }}
      />
    ) : null}
    {ports.includes("out") ? (
      <span
        aria-hidden="true"
        className={PORT}
        style={{ left: "100%", top: PORT_OFFSET }}
      />
    ) : null}
  </section>
);

export interface CanvasEdgeProps {
  /** Whether light is travelling — work is moving along this edge right now. */
  active?: boolean;
  className?: string;
  /** Where the edge leaves, normally `portOf(source, "out")`. */
  from: CanvasPoint;
  /** Where the edge arrives, normally `portOf(target, "in")`. */
  to: CanvasPoint;
}

/** A curve between two ports. It runs left to right — the light travels in x — so
 *  put the source on the left of the target. */
export const CanvasEdge = ({
  active = false,
  className,
  from,
  to,
}: CanvasEdgeProps) => {
  const left = Math.min(from.x, to.x);
  const top = Math.min(from.y, to.y);
  const width = Math.max(Math.abs(to.x - from.x), 1);
  const height = Math.max(Math.abs(to.y - from.y), 1);
  const startY = from.y <= to.y ? 0 : height;
  const endY = from.y <= to.y ? height : 0;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{ height, left, top, width }}
    >
      <FlowEdge
        active={active}
        className={cn("text-primary", className)}
        d={`M 0 ${startY} C ${width / 2} ${startY} ${width / 2} ${endY} ${width} ${endY}`}
        glow={2}
        strokeWidth={2}
        style={{ "--edge-track": "var(--muted-foreground)" } as CSSProperties}
        viewBox={`0 0 ${width} ${height}`}
      />
    </div>
  );
};

export interface CanvasMediaProps {
  alt?: string;
  /** Aspect ratio as `"16:9"` — the same string `AspectRatioPicker` hands back. */
  aspect?: string;
  className?: string;
  /** Shown along the bottom when `src` never decodes. */
  failureLabel?: string;
  /** Status copy and actions drawn over the media — a retry, a progress line. */
  overlay?: ReactNode;
  /** Whether a generation is in flight. */
  pending: boolean;
  /** Echoed along the bottom while pending. */
  prompt?: string | null;
  /** Varies the flow's motion, so concurrent nodes do not move in step. */
  seed?: string | number;
  /** The result. Omit it while nothing exists yet. */
  src?: string;
}

/** The media inside a node: a frame in the requested ratio that flows while it waits
 *  and reveals the result when it decodes. */
export const CanvasMedia = ({
  alt = "Generated result",
  aspect = "16:9",
  className,
  failureLabel,
  overlay,
  pending,
  prompt,
  seed,
  src,
}: CanvasMediaProps) => (
  <div
    className={cn(
      "relative w-full overflow-hidden rounded-lg border border-border",
      className
    )}
    style={{ aspectRatio: aspect.replace(":", " / ") }}
  >
    <GenerationOverlay
      failureLabel={failureLabel}
      mediaSrc={src}
      overlay={overlay}
      pending={pending}
      prompt={prompt}
      seed={seed}
    >
      {src ? (
        <img alt={alt} className="h-full w-full object-cover" src={src} />
      ) : null}
    </GenerationOverlay>
  </div>
);
