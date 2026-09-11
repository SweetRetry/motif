"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

/** One cover in the fan. */
export interface CoverFanItem {
  /** Describes the cover for assistive tech. Leave it out when the art is decorative —
   *  the title already names the card. */
  alt?: string;
  id: string;
  /** Cover art. Rendered `object-cover` into a 3:4 box, so any aspect ratio works. */
  src: string;
  /** Overlaid on the cover, bottom-left, one line. Longer titles are cut with an
   *  ellipsis rather than wrapped: the cover is the card, and a second line of type
   *  eats the thing being chosen. */
  title: string;
}

export interface CoverFanProps {
  className?: string;
  items: CoverFanItem[];
  /** Accessible name for the fan. */
  label?: string;
  onSelect: (item: CoverFanItem, index: number) => void;
}

/* -- The hand -----------------------------------------------------------------
 * A fan of covers is laid, not computed. The pitch leaves a quarter of every cover
 * showing — otherwise the fan is only a stack, and the covers are the whole content.
 * The drift is uneven on purpose: middles sitting lower than the ends is what reads as
 * placed by hand instead of as a card row with a rotation applied. The tilt turns with
 * the distance from the middle, so the fan opens as it spreads.
 *
 * Every number here is a share of the 200 × 267 reference card — where the fan was
 * drawn — and the card itself is a share of the container. Nothing in the component is
 * a fixed pixel size, so one width on the container scales the whole thing: the covers,
 * the pitch, the drift, the type.
 * --------------------------------------------------------------------------- */

/** Pitch between two cards, as a share of the card width. */
const STEP = 0.76;

/** Vertical drift per slot, as a share of the card height. It wraps for fans longer
 *  than four, where a repeating rhythm beats one deep arc — and beats numbers that grow
 *  with the count until a card is pushed out of the box. */
const DRIFT = [0.067, 0.127, 0.015, 0.052] as const;

/** Tilt of the outermost card, in degrees. */
const TILT = 2.5;

/** How far a lifted card rises, as a share of the card height, and how much it grows. */
const LIFT = 0.067;
const SCALE = 1.06;

/** Box the fan draws in, as a share of the card width: the deepest card, plus the drift
 *  below it, plus the room a lifted card needs above the top edge. */
const BOX = 1.6;

/** Corner radius, title inset and title size, as shares of the card width. */
const RADIUS = 0.06;
const INSET = 0.08;
const TITLE = 0.075;

/** Title floor, in px. Below roughly a 150px card the reference ratio stops being a
 *  label and starts being a caption squeezed into a corner. */
const TITLE_FLOOR = 11;

/** Room a rotated card needs for its corners, as a share of the fan's own width. */
const TILT_GUTTER = 1.06;

/** How many cards wide the fan is, gutter included. The card is whatever is left of the
 *  container once the fan is divided into that many. */
const fanFactor = (count: number) => ((count - 1) * STEP + 1) * TILT_GUTTER;

/**
 * One transform string per card. The slot decides the offset, the drift and the tilt; a
 * lifted card only changes the parts it has to, so the fan still reads as the same fan
 * while one card is out of it. Percentages resolve against the card's own box, which is
 * why nothing here needs to know how big the card is.
 */
const transformOf = (index: number, count: number, lifted: boolean) => {
  const offset = index - (count - 1) / 2;
  const drift = DRIFT[index % DRIFT.length] ?? 0;
  const x = offset * STEP * 100;
  const y = (lifted ? drift - LIFT : drift) * 100;
  const rotate = lifted ? 0 : offset * TILT;

  return [
    `translateX(calc(-50% ${x < 0 ? "-" : "+"} ${Math.abs(x).toFixed(2)}%))`,
    `translateY(${y.toFixed(2)}%)`,
    `rotate(${rotate.toFixed(2)}deg)`,
    `scale(${lifted ? SCALE : 1})`,
  ].join(" ");
};

export const CoverFan = ({
  className,
  items,
  label = "Starting points",
  onSelect,
}: CoverFanProps) => {
  // One index, not a flag per card: two cards can never be lifted at once, so the fan
  // has exactly one card out of it whatever the pointer and the keyboard do in turn.
  const [lifted, setLifted] = useState<number | null>(null);

  const factor = fanFactor(items.length);
  /** A share of the card width as a share of the container: the fan is `factor` cards
   *  wide, so the card is `1 / factor` of whatever the container gives it. */
  const share = (ratio: number) =>
    `calc(100cqw * ${(ratio / factor).toFixed(4)})`;

  return (
    // The container is the fan's own width, which is the only measurement the geometry
    // needs — hence the wrapper div: an element cannot query itself.
    <div className={cn("@container w-full", className)}>
      <div
        aria-label={label}
        className="relative w-full"
        role="group"
        style={{ height: share(BOX) }}
      >
        {items.map((item, index) => (
          // The card is the cover: no padding, no chrome, only the title sitting on the
          // art. Everything the fan does is one transform, so the browser animates the
          // card instead of re-laying out the row.
          <button
            className={cn(
              "absolute top-0 left-1/2 aspect-[3/4] overflow-hidden bg-muted",
              "cursor-pointer transition-transform duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
              // Drop shadow and hairline in one declaration: a ring utility would fight
              // the shadow for the same property.
              "shadow-[0_26px_50px_-22px_rgb(0_0_0/0.55),inset_0_0_0_1px_rgb(255_255_255/0.08)]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            )}
            key={item.id}
            onBlur={() => setLifted(null)}
            onClick={() => onSelect(item, index)}
            onFocus={() => setLifted(index)}
            onPointerEnter={() => setLifted(index)}
            onPointerLeave={() =>
              setLifted((current) => (current === index ? null : current))
            }
            style={{
              borderRadius: share(RADIUS),
              transform: transformOf(index, items.length, lifted === index),
              width: share(1),
              // Lifted cards come to the front; at rest the fan reads left to right, so
              // each card overlaps the one before it.
              zIndex: lifted === index ? items.length + 1 : index + 1,
            }}
            type="button"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={item.alt ?? ""}
              className="absolute inset-0 size-full object-cover"
              src={item.src}
            />
            {/* The scrim belongs to the component, not the cover: a fan has to stay
                legible over whatever art gets dropped into it. */}
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 aspect-[16/9] bg-linear-to-t from-black/75 via-black/30 to-transparent"
            />
            <span
              className="absolute truncate text-left font-bold text-white"
              style={{
                bottom: share(INSET * 0.8),
                fontSize: `max(${TITLE_FLOOR}px, ${share(TITLE)})`,
                left: share(INSET),
                right: share(INSET),
              }}
            >
              {item.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
