// Shared motion tokens. The `--ease-*` custom properties in globals.css carry the same
// curves for CSS-driven motion (view transitions); springs are the canonical physics
// used across components. Strong custom variants — defaults like `ease-in`/`ease-out`
// feel weak.

/** Entrances, exits and content swaps. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Press feedback on buttons and other tappable surfaces. */
export const SPRING_PRESS = {
  damping: 30,
  mass: 0.6,
  stiffness: 500,
} as const;

/** Content swaps — label/icon slots trading places inside a control. */
export const SPRING_SWAP = {
  damping: 30,
  mass: 0.55,
  stiffness: 460,
} as const;

/** Shared-layout glides — pills, indicators and panels morphing between positions. */
export const SPRING_LAYOUT = {
  damping: 32,
  mass: 0.6,
  stiffness: 360,
} as const;
