"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ApprovalCard } from "@/registry/new-york/agents/approval-card";

/** The card is only there while the call is held. Once it is answered it is gone, and the
 *  call's row is what says how it went, so the demo leaves a line of text in its place. */
export const ApprovalCardDemo = () => {
  const [outcome, setOutcome] = useState<string | null>(null);

  return (
    <div className="w-full max-w-md">
      {outcome ? (
        <p className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          {outcome}
          <Button variant="ghost" size="sm" onClick={() => setOutcome(null)}>
            Ask again
          </Button>
        </p>
      ) : (
        <ApprovalCard
          onApprove={() => setOutcome("Approved.")}
          onReject={(reason) =>
            setOutcome(reason ? `Rejected: ${reason}` : "Rejected.")
          }
        >
          This tool wants to delete the file <code>/tmp/example.txt</code>. Do
          you approve this action?
        </ApprovalCard>
      )}
    </div>
  );
};
