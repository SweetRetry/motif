"use client";

import { ChatApp } from "@/components/chat/chat-app";
import { useDemoChat } from "@/components/chat/use-demo-chat";
import { Button } from "@/components/ui/button";

/* -- The page ------------------------------------------------------------------
 * The whole app in one screen: the thread fills the window, the composer is anchored
 * to the bottom, and the only state above the surface is the thread itself. The
 * transport is the demo one — swap the hook and the page is a real chat app.
 * --------------------------------------------------------------------------- */

const SUGGESTIONS = [
  "How does the conversation frame keep up with a streaming answer?",
  "Write a migration plan from polling to streaming.",
  "What is the thinking block doing instead of jumping the scroll?",
];

const Empty = ({ onPick }: { onPick: (prompt: string) => void }) => (
  <div className="flex flex-col items-center gap-6 text-center">
    <div className="flex flex-col gap-1.5">
      <p className="font-medium">What are you working on?</p>
      <p className="text-sm text-muted-foreground">
        Ask a question, drop in a file, or start from one of these.
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

export default function ChatPage() {
  const chat = useDemoChat();

  return (
    <div className="h-dvh">
      <ChatApp
        {...chat}
        empty={<Empty onPick={chat.onSend} />}
        title="Assistant"
      />
    </div>
  );
}
