import assert from "node:assert/strict";
import { test } from "node:test";

import {
  canConnect,
  canRun,
  createNode,
  depthOf,
  inputsOf,
  jobOf,
  starterGraph,
} from "../registry/new-york/blocks/generation-canvas/generation-canvas-graph.ts";
import type {
  CanvasNode,
  ResultNode,
} from "../registry/new-york/blocks/generation-canvas/generation-canvas-graph.ts";

const { edges, nodes } = starterGraph({
  imageSrc: "image.png",
  videoSrc: "clip.mp4",
});
const without = (id: string) => edges.filter((edge) => edge.id !== id);
const node = (id: string) => nodes.find((n) => n.id === id) as CanvasNode;

test("the starter graph is connected the way its rules allow", () => {
  for (const edge of edges) {
    assert.equal(
      canConnect(edge, nodes, without(edge.id)),
      true,
      `${edge.id} should be a legal edge`
    );
  }
});

test("work only flows from an input or a result into a result", () => {
  assert.equal(
    canConnect({ source: "video", target: "image" }, nodes, []),
    false
  );
  assert.equal(
    canConnect({ source: "image", target: "prompt" }, nodes, []),
    false
  );
  assert.equal(
    canConnect({ source: "prompt", target: "settings" }, nodes, []),
    false
  );
  assert.equal(
    canConnect({ source: "prompt", target: "image" }, nodes, []),
    true
  );
});

test("a node takes one input of each kind, which also forbids a doubled edge", () => {
  assert.equal(
    canConnect({ source: "prompt", target: "image" }, nodes, edges),
    false
  );
  assert.equal(
    canConnect({ source: "motion", target: "image" }, nodes, edges),
    false
  );
  assert.equal(
    canConnect(
      { source: "motion", target: "image" },
      nodes,
      without("e-prompt-image")
    ),
    true
  );
});

test("an edge that would close a loop is refused, however far round", () => {
  const chain = [
    ...edges,
    { id: "extra", source: "image", target: "image2", type: "flow" },
  ];
  const more = [
    ...nodes,
    { ...node("image"), id: "image2", position: { x: 0, y: 0 } },
  ] as CanvasNode[];

  assert.equal(
    canConnect({ source: "image", target: "image" }, more, chain),
    false
  );
  assert.equal(
    canConnect({ source: "image2", target: "image" }, more, chain),
    false
  );
  assert.equal(
    canConnect({ source: "video", target: "image" }, more, chain),
    false
  );
});

test("a node is fed by what the edges into it say", () => {
  const image = inputsOf("image", nodes, edges);
  assert.equal(image.prompt, "a raven on a payphone at dusk, 35mm");
  assert.equal(image.settings.aspect, "16:9");
  assert.equal(image.reference, undefined);

  const video = inputsOf("video", nodes, edges);
  assert.equal(video.prompt, "the camera pushes in slowly, the phone swings");
  assert.equal(video.reference?.id, "image");
});

test("a node with no settings runs on the defaults, and one with no prompt does not run", () => {
  const bare = inputsOf("image", nodes, without("e-settings-image"));
  assert.deepEqual(bare.settings, {
    aspect: "16:9",
    resolution: "2K",
    strength: "Medium",
  });

  const noPrompt = without("e-prompt-image");
  assert.equal(canRun(node("image"), nodes, noPrompt), false);
  assert.equal(jobOf(node("image") as ResultNode, nodes, noPrompt), null);
  assert.equal(canRun(node("image"), nodes, edges), true);
});

test("a blank prompt is no prompt, and a node already running cannot be run again", () => {
  const blanked = nodes.map((n) =>
    n.id === "prompt" ? { ...n, data: { text: "   " } } : n
  ) as CanvasNode[];
  assert.equal(inputsOf("image", blanked, edges).prompt, undefined);

  const busy = nodes.map((n) =>
    n.id === "image" ? { ...n, data: { ...n.data, status: "pending" } } : n
  ) as CanvasNode[];
  assert.equal(
    canRun(busy.find((n) => n.id === "image") as CanvasNode, busy, edges),
    false
  );
});

test("a job carries the node's seed, its settings and the picture a video starts from", () => {
  const job = jobOf(node("video") as ResultNode, nodes, edges);
  assert.deepEqual(job, {
    aspect: "16:9",
    kind: "video",
    prompt: "the camera pushes in slowly, the phone swings",
    reference: "image.png",
    resolution: "2K",
    seed: 1,
    strength: "Medium",
  });
});

test("a prompt and settings are not results, so neither can be run", () => {
  assert.equal(canRun(node("prompt"), nodes, edges), false);
  assert.equal(canRun(node("settings"), nodes, edges), false);
});

test("results are ordered so that what a node starts from runs before it", () => {
  assert.equal(depthOf("image", nodes, edges), 0);
  assert.equal(depthOf("video", nodes, edges), 1);
  assert.equal(depthOf("video", nodes, without("e-image-video")), 0);
});

test("a new node is blank, draggable by its header and of the kind asked for", () => {
  const made = createNode("video", "v2", { x: 4, y: 8 });
  assert.equal(made.type, "video");
  assert.deepEqual(made.position, { x: 4, y: 8 });
  assert.equal(made.dragHandle, ".canvas-node-drag");
  assert.equal((made.data as { status: string }).status, "idle");
  assert.equal(
    (createNode("prompt", "p2", { x: 0, y: 0 }).data as { text: string }).text,
    ""
  );
});
