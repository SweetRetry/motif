import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { AgentIndicator } from "@/registry/new-york/agents/agent-indicator";
import { ApprovalCard } from "@/registry/new-york/agents/approval-card";
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
import { ThinkingBlock } from "@/registry/new-york/agents/thinking-block";
import { AspectRatioPicker } from "@/registry/new-york/aspect-ratio-picker";
import { DurationSlider } from "@/registry/new-york/duration-slider";
import { FlowEdge } from "@/registry/new-york/flow-edge";
import { GenerationOverlay } from "@/registry/new-york/generation-overlay";
import { Message, MessageContent } from "@/registry/new-york/message";
import { ResolutionSegmented } from "@/registry/new-york/resolution-segmented";

import {
  clamp01,
  drawSwarm,
  field,
  glyphs,
  grid3,
  H,
  lerp,
  matrix,
  out,
  outBack,
  point,
  ramp,
  sampleText,
  split,
  strand,
  swarmAt,
  W,
} from "./dots";
import type { Key, Rect } from "./dots";
import { AT, BEAT, CUE, PASSAGE, SWEEP, TYPING, WORDS } from "./timeline";

/* -- Where things sit, in a 960x540 frame drawn at 2x ---------------------- */

/* Rects are what the viewer sees. A scene drawn at a zoom lays out at rect / zoom and
 * is scaled up into it, so a component reads at a size a 1080p frame deserves. */
const THINK: Rect = { h: 210, w: 560, x: 200, y: 150 };
const APPROVE: Rect = { h: 270, w: 460, x: 250, y: 125 };
const PANEL: Rect = { h: 390, w: 420, x: 270, y: 78 };
const NODE: Rect = { h: 56, w: 200, x: 70, y: 334 };
const FRAME: Rect = { h: 225, w: 400, x: 490, y: 160 };
const PROMPT: Rect = { h: 180, w: 550, x: 205, y: 180 };
const SURFACE: Rect = { h: 460, w: 460, x: 250, y: 40 };
const TERM: Rect = { h: 200, w: 760, x: 100, y: 170 };

/** The connector from the render node to the frame, as one cubic in frame space. */
const EDGE = { h: 90, w: 220, x: NODE.x + NODE.w, y: 272 };
const EDGE_POINTS: [number, number][] = [
  [EDGE.x, EDGE.y + EDGE.h],
  [EDGE.x + EDGE.w / 2, EDGE.y + EDGE.h],
  [EDGE.x + EDGE.w / 2, EDGE.y],
  [EDGE.x + EDGE.w, EDGE.y],
];

const WORDMARK = { font: "600 112px Geist", x: 520, y: 248 };
const MARK = { gap: 22, r: 6, x: 318, y: 248 };

const IMAGE = "/attachment-demo.jpg";
const PROMPT_TEXT = "a portrait in raven feathers, dusk light, 35mm";
const MODELS: PromptModel[] = [
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", provider: "anthropic" },
];

/** The film drives every control from its clock, so their handlers have nothing to do. */
// eslint-disable-next-line no-empty-function
const noop = () => {};

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
  { at: CUE.approve - 0.35, dur: 0.3, form: matrix(THINK), spread: 0.1 },
  { at: CUE.approve, dur: 0.6, form: matrix(APPROVE), spread: 0.2 },
  { at: CUE.approve + 0.7, dur: 0.4, form: matrix(APPROVE, 0) },
  { at: CUE.settings - 0.35, dur: 0.3, form: matrix(APPROVE), spread: 0.1 },
  {
    at: CUE.settings,
    dur: 0.6,
    form: matrix(PANEL),
    order: "sweep",
    spread: 0.2,
  },
  { at: CUE.settings + 0.7, dur: 0.4, form: matrix(PANEL, 0) },
  { at: CUE.flow - 0.35, dur: 0.3, form: matrix(PANEL), spread: 0.1 },
  {
    at: CUE.flow,
    dur: 0.9,
    form: split(
      160,
      strand(EDGE_POINTS),
      split(60, matrix(NODE, 0.5, 60), matrix(FRAME, 0.5, 200))
    ),
    spread: 0.3,
  },
  {
    at: CUE.flow + 0.9,
    dur: 0.5,
    form: split(
      160,
      strand(EDGE_POINTS, 0),
      split(60, matrix(NODE, 0, 60), matrix(FRAME, 0, 200))
    ),
  },
  {
    at: CUE.attach - 0.1,
    dur: 0.5,
    form: matrix(PROMPT),
    order: "sweep",
    spread: 0.2,
  },
  { at: CUE.attach + 0.5, dur: 0.4, form: matrix(PROMPT, 0) },
  { at: CUE.compose - 0.35, dur: 0.3, form: matrix(PROMPT), spread: 0.1 },
  { at: CUE.compose, dur: 0.6, form: matrix(SURFACE), spread: 0.2 },
  { at: CUE.compose + 0.6, dur: 0.4, form: matrix(SURFACE, 0) },
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
  { at: CUE.outro - 0.35, dur: 0.3, form: matrix(TERM), spread: 0.1 },
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

/** The registry names of what is on screen, bottom centre. */
const Names = ({
  from,
  names,
  t,
  to,
}: {
  from: number;
  names: string[];
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
      <span
        className="rounded-full border border-border px-3 py-1 font-mono text-[13px] text-muted-foreground"
        key={name}
      >
        <span className="opacity-50">@motif/</span>
        {name}
      </span>
    ))}
  </Scene>
);

/* -- The assembled surface, which comes apart ----------------------------- */

const LAYERS = [
  "chat-app",
  "message",
  "thinking-block",
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

const Surface = ({
  explode,
  startedAt,
  t,
}: {
  explode: number;
  startedAt: number;
  t: number;
}) => {
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
          <div className="absolute inset-x-5 top-[132px] flex flex-col gap-2">
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
          <div className="absolute inset-x-5 top-[84px]">
            <ThinkingBlock
              defaultOpen={false}
              duration={3}
              startedAt={startedAt}
            >
              {PASSAGE}
            </ThinkingBlock>
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
    const image = new Image();
    image.src = IMAGE;
  }, []);

  const at = (seconds: number) => origin + seconds * 1000;

  // A slow breath on the whole frame, so nothing is ever quite still.
  const camera = 1.02 + 0.012 * Math.sin(t * 0.5);

  /* Scene values driven straight off the clock. */
  const shownWords = Math.round(
    WORDS.length * clamp01((t - AT.streamFrom) / (AT.streamTo - AT.streamFrom))
  );
  const ratio = t >= AT.ratio ? "16:9" : "1:1";
  const resolution = t >= AT.resolution ? "2K" : "1K";
  const seconds = Math.round(
    lerp(
      3,
      6,
      ramp(t, AT.duration, BEAT, (x) => x)
    )
  );
  const revealed = t >= AT.rendered;
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
  const explode =
    ramp(t, CUE.explode, 1.1) *
    (1 - ramp(t, CUE.assemble, AT.landed - CUE.assemble));
  const sweepIn = ramp(t, AT.sweepIn, SWEEP.in);
  const sweepOut = ramp(t, AT.sweepOut, SWEEP.out);
  const sweepEdge = sweepOut > 0 ? sweepOut : sweepIn;
  const sweeping =
    (sweepIn > 0 && sweepIn < 1) || (sweepOut > 0 && sweepOut < 1);

  const flyRect = {
    h: lerp(FRAME.h, 54, fly),
    w: lerp(FRAME.w, 54, fly),
    x: lerp(FRAME.x, PROMPT.x + 19, fly),
    y: lerp(FRAME.y, PROMPT.y + 19, fly),
  };

  const stage = (surfaceFrom: number) => (
    <Scene
      className="absolute inset-0"
      fade={0.35}
      from={surfaceFrom}
      t={t}
      to={CUE.install - 0.3}
    >
      <Surface explode={explode} startedAt={at(CUE.think + 1)} t={t} />
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
            to={CUE.approve - 0.35}
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
              answers={
                t >= AT.approveSelect ? { render: { selected: ["wide"] } } : {}
              }
              onAnswersChange={noop}
              onSubmit={noop}
              questions={[
                {
                  id: "render",
                  options: [
                    { label: "16:9 · 2K · 6 seconds", value: "wide" },
                    { label: "1:1 · 1K · 4 seconds", value: "square" },
                    { label: "Let me adjust it", value: "adjust" },
                  ],
                  title: "Render the clip like this?",
                },
              ]}
              result="Rendering 16:9 at 2K."
              status={t >= AT.approveAnswer ? "answered" : "pending"}
            />
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
            to={CUE.flow - 0.35}
            zoom={1.3}
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
            to={CUE.flow - 0.35}
          />

          <Scene from={AT.flowShown} rect={NODE} t={t} to={CUE.attach - 0.3}>
            <div
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4"
              style={{ height: NODE.h }}
            >
              <AgentIndicator state={revealed ? "idle" : "tool-call"} />
              <span className="font-mono text-foreground text-xs">
                16:9 · 2K · 6s
              </span>
            </div>
          </Scene>
          <Scene from={AT.flowShown} rect={EDGE} t={t} to={CUE.attach - 0.3}>
            <FlowEdge
              active={!revealed}
              className="text-primary"
              d={`M 0 ${EDGE.h} C ${EDGE.w / 2} ${EDGE.h} ${EDGE.w / 2} 0 ${EDGE.w} 0`}
              duration={1400}
              viewBox={`0 0 ${EDGE.w} ${EDGE.h}`}
            />
          </Scene>
          <Scene from={AT.flowShown} rect={FRAME} t={t} to={CUE.attach}>
            <div
              className="overflow-hidden rounded-xl border border-border"
              style={{ height: FRAME.h }}
            >
              <GenerationOverlay
                id="film-render"
                mediaSrc={revealed ? IMAGE : undefined}
                pending={!revealed}
                prompt={PROMPT_TEXT}
              >
                {revealed ? (
                  <img alt="" className="size-full object-cover" src={IMAGE} />
                ) : null}
              </GenerationOverlay>
            </div>
          </Scene>
          <Names
            from={AT.flowShown}
            names={["flow-edge", "generation-overlay"]}
            t={t}
            to={CUE.attach - 0.3}
          />

          {/* The result shrinks into the composer as an attachment. */}
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
            to={CUE.compose - 0.35}
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
                <PromptInputSubmit />
              </PromptInputFooter>
            </PromptInput>
          </Scene>
          <Names
            from={AT.promptShown + 0.15}
            names={["prompt-input", "attachment"]}
            t={t}
            to={CUE.compose - 0.35}
          />

          {/* 2. Compose a surface. */}
          {stage(AT.surfaceShown)}

          {/* 3. Own the source. */}
          <Scene
            className="absolute"
            from={AT.termShown}
            rect={TERM}
            t={t}
            to={CUE.outro - 0.35}
            zoom={1.3}
          >
            <div className="rounded-xl border border-border bg-card p-6 font-mono text-[12px] leading-6">
              <div className="text-foreground">
                <span className="text-muted-foreground">$ </span>
                {typed(t, TYPING.command)}
              </div>
              {[
                "conversation",
                "message",
                "thinking-block",
                "prompt-input",
              ].map((name, index) => {
                const p = ramp(t, AT.check(index), 0.2);
                return (
                  <div
                    className="text-muted-foreground"
                    key={name}
                    style={{ opacity: p }}
                  >
                    <span className="text-success">✓</span> {name}
                  </div>
                );
              })}
              <div
                className="text-foreground"
                style={{ opacity: ramp(t, AT.inRepo, 0.3) }}
              >
                The source is in your repo.
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
              text="Interface parts for AI agents"
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
            <Surface explode={0} startedAt={at(CUE.think + 1)} t={t} />
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
