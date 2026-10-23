"use client";

/**
 * The site's copy of the video preview, at the path the registry publishes it to. Consumers get the
 * file at `@/components/ui/motif/video-preview`, and the generation canvas imports it from there,
 * so this is only here to keep that one path resolvable without keeping a second copy of
 * the source.
 */
export {
  useVideoPreview,
  VideoPreview,
  VideoPreviewFilmstrip,
  VideoPreviewPlayButton,
  VideoPreviewPlayOverlay,
  VideoPreviewScreen,
  VideoPreviewTime,
} from "@/registry/new-york/video-preview";
export type {
  VideoPreviewFilmstripProps,
  VideoPreviewPlayButtonProps,
  VideoPreviewPlayOverlayProps,
  VideoPreviewProps,
  VideoPreviewScreenProps,
  VideoPreviewState,
  VideoPreviewTimeProps,
} from "@/registry/new-york/video-preview";
