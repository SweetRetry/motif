/**
 * Writes `public/audio-preview-demo.wav` — the clip the Audio Preview example plays.
 *
 * A preview needs something to preview, and a waveform needs something with shape in
 * it: six plucked notes, spaced so each one is a block of its own with quiet between
 * them, and struck at different strengths so the bars are not a flat row. A held tone
 * would draw as one rectangle and prove nothing.
 *
 *   node scripts/generate-audio-demo.mts
 *   afconvert -f m4af -d aac -b 64000 \
 *     public/audio-preview-demo.wav public/audio-preview-demo.m4a
 *   rm public/audio-preview-demo.wav
 *
 * The intermediate WAV is lossless and roughly five times the size; only the m4a is
 * committed, because 28KB of demo audio in a git history is already enough.
 */

import { writeFileSync } from "node:fs";

const RATE = 22_050;
const SECONDS = 3.5;

/** A minor arpeggio, and how hard each note is struck. The velocities are the demo:
 *  they are what the heights in the waveform are made of. */
const NOTES = [
  { at: 0, frequency: 220, velocity: 0.95 },
  { at: 0.55, frequency: 277.18, velocity: 0.5 },
  { at: 1.1, frequency: 329.63, velocity: 0.72 },
  { at: 1.65, frequency: 440, velocity: 0.36 },
  { at: 2.2, frequency: 554.37, velocity: 0.85 },
  { at: 2.75, frequency: 659.25, velocity: 0.46 },
];

/** Long enough to be a note, short enough that the next one starts after this has died
 *  — the gap is what makes six blocks rather than one swell. */
const DECAY = 0.45;

/** Five milliseconds. Slower and the attack is a click; faster and it is a snap. */
const ATTACK = 0.005;

/** Harmonic weights, quietest last. A pure sine has no body; a saw has too much. */
const PARTIALS = [1, 0.4, 0.18, 0.08];

const frames = Math.round(RATE * SECONDS);
const samples = new Float32Array(frames);

for (const note of NOTES) {
  const start = Math.round(note.at * RATE);
  const length = Math.round(DECAY * RATE);
  for (let index = 0; index < length; index += 1) {
    const position = start + index;
    if (position >= frames) {
      break;
    }
    const time = index / RATE;
    const envelope =
      Math.min(1, time / ATTACK) *
      Math.exp((-time / DECAY) * 4.5) *
      note.velocity;
    let value = 0;
    for (const [harmonic, weight] of PARTIALS.entries()) {
      value +=
        weight * Math.sin(2 * Math.PI * note.frequency * (harmonic + 1) * time);
    }
    samples[position] += (value / PARTIALS.length) * envelope;
  }
}

// 16-bit PCM in a 44-byte RIFF header, which is all the browser needs to decode it.
const bytes = Buffer.alloc(44 + frames * 2);
bytes.write("RIFF", 0);
bytes.writeUInt32LE(36 + frames * 2, 4);
bytes.write("WAVE", 8);
bytes.write("fmt ", 12);
bytes.writeUInt32LE(16, 16);
bytes.writeUInt16LE(1, 20);
bytes.writeUInt16LE(1, 22);
bytes.writeUInt32LE(RATE, 24);
bytes.writeUInt32LE(RATE * 2, 28);
bytes.writeUInt16LE(2, 32);
bytes.writeUInt16LE(16, 34);
bytes.write("data", 36);
bytes.writeUInt32LE(frames * 2, 40);

for (let index = 0; index < frames; index += 1) {
  // Clipped rather than limited: with these velocities nothing reaches full scale, and
  // a clip that never fires is the honest way to say so.
  const clamped = Math.max(-1, Math.min(1, samples[index]));
  bytes.writeInt16LE(Math.round(clamped * 32_767), 44 + index * 2);
}

const target = new URL("../public/audio-preview-demo.wav", import.meta.url);
writeFileSync(target, bytes);
console.log(`wrote ${target.pathname} — ${bytes.length} bytes`);
