import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/* -- The art ------------------------------------------------------------------
 * A gradient cover is drawn, not uploaded: a handful of colour fields blurred into one
 * another, a line pattern laid over them, and a film of grain on top. It is for the
 * things that need a cover and will never get art of their own — a collection, a
 * playlist, a newsletter, a project, a skill.
 *
 * The seed is the identity. The same seed always draws the same cover, so a list keyed
 * by id renders the same art on the server, on the client and next week; a different
 * seed with the same palette and pattern moves the fields and where the line work is strongest, so
 * a grid of one palette still reads as a set of different things.
 *
 * The art is one SVG document, built as a string and handed to CSS as a data URI. One
 * string serves both the component and anything else that takes an image source — a
 * Cover Fan, an `<img>`, an Open Graph card — and its filter ids live inside their own
 * document, so a page of covers never collides on them.
 *
 * The colours are literal on purpose. A cover is artwork, measured against itself and
 * not against the theme, and it should look the same in dark mode as in light.
 * --------------------------------------------------------------------------- */

/** The art is drawn on a square of this many units and scaled to the box with `slice`. */
const SIZE = 400;

/** A colour field: a hue and where it sits, as shares of the square. */
interface Field {
  color: string;
  x: number;
  y: number;
}

interface PaletteSpec {
  /** What shows through where no field reaches. */
  base: string;
  fields: readonly Field[];
}

export const GRADIENT_COVER_PALETTES = {
  dusk: {
    base: "#8a6cc0",
    fields: [
      { color: "#c9bbe8", x: 0.1, y: 0.08 },
      { color: "#b59ad8", x: 0.72, y: 0.4 },
      { color: "#2f1c44", x: 0.66, y: 0.9 },
      { color: "#8d5cc4", x: 0.04, y: 0.92 },
      { color: "#d8bce4", x: 0.95, y: 0.62 },
    ],
  },
  lagoon: {
    base: "#4f8aa0",
    fields: [
      { color: "#eef2f4", x: 0.45, y: 0.02 },
      { color: "#7fc4ae", x: 0, y: 0.6 },
      { color: "#1f5f7a", x: 0.82, y: 0.76 },
      { color: "#cfe3e8", x: 0.62, y: 0.3 },
      { color: "#3b7d9a", x: 0.3, y: 0.98 },
    ],
  },
  sunset: {
    base: "#f4a259",
    fields: [
      { color: "#8c9be8", x: 0.1, y: 0.15 },
      { color: "#e9a3d2", x: 0.92, y: 0.08 },
      { color: "#f9a03f", x: 0.78, y: 0.62 },
      { color: "#f6c453", x: 0.48, y: 0.78 },
      { color: "#ef6a5a", x: 0.02, y: 0.98 },
    ],
  },
} as const satisfies Record<string, PaletteSpec>;

export type GradientCoverPalette = keyof typeof GRADIENT_COVER_PALETTES;

/** The line work laid over the colour. `plain` is colour and grain alone. */
export const GRADIENT_COVER_PATTERNS = [
  "plain",
  "waves",
  "dots",
  "petals",
] as const;

export type GradientCoverPattern = (typeof GRADIENT_COVER_PATTERNS)[number];

export interface GradientCoverArt {
  /** Left out, the seed picks one. */
  palette?: GradientCoverPalette;
  /** Left out, the seed picks one. */
  pattern?: GradientCoverPattern;
  /** What the cover is for — an id or a title. The same seed always draws the same art. */
  seed: string;
}

/* -- Seeded randomness ------------------------------------------------------ */

/* oxlint-disable no-bitwise, unicorn/prefer-math-trunc -- a hash and a PRNG are 32-bit integer arithmetic; the
   operators are the algorithm, and `Math.trunc` is not `| 0` once the sum overflows. */

/** FNV-1a: a string to 32 bits, stable across runtimes. */
const hash = (input: string) => {
  let h = 2_166_136_261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.codePointAt(i) ?? 0;
    h = Math.imul(h, 16_777_619);
  }
  return h >>> 0;
};

/** Mulberry32: one 32-bit state, a float in [0, 1) per call. */
const randomFrom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state + 1_831_565_813) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

/* oxlint-enable no-bitwise, unicorn/prefer-math-trunc */

type Random = ReturnType<typeof randomFrom>;

const between = (random: Random, min: number, max: number) =>
  min + random() * (max - min);

/* -- Geometry --------------------------------------------------------------- */

type Point = readonly [number, number];

const fmt = (n: number) => String(Math.round(n * 10) / 10);

/**
 * A smooth line through the points: Catmull-Rom turned into cubic Béziers. Nine points
 * across the cover are enough for curves this gentle, where a polyline would need a
 * hundred and a data URI five times the size.
 */
const smooth = (points: readonly Point[]) => {
  const at = (i: number) =>
    points[Math.max(0, Math.min(points.length - 1, i))] as Point;
  let d = `M${fmt(at(0)[0])} ${fmt(at(0)[1])}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x0, y0] = at(i - 1);
    const [x1, y1] = at(i);
    const [x2, y2] = at(i + 1);
    const [x3, y3] = at(i + 2);
    d += `C${fmt(x1 + (x2 - x0) / 6)} ${fmt(y1 + (y2 - y0) / 6)} ${fmt(
      x2 - (x3 - x1) / 6
    )} ${fmt(y2 - (y3 - y1) / 6)} ${fmt(x2)} ${fmt(y2)}`;
  }
  return d;
};

/* -- Patterns ---------------------------------------------------------------
 * Every pattern draws in the same white hairline and is faded by the same mask, so
 * swapping one for another changes the drawing and never the weight of the cover.
 * ------------------------------------------------------------------------- */

const STROKE =
  "fill='none' stroke='#fff' stroke-width='0.75' vector-effect='non-scaling-stroke'";

const drawPattern = (pattern: GradientCoverPattern, random: Random) => {
  switch (pattern) {
    case "plain": {
      return "";
    }
    case "waves": {
      // Near-parallel lines whose swell grows down the cover, so the field reads as
      // folded cloth rather than a row of sine curves.
      const p1 = random() * Math.PI * 2;
      const p2 = random() * Math.PI * 2;
      const lines: string[] = [];
      for (let i = 0; i < 30; i += 1) {
        const base = i * 14 - 6;
        const swell = 6 + i * 0.9;
        const points: Point[] = [];
        for (let x = -40; x <= SIZE + 40; x += 55) {
          points.push([
            x,
            base +
              swell * Math.sin(x * 0.011 + p1 + i * 0.16) +
              4 * Math.sin(x * 0.029 + p2 - i * 0.1),
          ]);
        }
        lines.push(`<path d='${smooth(points)}' ${STROKE} opacity='0.5'/>`);
      }
      return lines.join("");
    }
    case "dots": {
      // A tiled grid — one circle in a <pattern>, not six hundred in the document.
      const pitch = 15;
      return `<defs><pattern id='d' width='${pitch}' height='${pitch}' patternUnits='userSpaceOnUse'><circle cx='${pitch / 2}' cy='${pitch / 2}' r='1.4' fill='#fff'/></pattern></defs><rect width='${SIZE}' height='${SIZE}' fill='url(#d)' opacity='0.8'/>`;
    }
    case "petals": {
      // Leaf outlines scattered at random, some running off the edge. Each is two
      // quadratic arcs meeting at the tips.
      const leaves: string[] = [];
      const count = 11;
      for (let i = 0; i < count; i += 1) {
        const x = between(random, -0.05, 1.05) * SIZE;
        const y = between(random, -0.05, 1.05) * SIZE;
        const length = between(random, 55, 120);
        const width = length * between(random, 0.35, 0.5);
        const angle = random() * 360;
        leaves.push(
          `<path transform='translate(${fmt(x)} ${fmt(y)}) rotate(${fmt(angle)})' d='M0 ${fmt(-length)}Q${fmt(width)} 0 0 ${fmt(length)}Q${fmt(-width)} 0 0 ${fmt(-length)}Z' ${STROKE} opacity='0.7'/>`
        );
      }
      return leaves.join("");
    }
    default: {
      return "";
    }
  }
};

/**
 * The cover as an SVG document. Five fields under one blur make the colour; the pattern
 * fades out from a seeded point, so the line work has a place it is strongest instead of
 * an even wash; the grain goes on last and over everything, line work included, which
 * is what makes the lines sit in the print rather than on it.
 */
export const gradientCoverSvg = ({
  seed,
  palette,
  pattern,
}: GradientCoverArt) => {
  const random = randomFrom(hash(seed));
  const paletteNames = Object.keys(
    GRADIENT_COVER_PALETTES
  ) as GradientCoverPalette[];
  // Both picks are drawn even when the caller fixes them, so naming a palette does not
  // shift every later random number and redraw the art.
  const pickedPalette =
    paletteNames[Math.floor(random() * paletteNames.length)] ?? "sunset";
  const pickedPattern =
    GRADIENT_COVER_PATTERNS[
      Math.floor(random() * GRADIENT_COVER_PATTERNS.length)
    ] ?? "plain";
  const spec = GRADIENT_COVER_PALETTES[palette ?? pickedPalette];

  const fields = spec.fields
    .map(({ color, x, y }) => {
      const cx = (x + between(random, -0.12, 0.12)) * SIZE;
      const cy = (y + between(random, -0.12, 0.12)) * SIZE;
      const r = between(random, 0.32, 0.44) * SIZE;
      return `<circle cx='${fmt(cx)}' cy='${fmt(cy)}' r='${fmt(r)}' fill='${color}'/>`;
    })
    .join("");

  const fadeX = between(random, 0.3, 0.7);
  const fadeY = between(random, 0.3, 0.7);
  const lines = drawPattern(pattern ?? pickedPattern, random);

  return [
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${SIZE} ${SIZE}' preserveAspectRatio='xMidYMid slice'>`,
    "<defs>",
    "<filter id='b' x='-50%' y='-50%' width='200%' height='200%'><feGaussianBlur stdDeviation='44'/></filter>",
    "<filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter>",
    `<radialGradient id='f' cx='${fmt(fadeX)}' cy='${fmt(fadeY)}' r='0.75'><stop offset='0' stop-color='#fff'/><stop offset='1' stop-color='#fff' stop-opacity='0.15'/></radialGradient>`,
    `<mask id='m'><rect width='${SIZE}' height='${SIZE}' fill='url(#f)'/></mask>`,
    "</defs>",
    `<rect width='${SIZE}' height='${SIZE}' fill='${spec.base}'/>`,
    `<g filter='url(#b)'>${fields}</g>`,
    lines ? `<g mask='url(#m)'>${lines}</g>` : "",
    `<rect width='${SIZE}' height='${SIZE}' filter='url(#g)' opacity='0.45' style='mix-blend-mode:overlay'/>`,
    "</svg>",
  ].join("");
};

/** The cover as an image source, for anything that takes a `src` — a Cover Fan, an
 *  `<img>`, a CSS background. */
export const gradientCoverUrl = (art: GradientCoverArt) =>
  `data:image/svg+xml,${encodeURIComponent(gradientCoverSvg(art))}`;

/* -- Parts ------------------------------------------------------------------ */

export type GradientCoverProps = GradientCoverArt & ComponentProps<"div">;

/**
 * The cover: the art filling the box and whatever is composed on top of it, centred.
 * The box is square and rounded by default; a class decides any other shape, and the
 * art crops to fill it.
 */
export const GradientCover = ({
  seed,
  palette,
  pattern,
  className,
  children,
  ...props
}: GradientCoverProps) => (
  <div
    className={cn(
      "@container relative isolate aspect-square min-w-0 overflow-hidden rounded-xl",
      className
    )}
    {...props}
  >
    {/* The art is decorative: whatever the cover is for, its title says so. */}
    <span
      aria-hidden="true"
      className="absolute inset-0 -z-10 bg-cover bg-center"
      style={{
        backgroundImage: `url("${gradientCoverUrl({ palette, pattern, seed })}")`,
      }}
    />
    {/* The inset is a share of the cover, so it lives one level in: `cqw` resolves
        against an ancestor container, and the root is that container, not its own. */}
    {children ? (
      <div className="absolute inset-0 flex items-center justify-center p-[8cqw] text-center">
        {children}
      </div>
    ) : null}
  </div>
);

/**
 * The title set on the art. White over a picture is measured against the picture, not
 * the theme, which is why it is the one literal colour here; the soft shadow keeps it
 * legible over the palettes' light corners without becoming a scrim.
 */
export const GradientCoverTitle = ({
  className,
  ...props
}: ComponentProps<"p">) => (
  <p
    className={cn(
      "text-[length:max(11px,7.5cqw)] leading-tight font-medium text-balance text-white [text-shadow:0_1px_14px_rgb(0_0_0/0.22)]",
      className
    )}
    {...props}
  />
);
