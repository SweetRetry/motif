"use client";

/**
 * The site's copy of the aspect ratio picker, at the path the registry publishes it to. Consumers get the
 * file at `@/components/ui/motif/ratio-picker`, and the generation canvas imports it from there,
 * so this is only here to keep that one path resolvable without keeping a second copy of
 * the source.
 */
export { RatioIcon, RatioPicker } from "@/registry/new-york/ratio-picker";
export type {
  RatioIconProps,
  RatioPickerProps,
} from "@/registry/new-york/ratio-picker";
