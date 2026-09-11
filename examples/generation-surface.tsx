"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { GenerationSurface } from "@/registry/new-york/generation-surface";

const IMAGE = "/attachment-demo.jpg";
const BROKEN = "/generation-missing.jpg";
const PROMPT = "a raven on a payphone at dusk, 35mm";

const FRAME = "aspect-video w-full max-w-md overflow-hidden rounded-xl border";

const SEEDS = ["aurora", "ember", "reef", "dusk", "moss", "iris"];

export const GenerationSurfaceDemo = () => {
  const [nonce, setNonce] = useState(0);
  const [pending, setPending] = useState(true);

  // Stands in for a generation: hold the surface pending long enough for the flow to
  // read, then hand it the result.
  useEffect(() => {
    if (!pending) {
      return;
    }
    const timer = window.setTimeout(() => setPending(false), 2600);
    return () => window.clearTimeout(timer);
  }, [pending, nonce]);

  const mediaSrc = pending ? undefined : `${IMAGE}?v=${nonce}`;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className={cn(FRAME, "border-border")}>
        <GenerationSurface
          id={`generation-demo-${nonce}`}
          mediaSrc={mediaSrc}
          pending={pending}
          prompt={PROMPT}
        >
          {mediaSrc ? (
            <img
              alt="Generated result"
              className="h-full w-full object-cover"
              src={mediaSrc}
            />
          ) : null}
        </GenerationSurface>
      </div>
      <button
        className="rounded-md border border-border bg-muted/20 px-3 py-1.5 text-muted-foreground text-xs transition-colors hover:bg-muted/50 hover:text-foreground"
        onClick={() => {
          setPending(true);
          setNonce((current) => current + 1);
        }}
        type="button"
      >
        Generate again
      </button>
    </div>
  );
};

/**
 * Six seeds side by side. The colour is the same everywhere; only the motion moves —
 * where each layer starts, which way it turns and how fast — so a wall of concurrent
 * generations reads as separate pieces of work instead of one repeated placeholder.
 */
export const GenerationSurfaceSeedsDemo = () => (
  <div className="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
    {SEEDS.map((seed) => (
      <div className={cn(FRAME, "max-w-none border-border")} key={seed}>
        <GenerationSurface pending prompt={seed} seed={seed} />
      </div>
    ))}
  </div>
);

/** A source that never loads: the flow gives way and the failure line takes over. */
export const GenerationSurfaceFailureDemo = () => {
  const [pending, setPending] = useState(true);

  return (
    <div className={cn(FRAME, "border-destructive/40")}>
      <GenerationSurface
        failureLabel="Media failed to load"
        id="generation-demo-failure"
        mediaSrc={BROKEN}
        pending={pending}
        prompt={PROMPT}
      >
        <img
          alt=""
          className="h-full w-full object-cover"
          onError={() => setPending(false)}
          src={BROKEN}
        />
      </GenerationSurface>
    </div>
  );
};
