/**
 * The film's clock, in one table both the picture and the score read.
 *
 * Everything lands on a beat of a 100 BPM grid, so a cut, a dot formation arriving and
 * a note in the score are the same moment by construction rather than by alignment.
 */
export const BPM = 100;
export const BEAT = 60 / BPM;

const on = (beats: number) => beats * BEAT;

/** When each scene begins, in seconds. A scene runs until the next one begins. */
export const CUE = {
  approve: on(14),
  assemble: on(45),
  attach: on(31),
  burst: on(6),
  compose: on(37),
  end: on(66),
  explode: on(40),
  flow: on(24),
  install: on(50),
  outro: on(58),
  own: on(47),
  render: on(26),
  seed: 0,
  settings: on(18),
  split: on(1),
  think: on(7),
  title: on(3),
} as const;

export const LENGTH = CUE.end;

/** What happens on screen inside each scene. The picture shows each of these at its
 *  time and the score plays it there, so a sound cannot drift off the thing it marks.
 *  A scene's component starts its entrance at its `…Shown` moment, which is when the
 *  dots that drew it land. */
export const AT = {
  address: CUE.outro + on(4),
  /** The card confirms the pick a beat after it is made. */
  approveAnswer: CUE.approve + on(3),
  /** The agent's proposal is picked. */
  approveSelect: CUE.approve + on(2),
  approveShown: CUE.approve + on(1),
  /** Each installed part's check, first to last. */
  check: (index: number) => CUE.install + on(3.5 + index / 2),
  /** The image lands in the composer as an attachment. */
  chipShown: CUE.attach + on(1),
  /** The duration slider walks 3 → 6 over one beat from here. */
  duration: CUE.settings + on(4),
  flowShown: CUE.flow + on(1),
  /** The image shrinks from the frame into the composer. */
  fly: CUE.attach,
  inRepo: CUE.install + on(5.5),
  /** Each layer's label in the exploded view, deepest first. */
  label: (depth: number) => CUE.explode + on(1 + depth / 2),
  /** The exploded view folds back flat and lands on the third chapter. */
  landed: CUE.own,
  promptShown: CUE.attach + on(0.5),
  ratio: CUE.settings + on(2),
  rendered: CUE.render + on(4),
  resolution: CUE.settings + on(3),
  settingsShown: CUE.settings + on(1),
  /** The thinking block streams its passage between these. */
  streamFrom: CUE.think + on(1),
  streamTo: CUE.approve - on(1),
  surfaceShown: CUE.compose + on(1),
  sweepIn: CUE.own + on(1),
  sweepOut: CUE.own + on(2.4),
  tagline: CUE.outro + on(3),
  termShown: CUE.install + on(1),
  thinkShown: CUE.think + on(1),
  /** The upload ring steps every half beat from the chip, and is done here. */
  uploadDone: CUE.attach + on(4),
  wave: CUE.outro + on(6),
  wordmark: CUE.outro + on(2),
} as const;

export const SWEEP = { in: 0.6, out: 0.5 } as const;

/** Text the picture types, a character at a time. */
export const TYPING = {
  command: {
    at: CUE.install + on(1.5),
    cps: 70,
    text: "npx shadcn@latest add https://motif.sweetretry.com/r/agent-run.json",
  },
  prompt: {
    at: CUE.attach + on(2.5),
    cps: 24,
    text: "Make it loop for the hero.",
  },
} as const;

/** The thinking block's passage, streamed a word at a time. */
export const PASSAGE = `A six second portrait in raven feathers, dusk light. The feathers spread past the shoulders, so a wide frame: 16:9. Skin and feather detail want 2K. Six seconds holds one slow turn of the head. Confirm before rendering.`;
export const WORDS = PASSAGE.split(" ");

/** What the score plays and when. `pluck` marks something arriving, `tick` a control
 *  changing, `thump` a chapter, `rise` the beats leading into one, `swoosh` the theme
 *  wiping across the frame, panned the way it travels.
 *
 *  The score marks one thing per moment and leaves the rest to the picture: typing,
 *  streaming and each line of a list read on screen without a sound of their own. */
export type Hit =
  | { at: number; kind: "rise" | "thump" | "tick" }
  | { at: number; kind: "pluck"; note: number }
  | { at: number; dur: number; kind: "swoosh"; pan: [number, number] };

export const HITS: Hit[] = [
  { at: CUE.seed + 0.05, kind: "pluck", note: 0 },
  { at: CUE.split, kind: "pluck", note: 4 },
  { at: CUE.title, kind: "pluck", note: 5 },
  { at: CUE.burst - on(1), kind: "rise" },
  { at: CUE.burst, kind: "pluck", note: 7 },

  { at: CUE.think, kind: "thump" },
  { at: AT.thinkShown, kind: "pluck", note: 5 },
  { at: AT.approveShown, kind: "pluck", note: 2 },
  { at: AT.approveSelect, kind: "tick" },
  { at: AT.settingsShown, kind: "pluck", note: 3 },
  { at: AT.ratio, kind: "tick" },
  { at: AT.resolution, kind: "tick" },
  { at: AT.flowShown, kind: "pluck", note: 4 },
  { at: AT.rendered, kind: "pluck", note: 9 },
  { at: AT.chipShown, kind: "pluck", note: 5 },
  { at: AT.uploadDone, kind: "tick" },

  { at: CUE.compose, kind: "thump" },
  { at: AT.label(0), kind: "pluck", note: 7 },
  { at: AT.landed, kind: "thump" },
  { at: AT.sweepIn, dur: SWEEP.in, kind: "swoosh", pan: [-0.8, 0.8] },
  { at: AT.termShown, kind: "pluck", note: 2 },
  { at: AT.inRepo, kind: "pluck", note: 9 },

  { at: CUE.outro - on(2), kind: "rise" },
  { at: CUE.outro, kind: "thump" },
  { at: AT.wordmark, kind: "pluck", note: 7 },
  { at: AT.address, kind: "pluck", note: 12 },
];

/** The pad underneath, one chord per stretch of the film, as semitones above A2. */
export const CHORDS: { at: number; notes: number[] }[] = [
  { at: 0, notes: [0, 7, 15, 22] },
  { at: CUE.think, notes: [-4, 3, 10, 19] },
  { at: CUE.settings, notes: [3, 10, 15, 22] },
  { at: CUE.render, notes: [-2, 5, 14, 21] },
  { at: CUE.compose, notes: [0, 7, 14, 19] },
  { at: CUE.own, notes: [-4, 3, 10, 19] },
  { at: CUE.outro, notes: [0, 7, 15, 24] },
];
