"use client";

import {
  VideoPreview,
  VideoPreviewFilmstrip,
  VideoPreviewPlayOverlay,
  VideoPreviewScreen,
  VideoPreviewTime,
} from "@/registry/new-york/video-preview";

const CLIP = "/video-preview-demo.mp4";

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
