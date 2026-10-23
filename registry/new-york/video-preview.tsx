"use client";

import { Pause, Play } from "lucide-react";
import type {
  ComponentProps,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  RefObject,
} from "react";
import {
  createContext,
  memo,
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

/* -- A clip, before it is played -----------------------------------------------
 * A generated video is judged by what happens in it, and what happens is spread over
 * its length. Played, it can only be read one second at a time. The filmstrip puts the
 * whole length on screen at once: a frame every few tenths of a second, in order, so a
 * cut, a stall or a drift in the subject is visible before anything is played.
 *
 * It is also the progress bar. The frames left of the playhead are lit and the frames
 * right of it are dimmed, and a press anywhere on the strip seeks there, so the picture
 * of the clip and the control over it are one thing and there is no second slider to
 * read against it.
 *
 * The root owns the clock and draws nothing. The screen, the strip, the button and the
 * readout are parts, and the caller decides which of them are there and where: the
 * frame around them is theirs.
 * --------------------------------------------------------------------------- */

/** What a part reads from the root. Exported with `useVideoPreview`, so a caller can
 *  draw a part of their own, a frame counter or a jump to the end, from the same
 *  numbers the shipped parts use. */
export interface VideoPreviewState {
  /** Seconds into the clip. `0` until it has been played or sought. */
  currentTime: number;
  /** Seconds of clip. `0` until the length is known. */
  duration: number;
  /** `0:02.4` from seconds. Not a prop, and the note under Clock says why. */
  formatTime: (seconds: number) => string;
  isPlaying: boolean;
  /** Where the playhead is, 0 to 1. `0` while the length is unknown. */
  progress: number;
  /** Move the playhead. Seconds, clamped to the clip. */
  seek: (time: number) => void;
  /** Play, or pause. */
  toggle: () => void;
}

interface VideoPreviewInternals extends VideoPreviewState {
  /** Width over height of the picture, `16 / 9` until it is known. The strip cuts its
   *  frames to this so each one is a whole picture, not a slice of one. */
  aspect: number;
  media: RefObject<HTMLVideoElement | null>;
  onAspect: (aspect: number) => void;
  onDuration: (duration: number) => void;
  onPlayingChange: (isPlaying: boolean) => void;
  onTime: (time: number) => void;
  src: string;
}

export interface VideoPreviewProps extends ComponentProps<"div"> {
  children: ReactNode;
  src: string;
}

export interface VideoPreviewScreenProps extends Omit<
  ComponentProps<"video">,
  "children" | "className" | "src"
> {
  /** Drawn over the picture, in the frame. A play overlay, a badge, a caption. */
  children?: ReactNode;
  /** Sizes and shapes the frame the picture sits in. Everything else is the video's. */
  className?: string;
}

export type VideoPreviewPlayOverlayProps = Omit<
  ComponentProps<"button">,
  "children"
>;

export interface VideoPreviewFilmstripProps extends ComponentProps<"div"> {
  /** Names the seek strip for a screen reader. */
  label?: string;
}

export interface VideoPreviewPlayButtonProps {
  className?: string;
  /** Names the button once it is playing. */
  pauseLabel?: string;
  /** Names the button at rest. */
  playLabel?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
}

export type VideoPreviewTimeProps = ComponentProps<"span">;

/* -- The clock -----------------------------------------------------------------
 * `m:ss.d`, and not a prop. A clip is seconds long, so a clock that ticks once a second
 * would sit still for most of a drag; tenths are what let the readout follow a finger.
 * A caller who wants frames, or a countdown, has `currentTime` and `duration` from the
 * hook and draws their own.
 *
 * Named for the reading rather than for the API, because the context key is what parts
 * destructure and a module-level `formatTime` would be shadowed by every one of them.
 * --------------------------------------------------------------------------- */
const clockTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00.0";
  }

  const tenths = Math.floor(seconds * 10);
  const whole = Math.floor(tenths / 10);
  const minutes = Math.floor(whole / 60);

  return `${minutes}:${String(whole % 60).padStart(2, "0")}.${tenths % 10}`;
};

const VideoPreviewContext = createContext<VideoPreviewInternals | null>(null);

const useInternals = () => {
  const context = useContext(VideoPreviewContext);
  if (!context) {
    throw new Error("Video preview parts must be used within a VideoPreview.");
  }

  return context;
};

export const useVideoPreview = (): VideoPreviewState => {
  const {
    currentTime,
    duration,
    formatTime,
    isPlaying,
    progress,
    seek,
    toggle,
  } = useInternals();

  return {
    currentTime,
    duration,
    formatTime,
    isPlaying,
    progress,
    seek,
    toggle,
  };
};

/** How far an arrow key moves the playhead, and how far with Shift held. A clip is
 *  seconds long, so one second is a step and five is a leap. */
const STEP = 1;
const COARSE_STEP = 5;

/**
 * The root: it owns the clock and everything the parts read from it, and draws only the
 * column they stack in. The `<video>` element is the screen's, so a caller who leaves
 * the screen out has a strip with nothing to seek.
 */
export const VideoPreview = ({
  children,
  className,
  src,
  ...props
}: VideoPreviewProps) => {
  const media = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [aspect, setAspect] = useState(16 / 9);

  // The element reports its time four times a second, which moves a playhead in steps
  // you can count. While it plays, the clock is read every frame instead.
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    let frame = 0;
    const tick = () => {
      if (media.current) {
        setCurrentTime(media.current.currentTime);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [isPlaying]);

  const seek = useCallback(
    (time: number) => {
      const element = media.current;
      if (!(element && duration > 0)) {
        return;
      }

      const next = Math.min(duration, Math.max(0, time));
      // Written to the element and to the state together: the element is the truth, but
      // a playhead that lags the finger moving it is the one thing a seek surface
      // cannot do.
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

  const state = useMemo<VideoPreviewInternals>(
    () => ({
      aspect,
      currentTime,
      duration,
      formatTime: clockTime,
      isPlaying,
      media,
      onAspect: setAspect,
      onDuration: setDuration,
      onPlayingChange: setIsPlaying,
      onTime: setCurrentTime,
      progress: duration > 0 ? Math.min(1, currentTime / duration) : 0,
      seek,
      src,
      toggle,
    }),
    [aspect, currentTime, duration, isPlaying, seek, src, toggle]
  );

  return (
    <VideoPreviewContext.Provider value={state}>
      <div
        {...props}
        className={cn("flex flex-col gap-3", className)}
        data-slot="video-preview"
      >
        {children}
      </div>
    </VideoPreviewContext.Provider>
  );
};

/**
 * The picture, in a frame of its own. A press on it plays and pauses, the one gesture
 * every video already teaches. The browser's own controls are never drawn: the play
 * button and the strip are the controls, and a second set would be the same thing twice.
 *
 * `children` are drawn over the picture, which is where a play overlay goes. The frame
 * is the screen's, so `className` sizes that; everything else a `<video>` takes is
 * passed to the video, `muted` and `poster` among them. It loops, because a clip that
 * ends on its last frame leaves the preview showing one still; pass `loop={false}` to
 * stop it there.
 */
export const VideoPreviewScreen = ({
  children,
  className,
  onClick,
  ...props
}: VideoPreviewScreenProps) => {
  const { media, onAspect, onDuration, onPlayingChange, onTime, src, toggle } =
    useInternals();

  const readMetadata = useCallback(
    (element: HTMLVideoElement) => {
      // A stream reports an infinite length. `0` is the same "no length to seek to"
      // the strip and the clock already read as unknown.
      onDuration(Number.isFinite(element.duration) ? element.duration : 0);
      if (element.videoHeight > 0) {
        onAspect(element.videoWidth / element.videoHeight);
      }
    },
    [onAspect, onDuration]
  );

  // The element is in the server's HTML, so the browser starts reading the clip before
  // React is there to hear it, and `durationchange` can have come and gone by the time a
  // handler exists. Without this the clock reads `0:00.0` for the life of the page.
  useEffect(() => {
    const element = media.current;
    if (element && element.readyState >= HTMLMediaElement.HAVE_METADATA) {
      readMetadata(element);
    }
  }, [media, readMetadata]);

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-xl bg-muted",
        className
      )}
      data-slot="video-preview-screen"
    >
      {/* The picture is the content here, and its captions do not exist until somebody
          writes them. */}
      {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        loop
        playsInline
        preload="metadata"
        {...props}
        className="size-full cursor-pointer object-cover"
        onClick={(event) => {
          onClick?.(event);
          toggle();
        }}
        onDurationChange={(event) => readMetadata(event.currentTarget)}
        onEnded={() => onPlayingChange(false)}
        onLoadedMetadata={(event) => readMetadata(event.currentTarget)}
        onPause={() => onPlayingChange(false)}
        onPlay={() => onPlayingChange(true)}
        onSeeked={(event) => onTime(event.currentTarget.currentTime)}
        onTimeUpdate={(event) => {
          // A seek in flight still reports the position it is leaving, which would drag
          // the playhead back under the pointer that just moved it.
          if (event.currentTarget.seeking) {
            return;
          }
          onTime(event.currentTarget.currentTime);
        }}
        ref={media}
        src={src}
      />
      {children}
    </div>
  );
};

/**
 * Play and pause, drawn on the picture: one button the size of the screen, with a round
 * mark in the middle while the clip is stopped.
 *
 * It is a real button, so the keyboard reaches it and a screen reader hears it; a press
 * on the bare video does the same for a pointer, and this is what catches it first. While
 * the clip plays the mark steps out of the way, and comes back as a pause on hover or
 * focus, so the picture is not under a glyph while it is being watched.
 *
 * The mark is a literal scrim, not a token. What it is measured against is the clip, not
 * the theme, and no theme colour is legible on every frame of every video.
 */
export const VideoPreviewPlayOverlay = ({
  className,
  ...props
}: VideoPreviewPlayOverlayProps) => {
  const { isPlaying, toggle } = useInternals();

  return (
    <button
      aria-label={isPlaying ? "Pause" : "Play"}
      type="button"
      {...props}
      className={cn(
        "group/overlay absolute inset-0 flex cursor-pointer items-center justify-center outline-none",
        className
      )}
      data-slot="video-preview-play-overlay"
      onClick={toggle}
    >
      <span
        className={cn(
          "flex size-14 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-opacity duration-150 group-focus-visible/overlay:opacity-100 group-focus-visible/overlay:ring-2 group-focus-visible/overlay:ring-ring group-hover/overlay:opacity-100 motion-reduce:transition-none",
          isPlaying && "opacity-0"
        )}
      >
        {isPlaying ? (
          <Pause className="size-6 fill-current" strokeWidth={0} />
        ) : (
          <Play
            className="size-6 translate-x-0.5 fill-current"
            strokeWidth={0}
          />
        )}
      </span>
    </button>
  );
};

/** Frames are drawn this tall, in pixels of the page. The strip's height is this, and the
 *  count that fits across it follows from the picture's aspect. */
const FRAME_HEIGHT = 56;
/** Drawn at twice the height they are shown at, so a screen with a pixel ratio of two
 *  does not get a soft strip. */
const FRAME_SCALE = 2;

interface FramesProps {
  aspect: number;
  count: number;
  src: string;
}

/**
 * The pictures. A second, unseen `<video>` is sought to the middle of each slice of the
 * clip and drawn into a canvas, in order, so the strip fills in from the left.
 *
 * Drawn and never read back: a canvas that has only been drawn into does not care whose
 * origin the video came from, so a clip on another host needs no header for its strip.
 *
 * Memoised, because the playhead moves sixty times a second and none of this should
 * hear about it.
 */
const Frames = memo(({ aspect, count, src }: FramesProps) => {
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    const probe = document.createElement("video");
    probe.muted = true;
    probe.preload = "auto";

    let index = 0;
    const seekToNext = () => {
      probe.currentTime = ((index + 0.5) / count) * probe.duration;
    };

    // One probe, one seek at a time: each `seeked` is the frame for the slice just asked
    // for, and the next ask follows it. A clip that cannot be loaded or sought raises no
    // `seeked`, so the strip stays as empty as it was.
    const handleMetadata = () => {
      if (Number.isFinite(probe.duration) && count > 0) {
        seekToNext();
      }
    };
    const handleSeeked = () => {
      const canvas = canvases.current[index];
      canvas
        ?.getContext("2d")
        ?.drawImage(probe, 0, 0, canvas.width, canvas.height);
      index += 1;
      if (index < count) {
        seekToNext();
      }
    };
    probe.addEventListener("loadedmetadata", handleMetadata);
    probe.addEventListener("seeked", handleSeeked);
    probe.src = src;

    const slots = canvases.current;

    return () => {
      probe.removeEventListener("loadedmetadata", handleMetadata);
      probe.removeEventListener("seeked", handleSeeked);
      probe.removeAttribute("src");
      probe.load();
      // A strip for another clip, or for a different count, starts from empty rather
      // than from the last clip's frames.
      for (const canvas of slots) {
        canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [count, src]);

  return Array.from({ length: count }, (_, index) => (
    <canvas
      aria-hidden="true"
      className="h-full min-w-0 flex-1 object-cover"
      height={FRAME_HEIGHT * FRAME_SCALE}
      // Position is the whole identity of a frame: they are one series in time order,
      // and an index is the only key that survives the count changing with the width.
      key={index}
      ref={(element) => {
        canvases.current[index] = element;
      }}
      width={Math.round(FRAME_HEIGHT * FRAME_SCALE * aspect)}
    />
  ));
});

/**
 * The strip: the clip as a row of frames, the playhead, and the surface that seeks.
 *
 * It is one element rather than a picture with a slider laid over it. The frames already
 * say where in the clip every moment is, so a separate handle would be a second reading
 * of the same axis, and the one the eye is not on.
 *
 * The count of frames follows the width, so each is a whole picture of the clip's own
 * shape; a wider strip gets more frames, not wider ones. Before they are drawn the strip
 * is an empty bordered track and still seeks: the frames are a reading of a control that
 * works without them.
 *
 * `children` are drawn on the axis, over the frames and under no one's pointer. The
 * readout goes here when the strip is the only control row there is.
 */
export const VideoPreviewFilmstrip = ({
  children,
  className,
  label = "Seek",
  ...props
}: VideoPreviewFilmstripProps) => {
  const { aspect, currentTime, duration, formatTime, progress, seek, src } =
    useInternals();
  const strip = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = strip.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width)
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const count =
    width > 0 ? Math.max(1, Math.round(width / (FRAME_HEIGHT * aspect))) : 0;
  const seekable = duration > 0;

  const timeAt = (clientX: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0) {
      return 0;
    }

    return (
      Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * duration
    );
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!seekable) {
      return;
    }
    // Captured, so a drag that leaves the strip keeps seeking, and released by the
    // browser on pointer up, which is why nothing here releases it by hand.
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
    seek(timeAt(event.clientX, event.currentTarget));
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging.current) {
      seek(timeAt(event.clientX, event.currentTarget));
    }
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

  return (
    <div
      {...props}
      aria-label={label}
      // Zero until the length lands, which is what "no clip to seek through yet" reads
      // as. A role that appeared once metadata arrived would make the element change
      // what it is a few hundred milliseconds after it is drawn.
      aria-valuemax={Math.round(duration)}
      aria-valuemin={0}
      aria-valuenow={Math.round(currentTime)}
      aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
      className={cn(
        "relative cursor-ew-resize touch-none select-none overflow-hidden rounded-lg border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      data-slot="video-preview-filmstrip"
      onKeyDown={handleKeyDown}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={strip}
      // A native range input cannot be a row of frames that also takes a drag.
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="slider"
      style={{ height: FRAME_HEIGHT, ...props.style }}
      tabIndex={0}
    >
      <div className="flex size-full">
        {count > 0 ? <Frames aspect={aspect} count={count} src={src} /> : null}
      </div>
      {/* The part of the clip not yet reached. Dimmed with the page's own colour, so it
          recedes on a light page and on a dark one. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 bg-background/60"
        style={{ width: `${(1 - progress) * 100}%` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-primary"
        style={{ left: `${progress * 100}%` }}
      />
      {/* Whatever the caller puts on the axis, laid over the frames. It never takes a
          press: the strip underneath is the surface that seeks. */}
      {children ? (
        <div className="pointer-events-none absolute inset-0">{children}</div>
      ) : null}
    </div>
  );
};

/** Play, or pause. `secondary` by default so it reads as a control rather than as the
 *  page's one action. */
export const VideoPreviewPlayButton = ({
  className,
  pauseLabel = "Pause",
  playLabel = "Play",
  size = "icon",
  variant = "secondary",
}: VideoPreviewPlayButtonProps) => {
  const { isPlaying, toggle } = useInternals();

  return (
    <Button
      aria-label={isPlaying ? pauseLabel : playLabel}
      className={cn("shrink-0 rounded-full", className)}
      data-slot="video-preview-play"
      onClick={toggle}
      size={size}
      type="button"
      variant={variant}
    >
      {isPlaying ? (
        <Pause className="size-4 fill-current" strokeWidth={0} />
      ) : (
        // Lucide's triangle carries its mass left of its bounding box, so a button that
        // centres the box reads as pushed left. The pause bars are symmetric and get no
        // shift.
        <Play className="size-4 translate-x-px fill-current" strokeWidth={0} />
      )}
    </Button>
  );
};

/** Where the playhead is, out of how long the clip runs. */
export const VideoPreviewTime = ({
  className,
  ...props
}: VideoPreviewTimeProps) => {
  const { currentTime, duration, formatTime } = useInternals();

  return (
    <span
      {...props}
      className={cn(
        "shrink-0 text-muted-foreground text-xs tabular-nums",
        className
      )}
      data-slot="video-preview-time"
    >
      {formatTime(currentTime)} / {formatTime(duration)}
    </span>
  );
};
