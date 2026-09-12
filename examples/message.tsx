"use client";

import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Message,
  MessageActions,
  MessageContent,
} from "@/registry/new-york/message";

/** The three roles beside each other: the reader against the trailing edge, the answer
 *  full width, the system note centred and quiet. */
export const MessageDemo = () => (
  <div className="flex w-full max-w-2xl flex-col gap-6">
    <Message from="user">
      <MessageContent>
        Can the rail follow a long thread without re-rendering it?
      </MessageContent>
    </Message>

    <Message from="assistant">
      <MessageContent>
        It reads the scroll position into a motion value, so the rail moves on
        the compositor while React stays out of the way.
        <MessageActions>
          <Button
            aria-label="Copy answer"
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Copy className="size-3.5" strokeWidth={1.75} />
          </Button>
        </MessageActions>
      </MessageContent>
    </Message>

    <Message from="system">
      <MessageContent>The thread was archived on 12 September.</MessageContent>
    </Message>
  </div>
);
