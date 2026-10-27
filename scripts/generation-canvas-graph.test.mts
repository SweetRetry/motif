import assert from "node:assert/strict";
import { test } from "node:test";

import {
  canConnect,
  canRun,
  createNode,
  jobOf,
  referenceOf,
  starterGraph,
} from "../registry/new-york/blocks/generation-canvas/generation-canvas-graph.ts";
import type { CanvasNode } from "../registry/new-york/blocks/generation-canvas/generation-canvas-graph.ts";

const { edges, nodes } = starterGraph({
  images: [
    { prompt: "a raven on a payphone", src: "image.png" },
    { prompt: "" },
  ],
  video: { prompt: "the camera pushes in", src: "clip.mp4" },
});
const node = (id: string) => nodes.find((n) => n.id === id) as CanvasNode;

test("the starter graph is connected the way its rules allow", () => {
  for (const edge of edges) {
    assert.equal(
      canConnect(
        edge,
        nodes,
        edges.filter((other) => other.id !== edge.id)
      ),
      true
    );
  }
});

test("only an image can be started from, so a clip has no way out", () => {
  assert.equal(
    canConnect({ source: "video", target: "image-2" }, nodes, edges),
    false
  );
  assert.equal(
    canConnect({ source: "image", target: "image-2" }, nodes, edges),
    true
  );
});

test("a frame starts from one picture, which also forbids a doubled edge", () => {
  assert.equal(
    canConnect({ source: "image", target: "video" }, nodes, edges),
    false
  );
  assert.equal(
    canConnect({ source: "image-2", target: "video" }, nodes, edges),
    false
  );
});

test("an edge that would close a loop is refused, however far round", () => {
  const chain = [
    ...edges,
    { id: "e2", source: "image-2", target: "image", type: "flow" },
  ];
  assert.equal(
    canConnect({ source: "image", target: "image" }, nodes, edges),
    false
  );
  assert.equal(
    canConnect({ source: "image", target: "image-2" }, nodes, chain),
    false
  );
});

test("a frame starts from the picture the edge into it names", () => {
  assert.equal(referenceOf("video", nodes, edges)?.id, "image");
  assert.equal(referenceOf("image", nodes, edges), undefined);
});

test("a frame with no prompt does not run, and neither does one already running", () => {
  assert.equal(canRun(node("image")), true);
  assert.equal(canRun(node("image-2")), false);
  assert.equal(
    canRun({
      ...node("image"),
      data: { ...node("image").data, prompt: "   " },
    }),
    false
  );
  assert.equal(
    canRun({
      ...node("image"),
      data: { ...node("image").data, status: "pending" },
    }),
    false
  );
});

test("a job carries the frame's own brief and the picture a clip starts from", () => {
  assert.deepEqual(jobOf(node("video") as never, nodes, edges), {
    aspect: "16:9",
    kind: "video",
    model: undefined,
    prompt: "the camera pushes in",
    reference: "image.png",
    resolution: "2K",
    seed: 1,
    strength: "Medium",
  });
  assert.equal(jobOf(node("image-2") as never, nodes, edges), null);
});

test("a new frame is blank, of the kind asked for, and carries the brief it was given", () => {
  const made = createNode("video", "v2", { x: 4, y: 8 }, { prompt: "a tide" });
  assert.equal(made.type, "video");
  assert.deepEqual(made.position, { x: 4, y: 8 });
  assert.equal(made.data.status, "idle");
  assert.equal(made.data.prompt, "a tide");
  assert.equal(made.data.aspect, "16:9");
});
