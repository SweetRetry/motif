/**
 * The motif: one swarm of dots that every scene is made of.
 *
 * A formation says where each dot sits at time `t`. A key says when the swarm starts
 * travelling to a formation, how long the trip takes and how the dots are staggered.
 * Position is a pure function of the keys, the dot's index and `t`: there is no state
 * carried from frame to frame, so any frame can be drawn on its own and comes out the
 * same every time.
 */

export const W = 960;
export const H = 540;
export const N = 420;

export interface Dot {
  a: number;
  r: number;
  x: number;
  y: number;
}

export type Form = (i: number, t: number) => Dot;

export interface Key {
  at: number;
  form: Form;
  /** Seconds one dot spends travelling. */
  dur?: number;
  ease?: (x: number) => number;
  /** `sweep` releases dots left to right by where they are going; `random` scatters. */
  order?: "random" | "sweep";
  /** Seconds between the first dot leaving and the last. */
  spread?: number;
}

export interface Rect {
  h: number;
  w: number;
  x: number;
  y: number;
}

/* -- Arithmetic ------------------------------------------------------------ */

/** A stable pseudo-random number in [0, 1) for a dot and a purpose. An integer hash,
 *  so the bitwise operators are the point here. */
/* eslint-disable no-bitwise, unicorn/prefer-math-trunc */
export const hash = (i: number, salt: number) => {
  let h = Math.imul(i + 1, 374_761_393) ^ Math.imul(salt + 7, 668_265_263);
  h = Math.imul(h ^ (h >>> 13), 1_274_126_177);
  return ((h ^ (h >>> 16)) >>> 0) / 4_294_967_296;
};
/* eslint-enable no-bitwise, unicorn/prefer-math-trunc */

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
export const inOut = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
export const out = (x: number) => 1 - (1 - x) ** 3;
export const outBack = (x: number) => {
  const c = 1.9;
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
};

/** 0 before `from`, 1 after `from + dur`, eased between. */
export const ramp = (t: number, from: number, dur: number, ease = inOut) =>
  ease(clamp01((t - from) / dur));

/* -- Formations ------------------------------------------------------------ */

const HIDDEN = { a: 0, r: 0 };

/** One dot at a point; the rest wait on it, unseen. */
export const point =
  (x: number, y: number, r: number): Form =>
  (i) =>
    i === 0 ? { a: 1, r, x, y } : { ...HIDDEN, x, y };

/** The agent indicator's 3x3 grid, with its opacity wave running diagonally through
 *  it while `wave` is on. Every other dot hides behind one of the nine. */
export const grid3 =
  (cx: number, cy: number, gap: number, r: number, wave = true): Form =>
  (i, t) => {
    const k = i % 9;
    const col = k % 3;
    const row = Math.floor(k / 3);
    const x = cx + (col - 1) * gap;
    const y = cy + (row - 1) * gap;
    if (i >= 9) {
      return { ...HIDDEN, x, y };
    }
    const a = wave
      ? 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 5.2 - (col + row) * 0.95))
      : 1;
    return { a, r, x, y };
  };

/** Dust across the whole frame, drifting. */
export const field =
  (level = 1): Form =>
  (i, t) => ({
    a: (0.18 + hash(i, 6) * 0.4) * level,
    r: 0.7 + hash(i, 5) * 1.5,
    x: hash(i, 1) * W + Math.sin(t * 0.45 + hash(i, 2) * 6.28) * 14,
    y: hash(i, 3) * H + Math.cos(t * 0.38 + hash(i, 4) * 6.28) * 10,
  });

/** A dot matrix filling a rectangle: the silhouette a component is about to occupy.
 *  `n` is how many dots it is built from when it shares the swarm with another form. */
export const matrix =
  ({ h, w, x, y }: Rect, a = 0.5, n = N): Form =>
  (i, t) => {
    const s = Math.sqrt((w * h) / n);
    const cols = Math.max(1, Math.round(w / s));
    const rows = Math.max(1, Math.floor(n / cols));
    const k = i % (cols * rows);
    const px = x + ((k % cols) + 0.5) * (w / cols);
    const py = y + (Math.floor(k / cols) + 0.5) * (h / rows);
    if (i >= cols * rows) {
      return { ...HIDDEN, x: px, y: py };
    }
    const shimmer = 0.65 + 0.35 * Math.sin(t * 3 + hash(i, 9) * 6.28);
    return { a: a * shimmer, r: 1.25, x: px, y: py };
  };

/** Dots strung along a cubic bezier, brightest in a band that travels along it. */
export const strand =
  (p: [number, number][], a = 0.7): Form =>
  (i, t) => {
    const u = i / (N - 1);
    const v = 1 - u;
    const x =
      v * v * v * p[0][0] +
      3 * v * v * u * p[1][0] +
      3 * v * u * u * p[2][0] +
      u * u * u * p[3][0];
    const y =
      v * v * v * p[0][1] +
      3 * v * v * u * p[1][1] +
      3 * v * u * u * p[2][1] +
      u * u * u * p[3][1];
    const band = Math.exp(-(((u - ((t * 0.9) % 1.4) + 0.2) / 0.08) ** 2));
    return { a: a * (0.35 + 0.65 * band), r: 1.1 + band * 0.9, x, y };
  };

/** Points sampled off rendered text, as a formation. */
export const glyphs =
  (points: [number, number][], a = 0.85, r = 1.5): Form =>
  (i) => {
    if (points.length === 0) {
      return { ...HIDDEN, x: W / 2, y: H / 2 };
    }
    const [x, y] = points[i % points.length];
    return i < points.length ? { a, r, x, y } : { ...HIDDEN, x, y };
  };

/** Two formations sharing the swarm: the first `count` dots take `head`. */
export const split =
  (count: number, head: Form, tail: Form): Form =>
  (i, t) =>
    i < count ? head(i, t) : tail(i - count, t);

/** Rasterises `text` and keeps one point per `step` px where it is inked. Runs in the
 *  page, after the face has loaded, so the points follow the real letterforms. */
export const sampleText = (
  text: string,
  font: string,
  cx: number,
  cy: number,
  step: number
) => {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return [];
  }
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy);
  const { data } = ctx.getImageData(0, 0, W, H);
  const points: [number, number][] = [];
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      if (data[(y * W + x) * 4 + 3] > 140) {
        points.push([x, y]);
      }
    }
  }
  // More ink than dots: keep an even spread rather than the top of the word.
  if (points.length <= N) {
    return points;
  }
  return Array.from(
    { length: N },
    (_, k) => points[Math.floor((k * points.length) / N)]
  );
};

/* -- Travel ---------------------------------------------------------------- */

/** Where dot `i` is at `t` under keys `0..k`. A key whose trip is unfinished departs
 *  from wherever the keys before it put the dot, so trips can overlap without a jump. */
const resolve = (keys: Key[], k: number, i: number, t: number): Dot => {
  const key = keys[k];
  const to = key.form(i, t);
  if (k === 0) {
    return to;
  }
  const dur = key.dur ?? 0.9;
  const spread = key.spread ?? 0.3;
  const rank = key.order === "sweep" ? clamp01(to.x / W) : hash(i, 8);
  const p = clamp01((t - key.at - rank * spread) / dur);
  if (p >= 1) {
    return to;
  }
  const from = resolve(keys, k - 1, i, t);
  if (p <= 0) {
    return from;
  }
  const e = (key.ease ?? inOut)(p);
  // A curved flight: the control point sits off the straight line by a per-dot
  // amount, so the swarm fans out and folds back instead of sliding as a block.
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const bend = (hash(i, 7) - 0.5) * 0.7;
  const cx = (from.x + to.x) / 2 - dy * bend;
  const cy = (from.y + to.y) / 2 + dx * bend;
  const v = 1 - e;
  return {
    a: lerp(from.a, to.a, e),
    r: lerp(from.r, to.r, e),
    x: v * v * from.x + 2 * v * e * cx + e * e * to.x,
    y: v * v * from.y + 2 * v * e * cy + e * e * to.y,
  };
};

export const swarmAt = (keys: Key[], t: number): Dot[] => {
  let k = keys.length - 1;
  while (k > 0 && keys[k].at > t) {
    k -= 1;
  }
  return Array.from({ length: N }, (_, i) => resolve(keys, k, i, t));
};

export const drawSwarm = (
  ctx: CanvasRenderingContext2D,
  dots: Dot[],
  color: string,
  scale: number
) => {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  for (const { a, r, x, y } of dots) {
    if (a < 0.01 || r < 0.05) {
      continue;
    }
    ctx.globalAlpha = Math.min(1, a);
    // Only the big dots of the opening glow; dust stays crisp.
    ctx.shadowBlur = r > 3 ? r * 2.5 : 0;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
};
