"use client";

/**
 * The site's copy of the composer, at the path the registry publishes it to. Consumers
 * get the files at `@/components/ui/motif/prompt-input`; the chat block imports them from
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
  PromptInputEditor,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTrigger,
  ProviderMark,
} from "@/registry/new-york/agents/prompt-input";
export type {
  ModelPickerProps,
  PromptAttachment,
  PromptInputAttachProps,
  PromptInputButtonProps,
  PromptInputEditorProps,
  PromptInputProps,
  PromptInputTextareaProps,
  PromptInputTriggerProps,
  PromptModel,
  PromptSegment,
  PromptTriggerItem,
  ProviderId,
  ProviderMarkProps,
} from "@/registry/new-york/agents/prompt-input";
