"use client";

/**
 * The site's copy of the run transport, at the path the registry publishes it to.
 * Consumers get the files at `@/components/ui/motif/use-demo-run`; the installed page
 * imports it from there, so this is only here to keep that one path resolvable without
 * keeping a second copy of the source.
 */
export {
  DEMO_MODELS,
  useDemoRun,
} from "@/registry/new-york/blocks/agent-run/use-demo-run";
export type { DemoRun } from "@/registry/new-york/blocks/agent-run/use-demo-run";
