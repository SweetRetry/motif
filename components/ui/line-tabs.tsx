"use client";

/**
 * The site's copy of the line tabs, at the path the registry publishes them to.
 * Consumers get the file at `@/components/ui/line-tabs`, and the skill panel imports it
 * from there, so this is only here to keep that one path resolvable without keeping a
 * second copy of the source.
 */
export {
  LineTabs,
  LineTabsContent,
  LineTabsList,
  LineTabsTrigger,
} from "@/registry/new-york/line-tabs";
