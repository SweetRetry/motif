"use client";

/**
 * The site's copy of the toolbar, at the path the registry publishes it to. Consumers get the
 * file at `@/components/ui/motif/toolbar`, and the generation canvas imports it from there,
 * so this is only here to keep that one path resolvable without keeping a second copy of
 * the source.
 */
export {
  Toolbar,
  ToolbarItem,
  ToolbarSeparator,
} from "@/registry/new-york/toolbar";
export type {
  ToolbarItemProps,
  ToolbarProps,
  ToolbarSeparatorProps,
} from "@/registry/new-york/toolbar";
