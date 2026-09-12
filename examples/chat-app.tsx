"use client";

import { Button } from "@/components/ui/button";
import { ChatApp } from "@/registry/new-york/blocks/chat-app/chat-app";
import type { ChatTurn } from "@/registry/new-york/blocks/chat-app/chat-app";
import { useDemoChat } from "@/registry/new-york/blocks/chat-app/use-demo-chat";

/** A thread already underway, so the preview opens on the anatomy — a reader's turn,
 *  an answer, and the reasoning it was written from. */
const SEED: ChatTurn[] = [
  {
    content: "How does the conversation frame keep up with a streaming answer?",
    from: "user",
    id: "seed-question",
  },
  {
    content:
      "The pieces already existed, so the template is mostly arrangement:\n\n- **Conversation** owns the follow: it pins to the newest turn while you are at the end, and lets go the moment you scroll away.\n- **Message** owns a turn's anatomy — the body, and the actions that appear once you are done reading.\n- **PromptInput** owns the draft, and **ThinkingBlock** owns the reasoning behind an answer.\n\nSwap the transport for a real one and nothing above it moves.",
    from: "assistant",
    id: "seed-answer",
    reasoning:
      "Starting from the question rather than from the components. A thread is a scroll region that follows its own tail, so the follow belongs to the region, not to the page that happens to render it.",
  },
];

export const ChatAppDemo = () => {
  const chat = useDemoChat(SEED);

  return (
    <div className="h-[38rem] w-full overflow-hidden rounded-xl border border-border">
      <ChatApp {...chat} title="Assistant" />
    </div>
  );
};

export const ChatAppEmptyDemo = () => {
  const chat = useDemoChat();

  return (
    <div className="h-[30rem] w-full overflow-hidden rounded-xl border border-border">
      <ChatApp
        {...chat}
        empty={
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex flex-col gap-1.5">
              <p className="font-medium">What are you working on?</p>
              <p className="text-sm text-muted-foreground">
                The empty slot is the caller's — a greeting, a fan of covers, a
                list of starting points.
              </p>
            </div>
            <Button
              onClick={() => chat.onSend("Explain the thinking block.")}
              type="button"
              variant="outline"
            >
              Explain the thinking block
            </Button>
          </div>
        }
        title="Assistant"
      />
    </div>
  );
};
