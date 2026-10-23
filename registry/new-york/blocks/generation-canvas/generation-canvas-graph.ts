import type { Edge, Node } from "@xyflow/react";

/* -- What the canvas knows -------------------------------------------------------
 * A generation canvas is a small graph with one rule: work flows left to right, from
 * the nodes that hold an *input* to the nodes that hold a *result*. A prompt says what
 * to make, settings say how, and an image can be the reference a video starts from.
 * Everything the canvas does follows from that, so it is written down once, here, with
 * nothing in it that draws.
 *
 * Nothing in this file imports React, and the only import is a type. The rules for what
 * may be connected, what a node is fed by and whether it can run are the part of the
 * canvas worth testing, and they are the part a viewport library should not be able to
 * get wrong.
 * --------------------------------------------------------------------------- */

export interface PromptData extends Record<string, unknown> {
  text: string;
}

export interface SettingsData extends Record<string, unknown> {
  /** `"16:9"`, the string `AspectRatioPicker` hands back. */
  aspect: string;
  resolution: string;
  strength: string;
}

/** Where a result stands. Four words, the same four a tool call has, because a node
 *  that makes something is in the same four places a call is. */
export type ResultStatus = "idle" | "pending" | "done" | "failed";

export interface ResultData extends Record<string, unknown> {
  /** What was asked for on the last run, kept so the footer under the picture says what
   *  the picture is rather than what the settings say now. */
  aspect: string;
  error?: string;
  resolution: string;
  /** The seed of the last run. `0` before there has been one. */
  seed: number;
  src?: string;
  status: ResultStatus;
}

export type PromptNode = Node<PromptData, "prompt">;
export type SettingsNode = Node<SettingsData, "settings">;
export type ImageNode = Node<ResultData, "image">;
export type VideoNode = Node<ResultData, "video">;
export type ResultNode = ImageNode | VideoNode;
export type CanvasNode = PromptNode | SettingsNode | ResultNode;
export type CanvasEdge = Edge;

export type NodeKind = "prompt" | "settings" | "image" | "video";

/** What a run asks the model for. Everything a transport needs and nothing it has to
 *  go and look up in the graph. */
export interface GenerateJob {
  aspect: string;
  kind: "image" | "video";
  prompt: string;
  /** The picture a video starts from, when an image is connected to it. */
  reference?: string;
  resolution: string;
  seed: number;
  strength: string;
}

/** The seam between the canvas and a model. It resolves with where the result is, and
 *  rejects to fail the node. The signal aborts when the node is deleted or the canvas is
 *  reset, and a transport that can stop should. */
export type Generate = (
  job: GenerateJob,
  signal: AbortSignal
) => Promise<{ src: string }>;

/** The class a node's header carries. Only the header drags a node, so the controls in
 *  its body, a text field, a picker, a clip's strip, are free to take a press without
 *  moving anything. */
export const DRAG_HANDLE = ".canvas-node-drag";

export const DEFAULT_SETTINGS: SettingsData = {
  aspect: "16:9",
  resolution: "2K",
  strength: "Medium",
};

/** Which kinds an edge may leave, and which it may arrive at. A video is an end: nothing
 *  is made from one, so there is no port on its right. */
const SOURCES: ReadonlySet<string | undefined> = new Set([
  "prompt",
  "settings",
  "image",
]);
const TARGETS: ReadonlySet<string | undefined> = new Set(["image", "video"]);

export const isResult = (node: CanvasNode): node is ResultNode =>
  node.type === "image" || node.type === "video";

export const blankResult = (): ResultData => ({
  ...DEFAULT_SETTINGS,
  seed: 0,
  status: "idle",
});

/** Whether `to` can be reached from `from` by following edges forwards. Used to refuse
 *  an edge that would close a loop: a result cannot feed itself, however far round. */
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
 * Three rules. Work flows from an input or an earlier result into a result. A node takes
 * one input of each kind, because two prompts feeding one image is a question the node
 * cannot answer and not one the user meant to ask; this is also what stops the same edge
 * being drawn twice. And the graph has no loops.
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
  if (!(from && to && SOURCES.has(from.type) && TARGETS.has(to.type))) {
    return false;
  }

  const taken = edges.some(
    (edge) =>
      edge.target === target &&
      nodes.find((node) => node.id === edge.source)?.type === from.type
  );

  return !(taken || reaches(target, source, edges));
};

/** What a node is fed by, read off the edges that arrive at it. */
export interface Inputs {
  /** The text of the connected prompt, trimmed. `undefined` when none is connected or it
   *  is blank: either way there is nothing to ask for. */
  prompt?: string;
  /** The result a video starts from, or an image a new one is drawn after. */
  reference?: ResultNode;
  /** The connected settings, or the defaults when none are. A node with no settings is
   *  still a node that can run. */
  settings: SettingsData;
}

export const inputsOf = (
  id: string,
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[]
): Inputs => {
  const feeding = edges
    .filter((edge) => edge.target === id)
    .map((edge) => nodes.find((node) => node.id === edge.source))
    .filter((node): node is CanvasNode => node !== undefined);

  const prompt = feeding.find(
    (node): node is PromptNode => node.type === "prompt"
  );
  const settings = feeding.find(
    (node): node is SettingsNode => node.type === "settings"
  );
  const reference = feeding.find(isResult);

  return {
    prompt: prompt?.data.text.trim() || undefined,
    reference,
    settings: settings?.data ?? DEFAULT_SETTINGS,
  };
};

/** Whether a node can be run now: it makes something, it is not already making it, and
 *  it has a prompt to make it from. */
export const canRun = (
  node: CanvasNode,
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[]
): boolean =>
  isResult(node) &&
  node.data.status !== "pending" &&
  inputsOf(node.id, nodes, edges).prompt !== undefined;

/** The request for a node's next run, or `null` when it cannot be made. The seed is the
 *  node's own, so a caller bumps it first and the job carries the new one. */
export const jobOf = (
  node: ResultNode,
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[]
): GenerateJob | null => {
  const { prompt, reference, settings } = inputsOf(node.id, nodes, edges);
  if (!prompt) {
    return null;
  }

  return {
    aspect: settings.aspect,
    kind: node.type === "video" ? "video" : "image",
    prompt,
    reference: reference?.data.src,
    resolution: settings.resolution,
    seed: node.data.seed,
    strength: settings.strength,
  };
};

/** A result as the starter graph draws it: made, with its one run behind it, when it has
 *  a source, and empty when it does not. */
const madeFrom = (src: string | undefined): ResultData => ({
  ...blankResult(),
  seed: src ? 1 : 0,
  src,
  status: src ? "done" : "idle",
});

/** A new node of a kind, blank, at a position in the plane. */
export const createNode = (
  kind: NodeKind,
  id: string,
  position: { x: number; y: number }
): CanvasNode => {
  const base = { dragHandle: DRAG_HANDLE, id, position };

  switch (kind) {
    case "prompt": {
      return { ...base, data: { text: "" }, type: "prompt" };
    }
    case "settings": {
      return { ...base, data: { ...DEFAULT_SETTINGS }, type: "settings" };
    }
    case "image": {
      return { ...base, data: blankResult(), type: "image" };
    }
    default: {
      return { ...base, data: blankResult(), type: "video" };
    }
  }
};

/** How many results sit upstream of a node in a chain of references: `0` for one that
 *  starts from nothing, `1` for a video made from an image. Running in this order makes a
 *  node's reference finish before it starts. */
export const depthOf = (
  id: string,
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[]
): number => {
  let depth = 0;
  let current = inputsOf(id, nodes, edges).reference;

  // A bound, because the graph has no loops by construction and a loop that got in
  // anyway should end a sort, not hang a tab.
  while (current && depth <= nodes.length) {
    depth += 1;
    current = inputsOf(current.id, nodes, edges).reference;
  }

  return depth;
};

export interface StarterOptions {
  /** A finished image for the starter's image node. Omitted, the node starts empty. */
  imageSrc?: string;
  /** A finished clip for the starter's video node. Omitted, the node starts empty. */
  videoSrc?: string;
}

/** The graph a new canvas opens with: a prompt and settings feeding an image, and that
 *  image and a second prompt feeding a video. It shows every kind of node and every kind
 *  of edge, and nothing in it crosses anything else. */
export const starterGraph = ({ imageSrc, videoSrc }: StarterOptions = {}): {
  edges: CanvasEdge[];
  nodes: CanvasNode[];
} => ({
  edges: [
    { id: "e-prompt-image", source: "prompt", target: "image", type: "flow" },
    {
      id: "e-settings-image",
      source: "settings",
      target: "image",
      type: "flow",
    },
    { id: "e-image-video", source: "image", target: "video", type: "flow" },
    {
      id: "e-motion-video",
      source: "motion",
      target: "video",
      type: "flow",
    },
  ],
  nodes: [
    {
      data: { text: "a raven on a payphone at dusk, 35mm" },
      dragHandle: DRAG_HANDLE,
      id: "prompt",
      position: { x: 0, y: 0 },
      type: "prompt",
    },
    {
      data: { ...DEFAULT_SETTINGS },
      dragHandle: DRAG_HANDLE,
      id: "settings",
      position: { x: 0, y: 200 },
      type: "settings",
    },
    {
      data: madeFrom(imageSrc),
      dragHandle: DRAG_HANDLE,
      id: "image",
      position: { x: 290, y: 0 },
      type: "image",
    },
    {
      data: { text: "the camera pushes in slowly, the phone swings" },
      dragHandle: DRAG_HANDLE,
      id: "motion",
      position: { x: 290, y: 330 },
      type: "prompt",
    },
    {
      data: madeFrom(videoSrc),
      dragHandle: DRAG_HANDLE,
      id: "video",
      position: { x: 600, y: 0 },
      type: "video",
    },
  ],
});
