"use client";

/**
 * The site's copy of the composer, at the path the registry publishes it to. Consumers
 * get the files at `@/components/agents/prompt-input`; the chat block imports them from
 * there, so this is only here to keep that one path resolvable without keeping a second
 * copy of the source.
 */
export {
  ModelPicker,
  PROVIDER_NAMES,
  PromptInput,
  PromptInputAttach,
  PromptInputAttachment,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  ProviderMark,
} from "@/registry/new-york/agents/prompt-input";
export type {
  ModelPickerProps,
  PromptAttachment,
  PromptInputAttachProps,
  PromptInputButtonProps,
  PromptInputProps,
  PromptInputTextareaProps,
  PromptModel,
  ProviderId,
  ProviderMarkProps,
} from "@/registry/new-york/agents/prompt-input";
