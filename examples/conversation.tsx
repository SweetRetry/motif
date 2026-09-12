"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/registry/new-york/conversation";
import { Message, MessageContent } from "@/registry/new-york/message";

interface Turn {
  from: "assistant" | "user";
  id: number;
  text: string;
}

/** Long enough to overflow the window below, so the scroll button has something to
 *  appear for the moment the reader scrolls up. */
const SEED: Turn[] = [
  {
    from: "user",
    id: 1,
    text: "Why does the thread stop following the moment I scroll up?",
  },
  {
    from: "assistant",
    id: 2,
    text: "Because the reader's position is a statement of intent. Pinning a region to its newest line is only right while they are already at the bottom; the second they move, the text they are reading is the thing that must not move.",
  },
  {
    from: "user",
    id: 3,
    text: "And how does it know I am at the bottom?",
  },
  {
    from: "assistant",
    id: 4,
    text: "It reads the distance from the bottom of the scroll box on every scroll frame, with about a line of slack for sub-pixel rounding. Anything past that and the region lets go.",
  },
  {
    from: "assistant",
    id: 5,
    text: "The follow itself never goes through React. A pin is a scrollTop assignment on the frame after a mutation, which is what keeps a streamed answer from diffing the whole thread to move one number.",
  },
];

const REPLIES = [
  "Scroll back to the end and the region picks the thread up again.",
  "New turns land at the bottom whether or not anyone is following them.",
  "The button is only drawn while it has somewhere to take you.",
];

export const ConversationDemo = () => {
  const [turns, setTurns] = useState<Turn[]>(SEED);
  const [count, setCount] = useState(0);

  const append = () => {
    const id = (SEED.at(-1)?.id ?? 0) + count + 1;
    setTurns((current) => [
      ...current,
      { from: "user", id, text: "Show me." },
      {
        from: "assistant",
        id: id + 0.5,
        text: REPLIES[count % REPLIES.length],
      },
    ]);
    setCount((current) => current + 1);
  };

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <Conversation className="h-96 rounded-xl border border-border">
        <ConversationContent className="gap-5 px-4 pt-5 pb-14">
          {turns.map((turn) => (
            <Message from={turn.from} key={turn.id}>
              <MessageContent>{turn.text}</MessageContent>
            </Message>
          ))}
        </ConversationContent>

        <ConversationScrollButton />
      </Conversation>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Scroll up and the way back appears; scroll to the end and it goes.
        </p>
        <Button onClick={append} size="sm" type="button" variant="outline">
          Append a turn
        </Button>
      </div>
    </div>
  );
};
