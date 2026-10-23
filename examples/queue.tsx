"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Queue,
  QueueHeader,
  QueueItem,
  QueueItemMarker,
  QueueItemRemove,
  QueueItemSendNow,
  QueueItemText,
  QueueList,
} from "@/registry/new-york/agents/queue";

interface Waiting {
  id: number;
  text: string;
}

const SENT = [
  "Also run the auth tests once the refactor is done",
  "Use createSession from src/auth/session.ts, not a new helper",
  "When you're finished, summarise what changed in two sentences",
  "Leave the migration files alone",
];

/** The queue as a caller writes it: a list they own, a row per entry. Remove takes the
 *  entry back; send now delivers it into the run, so it leaves the queue and shows up as
 *  what the agent is now working from. Each press of the button is the user typing while
 *  the agent is still running. */
export const QueueDemo = () => {
  const [sent, setSent] = useState(3);
  const [waiting, setWaiting] = useState<Waiting[]>(
    SENT.slice(0, 2).map((text, id) => ({ id, text }))
  );

  const [sentNow, setSentNow] = useState<string | null>(null);

  const queueAnother = () => {
    setWaiting((current) => [
      ...current,
      { id: sent, text: SENT[sent % SENT.length] },
    ]);
    setSent(sent + 1);
  };

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-4">
      <Queue>
        <QueueHeader>{waiting.length} queued</QueueHeader>
        <QueueList>
          {waiting.map((message) => (
            <QueueItem key={message.id}>
              <QueueItemMarker />
              <QueueItemText>{message.text}</QueueItemText>
              <QueueItemSendNow
                onClick={() => {
                  setSentNow(message.text);
                  setWaiting((current) =>
                    current.filter(({ id }) => id !== message.id)
                  );
                }}
              />
              <QueueItemRemove
                onClick={() =>
                  setWaiting((current) =>
                    current.filter(({ id }) => id !== message.id)
                  )
                }
              />
            </QueueItem>
          ))}
        </QueueList>
      </Queue>
      {sentNow ? (
        <p className="text-muted-foreground text-xs">Sent now: {sentNow}</p>
      ) : null}
      <Button onClick={queueAnother} size="sm" variant="outline">
        Send another while it runs
      </Button>
    </div>
  );
};
