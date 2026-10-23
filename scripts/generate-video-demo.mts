/**
 * Generates the clip the Video Preview demo plays, so the asset is a command and not a
 * file nobody can reproduce:
 *
 *   node scripts/generate-video-demo.mts
 *
 * A Mandelbrot zoom, because a filmstrip is only worth drawing for a clip whose frames
 * differ, and this one looks different at every second. Silent, so the demo never plays
 * sound at anyone. A keyframe every six frames keeps seeking from landing far from where
 * it was asked to. Needs `ffmpeg` on the path.
 */

import { execFileSync } from "node:child_process";
import { join } from "node:path";

const OUTPUT = join(
  import.meta.dirname,
  "..",
  "public",
  "video-preview-demo.mp4"
);

execFileSync(
  "ffmpeg",
  [
    "-f",
    "lavfi",
    "-i",
    "mandelbrot=size=640x360:rate=24",
    "-t",
    "6",
    "-c:v",
    "libx264",
    "-crf",
    "30",
    "-pix_fmt",
    "yuv420p",
    "-x264-params",
    "keyint=6:scenecut=0",
    "-movflags",
    "+faststart",
    "-an",
    "-y",
    OUTPUT,
  ],
  { stdio: "inherit" }
);
