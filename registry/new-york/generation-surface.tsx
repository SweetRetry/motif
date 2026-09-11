"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useState } from "react";
import type { CSSProperties, ReactNode, SyntheticEvent } from "react";

import { cn } from "@/lib/utils";

/* -- The wait, drawn -----------------------------------------------------------
 * A generation is a gap between a prompt and the thing it makes. Rather than a
 * spinner, the surface keeps a soft flow drifting behind the node and hides the
 * result until it is genuinely decodable, then hands it over with one blur-to-focus
 * fade. The flow is decorative; the reveal is the part that has to be honest.
 * --------------------------------------------------------------------------- */

/** The reveal curve. Slower than a UI transition on purpose — this is the shot, not a menu. */
const EASE = [0.25, 0.55, 0.45, 1] as const;

/** The two tones the flow is built from — one warm blue, one cool violet, screened
 *  together. Held fixed: the seed moves the motion, not the palette. */
const FLOW_A = "oklch(0.81 0.12 252)";
const FLOW_B = "oklch(0.78 0.08 280)";

/** Focal pairs, kept diagonal so the two tones stay apart wherever the seed lands. */
const FOCAL_PAIRS = [
  ["50% 20%", "50% 80%"],
  ["30% 30%", "70% 70%"],
  ["70% 25%", "30% 75%"],
  ["25% 60%", "75% 40%"],
  ["50% 75%", "50% 25%"],
] as const;

type SpinDirection = 1 | -1;

interface FlowSpec {
  directionA: SpinDirection;
  directionB: SpinDirection;
  focalA: string;
  focalB: string;
  phaseA: number;
  phaseB: number;
  spinA: number;
  spinB: number;
}

const flip = (direction: SpinDirection): SpinDirection =>
  direction === 1 ? -1 : 1;

/**
 * A 32-bit fold, spelled as arithmetic because the linter bans bitwise operators. The
 * `+ 2^32 % 2^32` wrap is what `>>> 0` does, and it lands on the same number.
 */
const toUint32 = (value: number) => (value + 4_294_967_296) % 4_294_967_296;

// 节点和任务使用稳定相位，避免同屏占位齐步旋转。
const hashString = (input: string, seed: number) => {
  let hash = toUint32(seed);
  for (let index = 0; index < input.length; index += 1) {
    hash = toUint32(Math.imul(hash, 33) + (input.codePointAt(index) ?? 0));
  }
  return hash;
};

/**
 * Everything about the flow's motion that a seed decides, hashed once. Same seed in,
 * same motion out — so a remount, a re-render, or a server pass never makes the
 * placeholder jump.
 *
 * The palette is fixed; the seed only changes where each layer starts, which way it
 * turns, how fast it turns and where its light sits. That is enough for two surfaces
 * generating side by side to never share a starting point or a path, without turning
 * the canvas into a colour chart.
 */
const buildFlowSpec = (seed: string): FlowSpec => {
  const phaseA = hashString(seed, 5381) % 360;
  // Keep the second layer 120–240° away from the first, so the two glows never start
  // stacked into one blob.
  const phaseB = (phaseA + 120 + (hashString(seed, 52_711) % 120)) % 360;
  const [focalA, focalB] =
    FOCAL_PAIRS[hashString(seed, 104_729) % FOCAL_PAIRS.length];
  const directionA: SpinDirection =
    hashString(seed, 15_485_863) % 2 === 0 ? 1 : -1;

  return {
    directionA,
    directionB: flip(directionA),
    focalA,
    focalB,
    phaseA,
    phaseB,
    spinA: 4.5 + (hashString(seed, 32_452_843) % 150) / 100,
    spinB: 6.5 + (hashString(seed, 49_979) % 200) / 100,
  };
};

interface MediaRevealState {
  animate: boolean;
  failed: boolean;
  mediaSrc?: string;
  pending: boolean;
  ready: boolean;
}

/**
 * Tracks a pending media element through decode. `loading` is the only value the
 * surface needs: it is true while work is in flight *and* while the result is still
 * being decoded, so the result never appears half-rendered.
 *
 * The handlers are capture-phase, because `img`/`video` load events do not bubble —
 * attaching them to the surface means one set covers whatever media the caller renders.
 */
export const useMediaReveal = (pending: boolean, mediaSrc?: string) => {
  const [state, setState] = useState<MediaRevealState>({
    animate: pending,
    failed: false,
    mediaSrc,
    pending,
    ready: false,
  });

  // Adjusting state during render, so a new generation resets the reveal in the same
  // commit that changed the source — no flash of the previous frame.
  if (state.pending !== pending || state.mediaSrc !== mediaSrc) {
    setState({
      animate:
        pending ||
        (state.animate && (!state.mediaSrc || state.mediaSrc === mediaSrc)),
      failed: state.mediaSrc === mediaSrc && state.failed,
      mediaSrc,
      pending,
      ready: state.mediaSrc === mediaSrc && state.ready,
    });
  }

  const settle = (failed: boolean) => {
    setState((current) =>
      current.mediaSrc === mediaSrc
        ? { ...current, failed, ready: !failed }
        : current
    );
  };

  const matches = (target: EventTarget) =>
    (target instanceof HTMLImageElement ||
      target instanceof HTMLMediaElement) &&
    (target.getAttribute("src") === mediaSrc || target.currentSrc === mediaSrc);

  const onLoadCapture = async (event: SyntheticEvent) => {
    const { target } = event;
    if (!(target instanceof HTMLImageElement) || !matches(target)) {
      return;
    }
    try {
      // `decode()` resolves only once the bitmap is ready to paint, which is the real
      // finish line — `load` fires while the pixels are still being unpacked.
      await target.decode();
      settle(false);
    } catch {
      settle(true);
    }
  };

  const onLoadedDataCapture = (event: SyntheticEvent) => {
    if (matches(event.target)) {
      settle(false);
    }
  };

  const onLoadedMetadataCapture = (event: SyntheticEvent) => {
    if (event.target instanceof HTMLAudioElement && matches(event.target)) {
      settle(false);
    }
  };

  const onErrorCapture = (event: SyntheticEvent) => {
    if (matches(event.target)) {
      settle(true);
    }
  };

  return {
    animate: state.animate,
    failed: state.failed,
    loading:
      pending ||
      (state.animate && Boolean(mediaSrc) && !state.ready && !state.failed),
    onErrorCapture,
    onLoadCapture,
    onLoadedDataCapture,
    onLoadedMetadataCapture,
  };
};

/**
 * Two screened radial gradients turning at different speeds and, usually, in opposite
 * directions. Where each starts, which way it goes and how fast all come from the
 * seeded spec, so neighbouring nodes never look choreographed.
 */
const Flow = ({
  reducedMotion,
  spec,
}: {
  reducedMotion: boolean;
  spec: FlowSpec;
}) => {
  const endA = spec.phaseA + 360 * spec.directionA;
  const endB = spec.phaseB + 360 * spec.directionB;

  return (
    <>
      <motion.div
        animate={{ rotate: reducedMotion ? spec.phaseA : endA }}
        className="absolute top-1/2 left-1/2 aspect-square w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        initial={{ rotate: spec.phaseA }}
        style={{
          background: `radial-gradient(circle at ${spec.focalA}, ${FLOW_A} 0%, transparent 45%)`,
          mixBlendMode: "screen",
        }}
        transition={{
          duration: spec.spinA,
          ease: "linear",
          repeat: reducedMotion ? 0 : Number.POSITIVE_INFINITY,
        }}
      />
      <motion.div
        animate={{ rotate: reducedMotion ? spec.phaseB : endB }}
        className="absolute top-1/2 left-1/2 aspect-square w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        initial={{ rotate: spec.phaseB }}
        style={{
          background: `radial-gradient(circle at ${spec.focalB}, ${FLOW_B} 0%, transparent 45%)`,
          mixBlendMode: "screen",
        }}
        transition={{
          duration: spec.spinB,
          ease: "linear",
          repeat: reducedMotion ? 0 : Number.POSITIVE_INFINITY,
        }}
      />
    </>
  );
};

export interface GenerationSurfaceProps {
  /** The media to reveal once it decodes. Omit while nothing exists yet. */
  children?: ReactNode;
  className?: string;
  /** Shown along the bottom when the pending media fails. */
  failureLabel?: string;
  /**
   * Stable id used to phase the flow, so two surfaces on screen do not spin in
   * lockstep. Defaults to a React id.
   */
  id?: string;
  /**
   * Seeds the flow's motion: where each layer starts, which way it turns, how fast it
   * turns and where its light sits. The palette is fixed, so the same seed always
   * draws the same motion and concurrent generations never share a starting point or
   * a path. Defaults to `id`, so a canvas of nodes gets variety for free — pass a
   * constant to pin one motion everywhere.
   */
  seed?: string | number;
  /** The src being awaited; the reveal completes when this element decodes. */
  mediaSrc?: string;
  /** Rendered above everything — status lines, retry actions, a toolbar. */
  overlay?: ReactNode;
  /** Whether a generation is in flight. */
  pending: boolean;
  /** Echoed along the bottom while pending, so the wait says what it is waiting for. */
  prompt?: string | null;
  style?: CSSProperties;
}

/**
 * The surface a media node shows while generation runs. It hides its children until
 * they are ready, drifts a two-tone flow behind them while they are not, and reveals
 * the result with a blur-to-focus fade. `overlay` is left to the caller: status copy
 * and actions are product decisions, not surface ones.
 */
export const GenerationSurface = ({
  children,
  className,
  failureLabel = "Media failed to load",
  id,
  mediaSrc,
  overlay,
  pending,
  prompt,
  seed,
  style,
}: GenerationSurfaceProps) => {
  const reducedMotion = useReducedMotion();
  const fallbackId = useId();
  const { animate, failed, loading, ...events } = useMediaReveal(
    pending,
    mediaSrc
  );
  const seedKey = String(seed ?? id ?? fallbackId);
  const flow = useMemo(() => buildFlowSpec(seedKey), [seedKey]);
  const duration = (seconds: number) => (reducedMotion ? 0 : seconds);

  return (
    <motion.div
      {...events}
      aria-busy={loading}
      className={cn(
        "relative isolate h-full w-full min-w-0 overflow-hidden",
        className
      )}
      style={style}
    >
      <motion.div
        animate={{
          filter: loading && !reducedMotion ? "blur(6px)" : "blur(0px)",
          opacity: loading ? 0 : 1,
        }}
        className="relative h-full w-full"
        inert={loading}
        initial={false}
        transition={{
          filter: { duration: animate ? duration(1.6) : 0, ease: EASE },
          opacity: { duration: animate ? duration(1.4) : 0, ease: EASE },
        }}
      >
        {children}
      </motion.div>

      <AnimatePresence>
        {loading ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="pointer-events-none absolute inset-0 bg-muted"
            exit={{
              opacity: 0,
              transition: { duration: duration(1.1), ease: EASE },
            }}
            initial={{ opacity: reducedMotion ? 1 : 0 }}
            key="base"
            transition={{ duration: duration(0.9), ease: EASE }}
          >
            <div className="h-full w-full animate-pulse bg-accent motion-reduce:animate-none" />
          </motion.div>
        ) : null}

        {loading ? (
          <motion.div
            animate={{ opacity: 1 }}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            exit={{
              opacity: 0,
              transition: { duration: duration(1.8), ease: EASE },
            }}
            initial={{ opacity: reducedMotion ? 1 : 0 }}
            key="glow"
            style={{ filter: "blur(24px)" }}
            transition={{ duration: duration(0.9), ease: EASE }}
          >
            <Flow reducedMotion={Boolean(reducedMotion)} spec={flow} />
          </motion.div>
        ) : null}

        {loading && prompt ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-background/85 via-background/35 to-transparent px-4 pt-12 pb-4"
            exit={{
              opacity: 0,
              transition: { duration: duration(0.7), ease: EASE },
            }}
            initial={{ opacity: reducedMotion ? 1 : 0 }}
            key="prompt"
            transition={{ duration: duration(0.9), ease: EASE }}
          >
            <p className="truncate text-foreground/85 text-xs" title={prompt}>
              {prompt}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {failed ? (
        <div
          className="absolute inset-x-0 bottom-0 bg-background/85 p-4 text-destructive text-xs"
          role="alert"
        >
          {failureLabel}
        </div>
      ) : null}

      {overlay}
    </motion.div>
  );
};
