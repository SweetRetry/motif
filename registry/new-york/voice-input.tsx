"use client";

import { Mic, Square, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* -- The recording ------------------------------------------------------------
 * A composer's mic is a press, and nearly all of the work that follows happens off the
 * render: the level arrives every frame, and a sixty-frame meter is not a reason to
 * re-render a tree. So the level is written straight onto a ring of bars, and React only
 * ever hears about the states a person can be in — idle, asking, recording.
 *
 * That split is also why the pieces ship apart. `useVoiceRecorder` is the engine:
 * permission, the analyser, the `MediaRecorder`, and the blob it ends on. `VoiceBars` is
 * the meter, `VoiceRecording` is the bar that replaces the field, and `VoiceInput` is
 * the mic that starts it. A caller who wants the bar somewhere else takes the engine and
 * the two views and arranges them.
 * --------------------------------------------------------------------------- */

/** Where a bar rests when the room is silent. The meter is read as dots, so the trough
 *  has to be small enough to close a 3px bar into one — but not zero, because a meter
 *  that collapses reads as broken rather than as quiet. */
const SILENCE = 0.16;

/** How many bars the window holds. More than a 2xl composer can show, so the window is
 *  always full and the oldest readings simply run off the left edge. */
const BARS = 96;

/** The level is RMS as a share of full scale, and speech sits far below that — an
 *  ordinary sentence lands around 0.05, which on a raw scale is a flat line. */
const LEVEL_GAIN = 5;

/** Meter resolution. 30fps is twice what a level meter needs and half the writes. */
const METER_MS = 33;

/** Containers, best first. Safari's recorder has no `webm`, Chrome's has no bare `mp4`,
 *  and a blob nobody can play is worse than one extra branch. */
const MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

const pickMime = () =>
  typeof MediaRecorder === "undefined"
    ? undefined
    : MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));

export interface VoiceBarsProps {
  className?: string;
  /** How many bars the window holds. */
  bars?: number;
  /**
   * Where the level comes from: read once a frame, 0–1. A ref-based read rather than a
   * prop because a prop would mean a render per frame, and this is a meter.
   */
  source: () => number;
}

/**
 * The live meter: a window of the last `bars` readings, newest on the right, drawn as
 * bars that grow from the middle and close into dots when the room is quiet.
 *
 * Heights go on through `scaleY`, so the only thing the compositor is asked for is a
 * transform — nothing here lays out, and nothing here re-renders. Give it a fixed width
 * and it fills it; the window holds more bars than fit, so the oldest readings run off
 * the left and the meter reads as moving rather than as filling up.
 *
 * It is information rather than decoration, so it keeps moving under
 * `prefers-reduced-motion`: a level meter that holds still is a meter that has stopped
 * listening.
 */
export const VoiceBars = ({
  bars = BARS,
  className,
  source,
}: VoiceBarsProps) => {
  const node = useRef<HTMLSpanElement>(null);
  // The loop outlives renders, so it reads the source through a ref instead of taking
  // it as a dependency — an inline arrow would otherwise restart it every render.
  const latest = useRef(source);

  useEffect(() => {
    latest.current = source;
  }, [source]);

  useEffect(() => {
    const element = node.current;
    if (!element) {
      return;
    }

    const cells = [...element.children] as HTMLElement[];
    const history = new Float32Array(bars);
    let frame = 0;
    let last = 0;

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (now - last < METER_MS) {
        return;
      }
      last = now;

      history.copyWithin(0, 1);
      history[bars - 1] = Math.max(0, Math.min(1, latest.current()));

      for (let index = 0; index < bars; index += 1) {
        cells[index].style.transform = `scaleY(${
          SILENCE + history[index] * (1 - SILENCE)
        })`;
      }
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [bars]);

  return (
    <span
      aria-hidden="true"
      className={cn(
        // Right-aligned, because the newest reading is the one that has to stay on
        // screen; the rest of the window is allowed to run off the left edge.
        "flex h-6 items-center justify-end overflow-hidden gap-[3px]",
        className
      )}
      ref={node}
    >
      {Array.from({ length: bars }, (_, index) => (
        <span
          className="h-full w-[3px] shrink-0 origin-center rounded-full bg-current"
          // The resting window, so the meter has a shape before the first frame lands.
          key={index}
          style={{ transform: `scaleY(${SILENCE})` }}
        />
      ))}
    </span>
  );
};

export interface VoiceRecordingProps {
  className?: string;
  /** Throw the recording away. */
  onCancel: () => void;
  /** Send what has been recorded. */
  onStop: () => void;
  /** The level, read once a frame. */
  source: () => number;
}

/**
 * The bar a recording turns the composer into: cancel on the left, the level across the
 * middle, stop on the right. It draws no surface of its own — it is laid out inside the
 * composer's frame, which is already there — and it holds no state, so where it is drawn
 * is entirely the caller's decision.
 *
 * Both ends are buttons rather than gestures. A sliding cancel has to be taught with a
 * hint, has to be re-taught for every new user, and cannot be performed with a keyboard
 * or a screen reader; a round button is understood the first time and reachable by every
 * input. The gesture was the demo; the button is the control.
 */
export const VoiceRecording = ({
  className,
  onCancel,
  onStop,
  source,
}: VoiceRecordingProps) => (
  <div
    aria-label="Recording"
    className={cn("flex w-full items-center gap-2", className)}
    role="group"
  >
    <Button
      aria-label="Cancel recording"
      className="shrink-0 rounded-full"
      onClick={onCancel}
      size="icon-lg"
      type="button"
      variant="secondary"
    >
      <X className="size-5" strokeWidth={2} />
    </Button>

    <VoiceBars
      className="min-w-0 flex-1 text-muted-foreground"
      source={source}
    />

    <Button
      aria-label="Stop recording"
      className="shrink-0 rounded-full"
      onClick={onStop}
      size="icon-lg"
      type="button"
      variant="secondary"
    >
      {/* A filled rounded square: the universal shape for *this recording ends here*,
          and the one glyph that cannot be mistaken for play or pause. */}
      <Square className="size-3.5 fill-current" strokeWidth={0} />
    </Button>
  </div>
);

export type VoiceRecorderStatus =
  | "denied"
  | "error"
  | "idle"
  | "recording"
  | "requesting";

export interface VoiceRecorderOptions {
  /** Auto-send at this many seconds. */
  maxSeconds?: number;
  /** The recording was thrown away — cancelled, or unmounted. */
  onCancel?: () => void;
  /** The finished recording. */
  onRecord?: (blob: Blob) => void;
}

export interface VoiceRecorder {
  /** Why the last attempt failed, cleared when the next one starts. */
  error: null | string;
  /** Throw the recording away. */
  cancel: () => void;
  /** Read once a frame; 0–1. */
  readLevel: () => number;
  /** Ask for the microphone and start. Safe to call while already running. */
  start: () => void;
  /** Epoch ms the current recording began, for a clock the caller draws itself. */
  startedAt: null | number;
  status: VoiceRecorderStatus;
  /** Send what has been recorded. */
  stop: () => void;
}

/**
 * The engine: permission, the analyser behind the meter, and the `MediaRecorder` behind
 * the blob. It owns nothing about how any of it looks, so a caller who wants a different
 * arrangement — a full-width bar, a timer in the header — can take this and draw their
 * own.
 */
export const useVoiceRecorder = ({
  maxSeconds = 120,
  onCancel,
  onRecord,
}: VoiceRecorderOptions = {}): VoiceRecorder => {
  const [status, setStatus] = useState<VoiceRecorderStatus>("idle");
  const [failure, setFailure] = useState<null | string>(null);
  const [startedAt, setStartedAt] = useState<null | number>(null);

  // Mirrored in a ref because `start` is called from an event handler and has to know
  // the state it is in without waiting for a render to tell it.
  const phase = useRef<VoiceRecorderStatus>("idle");
  const level = useRef(0);
  const stream = useRef<MediaStream | null>(null);
  const context = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const samples = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const discarded = useRef(false);
  const meter = useRef(0);
  const deadline = useRef(0);

  const readLevel = useCallback(() => level.current, []);

  /** Everything the recorder holds, let go in one place. Both exits and the unmount
   *  path come through here, so a closed context or a live track cannot survive a
   *  recording. Async only for the context, which closes on a promise of its own —
   *  everything before the `await` still runs on the caller's tick, so a caller can
   *  fire this and forget it. */
  const release = useCallback(async () => {
    cancelAnimationFrame(meter.current);
    window.clearTimeout(deadline.current);
    for (const track of stream.current?.getTracks() ?? []) {
      track.stop();
    }
    stream.current = null;
    analyser.current = null;
    samples.current = null;
    recorder.current = null;
    level.current = 0;

    const closing = context.current;
    context.current = null;
    if (closing) {
      try {
        await closing.close();
      } catch {
        // A context that is already closed rejects, and the microphone is off either
        // way — there is nothing here worth reporting.
      }
    }
  }, []);

  /** End the current recording, either into `onRecord` or onto the floor. The blob is
   *  built in `onstop` rather than here, because `stop()` only asks — the data arrives
   *  on the event after it. */
  const finish = useCallback(
    (discard: boolean) => {
      const active = recorder.current;
      if (!active || active.state === "inactive") {
        void release();
        phase.current = "idle";
        setStatus("idle");
        setStartedAt(null);
        return;
      }
      discarded.current = discard;
      active.stop();
    },
    [release]
  );

  const stop = useCallback(() => finish(false), [finish]);
  const cancel = useCallback(() => finish(true), [finish]);

  // Escape cancels from anywhere, and it lives here rather than on the bar because the
  // mic has unmounted by the time the bar is on screen: nothing in the bar holds focus
  // for a keyboard user to fall back on, so the listener has to be the page's.
  useEffect(() => {
    if (status !== "recording") {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancel, status]);

  const start = useCallback(async () => {
    if (phase.current !== "idle") {
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !pickMime()) {
      phase.current = "error";
      setStatus("error");
      setFailure("Recording is not supported here");
      return;
    }

    phase.current = "requesting";
    discarded.current = false;
    chunks.current = [];
    setFailure(null);
    setStatus("requesting");

    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      phase.current = "idle";
      setStatus("idle");
      // A refusal is the user's answer and reads differently from a missing device, so
      // they are two messages rather than one.
      const refused =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "SecurityError");
      setFailure(
        refused ? "Microphone access is blocked" : "No microphone available"
      );
      return;
    }

    stream.current = media;

    const audio = new AudioContext();
    context.current = audio;
    const node = audio.createAnalyser();
    // 2048 samples is ~46ms at 44.1kHz: long enough to hold a syllable, short enough
    // that the meter still reads as now.
    node.fftSize = 2048;
    analyser.current = node;
    samples.current = new Uint8Array(node.fftSize);
    // Analysed but never sent to the destination — routing it there would play the
    // microphone back through the speakers.
    audio.createMediaStreamSource(media).connect(node);

    const mimeType = pickMime();
    const active = new MediaRecorder(
      media,
      mimeType ? { mimeType } : undefined
    );
    recorder.current = active;

    active.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.current.push(event.data);
      }
    };

    active.onstop = () => {
      const type = active.mimeType || "audio/webm";
      const blob = new Blob(chunks.current, { type });
      const drop = discarded.current;
      void release();
      phase.current = "idle";
      setStatus("idle");
      setStartedAt(null);
      chunks.current = [];
      // An empty blob is a press with nothing behind it, which is a cancel, not a
      // message with no sound in it.
      if (drop || blob.size === 0) {
        if (drop) {
          onCancel?.();
        }
        return;
      }
      onRecord?.(blob);
    };

    active.start();
    phase.current = "recording";
    setStatus("recording");
    setStartedAt(Date.now());

    const draw = () => {
      meter.current = requestAnimationFrame(draw);
      const buffer = samples.current;
      const analysis = analyser.current;
      if (!buffer || !analysis) {
        return;
      }
      analysis.getByteTimeDomainData(buffer);
      let sum = 0;
      for (const sample of buffer) {
        const offset = (sample - 128) / 128;
        sum += offset * offset;
      }
      level.current = Math.min(1, Math.sqrt(sum / buffer.length) * LEVEL_GAIN);
    };
    meter.current = requestAnimationFrame(draw);

    if (maxSeconds > 0) {
      deadline.current = window.setTimeout(
        () => finish(false),
        maxSeconds * 1000
      );
    }
  }, [finish, maxSeconds, onCancel, onRecord, release]);

  // Unmounting mid-recording is a cancel: detach `onstop` first, so the teardown cannot
  // call back into a component that is already gone.
  useEffect(
    () => () => {
      if (recorder.current) {
        recorder.current.onstop = null;
      }
      void release();
    },
    [release]
  );

  return {
    cancel,
    error: failure,
    readLevel,
    start,
    startedAt,
    status,
    stop,
  };
};

export interface VoiceInputProps {
  className?: string;
  disabled?: boolean;
  /** Auto-send at this many seconds. */
  maxSeconds?: number;
  onCancel?: () => void;
  /** Called with the finished recording. Omit it and nothing is drawn. */
  onRecord?: (blob: Blob) => void;
  /**
   * Bind to a recorder the caller already owns — the case where the bar is drawn
   * somewhere the mic is not, so both have to share one recording. The options above
   * are the internal recorder's and are ignored when this is passed.
   */
  recorder?: VoiceRecorder;
}

/**
 * The mic, and the bar it turns into. At rest it is one round button in the composer's
 * row; a press asks for the microphone and starts, and from then on the component draws
 * the recording bar in place of itself.
 *
 * The bar is where the recording ends: cancel on the left, stop on the right, and the
 * live level between them. Escape cancels from the keyboard, which is the one thing the
 * bar's own buttons cannot do for a keyboard user.
 */
export const VoiceInput = ({
  className,
  disabled = false,
  maxSeconds,
  onCancel,
  onRecord,
  recorder,
}: VoiceInputProps) => {
  const internal = useVoiceRecorder({ maxSeconds, onCancel, onRecord });
  const active = recorder ?? internal;
  const recording = active.status === "recording";

  // A mic with nowhere to send a recording is a control that lies about what it can do.
  if (!(recorder ?? onRecord)) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative",
        recording ? "w-full" : "inline-flex",
        className
      )}
    >
      {recording ? (
        <VoiceRecording
          onCancel={active.cancel}
          onStop={active.stop}
          source={active.readLevel}
        />
      ) : (
        <Button
          aria-label="Record a message"
          className="rounded-full"
          disabled={disabled || active.status === "requesting"}
          onClick={active.start}
          size="icon-lg"
          type="button"
          variant="ghost"
        >
          <Mic className="size-5" strokeWidth={1.75} />
        </Button>
      )}

      {active.error && !recording ? (
        <span
          className="absolute bottom-[calc(100%+10px)] left-0 z-50 animate-in fade-in slide-in-from-bottom-1 rounded-full border border-destructive/40 bg-popover px-3 py-1.5 text-destructive text-xs whitespace-nowrap shadow-sm duration-150 motion-reduce:animate-none"
          role="alert"
        >
          {active.error}
        </span>
      ) : null}
    </div>
  );
};
