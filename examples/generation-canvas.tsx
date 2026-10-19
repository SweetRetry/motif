"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { AspectRatioPicker } from "@/registry/new-york/aspect-ratio-picker";
import {
  CanvasEdge,
  CanvasMedia,
  CanvasNode,
  GenerationCanvas,
  portOf,
} from "@/registry/new-york/blocks/generation-canvas/generation-canvas";
import { ResolutionSegmented } from "@/registry/new-york/resolution-segmented";
import { StrengthSelect } from "@/registry/new-york/strength-select";
import {
  Toolbar,
  ToolbarItem,
  ToolbarSeparator,
} from "@/registry/new-york/toolbar";

const PROMPT = "a raven on a payphone at dusk, 35mm";
const BROKEN = "/generation-missing.jpg";
const GENERATE_MS = 2400;

/** Three seats, because the settings node is narrow and five labels would not fit. */
const STRENGTHS = ["Low", "Medium", "High"];

const LABEL = "mb-2 font-medium text-muted-foreground text-xs";

/** A stand-in for a model: a gradient with more circles the stronger the request. The
 *  art is content, not chrome, so its colours are literal. */
const artFor = (seed: number, aspect: string, strength: string) => {
  const [w = 16, h = 9] = aspect.split(":").map(Number);
  const hue = (seed * 67) % 360;
  const count = STRENGTHS.indexOf(strength) + 2;
  const circles = Array.from({ length: Math.max(count, 2) }, (_, index) => {
    const cx = ((seed * 37 + index * 211) % 100) / 100;
    const cy = ((seed * 53 + index * 137) % 100) / 100;
    return `<circle cx="${cx * w * 100}" cy="${cy * h * 100}" r="${((60 + index * 24) * Math.min(w, h)) / 9}" fill="hsl(${(hue + index * 40) % 360} 85% 70%)" fill-opacity="0.35"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w * 100} ${h * 100}"><defs><radialGradient id="a" cx=".3" cy=".3" r=".9"><stop offset="0" stop-color="hsl(${hue} 80% 62%)"/><stop offset="1" stop-color="hsl(${(hue + 60) % 360} 70% 22%)"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#a)"/>${circles}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

interface Run {
  aspect: string;
  pending: boolean;
  seed: number;
  src?: string;
  /** The result, held back until the wait is over. */
  target: string;
}

const firstRun = (): Run => {
  const target = artFor(1, "16:9", "Medium");
  return { aspect: "16:9", pending: false, seed: 1, src: target, target };
};

const PROMPT_NODE = { width: 216, x: 16, y: 16 };
const SETTINGS_NODE = { width: 216, x: 16, y: 206 };
const IMAGE_NODE = { width: 232, x: 288, y: 16 };

/**
 * The block assembled: a prompt and its settings feed one image node, the lines carry
 * light while it generates, and the dock repeats the one action the prompt has.
 */
export const GenerationCanvasDemo = () => {
  const [prompt, setPrompt] = useState(PROMPT);
  const [aspect, setAspect] = useState("16:9");
  const [resolution, setResolution] = useState("2K");
  const [strength, setStrength] = useState("Medium");
  const [run, setRun] = useState<Run>(firstRun);

  // Stands in for a generation: hold the node pending long enough for the flow to read,
  // then hand it the result.
  useEffect(() => {
    if (!run.pending) {
      return;
    }
    const timer = window.setTimeout(
      () =>
        setRun((current) => ({
          ...current,
          pending: false,
          src: current.target,
        })),
      GENERATE_MS
    );
    return () => window.clearTimeout(timer);
  }, [run.pending, run.seed]);

  const generate = () => {
    if (run.pending) {
      return;
    }
    const seed = run.seed + 1;
    setRun({
      aspect,
      pending: true,
      seed,
      target: artFor(seed, aspect, strength),
    });
  };

  const reset = () => {
    setPrompt(PROMPT);
    setAspect("16:9");
    setResolution("2K");
    setStrength("Medium");
    setRun(firstRun());
  };

  return (
    <GenerationCanvas
      className="h-[38rem] w-full rounded-xl border border-border"
      dock={
        <Toolbar aria-label="Canvas">
          <ToolbarItem
            disabled={run.pending}
            icon={<Sparkles />}
            label="Generate an image"
            onSelect={generate}
            pinnedLabel="Generate"
          />
          <ToolbarSeparator />
          <ToolbarItem
            icon={<RotateCcw />}
            label="Reset the canvas"
            onSelect={reset}
          />
        </Toolbar>
      }
      height={560}
      width={536}
    >
      <CanvasEdge
        active={run.pending}
        from={portOf(PROMPT_NODE, "out")}
        to={portOf(IMAGE_NODE, "in")}
      />
      <CanvasEdge
        active={run.pending}
        from={portOf(SETTINGS_NODE, "out")}
        to={portOf(IMAGE_NODE, "in")}
      />

      <CanvasNode {...PROMPT_NODE} ports={["out"]} title="Prompt">
        <div className="flex flex-col gap-3 px-3 pb-3">
          <textarea
            aria-label="Prompt"
            className="h-20 w-full resize-none rounded-lg border border-border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            onChange={(event) => setPrompt(event.target.value)}
            value={prompt}
          />
          <Button
            disabled={run.pending}
            onClick={generate}
            size="sm"
            type="button"
          >
            Generate
          </Button>
        </div>
      </CanvasNode>

      <CanvasNode {...SETTINGS_NODE} ports={["out"]} title="Settings">
        <div className="flex flex-col gap-4 px-3 pb-3">
          <div>
            <div className={LABEL}>Aspect ratio</div>
            <AspectRatioPicker
              aria-label="Aspect ratio"
              onChange={setAspect}
              value={aspect}
            />
          </div>
          <div>
            <div className={LABEL}>Resolution</div>
            <ResolutionSegmented
              aria-label="Resolution"
              onChange={setResolution}
              value={resolution}
            />
          </div>
          <div>
            <div className={LABEL}>Strength</div>
            <StrengthSelect
              aria-label="Strength"
              onChange={setStrength}
              options={STRENGTHS}
              value={strength}
            />
          </div>
        </div>
      </CanvasNode>

      <CanvasNode {...IMAGE_NODE} ports={["in"]} title="Image">
        <div className="flex flex-col gap-2 px-3 pb-3">
          <CanvasMedia
            aspect={run.aspect}
            pending={run.pending}
            prompt={prompt}
            seed={run.seed}
            src={run.src}
          />
          <p className="font-mono text-muted-foreground text-xs">
            seed {run.seed} · {run.aspect} · {resolution}
          </p>
        </div>
      </CanvasNode>
    </GenerationCanvas>
  );
};

const WAITING = { width: 136, x: 16, y: 16 };
const READY = { width: 136, x: 192, y: 16 };
const FAILED = { width: 136, x: 368, y: 16 };

/** A source that never loads. It is set after mount, so the error lands on a listener
 *  that exists; an image that failed before hydration would never be heard. */
const FailedMedia = () => {
  const [src, setSrc] = useState<string>();

  useEffect(() => setSrc(BROKEN), []);

  return (
    <CanvasMedia
      aspect="1:1"
      failureLabel="The result never arrived"
      pending={false}
      seed="failed"
      src={src}
    />
  );
};

/**
 * The three states a node is in, left to right: waiting, with light travelling down the
 * line that feeds it; done, with the line at rest; and a source that never arrived.
 */
export const GenerationCanvasStatesDemo = () => (
  <GenerationCanvas
    className="h-52 w-full rounded-xl border border-border"
    height={208}
    width={520}
  >
    <CanvasEdge active from={portOf(WAITING, "out")} to={portOf(READY, "in")} />
    <CanvasEdge from={portOf(READY, "out")} to={portOf(FAILED, "in")} />

    <CanvasNode {...WAITING} ports={["out"]} title="Waiting">
      <div className="px-3 pb-3">
        <CanvasMedia aspect="1:1" pending prompt={PROMPT} seed="waiting" />
      </div>
    </CanvasNode>

    <CanvasNode {...READY} ports={["in", "out"]} title="Done">
      <div className="px-3 pb-3">
        <CanvasMedia
          aspect="1:1"
          pending={false}
          seed="ready"
          src={artFor(3, "1:1", "High")}
        />
      </div>
    </CanvasNode>

    <CanvasNode {...FAILED} ports={["in"]} title="Failed">
      <div className="px-3 pb-3">
        <FailedMedia />
      </div>
    </CanvasNode>
  </GenerationCanvas>
);
