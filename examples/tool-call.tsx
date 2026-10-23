"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Source,
  SourceLabel,
  SourceList,
  SourceMark,
} from "@/registry/new-york/agents/source";
import {
  ToolCall,
  ToolCallContent,
  ToolCallHeader,
  ToolCallName,
  ToolCallSection,
  ToolCallStatus,
  ToolCallSummary,
} from "@/registry/new-york/agents/tool-call";
import type { ToolCallStatusValue } from "@/registry/new-york/agents/tool-call";

const INPUT = `{
  "path": "src/auth/session.ts",
  "start_line": 1,
  "end_line": 40
}`;

const RESULT = `export const createSession = (userId: string) => {
  const token = crypto.randomUUID();
  sessions.set(token, { userId, createdAt: Date.now() });
  return token;
};`;

const ERROR = "ENOENT: no such file or directory, open 'src/auth/sessions.ts'";

const SOURCES = [
  {
    href: "https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme",
    title: "color-scheme - CSS: Cascading Style Sheets | MDN",
  },
  {
    href: "https://tailwindcss.com/docs/dark-mode",
    title: "Dark mode - Core concepts - Tailwind CSS",
  },
  {
    href: "https://ui.shadcn.com/docs/theming",
    title: "Theming - shadcn/ui",
  },
];

/** A search's detail is what the search found, not what it was sent: the sources, as
 *  tags. The query is already in the row. */
const Sources = () => (
  <SourceList>
    {SOURCES.map((source) => (
      <Source href={source.href} key={source.href} title={source.title}>
        <SourceMark />
        <SourceLabel />
      </Source>
    ))}
  </SourceList>
);

const IMAGES = [
  {
    alt: "Watercolor rose, first take",
    src: "/cover-fan/watercolor-rose.webp",
  },
  { alt: "Watercolor rose, second take", src: "/cover-fan/verdant-notes.webp" },
];

/** A generation's detail is the picture. The prompt is the row's summary, so the detail
 *  does not repeat it. */
const Images = () => (
  <div className="flex flex-col gap-1.5">
    <div className="grid grid-cols-2 gap-2">
      {IMAGES.map((image) => (
        <img
          alt={image.alt}
          className="aspect-4/3 w-full rounded-md border border-border object-cover"
          key={image.src}
          src={image.src}
        />
      ))}
    </div>
    <span className="text-muted-foreground text-xs">2 images · 1024 × 768</span>
  </div>
);

/** The kinds of detail a row can hold. What the reader wants behind a call depends on
 *  what the call was: the results of a search, the picture from a generation. Raw
 *  arguments are the fallback, for a call that has nothing better to show. */
export const ToolCallDemo = () => (
  <div className="flex w-full max-w-xl flex-col gap-2">
    <ToolCall status="done" defaultOpen>
      <ToolCallHeader>
        <ToolCallStatus />
        <ToolCallName>web_search</ToolCallName>
        <ToolCallSummary>design tokens for dark mode</ToolCallSummary>
      </ToolCallHeader>
      <ToolCallContent>
        <ToolCallSection title="3 results">
          <Sources />
        </ToolCallSection>
      </ToolCallContent>
    </ToolCall>

    <ToolCall status="done" defaultOpen>
      <ToolCallHeader>
        <ToolCallStatus />
        <ToolCallName>generate_image</ToolCallName>
        <ToolCallSummary>watercolor rose, soft morning light</ToolCallSummary>
      </ToolCallHeader>
      <ToolCallContent>
        <ToolCallSection>
          <Images />
        </ToolCallSection>
      </ToolCallContent>
    </ToolCall>

    <ToolCall status="running">
      <ToolCallHeader>
        <ToolCallStatus />
        <ToolCallName>grep</ToolCallName>
        <ToolCallSummary>createSession in src/</ToolCallSummary>
      </ToolCallHeader>
    </ToolCall>

    <ToolCall status="queued">
      <ToolCallHeader>
        <ToolCallStatus />
        <ToolCallName>run_tests</ToolCallName>
        <ToolCallSummary>src/auth</ToolCallSummary>
      </ToolCallHeader>
    </ToolCall>

    <ToolCall status="failed">
      <ToolCallHeader>
        <ToolCallStatus />
        <ToolCallName>read_file</ToolCallName>
        <ToolCallSummary>src/auth/sessions.ts</ToolCallSummary>
      </ToolCallHeader>
      <ToolCallContent>
        <ToolCallSection>
          <p className="text-destructive text-xs">{ERROR}</p>
        </ToolCallSection>
      </ToolCallContent>
    </ToolCall>
  </div>
);

/** The raw end of the range: the arguments and the result as text, for a call that has
 *  nothing better to show. */
export const ToolCallRawDemo = () => (
  <div className="flex w-full max-w-xl flex-col gap-2">
    <ToolCall status="done" defaultOpen>
      <ToolCallHeader>
        <ToolCallStatus />
        <ToolCallName>read_file</ToolCallName>
        <ToolCallSummary>src/auth/session.ts</ToolCallSummary>
      </ToolCallHeader>
      <ToolCallContent>
        <ToolCallSection title="Input">{INPUT}</ToolCallSection>
        <ToolCallSection title="Result">{RESULT}</ToolCallSection>
      </ToolCallContent>
    </ToolCall>
  </div>
);

const LIFECYCLE: ToolCallStatusValue[] = ["queued", "running", "done"];
const STEP_MS = 1400;

/** One call walked through its life. The row is the same row throughout: the status
 *  changes in place, and the detail only exists once there is a result to show. */
export const ToolCallLifecycleDemo = () => {
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    setStep(0);
  }, [run]);

  useEffect(() => {
    if (step >= LIFECYCLE.length - 1) {
      return;
    }

    const timer = window.setTimeout(() => setStep(step + 1), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [run, step]);

  const status = LIFECYCLE[step];

  return (
    <div className="flex w-full max-w-xl flex-col items-start gap-4">
      <ToolCall className="w-full" status={status}>
        <ToolCallHeader>
          <ToolCallStatus />
          <ToolCallName>web_search</ToolCallName>
          <ToolCallSummary>design tokens for dark mode</ToolCallSummary>
        </ToolCallHeader>
        {status === "done" ? (
          <ToolCallContent>
            <ToolCallSection title="3 results">
              <Sources />
            </ToolCallSection>
          </ToolCallContent>
        ) : null}
      </ToolCall>
      <Button
        onClick={() => setRun((current) => current + 1)}
        size="sm"
        variant="outline"
      >
        Replay
      </Button>
    </div>
  );
};
