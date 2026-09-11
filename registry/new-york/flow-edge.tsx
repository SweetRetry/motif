"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useId, useRef } from "react";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

/* -- The light ----------------------------------------------------------------
 * Two ends of a graph are one process, and while work is moving between them the
 * line between them should say so. This draws that as light: not a dot riding the
 * wire, but a band that is bright in the middle and dim at both ends, travelling
 * from the near end to the far one.
 *
 * The band is a gradient, and the line is *cut out of it* rather than stroked with
 * it. The mask holds one rectangle filled with a white-to-transparent white that is
 * opaque at its centre, and the lit lines show only where that rectangle says so. So
 * moving the rectangle along x moves the light along the curve, the taper at both
 * ends is the rectangle's own gradient — nothing has to be faded per frame — and the
 * only thing animated is one transform, which the compositor owns. A gradient laid
 * along a curved stroke would have to be re-aimed as the curve turns; a mask does not
 * care which way the line is going.
 *
 * Two consequences of travelling in x instead of along the path, both worth knowing
 * before passing your own `d`:
 *
 *   - the path wants to be monotonic in x. On a line that doubles back, the band
 *     covers two stretches at once and lights both.
 *   - a steep stretch is crossed at an angle, so the light is a little shorter along
 *     the path there than it is on the flat. On an S this is a few percent; on a
 *     hairpin it would show.
 * --------------------------------------------------------------------------- */

/** The curve this ships with: a single cubic, flat at both ends and steep in the
 *  middle — the shape a connection takes when it leaves one node and arrives at
 *  another.
 *
 *  Both control points sit at half the width, each at the height of the end it
 *  belongs to, and that pairing is the whole trick: it leaves the tangents at the two
 *  ends horizontal, so the line eases out of a port and into the next one instead of
 *  kinking away from it. Pull the controls in and the S stands up; push them out and
 *  it flattens into a diagonal. */
const CURVE = "M 0 239 C 500 239 500 0 1000 0";

/** The frame `CURVE` was drawn in — 1000:239. Pass a matching pair whenever you pass
 *  your own `d`; a viewBox that does not fit the path draws it against the wrong box,
 *  and the light's travel is measured in these units. */
const CURVE_VIEW_BOX = "0 0 1000 239";

/** One pass, in ms, and the share of the cycle the light then spends parked past the
 *  far end before it comes round again.
 *
 *  The rest is what makes this read as a pulse entering a line rather than a stripe
 *  scrolling through one: a light that never leaves is furniture, and the eye stops
 *  following it. A quarter of the cycle is long enough to register as a gap and short
 *  enough that a line that is doing work never looks stalled. */
const PASS_MS = 2600;
const REST = 0.28;

/** How much of the viewBox width the light spans — the length of the pulse, as a
 *  share of the whole run. A fifth leaves the ends of the line visible on either side
 *  of it, so the light reads as something travelling *along* a line rather than the
 *  line itself flickering. */
const STREAK = 0.2;

/** The lit line's width, and the blur radius of the halo around it, both in user
 *  units. The halo is deliberately small: a wide blur does not read as a bright line
 *  on a dark stage, it reads as fog sitting on top of one. */
const STROKE = 3.5;
const GLOW = 2.5;

/** The idle line's opacity, under the light and on its own when nothing is running. */
const TRACK_OPACITY = 0.24;

/** How much of the halo's own colour survives the blur. Under the core it stacks into
 *  the middle of the pulse, which is why the core does not have to be drawn any
 *  brighter than the light it came off. */
const GLOW_OPACITY = 0.6;

interface Frame {
  height: number;
  minX: number;
  minY: number;
  width: number;
}

/** The numbers out of a `viewBox`, which is the only place the light's geometry comes
 *  from: where the run starts, how far it travels, and how much room the halo needs. */
const frameOf = (viewBox: string): Frame => {
  const [minX = 0, minY = 0, width = 0, height = 0] = viewBox
    .trim()
    .split(/[\s,]+/)
    .map(Number);

  return { height, minX, minY, width };
};

export interface FlowEdgeProps {
  /** Whether the light is travelling. Off leaves the bare line, which is the state a
   *  connection is in most of the time. */
  active?: boolean;
  className?: string;
  /** The path to send light down. Defaults to the S-curve. */
  d?: string;
  /** One pass, in ms. */
  duration?: number;
  /** Blur radius of the halo, in user units. `0` drops the halo and leaves a clean
   *  lit line. */
  glow?: number;
  /** Share of the cycle spent parked before the next pass, 0–1. `0` streams without a
   *  break. */
  rest?: number;
  /** Share of the viewBox width the light spans, 0–1 — the length of the pulse. */
  streak?: number;
  /** Width of the lit line, in user units. The halo is drawn at twice this. */
  strokeWidth?: number;
  /** Sets `--edge-core` (the middle of the pulse), `--edge-glow` (the halo) and
   *  `--edge-track` (the unlit line). The first two default to `currentColor`, so
   *  `className` is usually enough — reach for them when the middle of the light
   *  should be hotter than its edges. `--edge-track` is the one to set when colour
   *  should mean "work is running" and the idle line should stay neutral. */
  style?: CSSProperties;
  /** The frame `d` was drawn in. Defaults to the frame of the built-in curve. */
  viewBox?: string;
}

/**
 * A bezier connector that carries light from one end to the other while work is in
 * flight, and rests as a plain line when it is not. Decorative: it has no text, and
 * whatever the line is telling the user should be said in words beside it.
 *
 * Set the colour with `className` (`text-primary`, or the accent of whatever it is
 * connecting) — the track, the core and the halo all derive from `currentColor` unless
 * `--edge-track`, `--edge-core` and `--edge-glow` say otherwise.
 */
export const FlowEdge = ({
  active = false,
  className,
  d = CURVE,
  duration = PASS_MS,
  glow = GLOW,
  rest = REST,
  streak = STREAK,
  strokeWidth = STROKE,
  style,
  viewBox = CURVE_VIEW_BOX,
}: FlowEdgeProps) => {
  const reduce = useReducedMotion() ?? false;
  const band = useRef<SVGRectElement>(null);
  const pass = useRef<Animation | null>(null);
  // React ids are not safe to paste into a `url(#…)` as-is, and two of these on one
  // page must not share a mask.
  const uid = `flow-edge-${useId().replaceAll(/[^a-zA-Z0-9_-]/g, "")}`;
  const { height, minX, minY, width } = frameOf(viewBox);
  const bandWidth = width * streak;

  /** Half the halo — which is drawn at twice the stroke — plus three blur radii:
   *  how far the light reaches past the line. The mask and the filter both have to be
   *  this much larger than the artwork, or they cut the glow off along a straight edge
   *  of their own. */
  const bleed = Math.ceil(strokeWidth + glow * 3);

  // Without motion the light stops part-way along the line instead of disappearing:
  // the middle of the run is the one position that reads as "in flight" from a still
  // frame. The travel is a transform, so it never touches this.
  const parked = reduce ? (width - bandWidth) / 2 : 0;

  /* The pass. Kept running whether or not the light is showing: `active` fades the
   * band's opacity instead of stopping it, which is what lets the light fade out
   * *while it is still moving* rather than blinking off in place. Restarting it on
   * activation is the other half of that — see below. */
  useEffect(() => {
    const node = band.current;
    if (!node || reduce) {
      return;
    }

    const held = { offset: 1, transform: `translateX(${width}px)` };
    const running = node.animate(
      [
        // Parked entirely off the near end: the band's own taper starts at zero
        // opacity, so the light arrives out of nothing rather than switching on.
        { offset: 0, transform: `translateX(${-bandWidth}px)` },
        { offset: 1 - rest, transform: held.transform },
        // A repeated value is what holds the light past the far end. Dropped at
        // `rest: 0`, where the two keyframes would be one.
        ...(rest > 0 ? [held] : []),
      ],
      {
        duration,
        // Linear on purpose: the pulse should cross the line at one speed. The
        // ease-in is the band's gradient, which is a shape rather than a timing.
        easing: "linear",
        iterations: Number.POSITIVE_INFINITY,
      }
    );

    pass.current = running;
    return () => {
      running.cancel();
      pass.current = null;
    };
  }, [bandWidth, duration, reduce, rest, width]);

  /* A pass starts when the line goes live, not wherever the unfelt cycle happened to
   * be: a light that appears mid-run has not travelled from anywhere, and the whole
   * point of the pulse is that it came from the other end. */
  useEffect(() => {
    if (active && !reduce && pass.current) {
      pass.current.currentTime = 0;
    }
  }, [active, reduce]);

  return (
    <svg
      aria-hidden="true"
      // No intrinsic size: the caller sets the width, and the frame keeps the height.
      // `overflow` because the halo is wider than the artwork it came from and would
      // otherwise be clipped flat wherever the curve runs along an edge.
      className={cn("block h-auto w-full overflow-visible", className)}
      fill="none"
      style={style}
      viewBox={viewBox}
    >
      <defs>
        {/* The light's own profile, in the band's coordinates: dim end, bright
            middle, dim end. The shoulders away from the middle keep a lit stretch
            rather than a single hot point, which is what a smear of light looks like
            when it is moving. */}
        <linearGradient id={`${uid}-fade`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.22" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.8" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>

        {/* The light: one rectangle, taller than the artwork so the halo passing it
            is not clipped, moved by the effect above. Masking in luminance, so the
            gradient's opacity is the only thing deciding what is lit. */}
        <mask
          height={height + bleed * 2}
          id={`${uid}-mask`}
          maskUnits="userSpaceOnUse"
          width={width + bleed * 2}
          x={minX - bleed}
          y={minY - bleed}
        >
          <rect
            fill={`url(#${uid}-fade)`}
            height={height + bleed * 2}
            ref={band}
            style={{
              opacity: active ? 1 : 0,
              // Long enough to see the light leave, short enough that a line which
              // has stopped does not keep glowing for a beat after.
              transition: "opacity 320ms ease-out",
            }}
            width={bandWidth}
            x={minX + parked}
            y={minY - bleed}
          />
        </mask>

        {/* Filters are interpolated in linear light by default, which renders a soft
            glow darker and greyer than the line it came off. The halo should be the
            same colour as the light, so it is blurred in sRGB. */}
        <filter
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
          height={height + bleed * 2}
          id={`${uid}-blur`}
          width={width + bleed * 2}
          x={minX - bleed}
          y={minY - bleed}
        >
          <feGaussianBlur stdDeviation={glow} />
        </filter>
      </defs>

      {/* The line itself, unlit: always drawn, so a connection exists before anything
          travels down it. It takes a tone of its own rather than the light's, because a
          wire that is the same colour as its own light has nothing left to say when the
          light is gone. */}
      <path
        d={d}
        stroke="var(--edge-track, currentColor)"
        strokeLinecap="round"
        strokeOpacity={TRACK_OPACITY}
        strokeWidth={strokeWidth}
      />

      {/* Halo first, so the core sits on top of its own bloom rather than under it. */}
      <g mask={`url(#${uid}-mask)`}>
        {glow > 0 ? (
          <path
            d={d}
            filter={`url(#${uid}-blur)`}
            stroke="var(--edge-glow, currentColor)"
            strokeLinecap="round"
            strokeOpacity={GLOW_OPACITY}
            strokeWidth={strokeWidth * 2}
          />
        ) : null}
        <path
          d={d}
          stroke="var(--edge-core, currentColor)"
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  );
};
