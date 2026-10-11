"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/* -- A word with a line under it ---------------------------------------------
 * The selected tab is the word at full strength with a 2px line laid under it;
 * the rest are muted words. There is no plate and no pill, so the strip draws
 * no surface of its own: it sits on whatever rule the header around it already
 * has, and the line reads as that rule thickening under one word.
 *
 * The list carries no border for that reason. A caller that wants a rule draws
 * it on the header, where it belongs; a strip that drew its own would stack two
 * rules the moment it landed in a header that already had one.
 *
 * Behaviour is Radix's tabs, unchanged: one tab stop with a roving focus, arrow
 * keys, Home and End, and the ids and `aria-controls` that tie a tab to its
 * panel. This file only decides how it looks.
 * --------------------------------------------------------------------------- */

/** The root owns the selection, controlled with `value` or uncontrolled with
 *  `defaultValue`, like any Radix tabs. */
const LineTabs = ({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Root>) => (
  <TabsPrimitive.Root
    className={cn("flex flex-col", className)}
    data-slot="line-tabs"
    {...props}
  />
);

/** The strip. It is as wide as its tabs and no wider, so a toolbar can sit opposite it. */
const LineTabsList = ({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List
    className={cn("flex items-stretch gap-5", className)}
    data-slot="line-tabs-list"
    {...props}
  />
);

/** One tab. The line is an inset shadow in the text's own colour, so it follows the
 *  word through any theme and never needs a token of its own. */
const LineTabsTrigger = ({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    className={cn(
      "inline-flex h-12 cursor-pointer items-center text-sm whitespace-nowrap text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground data-[state=active]:shadow-[inset_0_-2px_0_currentColor]",
      className
    )}
    data-slot="line-tabs-trigger"
    {...props}
  />
);

/** A panel. Only the selected one is mounted. */
const LineTabsContent = ({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Content>) => (
  <TabsPrimitive.Content
    className={cn("outline-none", className)}
    data-slot="line-tabs-content"
    {...props}
  />
);

export { LineTabs, LineTabsContent, LineTabsList, LineTabsTrigger };
