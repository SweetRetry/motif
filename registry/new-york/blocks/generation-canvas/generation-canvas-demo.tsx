import type {
  ModelSelectModel,
  ModelSelectProvider,
} from "@/components/ui/motif/model-select";
import { ProviderMark } from "@/components/ui/motif/provider-mark";

import { starterGraph } from "./generation-canvas-graph";
import type {
  Generate,
  GenerateJob,
  NodeKind,
} from "./generation-canvas-graph";

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

/** The clip a video node "makes". One file, because there is no model behind this. */
export const DEMO_CLIP = "/canvas-demo/clip.mp4";

/** What an image node "makes": the next picture in a small set, by seed. */
const PICTURES = Array.from(
  { length: 7 },
  (_, i) => `/canvas-demo/${i + 1}.jpg`
);
export const pictureFor = (seed: number) =>
  PICTURES[Math.max(seed - 1, 0) % PICTURES.length];

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
    src: job.kind === "video" ? DEMO_CLIP : pictureFor(job.seed),
  };
};

/** The graph the demo opens with: two finished pictures and a clip started from the first,
 *  so the first thing on the plane is something to look at and not a row of empty frames. */
export const demoGraph = () => {
  const graph = starterGraph({
    images: [
      {
        prompt: "a diver at the foot of a drowned skyline",
        src: pictureFor(1),
      },
      { prompt: "a white coupe in the rain, floodlights", src: pictureFor(3) },
    ],
    video: {
      prompt: "the camera drifts forward through the water",
      src: DEMO_CLIP,
    },
  });

  // The clip's line is lit from the start, so the first thing on the plane moves.
  return {
    ...graph,
    edges: graph.edges.map((edge) => ({ ...edge, data: { active: true } })),
  };
};

/** The makers the demo's catalogue draws from, in the order the picker walks them. */
export const DEMO_PROVIDERS: ModelSelectProvider[] = [
  {
    icon: <ProviderMark provider="bytedance" />,
    id: "bytedance",
    name: "ByteDance",
  },
  { icon: <ProviderMark provider="google" />, id: "google", name: "Google" },
  { icon: <ProviderMark provider="kling" />, id: "kling", name: "Kling" },
  { icon: <ProviderMark provider="alibaba" />, id: "alibaba", name: "Alibaba" },
  {
    icon: <ProviderMark provider="bfl" />,
    id: "bfl",
    name: "Black Forest Labs",
  },
];

/** What the demo offers to make each kind with. The transport ignores the choice: there is
 *  no model behind it. */
export const DEMO_MODELS: Record<NodeKind, ModelSelectModel[]> = {
  image: [
    {
      description: "Sharp, art-directed pictures with legible type.",
      id: "seedream-4",
      name: "Seedream 4.0",
      provider: "bytedance",
      recommended: true,
    },
    {
      description: "Fast edits that keep a subject the same across frames.",
      id: "nano-banana",
      name: "Nano Banana",
      provider: "google",
      recommended: true,
    },
    {
      description: "Open-weight and photographic.",
      id: "flux-2",
      name: "FLUX.2",
      provider: "bfl",
    },
    {
      description: "Strong on posters and Chinese text.",
      id: "qwen-image",
      name: "Qwen-Image",
      provider: "alibaba",
    },
  ],
  video: [
    {
      description: "Single-shot video with native audio.",
      id: "seedance-2-5",
      name: "Seedance 2.5",
      provider: "bytedance",
      recommended: true,
    },
    {
      description: "Native audio and dialogue, up to 4k.",
      id: "veo-3-1",
      name: "Veo 3.1",
      provider: "google",
      recommended: true,
    },
    {
      description: "Best-in-class motion and prompt adherence.",
      id: "kling-2-5-turbo",
      name: "Kling 2.5 Turbo",
      provider: "kling",
    },
    {
      description: "Open-weight video model with audio.",
      id: "wan-2-5",
      name: "Wan 2.5 Preview",
      provider: "alibaba",
    },
  ],
};
