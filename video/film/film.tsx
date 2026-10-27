import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { ActivityHeatmap } from "@/registry/new-york/activity-heatmap";
import type { HeatmapDatum } from "@/registry/new-york/activity-heatmap";
import {
  AgentActivity,
  AgentActivityContent,
  AgentActivityHeader,
  AgentActivitySummary,
  AgentActivityTitle,
} from "@/registry/new-york/agents/agent-activity";
import { ApprovalCard } from "@/registry/new-york/agents/approval-card";
import {
  ContextUsage,
  ContextUsageRing,
} from "@/registry/new-york/agents/context-usage";
import type { ContextUsageDatum } from "@/registry/new-york/agents/context-usage";
import {
  ModelPicker,
  PromptInput,
  PromptInputAttachment,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/registry/new-york/agents/prompt-input";
import type { PromptModel } from "@/registry/new-york/agents/prompt-input";
import {
  Source,
  SourceLabel,
  SourceList,
  SourceMark,
} from "@/registry/new-york/agents/source";
import { ThinkingBlock } from "@/registry/new-york/agents/thinking-block";
import {
  ToolCall,
  ToolCallContent,
  ToolCallHeader,
  ToolCallName,
  ToolCallSection,
  ToolCallStatus,
  ToolCallSummary,
} from "@/registry/new-york/agents/tool-call";
import type { ToolCallStatusValue } from "@/registry/new-york/agents/tool-call";
import { AspectRatioPicker } from "@/registry/new-york/aspect-ratio-picker";
import { GenerationCanvas } from "@/registry/new-york/blocks/generation-canvas/generation-canvas";
import type {
  CanvasEdge,
  CanvasNode,
} from "@/registry/new-york/blocks/generation-canvas/generation-canvas-graph";
import {
  Breakdown,
  BreakdownBar,
  BreakdownLegend,
  breakdownColors,
} from "@/registry/new-york/breakdown";
import {
  Compare,
  CompareAfter,
  CompareBefore,
  CompareHandle,
  CompareLabel,
  useCompare,
} from "@/registry/new-york/compare";
import { CoverFan } from "@/registry/new-york/cover-fan";
import { DurationSlider } from "@/registry/new-york/duration-slider";
import { Message, MessageContent } from "@/registry/new-york/message";
import { ResolutionSegmented } from "@/registry/new-york/resolution-segmented";

import {
  clamp01,
  drawSwarm,
  field,
  glyphs,
  grid3,
  H,
  hash,
  lerp,
  matrix,
  out,
  outBack,
  point,
  ramp,
  sampleText,
  split,
  swarmAt,
  tiles,
  W,
} from "./dots";
import type { Key, Rect } from "./dots";
import { AT, BEAT, CUE, PARTS, SWEEP, TYPING, WORDS } from "./timeline";

/* -- Where things sit, in a 960x540 frame drawn at 2x ---------------------- */

/* Rects are what the viewer sees. A scene drawn at a zoom lays out at rect / zoom and
 * is scaled up into it, so a component reads at a size a 1080p frame deserves. */
const THINK: Rect = { h: 210, w: 560, x: 200, y: 150 };
const TOOLS: Rect = { h: 250, w: 520, x: 220, y: 130 };
const APPROVE: Rect = { h: 170, w: 480, x: 240, y: 175 };
const PANEL: Rect = { h: 350, w: 400, x: 280, y: 96 };
const COMPARE: Rect = { h: 270, w: 480, x: 240, y: 120 };
const PROMPT: Rect = { h: 180, w: 550, x: 205, y: 180 };
const CANVAS: Rect = { h: 520, w: 960, x: 0, y: -40 };
const SURFACE: Rect = { h: 460, w: 460, x: 250, y: 40 };
const TERM: Rect = { h: 170, w: 760, x: 100, y: 185 };

/** The wall: three parts, with room around each. */
const WALL = {
  breakdown: { h: 100, w: 820, x: 70, y: 360 },
  cover: { h: 210, w: 400, x: 70, y: 130 },
  heatmap: { h: 210, w: 400, x: 490, y: 130 },
} satisfies Record<string, Rect>;

const WORDMARK = { font: "600 112px Geist", x: 520, y: 248 };
const MARK = { gap: 22, r: 6, x: 318, y: 248 };

const IMAGE = "/attachment-demo.jpg";
/** The loop the canvas makes, cut from the portrait by build.mts. */
const LOOP = "/raven-loop.mp4";
const MODELS: PromptModel[] = [
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", provider: "anthropic" },
];

/** What the agent read. Marks are drawn as letters: a favicon would be a network call
 *  in the middle of a capture. */
const SOURCES = [
  "https://en.wikipedia.org/wiki/Common_raven",
  "https://www.audubon.org/field-guide/bird/common-raven",
  "https://www.allaboutbirds.org/guide/Common_Raven",
];

const COVERS = [
  "watercolor-rose",
  "unbound-bloom",
  "refraction",
  "verdant-notes",
].map((id) => ({
  id,
  src: `/cover-fan/${id}.webp`,
  title: id.replace("-", " ").replaceAll(/\b\w/g, (c) => c.toUpperCase()),
}));

const SPEND = [
  { key: "seedance", label: "Seedance 2.5", value: 486_200 },
  { key: "claude", label: "Claude Opus 5.5", value: 312_450 },
  { key: "veo", label: "Veo 3.1", value: 184_900 },
];
const SPEND_COLORS = breakdownColors(SPEND.map(({ key }) => key));

/** Half a year of runs that depends on nothing but the day, so every capture draws
 *  the same grid. Weekends drop and the year trends up, the way real usage does. */
const HEAT_WEEKS = 26;
const HEAT_END = new Date(2026, 9, 27);
const HEAT: HeatmapDatum[] = Array.from(
  { length: HEAT_WEEKS * 7 },
  (_, back) => {
    const date = new Date(2026, 9, 27 - back);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    return {
      date,
      value: Math.round(
        hash(back, 11) ** 2 *
          20 *
          (weekend ? 0.3 : 1) *
          (2 - back / (HEAT_WEEKS * 7))
      ),
    };
  }
);
let HEAT_TOTAL = 0;
for (const { value } of HEAT) {
  HEAT_TOTAL += value;
}

/** Where the window goes, with the conversation growing as the image uploads. */
const usage = (messages: number): ContextUsageDatum[] => [
  { key: "system", label: "System prompt", value: 3800 },
  { key: "tools", label: "Tool definitions", value: 14_200 },
  { key: "files", label: "Files", value: 22_500 },
  { key: "messages", label: "Messages", value: messages },
];

/** The canvas the second chapter opens on: the portrait, and the loop asked of it. The
 *  canvas reads its graph once, so the film mounts it again when the loop arrives. */
const canvasGraph = (done: boolean) => {
  const brief = { resolution: "2K", seed: 1, strength: "High" };
  const nodes: CanvasNode[] = [
    {
      data: {
        ...brief,
        aspect: "16:9",
        prompt: "a portrait in raven feathers, dusk light",
        src: IMAGE,
        status: "done",
      },
      id: "image",
      position: { x: 0, y: 0 },
      type: "image",
    },
    {
      data: {
        ...brief,
        aspect: "16:9",
        prompt: TYPING.prompt.text,
        src: done ? LOOP : undefined,
        status: done ? "done" : "pending",
      },
      id: "video",
      position: { x: 760, y: -110 },
      type: "video",
    },
  ];
  const edges: CanvasEdge[] = [
    { id: "e-image-video", source: "image", target: "video", type: "flow" },
  ];
  return { edges, nodes };
};

/** What `add agent-run` brings along, in the order the CLI reports it. */
const INSTALLED = [
  "conversation",
  "message",
  "agent-activity",
  "tool-call",
  "source",
  "approval-card",
  "question-card",
  "loading-state",
  "context-usage",
  "prompt-input",
  "attachment",
  "scroll-rail",
];

/** Where a call stands at `t`: waiting, then running from `from`, then done. */
const callAt = (t: number, from: number, done: number): ToolCallStatusValue => {
  if (t >= done) {
    return "done";
  }
  return t >= from ? "running" : "queued";
};

/** The settings panel's values at `t`, each changed on its own beat. */
const settingsAt = (t: number) => ({
  ratio: t >= AT.ratio ? "16:9" : "1:1",
  resolution: t >= AT.resolution ? "2K" : "1K",
  seconds: Math.round(
    lerp(
      3,
      6,
      ramp(t, AT.duration, BEAT, (x) => x)
    )
  ),
});

/** The film drives every control from its clock, so their handlers have nothing to do. */
// eslint-disable-next-line no-empty-function
const noop = () => {};
const generate = () => Promise.resolve({ src: LOOP });

/* -- Time ------------------------------------------------------------------ */

/** Film time in seconds, set by the capture script once per frame. Reading it off a
 *  frame event rather than off `requestAnimationFrame` keeps it exactly n/60: the fake
 *  clock's animation frames tick every 16 ms and drift against a 60 fps film. */
const useFilmTime = () => {
  const [t, setT] = useState(0);
  useEffect(() => {
    const onFrame = (event: Event) =>
      setT((event as CustomEvent<number>).detail / 1000);
    window.addEventListener("stage:frame", onFrame);
    return () => window.removeEventListener("stage:frame", onFrame);
  }, []);
  return t;
};

/** Characters of `text` typed by `t`, at `cps` from `from`. */
const typed = (
  t: number,
  { at, cps, text }: { at: number; cps: number; text: string }
) => text.slice(0, Math.max(0, Math.floor((t - at) * cps)));

/* -- The swarm's script ---------------------------------------------------- */

const mark = (wave: boolean) => grid3(MARK.x, MARK.y, MARK.gap, MARK.r, wave);
const wall = (a?: number) => tiles(Object.values(WALL), a);

/** The swarm draws a scene's silhouette, fades out under the component once it is
 *  drawn, and gathers again just before the next scene takes it. */
const settle = (at: number, rect: Rect): Key => ({
  at: at + 0.7,
  dur: 0.4,
  form: matrix(rect, 0),
});
const gather = (next: number, rect: Rect): Key => ({
  at: next - 0.35,
  dur: 0.3,
  form: matrix(rect),
  spread: 0.1,
});
const arrive = (at: number, rect: Rect, sweep = false): Key => ({
  at,
  dur: 0.6,
  form: matrix(rect),
  order: sweep ? "sweep" : undefined,
  spread: 0.2,
});

const keysFor = (wordmark: [number, number][]): Key[] => [
  { at: 0, form: point(W / 2, H / 2, 0) },
  {
    at: 0.05,
    dur: 0.35,
    ease: outBack,
    form: point(W / 2, H / 2, 6),
    spread: 0,
  },
  {
    at: CUE.split,
    dur: 0.5,
    ease: outBack,
    form: grid3(W / 2, H / 2, 30, 7),
    spread: 0.12,
  },
  { at: CUE.title, dur: 0.7, form: grid3(250, H / 2, 30, 7), spread: 0.05 },
  { at: CUE.burst, dur: 1.1, ease: out, form: field(), spread: 0.25 },

  {
    at: CUE.think,
    dur: 0.7,
    form: matrix(THINK),
    order: "sweep",
    spread: 0.3,
  },
  { at: CUE.think + 0.9, dur: 0.4, form: matrix(THINK, 0) },
  gather(CUE.tools, THINK),
  arrive(CUE.tools, TOOLS),
  settle(CUE.tools, TOOLS),
  gather(CUE.approve, TOOLS),
  arrive(CUE.approve, APPROVE),
  settle(CUE.approve, APPROVE),
  gather(CUE.settings, APPROVE),
  arrive(CUE.settings, PANEL, true),
  settle(CUE.settings, PANEL),
  gather(CUE.compare, PANEL),
  arrive(CUE.compare, COMPARE),
  settle(CUE.compare, COMPARE),
  {
    at: CUE.attach - 0.1,
    dur: 0.5,
    form: matrix(PROMPT),
    order: "sweep",
    spread: 0.2,
  },
  { at: CUE.attach + 0.5, dur: 0.4, form: matrix(PROMPT, 0) },
  gather(CUE.wall, PROMPT),
  { at: CUE.wall, dur: 0.8, ease: out, form: wall(), spread: 0.35 },
  { at: CUE.wall + 1, dur: 0.4, form: wall(0) },
  { at: CUE.compose - 0.35, dur: 0.3, form: wall(), spread: 0.1 },
  arrive(CUE.compose, CANVAS, true),
  settle(CUE.compose, CANVAS),
  gather(CUE.surface, CANVAS),
  arrive(CUE.surface, SURFACE),
  { at: CUE.surface + 0.6, dur: 0.4, form: matrix(SURFACE, 0) },
  { at: CUE.explode, dur: 1.2, ease: out, form: field(0.6), spread: 0.4 },
  { at: CUE.own, dur: 0.4, form: field(0) },
  {
    at: CUE.install - 0.1,
    dur: 0.5,
    form: matrix(TERM),
    order: "sweep",
    spread: 0.2,
  },
  { at: CUE.install + 0.5, dur: 0.4, form: matrix(TERM, 0) },
  gather(CUE.outro, TERM),
  {
    at: CUE.outro,
    dur: 1.1,
    form: split(9, mark(false), glyphs(wordmark)),
    order: "sweep",
    spread: 0.5,
  },
  {
    at: CUE.outro + 1.4,
    dur: 0.6,
    form: split(9, mark(false), glyphs(wordmark, 0)),
  },
  {
    at: AT.wave,
    dur: 0.3,
    form: split(9, mark(true), glyphs(wordmark, 0)),
  },
];

const Swarm = ({ keys, t }: { keys: Key[]; t: number }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const node = canvas.current;
    const ctx = node?.getContext("2d");
    if (!(node && ctx)) {
      return;
    }
    drawSwarm(
      ctx,
      swarmAt(keys, t),
      getComputedStyle(node).color,
      node.width / W
    );
  }, [keys, t]);
  return (
    <canvas
      className="pointer-events-none absolute inset-0 size-full text-foreground"
      height={H * 2}
      ref={canvas}
      width={W * 2}
    />
  );
};

/* -- Pieces of staging ----------------------------------------------------- */

/** Something on stage between `from` and `to`: it arrives out of a blur, leaves into
 *  one, and is not mounted at all outside that window, so its own entrance animations
 *  run when the film says. */
const Scene = ({
  children,
  className,
  fade = 0.3,
  from,
  rect,
  style,
  t,
  to,
  zoom = 1,
}: {
  children: ReactNode;
  className?: string;
  fade?: number;
  from: number;
  rect?: Rect;
  style?: CSSProperties;
  t: number;
  to: number;
  zoom?: number;
}) => {
  if (t < from || t > to + fade) {
    return null;
  }
  const shown = Math.min(ramp(t, from, fade), 1 - ramp(t, to, fade));
  return (
    <div
      className={className ?? "absolute"}
      style={{
        filter: shown < 1 ? `blur(${(1 - shown) * 8}px)` : undefined,
        opacity: shown,
        transform: `translateY(${(1 - shown) * 8}px)`,
        ...(rect ? { left: rect.x, top: rect.y, width: rect.w } : null),
        ...style,
      }}
    >
      {zoom === 1 ? (
        children
      ) : (
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            width: rect ? rect.w / zoom : undefined,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

/** Words that rise out of a mask one after another. */
const Rise = ({
  className,
  from,
  stagger = 0.08,
  t,
  text,
}: {
  className?: string;
  from: number;
  stagger?: number;
  t: number;
  text: string;
}) => (
  <span className={className}>
    {text.split(" ").map((word, index) => {
      const p = ramp(t, from + index * stagger, 0.5, out);
      return (
        <span
          className="inline-block overflow-hidden pb-[0.12em] align-bottom"
          key={`${word}-${index}`}
        >
          <span
            className="inline-block"
            style={{ opacity: p, transform: `translateY(${(1 - p) * 105}%)` }}
          >
            {word}&nbsp;
          </span>
        </span>
      );
    })}
  </span>
);

/** The chapter the film is in, top left. */
const Chapter = ({
  from,
  index,
  t,
  text,
  to,
}: {
  from: number;
  index: number;
  t: number;
  text: string;
  to: number;
}) => (
  <Scene fade={0.35} from={from} style={{ left: 40, top: 34 }} t={t} to={to}>
    <div className="font-mono text-muted-foreground text-sm tabular-nums">
      {index} / 3
    </div>
    <Rise
      className="mt-1 block font-semibold text-[30px] text-foreground tracking-tight"
      from={from}
      t={t}
      text={text}
    />
  </Scene>
);

const Chip = ({ children }: { children: ReactNode }) => (
  <span className="rounded-full border border-border px-3 py-1 font-mono text-[13px] text-muted-foreground tabular-nums">
    <span className="opacity-50">@motif/</span>
    {children}
  </span>
);

/** The registry names of what is on screen, bottom centre. */
const Names = ({
  children,
  from,
  names = [],
  t,
  to,
}: {
  children?: ReactNode;
  from: number;
  names?: string[];
  t: number;
  to: number;
}) => (
  <Scene
    className="absolute inset-x-0 flex justify-center gap-3"
    fade={0.25}
    from={from}
    style={{ top: 496 }}
    t={t}
    to={to}
  >
    {names.map((name) => (
      <Chip key={name}>{name}</Chip>
    ))}
    {children}
  </Scene>
);

/** Moves a compare's divider from the film's clock. The part reads the position it
 *  sets, so this is the caller-side control the compare docs describe. */
const Divider = ({ position }: { position: number }) => {
  const { setPosition } = useCompare();
  useLayoutEffect(() => setPosition(position), [position, setPosition]);
  return null;
};

/* -- The assembled surface, which comes apart ----------------------------- */

const LAYERS = [
  "agent-run",
  "message",
  "agent-activity",
  "prompt-input",
] as const;

/** The exploded view's pose at `explode` (0 flat, 1 apart), with a slow orbit while
 *  it holds so the stack never sits still. */
const pose = (explode: number, orbit: number) => ({
  tilt: 48 * explode,
  turn: -24 * explode + orbit,
});

const Layer = ({
  children,
  depth,
  explode,
  label,
  shown,
}: {
  children: ReactNode;
  depth: number;
  explode: number;
  label: string;
  shown: number;
}) => (
  <div
    className="absolute inset-0"
    style={{
      transform: `translateZ(${depth * 70 * explode}px)`,
      transformStyle: "preserve-3d",
    }}
  >
    {children}
    {/* Lying on its own plane, like a callout in an exploded drawing: the planes sit
        at different heights, so the labels separate as the stack does. */}
    <div
      className="absolute flex items-center gap-2 whitespace-nowrap font-mono text-foreground text-xl"
      style={{
        left: SURFACE.w + 16,
        opacity: shown,
        top: SURFACE.h - 40 - depth * 18,
      }}
    >
      <span className="h-px w-12 bg-foreground/50" />
      <span className="opacity-50">@motif/</span>
      {label}
    </div>
  </div>
);

const Surface = ({ explode, t }: { explode: number; t: number }) => {
  const orbit = explode * 7 * Math.sin((t - CUE.explode) * 0.9);
  const { tilt, turn } = pose(explode, orbit);
  const label = (depth: number) =>
    ramp(t, AT.label(depth), 0.3) * (1 - ramp(t, CUE.assemble - 0.2, 0.3));
  return (
    <div
      className="absolute"
      style={{
        height: SURFACE.h,
        left: SURFACE.x,
        perspective: 2000,
        top: SURFACE.y,
        width: SURFACE.w,
      }}
    >
      <div
        className="relative size-full"
        style={{
          // Lifting layers in z walks the stack up the frame; the translate holds it centred.
          transform: `translate(${-110 * explode}px, ${40 * explode}px) rotateX(${tilt}deg) rotateZ(${turn}deg) scale(${1 - 0.1 * explode})`,
          transformStyle: "preserve-3d",
        }}
      >
        <Layer depth={0} explode={explode} label={LAYERS[0]} shown={label(0)}>
          <div className="absolute inset-0 rounded-2xl border border-border bg-card" />
        </Layer>
        <Layer depth={1} explode={explode} label={LAYERS[1]} shown={label(1)}>
          <div className="absolute inset-x-5 top-5 flex flex-col gap-3">
            <Message from="user">
              <MessageContent>A six second portrait clip, wide.</MessageContent>
            </Message>
          </div>
          <div className="absolute inset-x-5 top-[112px] flex flex-col gap-2">
            <Message from="assistant">
              <MessageContent>
                Rendered at 2K, 16:9, six seconds.
                <img
                  alt=""
                  className="mt-2 aspect-video w-56 rounded-lg object-cover"
                  src={IMAGE}
                />
              </MessageContent>
            </Message>
          </div>
        </Layer>
        <Layer depth={2} explode={explode} label={LAYERS[2]} shown={label(2)}>
          <div className="absolute inset-x-5 top-[72px]">
            <AgentActivity duration={9} running={false}>
              <AgentActivityHeader>
                <AgentActivityTitle />
                <AgentActivitySummary>
                  1 thought, 2 tool calls
                </AgentActivitySummary>
              </AgentActivityHeader>
            </AgentActivity>
          </div>
        </Layer>
        <Layer depth={3} explode={explode} label={LAYERS[3]} shown={label(3)}>
          <div className="absolute inset-x-4 bottom-4">
            <PromptInput onSubmit={noop}>
              <PromptInputTextarea placeholder="Ask for a change" />
              <PromptInputFooter>
                <ModelPicker
                  models={MODELS}
                  onValueChange={noop}
                  value={MODELS[0].id}
                />
                <PromptInputSubmit />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </Layer>
      </div>
    </div>
  );
};

/* -- The film -------------------------------------------------------------- */

export const Film = () => {
  const t = useFilmTime();
  const [origin] = useState(() => Date.now());
  const keys = useMemo(
    () =>
      keysFor(sampleText("Motif", WORDMARK.font, WORDMARK.x, WORDMARK.y, 4)),
    []
  );

  // The film carries both themes itself: dark by default, light where the sweep
  // shows it. The page has to start light for a light layer to inherit anything.
  useLayoutEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  // Decoded before it is needed, so the reveal starts on the frame the film asks for.
  useEffect(() => {
    for (const src of [IMAGE, ...COVERS.map((cover) => cover.src)]) {
      const image = new Image();
      image.src = src;
    }
  }, []);

  const at = (seconds: number) => origin + seconds * 1000;

  // A slow breath on the whole frame, so nothing is ever quite still.
  const camera = 1.02 + 0.012 * Math.sin(t * 0.5);

  /* Scene values driven straight off the clock. */
  const shownWords = Math.round(
    WORDS.length * clamp01((t - AT.streamFrom) / (AT.streamTo - AT.streamFrom))
  );
  const search = callAt(t, AT.toolsShown, AT.searchDone);
  const estimate = callAt(t, AT.estimateFrom, AT.estimateDone);
  const { ratio, resolution, seconds } = settingsAt(t);
  const divider =
    0.82 - 0.64 * ramp(t, AT.divideFrom, AT.divideTo - AT.divideFrom);
  // The ring eases to each new value over half a second, so the film hands it a new
  // one every half beat, the way an upload reports chunks. A value per frame would
  // restart the transition every frame and the ring would never move. It stops short
  // of 100, which the attachment reads as done and drops the ring before it closes.
  const chunk = Math.floor((t - AT.chipShown) / (BEAT / 2));
  const progress =
    t < AT.uploadDone
      ? [8, 30, 52, 74, 93][Math.min(4, Math.max(0, chunk))]
      : undefined;
  const fly = ramp(t, AT.fly, 0.7);
  // The wall drifts toward the viewer the whole time it holds.
  const push = 0.97 + 0.06 * ramp(t, CUE.wall, CUE.compose - CUE.wall, out);
  const counted = Math.round(
    lerp(3, PARTS, ramp(t, AT.wallShown, CUE.compose - AT.wallShown - 1, out))
  );
  const canvasDone = t >= AT.canvasDone;
  const explode =
    ramp(t, CUE.explode, 1.1) *
    (1 - ramp(t, CUE.assemble, AT.landed - CUE.assemble));
  const sweepIn = ramp(t, AT.sweepIn, SWEEP.in);
  const sweepOut = ramp(t, AT.sweepOut, SWEEP.out);
  const sweepEdge = sweepOut > 0 ? sweepOut : sweepIn;
  const sweeping =
    (sweepIn > 0 && sweepIn < 1) || (sweepOut > 0 && sweepOut < 1);
  const installed = INSTALLED.filter((_, index) => t >= AT.check(index)).length;

  const flyRect = {
    h: lerp(COMPARE.h, 54, fly),
    w: lerp(COMPARE.w, 54, fly),
    x: lerp(COMPARE.x, PROMPT.x + 19, fly),
    y: lerp(COMPARE.y, PROMPT.y + 19, fly),
  };

  /** One tile of the wall, landing in its turn. */
  const tile = (index: number, rect: Rect, children: ReactNode) => (
    <Scene from={AT.tile(index)} rect={rect} t={t} to={CUE.compose - 0.35}>
      <div style={{ height: rect.h }}>{children}</div>
    </Scene>
  );

  return (
    <div className="relative overflow-hidden" style={{ height: H, width: W }}>
      <div className="dark absolute inset-0 bg-background text-foreground">
        <div
          className="absolute inset-0"
          style={{ transform: `scale(${camera})` }}
        >
          {/* Opening: the title beside the grid. */}
          <Scene
            className="absolute"
            fade={0.4}
            from={CUE.title}
            style={{ left: 320, top: 214 }}
            t={t}
            to={CUE.burst - 0.2}
          >
            <Rise
              className="block font-semibold text-[46px] text-foreground leading-[1.05] tracking-tight"
              from={CUE.title}
              t={t}
              text="Interface parts"
            />
            <Rise
              className="block font-semibold text-[46px] text-muted-foreground leading-[1.05] tracking-tight"
              from={CUE.title + BEAT / 2}
              t={t}
              text="for AI agents."
            />
          </Scene>

          {/* 1. Install a piece. */}
          <Scene
            from={AT.thinkShown}
            rect={THINK}
            t={t}
            to={CUE.tools - 0.35}
            zoom={1.4}
          >
            <ThinkingBlock
              height={120}
              startedAt={at(AT.streamFrom)}
              streaming={t < AT.streamTo}
            >
              {WORDS.slice(0, shownWords).join(" ")}
            </ThinkingBlock>
          </Scene>
          <Names
            from={AT.thinkShown + 0.15}
            names={["thinking-block"]}
            t={t}
            to={CUE.tools - 0.35}
          />

          <Scene
            from={AT.toolsShown}
            rect={TOOLS}
            t={t}
            to={CUE.approve - 0.35}
            zoom={1.3}
          >
            <AgentActivity open running startedAt={at(AT.toolsShown)}>
              <AgentActivityHeader>
                <AgentActivityTitle label="Researching" />
              </AgentActivityHeader>
              <AgentActivityContent>
                <ToolCall open={search === "done"} status={search}>
                  <ToolCallHeader>
                    <ToolCallStatus />
                    <ToolCallName>web_search</ToolCallName>
                    <ToolCallSummary>
                      raven plumage in low light
                    </ToolCallSummary>
                  </ToolCallHeader>
                  {search === "done" ? (
                    <ToolCallContent>
                      <ToolCallSection title="3 results">
                        <SourceList>
                          {SOURCES.map((href) => (
                            <Source href={href} key={href}>
                              <SourceMark src={false} />
                              <SourceLabel />
                            </Source>
                          ))}
                        </SourceList>
                      </ToolCallSection>
                    </ToolCallContent>
                  ) : null}
                </ToolCall>
                <ToolCall status={estimate}>
                  <ToolCallHeader>
                    <ToolCallStatus />
                    <ToolCallName>estimate_render</ToolCallName>
                    <ToolCallSummary>
                      {estimate === "done"
                        ? "16:9 · 2K · 6s → 120 credits"
                        : "16:9 · 2K · 6s"}
                    </ToolCallSummary>
                  </ToolCallHeader>
                </ToolCall>
              </AgentActivityContent>
            </AgentActivity>
          </Scene>
          <Names
            from={AT.toolsShown + 0.15}
            names={["agent-activity", "tool-call", "source"]}
            t={t}
            to={CUE.approve - 0.35}
          />

          <Scene
            from={AT.approveShown}
            rect={APPROVE}
            t={t}
            to={CUE.settings - 0.35}
            zoom={1.35}
          >
            <ApprovalCard
              onApprove={noop}
              onReject={noop}
              submitting={t >= AT.approvePress}
            >
              Render a six second clip at 2K? This spends{" "}
              <strong>120 credits</strong>.
            </ApprovalCard>
          </Scene>
          <Names
            from={AT.approveShown + 0.15}
            names={["approval-card"]}
            t={t}
            to={CUE.settings - 0.35}
          />

          <Scene
            from={AT.settingsShown}
            rect={PANEL}
            t={t}
            to={CUE.compare - 0.35}
            zoom={1.2}
          >
            <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5">
              {(
                [
                  [
                    "Aspect ratio",
                    <AspectRatioPicker
                      aria-label="Aspect ratio"
                      key="ratio"
                      onChange={noop}
                      value={ratio}
                    />,
                  ],
                  [
                    "Resolution",
                    <ResolutionSegmented
                      aria-label="Resolution"
                      key="res"
                      onChange={noop}
                      value={resolution}
                    />,
                  ],
                  [
                    "Duration",
                    <DurationSlider
                      aria-label="Duration"
                      key="dur"
                      max={15}
                      min={1}
                      onCommit={noop}
                      value={seconds}
                    />,
                  ],
                ] as const
              ).map(([label, control], index) => {
                const p = ramp(t, AT.settingsShown + index * 0.12, 0.35, out);
                return (
                  <div
                    key={label}
                    style={{
                      opacity: p,
                      transform: `translateY(${(1 - p) * 10}px)`,
                    }}
                  >
                    <div className="mb-2 font-medium text-muted-foreground text-xs">
                      {label}
                    </div>
                    {control}
                  </div>
                );
              })}
            </div>
          </Scene>
          <Names
            from={AT.settingsShown + 0.15}
            names={[
              "aspect-ratio-picker",
              "resolution-segmented",
              "duration-slider",
            ]}
            t={t}
            to={CUE.compare - 0.35}
          />

          <Scene from={AT.compareShown} rect={COMPARE} t={t} to={CUE.attach}>
            <Compare defaultPosition={0.82} style={{ height: COMPARE.h }}>
              <CompareAfter>
                <img alt="" className="size-full object-cover" src={IMAGE} />
                <CompareLabel>2K</CompareLabel>
              </CompareAfter>
              <CompareBefore>
                <img
                  alt=""
                  className="size-full scale-110 object-cover blur-[3px]"
                  src={IMAGE}
                />
                <CompareLabel>1K</CompareLabel>
              </CompareBefore>
              <CompareHandle />
              <Divider position={divider} />
            </Compare>
          </Scene>
          <Names
            from={AT.compareShown + 0.15}
            names={["compare"]}
            t={t}
            to={CUE.attach - 0.3}
          />

          {/* The upscale shrinks into the composer as an attachment. */}
          {t >= AT.fly && t < AT.fly + 0.9 ? (
            <img
              alt=""
              className="absolute rounded-xl object-cover"
              src={IMAGE}
              style={{
                height: flyRect.h,
                left: flyRect.x,
                opacity: 1 - ramp(t, AT.fly + 0.6, 0.3),
                top: flyRect.y,
                width: flyRect.w,
              }}
            />
          ) : null}
          <Scene
            from={AT.promptShown}
            rect={PROMPT}
            t={t}
            to={CUE.wall - 0.35}
            zoom={1.35}
          >
            <PromptInput
              onSubmit={noop}
              onValueChange={noop}
              value={typed(t, TYPING.prompt)}
            >
              <PromptInputHeader>
                {t >= AT.chipShown ? (
                  <PromptInputAttachment
                    name="raven.jpg"
                    progress={progress}
                    src={IMAGE}
                  />
                ) : null}
              </PromptInputHeader>
              <PromptInputTextarea placeholder="Ask for a change" />
              <PromptInputFooter>
                <ModelPicker
                  models={MODELS}
                  onValueChange={noop}
                  value={MODELS[0].id}
                />
                <div className="ml-auto flex items-center gap-1">
                  <ContextUsage
                    items={usage(t >= AT.uploadDone ? 41_000 : 12_000)}
                    limit={200_000}
                  >
                    <ContextUsageRing showPercent />
                  </ContextUsage>
                  <PromptInputSubmit />
                </div>
              </PromptInputFooter>
            </PromptInput>
          </Scene>
          <Names
            from={AT.promptShown + 0.15}
            names={["prompt-input", "attachment", "context-usage"]}
            t={t}
            to={CUE.wall - 0.35}
          />

          {/* Then the rest of the shelf, drifting toward the viewer. */}
          <div
            className="absolute inset-0"
            style={{ transform: `scale(${push})` }}
          >
            {tile(
              0,
              WALL.cover,
              <div className="flex h-full items-center">
                <CoverFan items={COVERS} onSelect={noop} />
              </div>
            )}
            {tile(
              1,
              WALL.heatmap,
              <div className="h-full rounded-xl border border-border bg-card p-4">
                <p className="font-medium text-sm">Agent runs</p>
                <p className="mb-3 text-muted-foreground text-xs">
                  {HEAT_TOTAL.toLocaleString("en-US")} in six months
                </p>
                <ActivityHeatmap
                  cellSize={10}
                  className="text-chart-2"
                  data={HEAT}
                  end={HEAT_END}
                  gap={2}
                  weeks={HEAT_WEEKS}
                />
              </div>
            )}
            {tile(
              2,
              WALL.breakdown,
              <div className="h-full rounded-xl border border-border bg-card p-4">
                <p className="mb-3 font-medium text-sm">Model spend</p>
                <Breakdown
                  colors={SPEND_COLORS}
                  formatValue={(value) => `${Math.round(value / 1000)}K`}
                  items={SPEND}
                >
                  <div className="flex flex-col gap-3">
                    <BreakdownBar label="Spend by model" />
                    <BreakdownLegend />
                  </div>
                </Breakdown>
              </div>
            )}
          </div>
          <Names
            from={AT.wallShown}
            names={["cover-fan", "activity-heatmap", "breakdown"]}
            t={t}
            to={CUE.compose - 0.35}
          >
            <Chip>{counted} parts</Chip>
          </Names>

          {/* 2. Compose a surface. The canvas itself is drawn outside the camera. */}
          {/* Fetched from the start, so the clip is decoded by the time its frame asks. */}
          <video className="hidden" muted preload="auto" src={LOOP} />
          <Names
            from={AT.canvasShown + 0.15}
            names={["generation-canvas"]}
            t={t}
            to={CUE.surface - 0.35}
          />

          <Scene
            className="absolute inset-0"
            fade={0.35}
            from={AT.surfaceShown}
            t={t}
            to={CUE.install - 0.3}
          >
            <Surface explode={explode} t={t} />
          </Scene>

          {/* 3. Own the source. */}
          <Scene
            className="absolute"
            from={AT.termShown}
            rect={TERM}
            t={t}
            to={CUE.outro - 0.35}
            zoom={1.3}
          >
            <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-6 font-mono text-[12px] leading-6">
              <div className="text-foreground">
                <span className="text-muted-foreground">$ </span>
                {typed(t, TYPING.command)}
              </div>
              {/* One line the parts roll through, rather than a list to read. */}
              <div
                className="flex justify-between text-muted-foreground"
                style={{ opacity: installed > 0 ? 1 : 0 }}
              >
                <span>
                  <span className="text-success">✓</span>{" "}
                  {installed === INSTALLED.length
                    ? `${INSTALLED.length} parts added`
                    : INSTALLED[Math.max(0, installed - 1)]}
                </span>
                <span className="tabular-nums">
                  {installed} / {INSTALLED.length}
                </span>
              </div>
              <div style={{ opacity: ramp(t, AT.inRepo, 0.3) }}>
                <span className="text-muted-foreground">
                  components/ui/motif/{" "}
                </span>
                <span className="text-foreground">
                  The source is in your repo.
                </span>
              </div>
            </div>
          </Scene>

          {/* Outro: the dots became the word; the word becomes type. */}
          <Scene
            className="absolute"
            fade={0.6}
            from={AT.wordmark}
            style={{ left: 0, top: 0 }}
            t={t}
            to={CUE.end + 1}
          >
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-semibold text-foreground leading-none tracking-tight"
              style={{
                fontFamily: "Geist",
                fontSize: 112,
                left: WORDMARK.x,
                top: WORDMARK.y,
              }}
            >
              Motif
            </div>
          </Scene>
          <Scene
            className="absolute inset-x-0 text-center"
            from={AT.tagline}
            style={{ top: 322 }}
            t={t}
            to={CUE.end + 1}
          >
            <Rise
              className="text-2xl text-muted-foreground tracking-tight"
              from={AT.tagline}
              t={t}
              text={`${PARTS} interface parts for AI agents`}
            />
          </Scene>
          <Scene
            className="absolute inset-x-0 text-center"
            from={AT.address}
            style={{ top: 372 }}
            t={t}
            to={CUE.end + 1}
          >
            <span className="font-mono text-foreground text-sm">
              motif.sweetretry.com
            </span>
          </Scene>
        </div>

        {/* Outside the camera and never scaled: React Flow measures its ports on screen
            and divides by its own zoom only, so a scale on any ancestor pulls every edge
            off its ports. The plane fits itself to the frame instead. */}
        <Scene
          from={AT.canvasShown}
          rect={CANVAS}
          t={t}
          to={CUE.surface - 0.35}
        >
          <div style={{ height: CANVAS.h }}>
            <GenerationCanvas
              generate={generate}
              initial={canvasGraph(canvasDone)}
              key={String(canvasDone)}
            />
          </div>
        </Scene>

        <Swarm keys={keys} t={t} />

        {/* Chapters sit outside the camera, like a lower third. */}
        <Chapter
          from={CUE.think}
          index={1}
          t={t}
          text="Install a piece."
          to={CUE.compose - 0.35}
        />
        <Chapter
          from={CUE.compose}
          index={2}
          t={t}
          text="Compose a surface."
          to={CUE.own - 0.2}
        />
        <Chapter
          from={CUE.own}
          index={3}
          t={t}
          text="Own the source."
          to={CUE.outro - 0.35}
        />
      </div>

      {/* The light theme, wiped across the same surface and wiped away again. */}
      {sweepIn > 0 && sweepOut < 1 ? (
        <div
          className="absolute inset-0 bg-background text-foreground"
          style={{
            clipPath: `inset(0 ${(1 - sweepIn) * 100}% 0 ${sweepOut * 100}%)`,
          }}
        >
          <div
            className="absolute inset-0"
            style={{ transform: `scale(${camera})` }}
          >
            <Surface explode={0} t={t} />
          </div>
          <div className="absolute" style={{ left: 40, top: 34 }}>
            <div className="font-mono text-muted-foreground text-sm">3 / 3</div>
            <div className="mt-1 font-semibold text-[30px] text-foreground tracking-tight">
              Own the source.
            </div>
          </div>
        </div>
      ) : null}
      {sweeping ? (
        <div
          className="absolute inset-y-0 w-px bg-white"
          style={{
            boxShadow: "0 0 24px 6px rgb(255 255 255 / 0.55)",
            left: `${sweepEdge * 100}%`,
          }}
        />
      ) : null}
    </div>
  );
};
