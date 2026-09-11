"use client";

import { useReducedMotion } from "motion/react";
import { useCallback, useMemo, useRef } from "react";

import {
  useMessageFocus,
  useScrollProgress,
} from "@/lib/hooks/use-scroll-focus";
import { ScrollRail, ScrollRailPreview } from "@/registry/new-york/scroll-rail";

const TRANSCRIPT = [
  {
    answer:
      "Both measure the same session, but they answer different questions. Metrics are the timeline: frames, long tasks, layout shifts. Logs are the narration: what the code decided and why.",
    id: "metrics",
    question: "Are Metrics better than Logs here?",
  },
  {
    answer:
      "For continuous collection and watching the shape of performance over a release, metrics win — they are cheap, uniform and comparable. Digging into one user's jank is where logs win.",
    id: "purpose",
    question: "Which one do I pick for ongoing collection?",
  },
  {
    answer:
      "Yes. A counter per frame is a few bytes; a log line is a thousand times that, and the interesting ones are rare. Sampling the long frames keeps the cost flat.",
    id: "sampling",
    question: "Can I keep the sample rate low?",
  },
  {
    answer:
      "Emit a metric per dropped frame, then attach the last N trace summaries to the payload when the frame is slow enough to be worth explaining.",
    id: "payload",
    question: "So should every frame carry a trace id?",
  },
  {
    answer:
      "Ninety-fifth percentile of frame time, plus a count of frames over 50ms. Averages hide the jank you are looking for.",
    id: "summary",
    question: "What goes in the dashboard?",
  },
  {
    answer:
      "Keep both, but never make the logs the source of truth — they are for explaining a number that already moved, not for producing it.",
    id: "truth",
    question: "Do I still need logs at all?",
  },
  {
    answer:
      "Group by route and by device class. The interesting failures are concentrated in one of the two, and the aggregate flattens them into noise.",
    id: "dimensions",
    question: "How should I break them down?",
  },
  {
    answer:
      "Percentiles from a histogram, computed on the client at flush time. Shipping raw samples off the device is the expensive part.",
    id: "histogram",
    question: "Where do percentiles get computed?",
  },
  {
    answer:
      "Alert on the count of slow frames in a window, not on the percentile. A count is stable enough to page on, and a percentile moves with the traffic mix.",
    id: "alerts",
    question: "What should alert?",
  },
  {
    answer:
      "Retain the metrics for a release cycle and the logs for a week. Both are dirty after that: routes come and go, and the log format drifts.",
    id: "retention",
    question: "How long do we keep them?",
  },
  {
    answer:
      "Start with frame time and dropped frames. Add memory only once you have a page that fails with it, otherwise it is a number nobody trusts.",
    id: "start",
    question: "Where do I start?",
  },
];

const SECTIONS = [
  {
    answer:
      "The rail reads the scroll container, not the page: one tick per message, and the reading line sits at the centre of the viewport. Hover a tick to preview the turn, click to jump to it.",
    id: "reading-line",
    question: "Metrics beat logs for ongoing collection",
  },
  {
    answer: "Logs stay for the why. Metrics answer what and how often.",
    id: "logs",
    question: "Logs still explain a single bad session",
  },
  {
    answer: "A counter per frame costs a few bytes.",
    id: "cost",
    question: "Sampling keeps the cost flat",
  },
  {
    answer: "Counts are stable enough to page on.",
    id: "alerts",
    question: "Alert on the count, not the percentile",
  },
  {
    answer: "Frame time and dropped frames first.",
    id: "start",
    question: "Start with two numbers",
  },
  {
    answer: "Percentiles come from a client-side histogram.",
    id: "histogram",
    question: "Compute percentiles on the device",
  },
  {
    answer: "A release cycle for metrics, a week for logs.",
    id: "retention",
    question: "Retention follows the release cycle",
  },
  {
    answer: "Group by route and device class.",
    id: "dimensions",
    question: "Two dimensions are enough",
  },
];

const MESSAGE_CLASS = "space-y-1";

export const ScrollRailDemo = () => {
  const scroller = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLElement | null)[]>([]);
  const focus = useMessageFocus(scroller, nodes);
  const reduce = useReducedMotion() ?? false;

  const scrollTo = useCallback(
    (index: number) => {
      nodes.current[index]?.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "center",
      });
    },
    [reduce]
  );

  const items = useMemo(
    () =>
      TRANSCRIPT.map((message) => ({
        id: message.id,
        label: message.question,
        preview: (
          <ScrollRailPreview title={message.question}>
            {message.answer}
          </ScrollRailPreview>
        ),
      })),
    []
  );

  return (
    <div className="bg-card flex w-full max-w-xl gap-4 rounded-xl border p-4">
      <ScrollRail
        className="py-1"
        focus={focus}
        items={items}
        label="Transcript"
        onSelect={scrollTo}
      />
      <div
        className="h-72 min-w-0 flex-1 space-y-5 overflow-y-auto"
        ref={scroller}
      >
        {TRANSCRIPT.map((message, index) => (
          <article
            className={MESSAGE_CLASS}
            key={message.id}
            ref={(node) => {
              nodes.current[index] = node;
            }}
          >
            <p className="text-sm font-medium">{message.question}</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {message.answer}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
};

/** The other focus mode: no item measurement, just how far through the document the
 *  reader is. */
export const ScrollRailProgressDemo = () => {
  const scroller = useRef<HTMLDivElement>(null);
  const focus = useScrollProgress(scroller, { count: SECTIONS.length });

  const items = useMemo(
    () =>
      SECTIONS.map((section) => ({ id: section.id, label: section.question })),
    []
  );

  return (
    <div className="bg-card flex w-full max-w-xl gap-4 rounded-xl border p-4">
      <div
        className="h-72 min-w-0 flex-1 space-y-6 overflow-y-auto"
        ref={scroller}
      >
        {SECTIONS.map((section) => (
          <section className={MESSAGE_CLASS} key={section.id}>
            <p className="text-sm font-medium">{section.question}</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {section.answer}
            </p>
          </section>
        ))}
      </div>
      <ScrollRail
        className="py-1"
        focus={focus}
        items={items}
        label="Reading progress"
        side="right"
      />
    </div>
  );
};
