"use client";

/**
 * The site's copy of the provider marks, at the path the registry publishes them to.
 * Consumers get the file at `@/components/ui/motif/provider-logo`; other registry sources import
 * it from there, so this is only here to keep that one path resolvable without keeping a
 * second copy of the source.
 */
export {
  PROVIDER_NAMES,
  ProviderLogo,
} from "@/registry/new-york/provider-logo";
export type {
  ProviderId,
  ProviderLogoProps,
} from "@/registry/new-york/provider-logo";
