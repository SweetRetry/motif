"use client";

import type { ReactNode } from "react";

import {
  AudioPreview,
  AudioPreviewPlayButton,
  AudioPreviewTime,
  AudioPreviewWaveform,
  useAudioPreview,
} from "@/registry/new-york/audio-preview";

/** Six plucked notes, three and a half seconds of them — long enough to seek around in,
 *  and shaped so the waveform has something to be a reading of. `scripts/generate-audio-demo.mts`
 *  is where it comes from. */
const CLIP = "/audio-preview-demo.m4a";

/** A label and the thing it names are one object, so they sit at the doc's tight scale —
 *  the same 6px `design/composition` draws between a field and its caption. No card
 *  around the transport: the preview frame is already the surface, and a bordered box
 *  inside a bordered stage is the nested case that section exists to rule out. */
const Take = ({ children, title }: { children: ReactNode; title: string }) => (
  <div className="flex w-full max-w-2xl flex-col gap-1.5">
    <span className="font-medium text-muted-foreground text-xs">{title}</span>
    {children}
  </div>
);

export const AudioPreviewDemo = () => (
  <Take title="Ambient bed, take 3">
    <AudioPreview src={CLIP}>
      <AudioPreviewPlayButton />
      <AudioPreviewWaveform label="Seek Ambient bed, take 3" />
      <AudioPreviewTime />
    </AudioPreview>
  </Take>
);

/** The clock, counting down instead of up. Nothing in the component does this — it is
 *  the caller reading `useAudioPreview` and drawing a fourth part, which is the whole
 *  reason the hook is exported. */
const Remaining = () => {
  const { currentTime, duration, formatTime } = useAudioPreview();

  return (
    <span className="text-muted-foreground text-xs tabular-nums">
      -{formatTime(Math.max(0, duration - currentTime))}
    </span>
  );
};

/** The same track, drawn the way a player usually is: the waveform takes the width and
 *  the transport sits under it. The parts are the same parts; only the frame is the
 *  caller's, which is what `className` on the root is for. */
export const AudioPreviewPlayerDemo = () => (
  <Take title="Ambient bed, take 4">
    <AudioPreview className="flex-col items-stretch gap-1.5" src={CLIP}>
      <AudioPreviewWaveform
        className="text-primary"
        label="Seek Ambient bed, take 4"
      />
      <div className="flex items-center justify-between">
        <AudioPreviewPlayButton variant="ghost" />
        <Remaining />
      </div>
    </AudioPreview>
  </Take>
);
