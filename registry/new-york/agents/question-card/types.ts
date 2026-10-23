import type { ReactNode } from "react";

export type QuestionCardStatus = "pending" | "submitting" | "answered";

export interface QuestionCardOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface QuestionCardQuestion {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  options?: QuestionCardOption[];
  autoAdvance?: boolean;
  customPlaceholder?: string;
}

export interface QuestionCardAnswer {
  selected: string[];
  custom?: string;
}

export type QuestionCardAnswers = Record<string, QuestionCardAnswer>;

export interface QuestionCardProps {
  questions: QuestionCardQuestion[];
  status?: QuestionCardStatus;
  answers?: QuestionCardAnswers;
  defaultAnswers?: QuestionCardAnswers;
  onAnswersChange?: (answers: QuestionCardAnswers) => void;
  step?: number;
  defaultStep?: number;
  onStepChange?: (step: number) => void;
  onSubmit?: (answers: QuestionCardAnswers) => void;
  onDismiss?: () => void;
  submitLabel?: ReactNode;
  continueLabel?: ReactNode;
  skipLabel?: ReactNode;
  result?: ReactNode;
  className?: string;
}
