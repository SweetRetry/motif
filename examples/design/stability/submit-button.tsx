"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { DesignCase } from "@/components/design-case";
import { cn } from "@/lib/utils";

const usePending = () => {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!pending) {
      return;
    }
    const timer = window.setTimeout(() => setPending(false), 1400);
    return () => window.clearTimeout(timer);
  }, [pending]);

  return [pending, () => setPending(true)] as const;
};

/**
 * The label is what gives the button its width. Swapping it out for a spinner
 * hands the width to the spinner, and everything after the button slides left;
 * keeping the label in place holds the box the pointer is already on.
 */
const Row = ({ held }: { held?: boolean }) => {
  const [pending, start] = usePending();

  return (
    <div className="flex w-64 items-center gap-3">
      <button
        type="button"
        onClick={start}
        className="bg-primary text-primary-foreground relative inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium"
      >
        <span className={cn(held && pending && "invisible")}>Publish</span>
        {pending && (
          <LoaderCircle
            className={cn("size-4 animate-spin", held && "absolute")}
          />
        )}
      </button>
      <span className="text-muted-foreground text-xs">Draft saved</span>
    </div>
  );
};

export const SubmitButtonDemo = () => (
  <div className="flex items-start gap-12">
    <DesignCase note="Text unmounted" verdict="wrong">
      <Row />
    </DesignCase>
    <DesignCase note="Fixed width" verdict="right">
      <Row held />
    </DesignCase>
  </div>
);
