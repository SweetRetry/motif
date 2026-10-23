"use client";

import { LoaderCircle } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ApprovalCardProps {
  /** One sentence naming what the tool is about to do, with its target in `<code>`: "This
   *  tool wants to delete the file <code>/tmp/a.txt</code>. Do you approve?" The gate
   *  stopped the call, the model did not ask, so the words come from the call itself. */
  children: ReactNode;
  /** The answer is on its way: both buttons lock until the call moves on. */
  submitting?: boolean;
  /** Omit it and the Approve button is not drawn. */
  onApprove?: () => void;
  /** Reject opens a field for why, and this is called with it, or with nothing when it is
   *  left empty. Omit it and the Reject button is not drawn. */
  onReject?: (reason?: string) => void;
  approveLabel?: ReactNode;
  rejectLabel?: ReactNode;
  className?: string;
}

export function ApprovalCard({
  children,
  submitting: busy = false,
  onApprove,
  onReject,
  approveLabel = "Approve",
  rejectLabel = "Reject",
  className,
}: ApprovalCardProps) {
  const reduce = useReducedMotion() ?? false;
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const cancelReject = () => {
    setRejecting(false);
    setReason("");
  };

  const submitReject = () => {
    onReject?.(reason.trim() || undefined);
    cancelReject();
  };

  return (
    <div
      aria-busy={busy}
      className={cn(
        "w-full overflow-hidden rounded-xl border border-border bg-card p-4 text-sm",
        className
      )}
    >
      <p className="leading-7 text-muted-foreground [&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:text-foreground">
        {children}
      </p>

      {rejecting ? (
        <div className="mt-4 flex items-center gap-2">
          <Input
            autoFocus
            value={reason}
            disabled={busy}
            placeholder="Tell the agent why, or what to do instead"
            onChange={(event) => setReason(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                submitReject();
              } else if (event.key === "Escape") {
                cancelReject();
              }
            }}
            className="h-8 min-w-0 flex-1"
          />
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={cancelReject}
          >
            Back
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={submitReject}
          >
            {rejectLabel}
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-end gap-2">
          {onReject ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setRejecting(true)}
            >
              {rejectLabel}
            </Button>
          ) : null}
          {onApprove ? (
            <Button size="sm" disabled={busy} onClick={onApprove}>
              {busy ? (
                <LoaderCircle
                  className={cn("size-4", !reduce && "animate-spin")}
                />
              ) : (
                approveLabel
              )}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
