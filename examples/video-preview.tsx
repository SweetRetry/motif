"use client";

import {
  VideoPreview,
  VideoPreviewFilmstrip,
  VideoPreviewPlayOverlay,
  VideoPreviewScreen,
  VideoPreviewTime,
} from "@/registry/new-york/video-preview";

/** A Mandelbrot zoom, six seconds, silent. `scripts/generate-video-demo.mts` is where it
 *  comes from. It is a clip whose frames differ, which is the only kind a filmstrip has
 *  anything to say about. */
const CLIP = "/video-preview-demo.mp4";

/** The parts, stacked the way a result is usually shown: the picture with its play mark on
 *  it, and the whole clip under it with the readout on the axis. Two things, and no row of
 *  controls under them. There is no frame around either: the preview stage is already the
 *  surface, and a card inside it would hold two things that are each already their own
 *  shape.
 *
 *  The readout is a scrim like the play mark's, for the same reason: what it sits on is
 *  the clip. */
export const VideoPreviewDemo = () => (
  <VideoPreview className="w-full max-w-2xl" src={CLIP}>
    <VideoPreviewScreen>
      <VideoPreviewPlayOverlay />
    </VideoPreviewScreen>
    <VideoPreviewFilmstrip label="Seek take 3">
      <VideoPreviewTime className="absolute right-1.5 bottom-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-white" />
    </VideoPreviewFilmstrip>
  </VideoPreview>
);
