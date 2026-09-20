"use client";

import { Pause, Play } from "lucide-react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* -- A recording, before it is played ------------------------------------------
 * A take, a voicemail, the audio a node produced: a thing you have to hear to judge.
 * The waveform is what makes it readable first — where the loud parts are, how long the
 * quiet stretches run, whether anything is in there at all.
 *
 * It does not scroll. The whole track is on screen from the start, every bar left of the
 * playhead lit and every bar right of it dimmed, and a press anywhere on it seeks there.
 * A window scrolling past a playhead pinned to the left edge can say *something is
 * happening* but never *you are a third of the way in*, which is the one question a
 * preview is opened to answer — and it needs a second control, a slider beside it, to
 * answer the first one at all. Standing still, the waveform is its own progress bar.
 *
 * The root owns the media element and the clock; the parts read them and know nothing of
 * each other. A caller who wants the clock above the waveform rather than beside it moves
 * the part, or leaves it out.
 * --------------------------------------------------------------------------- */

/** One bar, 0–1 as a share of the track's own loudest passage. */
export type AudioPreviewPeaks = number[];

/** What a part reads from the root. Exported with `useAudioPreview`, so a caller can
 *  draw a frame of their own — a clock with hours in it, a row per chapter — from the
 *  same numbers the shipped parts use. */
export interface AudioPreviewState {
  /** Seconds into the track. `0` until it has been played or sought. */
  currentTime: number;
  /** Seconds of track. `0` until the length is known — and for anything with no length
   *  to know, such as a stream. */
  duration: number;
  /** `0:12` from seconds. Not a prop, and the note under Clock says why. */
  formatTime: (seconds: number) => string;
  isPlaying: boolean;
  /** The bars, or `null` while they are still being worked out. */
  peaks: AudioPreviewPeaks | null;
  /** Where the playhead is, 0–1. `0` while the length is unknown. */
  progress: number;
  /** Move the playhead. Seconds, clamped to the track. */
  seek: (time: number) => void;
  /** Play, or pause. */
  toggle: () => void;
}

export interface AudioPreviewProps {
  children: ReactNode;
  className?: string;
  /**
   * The bars, left to right, one per bar. Passed, the component neither fetches nor
   * decodes `src` — these are the reading. Left out, it decodes `src` itself and the
   * waveform draws an empty track until it can.
   *
   * A server that analysed the file when it was uploaded is the caller who wants this:
   * the peaks are already in the payload, and decoding them again in the browser would
   * be the same work done a second time.
   */
  peaks?: AudioPreviewPeaks;
  src: string;
}

export interface AudioPreviewWaveformProps {
  className?: string;
  /** Names the seek track for a screen reader. */
  label?: string;
}

export interface AudioPreviewPlayButtonProps {
  className?: string;
  /** Names the button once it is playing. */
  pauseLabel?: string;
  /** Names the button at rest. */
  playLabel?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
}

export interface AudioPreviewTimeProps {
  className?: string;
}

/* -- The picture ---------------------------------------------------------------
 * 96 buckets, each the RMS of its slice of samples, then read against the track's own
 * 10th and 90th percentiles rather than against full scale. That is the whole trick: a
 * recording made quietly is still drawn full height, so a preview of a whisper is as
 * legible as a preview of a shout. Against full scale, half the takes anyone uploads
 * would be a flat line.
 *
 * Channel 0 only. Averaging the channels would cost the same and could cancel — a stereo
 * pair that is out of phase would read as silence, which is the one thing a wrong
 * waveform says that a missing one does not.
 * --------------------------------------------------------------------------- */
const BAR_COUNT = 96;

const samplePeaks = (samples: Float32Array): AudioPreviewPeaks => {
  const stride = Math.max(1, Math.floor(samples.length / BAR_COUNT));

  const energy = Array.from({ length: BAR_COUNT }, (_, index) => {
    const start = index * stride;
    const end = Math.min(samples.length, start + stride);
    let sum = 0;
    for (let sample = start; sample < end; sample += 1) {
      sum += samples[sample] * samples[sample];
    }

    return Math.sqrt(sum / Math.max(1, end - start));
  });

  const sorted = energy.toSorted((left, right) => left - right);
  const low = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
  const high = sorted[Math.floor(sorted.length * 0.9)] ?? 1;
  const range = Math.max(0.0001, high - low);

  return energy.map((value) => Math.min(1, Math.max(0, (value - low) / range)));
};

/** How a peak becomes a height. The floor keeps the quietest bar a dot rather than a
 *  gap: a bar that vanishes reads as a hole in the picture, not as silence. The curve
 *  lifts the middle, because measured as RMS an ordinary take spends most of its length
 *  well under half and drawn straight is a row of stubs. */
const FLOOR = 0.12;
const CURVE = 0.75;

const heightOf = (peak: number) =>
  FLOOR + Math.min(1, Math.max(0, peak)) ** CURVE * (1 - FLOOR);

/* -- The clock -----------------------------------------------------------------
 * `m:ss`, and not a prop. A duration is the one thing every locale writes the same way,
 * and the two decisions inside it — seconds are padded, minutes are not — are what the
 * `tabular-nums` on the part exists to hold still. A caller who wants `1m 30s`, or an
 * hour column, has `currentTime` and `duration` from the hook and draws their own.
 *
 * Named for the reading rather than for the API, because the context key is what parts
 * destructure and a module-level `formatTime` would be shadowed by every one of them.
 * --------------------------------------------------------------------------- */
const clockTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const whole = Math.floor(seconds);

  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};

const AudioPreviewContext = createContext<AudioPreviewState | null>(null);

export const useAudioPreview = () => {
  const context = useContext(AudioPreviewContext);
  if (!context) {
    throw new Error("Audio preview parts must be used within an AudioPreview.");
  }

  return context;
};

/** How far an arrow key moves the playhead, and how far with Shift held. Five seconds
 *  is a sentence; thirty is a paragraph, and is the only way to cross a long take
 *  without holding a key down. */
const STEP = 5;
const COARSE_STEP = 30;

/**
 * The root: it owns the media element and everything the parts read from it, and draws
 * the row they sit in. The element is never drawn — the play button is the control, and
 * a second set of browser controls under it would be the same thing twice.
 *
 * The parts are arranged left to right by default, which is the arrangement a preview
 * almost always wants; `className` replaces it for the caller who wants a stack.
 */
export const AudioPreview = ({
  children,
  className,
  peaks,
  src,
}: AudioPreviewProps) => {
  const media = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [decoded, setDecoded] = useState<AudioPreviewPeaks | null>(null);

  const bars = peaks ?? decoded;

  useEffect(() => {
    // The caller's peaks are the reading; there is nothing here to work out.
    if (peaks) {
      return;
    }

    setDecoded(null);

    const controller = new AbortController();
    let context: AudioContext | null = null;

    const decode = async () => {
      try {
        const response = await fetch(src, { signal: controller.signal });
        const bytes = await response.arrayBuffer();
        // A context only to decode with: nothing is routed through it and it is closed
        // on the way out, so no device is left open behind a waveform.
        context = new AudioContext();
        const audio = await context.decodeAudioData(bytes);
        if (!controller.signal.aborted) {
          setDecoded(samplePeaks(audio.getChannelData(0)));
        }
      } catch {
        // A file that cannot be fetched, decoded, or read across origins — a `src` on
        // another host has to allow the request for its bytes to be visible here. What
        // is lost is the picture. The track underneath still seeks and still plays, so
        // the bars stay empty rather than turning a working control into an error.
      } finally {
        await context?.close();
      }
    };

    void decode();

    return () => {
      controller.abort();
    };
  }, [peaks, src]);

  const seek = useCallback(
    (time: number) => {
      const element = media.current;
      if (!(element && duration > 0)) {
        return;
      }

      const next = Math.min(duration, Math.max(0, time));
      // Written to the element and to the state together: the element is the truth, but
      // it only reports back four times a second, and a playhead that lags the finger
      // moving it is the one thing a seek surface cannot do.
      element.currentTime = next;
      setCurrentTime(next);
    },
    [duration]
  );

  const toggle = useCallback(() => {
    const element = media.current;
    if (!element) {
      return;
    }

    if (element.paused) {
      void element.play();
    } else {
      element.pause();
    }
  }, []);

  const state = useMemo<AudioPreviewState>(
    () => ({
      currentTime,
      duration,
      formatTime: clockTime,
      isPlaying,
      peaks: bars,
      progress: duration > 0 ? Math.min(1, currentTime / duration) : 0,
      seek,
      toggle,
    }),
    [bars, currentTime, duration, isPlaying, seek, toggle]
  );

  return (
    <AudioPreviewContext.Provider value={state}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- the sound is the
          content here, and its cue sheet does not exist until somebody writes one. */}
      <audio
        onDurationChange={(event) => {
          const length = event.currentTarget.duration;
          // A stream reports an infinite length. `0` is the same "no length to seek to"
          // the waveform and the clock already read as unknown.
          setDuration(Number.isFinite(length) ? length : 0);
        }}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={(event) => {
          // A seek in flight still reports the position it is leaving, which would drag
          // the playhead back under the pointer that just moved it.
          if (event.currentTarget.seeking) {
            return;
          }
          setCurrentTime(event.currentTarget.currentTime);
        }}
        preload="metadata"
        ref={media}
        src={src}
      />
      <div className={cn("flex items-center gap-3", className)}>{children}</div>
    </AudioPreviewContext.Provider>
  );
};

/**
 * The track: the waveform, the playhead, and the surface that seeks.
 *
 * It is one element rather than a picture with a slider over it. The bars already say
 * where in the track every moment is, so a separate handle would be a second reading of
 * the same axis, and the one the eye is not on.
 *
 * Before the bars arrive it draws the empty track and still seeks. The waveform is a
 * reading of a control that works without it.
 */
export const AudioPreviewWaveform = ({
  className,
  label = "Seek",
}: AudioPreviewWaveformProps) => {
  const { currentTime, duration, peaks, progress, seek } = useAudioPreview();
  const dragging = useRef(false);

  const bars = peaks ?? [];
  const played = Math.round(progress * bars.length);
  const seekable = duration > 0;

  const timeAt = (clientX: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0) {
      return 0;
    }

    const share = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));

    return share * duration;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!seekable) {
      return;
    }
    // Captured, so a drag that leaves the track keeps seeking — and released by the
    // browser on pointer up, which is why nothing here releases it by hand.
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
    seek(timeAt(event.clientX, event.currentTarget));
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) {
      return;
    }
    seek(timeAt(event.clientX, event.currentTarget));
  };

  const handlePointerUp = () => {
    dragging.current = false;
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!seekable) {
      return;
    }

    const step = event.shiftKey ? COARSE_STEP : STEP;
    let next: number | null = null;

    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      next = currentTime - step;
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      next = currentTime + step;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = duration;
    }

    if (next === null) {
      return;
    }
    event.preventDefault();
    seek(next);
  };

  const seconds = Math.round(duration);
  const at = Math.round(currentTime);

  return (
    <div
      aria-label={label}
      // Zero until the length lands, which is what "no track to seek through yet"
      // reads as. The alternative — a role that appears once metadata arrives — makes
      // the element change what it is a few hundred milliseconds after it is drawn,
      // and a control that is briefly not one is worse than one that is briefly empty.
      aria-valuemax={seconds}
      aria-valuemin={0}
      aria-valuenow={at}
      aria-valuetext={`${clockTime(at)} of ${clockTime(seconds)}`}
      className={cn(
        "relative flex h-10 min-w-0 flex-1 cursor-ew-resize touch-none select-none items-center text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring",
        className
      )}
      data-slot="audio-preview-waveform"
      onKeyDown={handleKeyDown}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="slider"
      tabIndex={0}
    >
      {bars.length > 0 ? (
        bars.map((peak, index) => (
          // Position in the array is the whole identity of a bar: they are one series,
          // never reordered, and an index is the only key that survives the count
          // changing under a re-decode.
          <Fragment key={index}>
            {/* The air is a sibling with the bar's own `flex-1`, so the two always come
                out the same width — the pitch the source drew at a fixed 3px and 3px,
                at any width and for any count. A gap cannot scale itself: 96 bars in a
                550px track leaves 4.7px of bar against a 1px `gap-px`, which is a
                barcode rather than a waveform. */}
            {index > 0 ? <span className="flex-1" /> : null}
            <span
              className={cn(
                "flex-1 rounded-full bg-current",
                // The only thing separating heard from unheard. 30% is the dimmest the
                // source ever drew a bar, so the resting waveform is the colour it was.
                index >= played && "opacity-30"
              )}
              style={{ height: `${heightOf(peak) * 100}%` }}
            />
          </Fragment>
        ))
      ) : (
        // Silence decodes to a full-height row of dots — the floor sees to that — so a
        // flat line is unambiguously "not drawn yet" rather than "nothing in here".
        <span className="h-px flex-1 bg-current opacity-30" />
      )}
    </div>
  );
};

/** Play, or pause. `secondary` by default so it reads as a control on a card rather
 *  than as the page's one action. */
export const AudioPreviewPlayButton = ({
  className,
  pauseLabel = "Pause",
  playLabel = "Play",
  size = "icon",
  variant = "secondary",
}: AudioPreviewPlayButtonProps) => {
  const { isPlaying, toggle } = useAudioPreview();

  return (
    <Button
      aria-label={isPlaying ? pauseLabel : playLabel}
      className={cn("shrink-0 rounded-full", className)}
      data-slot="audio-preview-play"
      onClick={toggle}
      size={size}
      type="button"
      variant={variant}
    >
      {isPlaying ? (
        <Pause className="size-4 fill-current" strokeWidth={0} />
      ) : (
        // Lucide's triangle carries its mass left of its bounding box — the centroid
        // sits 1px left of centre at 16px — so a button that centres the box reads as
        // pushed left. The shift is named for what it corrects, not applied to every
        // icon: the pause bars are symmetric and get none.
        <Play className="size-4 translate-x-px fill-current" strokeWidth={0} />
      )}
    </Button>
  );
};

/** Where the playhead is, out of how long the track runs. */
export const AudioPreviewTime = ({ className }: AudioPreviewTimeProps) => {
  const { currentTime, duration, formatTime } = useAudioPreview();

  return (
    <span
      className={cn(
        "shrink-0 text-muted-foreground text-xs tabular-nums",
        className
      )}
      data-slot="audio-preview-time"
    >
      {formatTime(currentTime)} / {formatTime(duration)}
    </span>
  );
};
