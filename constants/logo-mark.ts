/**
 * Motif's mark: the agent indicator's 3x3 grid caught as its wave sets off. The
 * indicator runs a wave corner to corner; the mark freezes the first frame, swelling
 * at the top-left dot and fading toward the far corner, so the grid reads as moving
 * even standing still.
 *
 * One table for every place the mark is drawn: `LogoMark`, the OG images, and the
 * favicons that `pnpm icons` generates from it.
 */

/** The mark is drawn in a square this many units wide. */
export const LOGO_SIZE = 32;

const CENTRES = [6.5, 16, 25.5];

/** Radius and opacity by distance from the top-left corner, counted `col + row`. */
const SWELL = [
  { opacity: 1, r: 4.3 },
  { opacity: 0.8, r: 3.7 },
  { opacity: 0.6, r: 3.1 },
  { opacity: 0.42, r: 2.5 },
  { opacity: 0.28, r: 1.9 },
];

export const LOGO_DOTS = CENTRES.flatMap((cy, row) =>
  CENTRES.map((cx, col) => ({ cx, cy, ...SWELL[col + row] }))
);

/** The mark as standalone SVG markup, in `color`. */
export const logoMarkSvg = (color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOGO_SIZE} ${LOGO_SIZE}" fill="${color}">${LOGO_DOTS.map(
    ({ cx, cy, opacity, r }) =>
      `<circle cx="${cx}" cy="${cy}" r="${r}" opacity="${opacity}"/>`
  ).join("")}</svg>`;
