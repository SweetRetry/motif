"use client";

/**
 * The site's copy of the attachment chip, at the path the registry publishes it to.
 * Consumers get the file at `@/components/ui/attachment`, and the composer imports it
 * from there, so this is only here to keep that one path resolvable without keeping a
 * second copy of the source.
 */
export { Attachment } from "@/registry/new-york/attachment";
export type {
  AttachmentProps,
  AttachmentStatus,
} from "@/registry/new-york/attachment";
