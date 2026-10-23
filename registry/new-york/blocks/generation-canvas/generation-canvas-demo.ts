import { starterGraph } from "./generation-canvas-graph";
import type { Generate, GenerateJob } from "./generation-canvas-graph";

/* -- The demo transport ----------------------------------------------------------
 * A stand-in for a model, with the same shape as a real one: it takes a job, takes its
 * time, and resolves with where the result is. Swap `demoGenerate` for a function that
 * calls your own backend and the canvas is a real one.
 *
 * It fails on purpose for one prompt: any text with the word "fail" in it is refused, so
 * the failed state of a node can be reached without breaking anything.
 * --------------------------------------------------------------------------- */

const IMAGE_MS = 2400;
const VIDEO_MS = 3600;

/** The clip a video node "makes". One file, because there is no model behind this: what a
 *  run changes is the seed in the footer, not the pictures in the clip. */
export const DEMO_CLIP = "/video-preview-demo.mp4";

const STRENGTHS = ["Low", "Medium", "High"];

/** A stand-in for an image model: a gradient with more circles the stronger the request.
 *  The art is content, not chrome, so its colours are literal. */
export const artFor = (seed: number, aspect: string, strength: string) => {
  const [w = 16, h = 9] = aspect.split(":").map(Number);
  const hue = (seed * 67) % 360;
  const count = Math.max(STRENGTHS.indexOf(strength) + 2, 2);
  const circles = Array.from({ length: count }, (_, index) => {
    const cx = ((seed * 37 + index * 211) % 100) / 100;
    const cy = ((seed * 53 + index * 137) % 100) / 100;
    return `<circle cx="${cx * w * 100}" cy="${cy * h * 100}" r="${((60 + index * 24) * Math.min(w, h)) / 9}" fill="hsl(${(hue + index * 40) % 360} 85% 70%)" fill-opacity="0.35"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w * 100} ${h * 100}"><defs><radialGradient id="a" cx=".3" cy=".3" r=".9"><stop offset="0" stop-color="hsl(${hue} 80% 62%)"/><stop offset="1" stop-color="hsl(${(hue + 60) % 360} 70% 22%)"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#a)"/>${circles}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/** Waits, and gives up the moment the signal aborts, so a deleted node does not leave a
 *  timer behind it. */
const wait = (ms: number, signal: AbortSignal) =>
  // oxlint-disable-next-line promise/avoid-new -- a timer has no promise form of its own
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }

    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true }
    );
  });

export const demoGenerate: Generate = async (
  job: GenerateJob,
  signal: AbortSignal
) => {
  await wait(job.kind === "video" ? VIDEO_MS : IMAGE_MS, signal);

  if (/\bfail/i.test(job.prompt)) {
    throw new Error("The model declined this prompt.");
  }

  return {
    src:
      job.kind === "video"
        ? DEMO_CLIP
        : artFor(job.seed, job.aspect, job.strength),
  };
};

/** The graph the demo opens with: the starter, with its image and its clip already made,
 *  so the first thing on the plane is a finished picture and not a row of empty frames. */
export const demoGraph = () =>
  starterGraph({
    imageSrc: artFor(1, "16:9", "Medium"),
    videoSrc: DEMO_CLIP,
  });
