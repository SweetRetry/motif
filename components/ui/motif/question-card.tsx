"use client";

/**
 * The site's copy of the question card, at the path the registry publishes it to.
 * Consumers get the files at `@/components/ui/motif/question-card`; this keeps that one
 * path resolvable without keeping a second copy of the source.
 */
export { QuestionCard } from "@/registry/new-york/agents/question-card";
export type {
  QuestionCardProps,
  QuestionCardStatus,
} from "@/registry/new-york/agents/question-card";
