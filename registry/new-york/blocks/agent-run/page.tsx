"use client";

import { Button } from "@/components/ui/button";
import { AgentRun } from "@/components/ui/motif/agent-run";
import { useDemoRun } from "@/components/ui/motif/use-demo-run";

/* -- The page ------------------------------------------------------------------
 * The whole run in one screen: the thread fills the window, the composer is anchored
 * to the bottom, and the only state above the surface is the thread itself. The
 * transport is the demo one — swap the hook and the page is a real agent.
 * --------------------------------------------------------------------------- */

const SUGGESTIONS = [
  "Make the thread follow its tail while I read the newest turn.",
  "Move the polling transport over to streaming.",
  "Find where the thinking block jumps the scroll and stop it.",
];

const Empty = ({ onPick }: { onPick: (prompt: string) => void }) => (
  <div className="flex flex-col items-center gap-6 text-center">
    <div className="flex flex-col gap-1.5">
      <p className="font-medium">What should the agent do?</p>
      <p className="text-sm text-muted-foreground">
        Describe a task, drop in a file, or start from one of these.
      </p>
    </div>

    <div className="flex w-full flex-col gap-2">
      {SUGGESTIONS.map((prompt) => (
        <Button
          className="h-auto justify-start rounded-xl px-3.5 py-2.5 text-left font-normal"
          key={prompt}
          onClick={() => onPick(prompt)}
          type="button"
          variant="outline"
        >
          {prompt}
        </Button>
      ))}
    </div>
  </div>
);

export default function AgentRunPage() {
  const run = useDemoRun();

  return (
    <div className="h-dvh">
      <AgentRun {...run} empty={<Empty onPick={run.onSend} />} title="Agent" />
    </div>
  );
}
