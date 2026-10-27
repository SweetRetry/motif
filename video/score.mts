/**
 * Synthesises the film's score from the same table the picture reads.
 *
 *   node score.mts   → out/score.wav (48 kHz, stereo, 16-bit)
 *
 * A pad holds the chords, a soft pulse keeps the beat, and every hit in the timeline
 * lands on the frame where the picture does the thing it marks. Nothing is sampled or
 * licensed: the sound is arithmetic, so it re-renders with the picture.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { BEAT, CHORDS, CUE, HITS, LENGTH } from "./film/timeline.ts";

const RATE = 48_000;
const TAIL = 0.5;
const frames = Math.ceil((LENGTH + TAIL) * RATE);
const left = new Float32Array(frames);
const right = new Float32Array(frames);
const TAU = Math.PI * 2;

/** A stable pseudo-random value in [-1, 1) for noise. An LCG is integer arithmetic,
 *  so the bitwise operators are the point here. */
/* eslint-disable no-bitwise, unicorn/prefer-math-trunc */
let seed = 795_548_986;
const noise = () => {
  seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
  return seed / 2_147_483_648 - 1;
};
/* eslint-enable no-bitwise, unicorn/prefer-math-trunc */

const add = (index: number, value: number, pan = 0) => {
  if (index < 0 || index >= frames) {
    return;
  }
  left[index] += value * Math.min(1, 1 - pan);
  right[index] += value * Math.min(1, 1 + pan);
};

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const hz = (semitonesAboveA2: number) => 110 * 2 ** (semitonesAboveA2 / 12);

/* -- Pad ------------------------------------------------------------------- */

const FADE = 0.9;
for (const [index, { at, notes }] of CHORDS.entries()) {
  const end = (CHORDS[index + 1]?.at ?? LENGTH) + FADE;
  for (const [voice, note] of notes.entries()) {
    const f = hz(note);
    const pan = (voice / (notes.length - 1) - 0.5) * 0.6;
    for (
      let i = Math.floor(at * RATE);
      i < Math.min(frames, end * RATE);
      i += 1
    ) {
      const t = i / RATE;
      const env = Math.min(1, (t - at) / FADE, (end - t) / FADE);
      const shimmer = 0.85 + 0.15 * Math.sin(TAU * 0.18 * t + voice * 1.7);
      const tone =
        Math.sin(TAU * f * t) +
        0.28 * Math.sin(TAU * 2.003 * f * t + 0.4) +
        0.12 * Math.sin(TAU * 3.01 * f * t + 1.1);
      add(i, 0.035 * env * shimmer * tone, pan);
    }
  }
}

/* -- Pulse: a soft low beat from the first chapter to the outro ------------ */

for (let beat = CUE.think; beat < CUE.outro - 1e-6; beat += BEAT) {
  const start = Math.floor(beat * RATE);
  const strong = Math.round((beat - CUE.think) / BEAT) % 4 === 0;
  for (let i = 0; i < 0.35 * RATE; i += 1) {
    const t = i / RATE;
    const f = 52 + 50 * Math.exp(-t * 30);
    add(
      start + i,
      (strong ? 0.08 : 0.04) * Math.exp(-t * 11) * Math.sin(TAU * f * t)
    );
  }
}

/* -- Hits ------------------------------------------------------------------ */

const PENTATONIC = [0, 3, 5, 7, 10];
// An octave under where it first sat: the top notes were near 1.8 kHz, which is where
// a long listen starts to sting.
const pluckHz = (degree: number) =>
  hz(12 + 12 * Math.floor(degree / 5) + PENTATONIC[degree % 5]);

const pluck = (start: number, degree: number) => {
  const f = pluckHz(degree);
  const pan = ((degree % 5) / 4 - 0.5) * 0.5;
  // Three echoes a dotted eighth apart, alternating sides, for room.
  for (const [delay, gain, side] of [
    [0, 1, pan],
    [0.75 * BEAT, 0.2, -0.6],
    [1.5 * BEAT, 0.07, 0.6],
  ] as const) {
    const from = Math.floor((start + delay) * RATE);
    for (let i = 0; i < 1.4 * RATE; i += 1) {
      const t = i / RATE;
      // A rounded onset and a quiet octave: a felt mallet rather than a plucked wire.
      const attack = Math.min(1, t / 0.012);
      const tone =
        Math.sin(TAU * f * t) +
        0.12 * Math.exp(-t * 12) * Math.sin(TAU * 2 * f * t);
      add(from + i, 0.11 * gain * attack * Math.exp(-t * 3.4) * tone, side);
    }
  }
};

/** A control settling: a short low tock with no noise in it, so a run of them reads as
 *  touch rather than as clicks. */
const tick = (start: number) => {
  const from = Math.floor(start * RATE);
  for (let i = 0; i < 0.08 * RATE; i += 1) {
    const t = i / RATE;
    const attack = Math.min(1, t / 0.002);
    const env = attack * Math.exp(-t * 55);
    add(
      from + i,
      0.05 * env * (Math.sin(TAU * 660 * t) + 0.4 * Math.sin(TAU * 990 * t)),
      0.2
    );
  }
};

const thump = (start: number) => {
  const from = Math.floor(start * RATE);
  for (let i = 0; i < 0.9 * RATE; i += 1) {
    const t = i / RATE;
    const f = 44 + 90 * Math.exp(-t * 18);
    add(from + i, 0.24 * Math.exp(-t * 4.5) * Math.sin(TAU * f * t));
  }
};

const rise = (start: number) => {
  const from = Math.floor(start * RATE);
  const length = BEAT * RATE;
  let low = 0;
  for (let i = 0; i < length; i += 1) {
    const p = i / length;
    // A one-pole low-pass that opens as the rise goes on.
    low += (0.02 + 0.5 * p * p) * (noise() - low);
    add(from + i, 0.07 * p * p * low, Math.sin(p * 9) * 0.4);
  }
};

/** Air moving past: noise through a band that opens and closes with the motion,
 *  panned from where the thing starts to where it lands. */
const swoosh = (
  start: number,
  dur: number,
  [panFrom, panTo]: [number, number]
) => {
  const from = Math.floor(start * RATE);
  const length = Math.floor(dur * RATE);
  let fast = 0;
  let slow = 0;
  for (let i = 0; i < length; i += 1) {
    const p = i / length;
    const env = Math.sin(Math.PI * p) ** 2;
    const raw = noise();
    fast += (0.03 + 0.1 * env) * (raw - fast);
    slow += 0.01 * (raw - slow);
    add(from + i, 0.14 * env * (fast - slow), lerp(panFrom, panTo, p));
  }
};

for (const hit of HITS) {
  if (hit.kind === "pluck") {
    pluck(hit.at, hit.note);
  } else if (hit.kind === "swoosh") {
    swoosh(hit.at, hit.dur, hit.pan);
  } else if (hit.kind === "tick") {
    tick(hit.at);
  } else if (hit.kind === "thump") {
    thump(hit.at);
  } else {
    rise(hit.at);
  }
}

/* -- Master ---------------------------------------------------------------- */

// Two gentle low-passes in series take the edge off everything above a few kHz, and
// the saturation is left light, so nothing is squeezed into a wall of loudness.
const ROLLOFF = 1 - Math.exp((-TAU * 4500) / RATE);
const fadeFrom = (LENGTH - 1.5) * RATE;
const lows = [0, 0, 0, 0];
let peak = 0;
for (let i = 0; i < frames; i += 1) {
  const fade =
    i > fadeFrom ? Math.max(0, 1 - (i - fadeFrom) / (1.5 * RATE)) : 1;
  lows[0] += ROLLOFF * (left[i] - lows[0]);
  lows[1] += ROLLOFF * (lows[0] - lows[1]);
  lows[2] += ROLLOFF * (right[i] - lows[2]);
  lows[3] += ROLLOFF * (lows[2] - lows[3]);
  left[i] = Math.tanh(lows[1]) * fade;
  right[i] = Math.tanh(lows[3]) * fade;
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
}
const gain = 10 ** (-3 / 20) / peak;

const data = Buffer.alloc(frames * 4);
for (let i = 0; i < frames; i += 1) {
  data.writeInt16LE(Math.round(left[i] * gain * 32_767), i * 4);
  data.writeInt16LE(Math.round(right[i] * gain * 32_767), i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);

const out = join(import.meta.dirname, "out");
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "score.wav"), Buffer.concat([header, data]));
console.log(`score: ${(frames / RATE).toFixed(2)} s → out/score.wav`);
