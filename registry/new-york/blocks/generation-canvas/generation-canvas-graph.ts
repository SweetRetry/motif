import type { Edge, Node } from "@xyflow/react";

/* -- What the canvas knows -------------------------------------------------------
 * A generation canvas is a small graph with one kind of node: a frame that holds a
 * result. What to make, and how, belongs to the frame itself, so there is no separate
 * node for a prompt or for settings. An edge says one thing, that a frame starts from
 * the picture in another, and work flows left to right along it.
 *
 * Nothing in this file imports React, and the only import is a type. The rules for what
 * may be connected, what a frame starts from and whether it can run are the part of the
 * canvas worth testing, and they are the part a viewport library should not be able to
 * get wrong.
 * --------------------------------------------------------------------------- */

/** Where a result stands. Four words, the same four a tool call has, because a node
 *  that makes something is in the same four places a call is. */
export type ResultStatus = "idle" | "pending" | "done" | "failed";

/** What to make and how. The composer edits these on the selected frame. */
export interface Brief extends Record<string, unknown> {
  aspect: string;
  /** A `ModelSelectModel.id`. Unset, the canvas asks the first model of the kind. */
  model?: string;
  prompt: string;
  resolution: string;
  strength: string;
}

export interface ResultData extends Brief {
  error?: string;
  /** The seed of the last run. `0` before there has been one. */
  seed: number;
  src?: string;
  status: ResultStatus;
}

export type ImageNode = Node<ResultData, "image">;
export type VideoNode = Node<ResultData, "video">;
export type ResultNode = ImageNode | VideoNode;
export type CanvasNode = ResultNode;
export type CanvasEdge = Edge;

export type NodeKind = "image" | "video";

/** What a run asks the model for. Everything a transport needs and nothing it has to
 *  go and look up in the graph. */
export interface GenerateJob {
  aspect: string;
  kind: NodeKind;
  model?: string;
  prompt: string;
  /** The picture a frame starts from, when an image is connected to it. */
  reference?: string;
  resolution: string;
  seed: number;
  strength: string;
}

/** The seam between the canvas and a model. It resolves with where the result is, and
 *  rejects to fail the node. The signal aborts when the node is deleted, and a transport
 *  that can stop should. */
export type Generate = (
  job: GenerateJob,
  signal: AbortSignal
) => Promise<{ src: string }>;

export const DEFAULT_BRIEF: Brief = {
  aspect: "16:9",
  prompt: "",
  resolution: "2K",
  strength: "Medium",
};

export const blankResult = (): ResultData => ({
  ...DEFAULT_BRIEF,
  seed: 0,
  status: "idle",
});

/** Whether `to` can be reached from `from` by following edges forwards. Used to refuse
 *  an edge that would close a loop: a frame cannot start from itself, however far round. */
const reaches = (from: string, to: string, edges: readonly CanvasEdge[]) => {
  const seen = new Set<string>();
  const stack = [from];

  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (id === to) {
      return true;
    }
    if (!seen.has(id)) {
      seen.add(id);
      for (const edge of edges) {
        if (edge.source === id) {
          stack.push(edge.target);
        }
      }
    }
  }

  return false;
};

/**
 * Whether an edge from `source` to `target` is allowed.
 *
 * Three rules. Only an image can be started from: nothing is made from a clip, so a video
 * is an end. A frame starts from one picture, because two pictures feeding one is a
 * question the frame cannot answer and not one the user meant to ask; this is also what
 * stops the same edge being drawn twice. And the graph has no loops.
 */
export const canConnect = (
  connection: { source: string | null; target: string | null },
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[]
): boolean => {
  const { source, target } = connection;
  if (!(source && target) || source === target) {
    return false;
  }

  const from = nodes.find((node) => node.id === source);
  const to = nodes.find((node) => node.id === target);
  if (!(from && to) || from.type !== "image") {
    return false;
  }

  const taken = edges.some((edge) => edge.target === target);

  return !(taken || reaches(target, source, edges));
};

/** The frame a node starts from, read off the edge that arrives at it. */
export const referenceOf = (
  id: string,
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[]
): ResultNode | undefined => {
  const edge = edges.find((candidate) => candidate.target === id);

  return edge ? nodes.find((node) => node.id === edge.source) : undefined;
};

/** Whether a node can be run now: it is not already making something, and it has a
 *  prompt to make it from. */
export const canRun = (node: CanvasNode): boolean =>
  node.data.status !== "pending" && node.data.prompt.trim() !== "";

/** The request for a node's next run, or `null` when it cannot be made. The seed is the
 *  node's own, so a caller bumps it first and the job carries the new one. */
export const jobOf = (
  node: ResultNode,
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[]
): GenerateJob | null => {
  const prompt = node.data.prompt.trim();
  if (!prompt) {
    return null;
  }

  return {
    aspect: node.data.aspect,
    kind: node.type,
    model: node.data.model,
    prompt,
    reference: referenceOf(node.id, nodes, edges)?.data.src,
    resolution: node.data.resolution,
    seed: node.data.seed,
    strength: node.data.strength,
  };
};

/** A new frame of a kind, at a position in the plane. */
export const createNode = (
  kind: NodeKind,
  id: string,
  position: { x: number; y: number },
  brief: Partial<Brief> = {}
): CanvasNode => ({
  data: { ...blankResult(), ...brief },
  id,
  position,
  type: kind,
});

/** A result as the starter graph draws it: made, with its one run behind it, when it has
 *  a source, and empty when it does not. */
const madeFrom = (src: string | undefined, prompt: string): ResultData => ({
  ...blankResult(),
  prompt,
  seed: src ? 1 : 0,
  src,
  status: src ? "done" : "idle",
});

export interface StarterFrame {
  prompt: string;
  /** A finished result for the frame. Omitted, the frame starts empty. */
  src?: string;
}

export interface StarterOptions {
  /** The images the starter opens with. The first one is the one the clip starts from. */
  images?: readonly StarterFrame[];
  /** The clip the first image starts. */
  video?: StarterFrame;
}

const IMAGE_WIDTH = 288;
const GAP = 140;

/** The graph a new canvas opens with: an image, a clip started from it, and an image on
 *  its own, so the plane shows a picture, a line and a lone frame. Positions are the
 *  frames' top-left corners in plane units. */
export const starterGraph = ({ images = [], video }: StarterOptions = {}): {
  edges: CanvasEdge[];
  nodes: CanvasNode[];
} => {
  const [first = { prompt: "" }, second = { prompt: "" }] = images;

  return {
    edges: [
      { id: "e-image-video", source: "image", target: "video", type: "flow" },
    ],
    nodes: [
      {
        data: madeFrom(first.src, first.prompt),
        id: "image",
        position: { x: 0, y: 0 },
        type: "image",
      },
      {
        data: madeFrom(video?.src, video?.prompt ?? ""),
        id: "video",
        position: { x: IMAGE_WIDTH + GAP, y: -40 },
        type: "video",
      },
      {
        data: madeFrom(second.src, second.prompt),
        id: "image-2",
        position: { x: IMAGE_WIDTH + GAP + 40, y: 300 },
        type: "image",
      },
    ],
  };
};
