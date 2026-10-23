"use client";

import { useState } from "react";

import type {
  QuestionCardAnswers,
  QuestionCardQuestion,
  QuestionCardStatus,
} from "@/registry/new-york/agents/question-card";
import { QuestionCard } from "@/registry/new-york/agents/question-card";

const QUESTIONS: QuestionCardQuestion[] = [
  {
    customPlaceholder: "Describe another scope…",
    id: "scope",
    options: [
      { label: "A focused starter set", value: "focused" },
      { label: "A broader collection", value: "broad" },
      { label: "One flagship experience", value: "flagship" },
    ],
    title: "How focused should the first release be?",
  },
  {
    id: "review",
    options: [
      { label: "A single maintainer", value: "maintainer" },
      { label: "Two reviewers", value: "pair" },
      { label: "Anyone on the team", value: "team" },
    ],
    title: "Who signs off before anything ships?",
  },
  {
    id: "signals",
    options: [
      { label: "Tests and type checks", value: "tests" },
      { label: "Usage in a real app", value: "usage" },
      { label: "Docs and examples", value: "docs" },
    ],
    title: "Which signal should gate the release?",
  },
];

export const QuestionCardDemo = () => {
  const [answers, setAnswers] = useState<QuestionCardAnswers>({});
  const [status, setStatus] = useState<QuestionCardStatus>("pending");

  return (
    <div className="w-full max-w-md">
      <QuestionCard
        questions={QUESTIONS}
        status={status}
        answers={answers}
        onAnswersChange={setAnswers}
        onSubmit={() => setStatus("answered")}
        onDismiss={() => {
          setAnswers({});
          setStatus("pending");
        }}
        result="Thanks — the plan was recorded."
      />
    </div>
  );
};
