/**
 * Renders every deliverable of the launch film from source.
 *
 *   node render.mts          capture, score and cut everything
 *   node render.mts --cuts   recut from the last capture, for timing changes to a cut
 *
 *   out/motif-launch.mp4   the film with its score, loudness-matched for social feeds
 *   out/motif-loop.mp4     a silent loop for a README or a hero, and the same as .webm
 *   out/motif-cover.png    the poster frame
 *
 * Each step is a script in this folder; this only runs them in order and cuts the
 * results, so a step can still be rerun alone while working on it.
 */
import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { CUE } from "./film/timeline.ts";

const here = import.meta.dirname;
const out = (file: string) => join(here, "out", file);
const run = (command: string, args: string[]) =>
  execFileSync(command, args, { cwd: here, stdio: "inherit" });
const ffmpeg = (...args: string[]) =>
  run("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-threads",
    "2",
    ...args,
  ]);

if (!process.argv.includes("--cuts")) {
  run("node", ["build.mts"]);
  run("node", ["--max-old-space-size=1024", "capture.mts", "film"]);
  run("node", ["score.mts"]);
}

// -16 LUFS sits a little under where X and YouTube normalise to (-14): a feed turns
// the film up a touch rather than down, and a listen through on headphones stays soft.
ffmpeg(
  "-i",
  out("film.mp4"),
  "-i",
  out("score.wav"),
  "-map",
  "0:v",
  "-map",
  "1:a",
  "-c:v",
  "copy",
  "-af",
  "loudnorm=I=-16:TP=-2:LRA=9",
  "-c:a",
  "aac",
  "-b:a",
  "192k",
  "-ar",
  "48000",
  "-shortest",
  "-movflags",
  "+faststart",
  out("motif-launch.mp4")
);

// The exploded view through the theme sweep, with its tail dissolved into its head so
// it loops without a seam.
const from = CUE.explode - 1;
const length = CUE.install - from;
const blend = 0.5;
const loop = [
  "-ss",
  String(from),
  "-t",
  String(length),
  "-i",
  out("film.mp4"),
  "-filter_complex",
  `[0:v]split[a][b];[a]trim=0:${length - blend},setpts=PTS-STARTPTS[body];` +
    `[b]trim=${length - blend}:${length},setpts=PTS-STARTPTS[tail];` +
    `[body][tail]xfade=transition=fade:duration=${blend}:offset=${length - 2 * blend}[v]`,
  "-map",
  "[v]",
  "-an",
];
ffmpeg(
  ...loop,
  "-c:v",
  "libx264",
  "-crf",
  "18",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  out("motif-loop.mp4")
);
ffmpeg(
  ...loop,
  "-c:v",
  "libvpx-vp9",
  "-crf",
  "32",
  "-b:v",
  "0",
  "-row-mt",
  "1",
  out("motif-loop.webm")
);

// The wordmark with its line and address under it.
ffmpeg(
  "-ss",
  String(CUE.outro + 3),
  "-i",
  out("film.mp4"),
  "-frames:v",
  "1",
  out("motif-cover.png")
);

console.log(
  "rendered → out/motif-launch.mp4, out/motif-loop.{mp4,webm}, out/motif-cover.png"
);
