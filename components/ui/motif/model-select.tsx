"use client";

/**
 * The site's copy of the model select, at the path the registry publishes it to.
 * Consumers get the files at `@/components/ui/motif/model-select`; the canvas imports
 * them from there, so this is only here to keep that one path resolvable without keeping
 * a second copy of the source.
 */
export {
  ModelSelect,
  ModelSelectContent,
  ModelSelectIndex,
  ModelSelectItem,
  ModelSelectList,
  ModelSelectSearch,
  ModelSelectSection,
  ModelSelectTrigger,
  ProviderGlyph,
  useModelSelect,
} from "@/registry/new-york/model-select";
export type {
  ModelSelectContentProps,
  ModelSelectItemProps,
  ModelSelectModel,
  ModelSelectProps,
  ModelSelectProvider,
  ModelSelectSectionData,
  ModelSelectSectionProps,
  ModelSelectState,
  ModelSelectTriggerProps,
} from "@/registry/new-york/model-select";
