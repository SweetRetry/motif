"use client";

import { LoaderCircle, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AgentDisclosure } from "@/components/agents/agent-disclosure";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EASE_OUT, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

import type {
  ApprovalCardAnswer,
  ApprovalCardAnswers,
  ApprovalCardProps,
  ApprovalCardQuestion,
  ApprovalCardStatus,
} from "./types";

export type {
  ApprovalCardAnswer,
  ApprovalCardAnswers,
  ApprovalCardOption,
  ApprovalCardProps,
  ApprovalCardQuestion,
  ApprovalCardStatus,
} from "./types";

const EMPTY_ANSWER: ApprovalCardAnswer = { custom: "", selected: [] };

const STATUS_LABEL: Record<ApprovalCardStatus, string> = {
  answered: "Response submitted",
  approved: "Approved",
  "changes-requested": "Changes requested",
  pending: "Input required",
  rejected: "Rejected",
  submitting: "Submitting",
};

const getStatusLabel = (status: ApprovalCardStatus) => STATUS_LABEL[status];

function isAnswered(answer: ApprovalCardAnswer) {
  return answer.selected.length > 0 || Boolean(answer.custom?.trim());
}

function QuestionOptions({
  question,
  answer,
  disabled,
  onChange,
  onAutoAdvance,
}: {
  question: ApprovalCardQuestion;
  answer: ApprovalCardAnswer;
  disabled: boolean;
  onChange: (answer: ApprovalCardAnswer) => void;
  onAutoAdvance?: () => void;
}) {
  const custom = answer.custom ?? "";

  return (
    <div className="mt-3">
      {question.options?.length ? (
        <RadioGroup
          value={answer.selected[0] ?? ""}
          onValueChange={(value) => {
            onChange({ custom: "", selected: [value] });
            onAutoAdvance?.();
          }}
          className="gap-0.5"
        >
          {question.options.map((option) => {
            const optionDisabled = disabled || option.disabled;

            return (
              <label
                key={option.value}
                className={cn(
                  "flex min-h-9 items-center gap-3 rounded-lg px-1.5 py-1 text-sm",
                  optionDisabled ? "cursor-not-allowed" : "cursor-pointer"
                )}
              >
                <RadioGroupItem
                  value={option.value}
                  disabled={optionDisabled}
                />
                <span
                  className={cn("select-none", optionDisabled && "opacity-60")}
                >
                  {option.label}
                </span>
              </label>
            );
          })}
        </RadioGroup>
      ) : null}

      <Input
        value={custom}
        disabled={disabled}
        placeholder={question.customPlaceholder ?? "Add another response…"}
        onChange={(event) =>
          onChange({ custom: event.target.value, selected: [] })
        }
        className={cn("h-10 rounded-xl", question.options?.length && "mt-1.5")}
      />
    </div>
  );
}

// One bar per question — and the only step control on the left. Width carries position
// (the current bar is twice the resting width), colour carries the answer state, and
// clicking jumps. Bars are sized by their content, so hovering one grows it and pushes
// the rest of the row right instead of eating the gap to its neighbour. Widths stay real
// (never `scaleX`), so the pill caps stay round.
const BAR_REST_WIDTH = 8;
const BAR_CURRENT_WIDTH = 16;
const BAR_HOVER_WIDTH = 20;

function barTone({
  answered,
  current,
  hovered,
  skipped,
}: {
  answered: boolean;
  current: boolean;
  hovered: boolean;
  skipped: boolean;
}) {
  if (skipped) {
    return "bg-warning";
  }
  if (current) {
    return "bg-foreground";
  }
  if (hovered) {
    return answered ? "bg-foreground" : "bg-foreground/45";
  }
  return answered ? "bg-foreground/55" : "bg-foreground/20";
}

function StepBars({
  current,
  questions,
  answers,
  onSelect,
}: {
  current: number;
  questions: ApprovalCardQuestion[];
  answers: ApprovalCardAnswers;
  onSelect: (index: number) => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <span className="flex items-center gap-1.5">
      {questions.map((question, index) => {
        const answered = isAnswered(answers[question.id] ?? EMPTY_ANSWER);
        const skipped = index < current && !answered;
        const label =
          typeof question.title === "string"
            ? question.title
            : `Question ${index + 1}`;
        const width =
          hovered === question.id && !reduce
            ? BAR_HOVER_WIDTH
            : index === current
              ? BAR_CURRENT_WIDTH
              : BAR_REST_WIDTH;

        return (
          <Tooltip key={question.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`Question ${index + 1} of ${questions.length}: ${label}${
                  answered ? " (answered)" : skipped ? " (unanswered)" : ""
                }`}
                aria-current={index === current ? "step" : undefined}
                onClick={() => onSelect(index)}
                onPointerEnter={() => setHovered(question.id)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(question.id)}
                onBlur={() => setHovered(null)}
                className="flex h-4 cursor-pointer items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <motion.span
                  initial={false}
                  animate={{ width }}
                  transition={reduce ? { duration: 0 } : SPRING_SWAP}
                  className={cn(
                    "h-1 rounded-full transition-colors duration-200",
                    barTone({
                      answered,
                      current: index === current,
                      hovered: hovered === question.id && !reduce,
                      skipped,
                    })
                  )}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-none whitespace-nowrap">
              {question.title}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </span>
  );
}

export function ApprovalCard({
  title = "Approval required",
  description,
  children,
  questions = [],
  status = "pending",
  answers,
  defaultAnswers = {},
  onAnswersChange,
  step,
  defaultStep = 0,
  onStepChange,
  onSubmit,
  onApprove,
  onReject,
  onRequestChanges,
  onDismiss,
  approveLabel = "Approve",
  submitLabel = "Submit",
  continueLabel = "Continue",
  skipLabel = "Skip",
  result,
  className,
}: ApprovalCardProps) {
  const reduce = useReducedMotion() ?? false;
  const [internalAnswers, setInternalAnswers] =
    useState<ApprovalCardAnswers>(defaultAnswers);
  const [internalStep, setInternalStep] = useState(defaultStep);
  const autoAdvanceTimer = useRef<number | null>(null);
  // Which way the last step change went, so the question slides in from the side
  // the user is travelling towards. Read during render, written after paint.
  const previousStep = useRef(defaultStep);
  const currentAnswers = answers ?? internalAnswers;
  const currentStep = Math.min(
    Math.max(0, step ?? internalStep),
    Math.max(0, questions.length - 1)
  );
  const question = questions[currentStep];
  const questionMode = questions.length > 0;
  const pending = status === "pending";
  const busy = status === "submitting";
  const interactive = pending || busy;
  const currentAnswer = question
    ? (currentAnswers[question.id] ?? EMPTY_ANSWER)
    : EMPTY_ANSWER;
  const displayTitle = question?.title ?? title;
  const statusLabel = getStatusLabel(status);
  const lastStep = currentStep === questions.length - 1;
  // One read-out per question: solid = answered, amber = walked past without an
  // answer, faint = not reached yet. The counter keeps the summary warning; this is
  // what makes "which one is missing" visible without counting.
  const answeredCount = questions.filter((item) =>
    isAnswered(currentAnswers[item.id] ?? EMPTY_ANSWER)
  ).length;
  const allAnswered = answeredCount === questions.length;
  const slide =
    reduce || currentStep === previousStep.current
      ? 0
      : currentStep > previousStep.current
        ? 1
        : -1;

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimer.current === null) {
      return;
    }
    window.clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = null;
  }, []);

  useEffect(() => clearAutoAdvance, [clearAutoAdvance]);

  useEffect(() => {
    previousStep.current = currentStep;
  }, [currentStep]);

  const setAnswers = useCallback(
    (next: ApprovalCardAnswers) => {
      if (answers === undefined) {
        setInternalAnswers(next);
      }
      onAnswersChange?.(next);
    },
    [answers, onAnswersChange]
  );

  const setStep = (next: number) => {
    clearAutoAdvance();
    if (step === undefined) {
      setInternalStep(next);
    }
    onStepChange?.(next);
  };

  const updateCurrentAnswer = (next: ApprovalCardAnswer) => {
    if (!question) {
      return;
    }
    setAnswers({ ...currentAnswers, [question.id]: next });
  };

  const continueQuestion = () => {
    if (currentStep < questions.length - 1) {
      setStep(currentStep + 1);
      return;
    }
    onSubmit?.(currentAnswers);
  };

  const queueAutoAdvance = () => {
    if (
      !question ||
      question.autoAdvance === false ||
      currentStep >= questions.length - 1 ||
      busy
    ) {
      return;
    }

    clearAutoAdvance();
    autoAdvanceTimer.current = window.setTimeout(() => {
      setStep(currentStep + 1);
    }, 240);
  };

  return (
    <div
      data-state={status}
      aria-busy={busy}
      className={cn(
        "w-full overflow-hidden rounded-2xl border border-border bg-card p-4 text-sm",
        className
      )}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-start gap-3">
          <h3 className="min-w-0 flex-1 text-base font-medium leading-5 text-foreground">
            {displayTitle}
          </h3>
          {onDismiss ? (
            <button
              type="button"
              aria-label="Dismiss"
              onClick={onDismiss}
              className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <AgentDisclosure open={interactive}>
          {questionMode && question ? (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, x: 8 * slide }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
            >
              {question.description ? (
                <p className="mt-1 leading-5 text-muted-foreground">
                  {question.description}
                </p>
              ) : null}
              <QuestionOptions
                question={question}
                answer={currentAnswer}
                disabled={busy}
                onChange={updateCurrentAnswer}
                onAutoAdvance={queueAutoAdvance}
              />
            </motion.div>
          ) : (
            <div>
              {description ? (
                <p className="mt-1 leading-5 text-muted-foreground">
                  {description}
                </p>
              ) : null}
              {children ? <div className="mt-3">{children}</div> : null}
            </div>
          )}

          {questionMode ? (
            <div className="mt-4 flex items-center gap-3">
              <StepBars
                answers={currentAnswers}
                current={currentStep}
                onSelect={setStep}
                questions={questions}
              />
              <div className="ml-auto flex items-center gap-2">
                {lastStep ? null : (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => setStep(currentStep + 1)}
                    className="rounded-full"
                  >
                    {skipLabel}
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={busy || (lastStep && !allAnswered)}
                  onClick={continueQuestion}
                  className="rounded-full"
                >
                  {busy ? (
                    <LoaderCircle
                      className={cn("size-4", !reduce && "animate-spin")}
                    />
                  ) : lastStep ? (
                    submitLabel
                  ) : (
                    continueLabel
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                disabled={busy}
                onClick={onApprove}
                className="rounded-full"
              >
                {approveLabel}
              </Button>
              {onRequestChanges ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={onRequestChanges}
                  className="rounded-full"
                >
                  Request changes
                </Button>
              ) : null}
              {onReject ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={onReject}
                  className="rounded-full text-muted-foreground hover:text-destructive"
                >
                  Reject
                </Button>
              ) : null}
            </div>
          )}
        </AgentDisclosure>

        {!interactive ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {result ?? statusLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}
