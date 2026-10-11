"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  LineTabs,
  LineTabsContent,
  LineTabsList,
  LineTabsTrigger,
} from "@/registry/new-york/line-tabs";

const Count = ({ children }: { children: ReactNode }) => (
  <span className="ml-1.5 font-mono text-xs tabular-nums">{children}</span>
);

/** The strip in the place it is made for: a header that already has a rule, with the
 *  tabs on the left and the panel's own controls opposite. The tabs draw no rule of their
 *  own, so the selected line lands on the header's. */
export const LineTabsDemo = () => (
  <LineTabs
    className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card"
    defaultValue="overview"
  >
    <div className="flex items-center justify-between border-b border-border/60 pr-2 pl-5">
      <LineTabsList aria-label="Sections">
        <LineTabsTrigger value="overview">Overview</LineTabsTrigger>
        <LineTabsTrigger value="files">
          Files
          <Count>{5}</Count>
        </LineTabsTrigger>
        <LineTabsTrigger value="activity">Activity</LineTabsTrigger>
      </LineTabsList>
      <Button aria-label="Close" size="icon" variant="ghost">
        <X />
      </Button>
    </div>
    <LineTabsContent
      className="p-5 text-sm text-muted-foreground"
      value="overview"
    >
      What the thing is for, in a sentence or two.
    </LineTabsContent>
    <LineTabsContent
      className="p-5 text-sm text-muted-foreground"
      value="files"
    >
      Five files, a folder or two, and a preview beside them.
    </LineTabsContent>
    <LineTabsContent
      className="p-5 text-sm text-muted-foreground"
      value="activity"
    >
      Nothing has happened yet.
    </LineTabsContent>
  </LineTabs>
);
