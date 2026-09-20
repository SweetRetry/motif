import { ArrowRight } from "lucide-react";

import { DesignCase } from "@/components/design-case";
import { cn } from "@/lib/utils";

/**
 * The arrow does not touch the edges of its own 16px box — a stroke icon leaves
 * about 1.75px of built-in air on either side. Equal padding therefore reads as
 * a looser right edge, and the icon side gets 2px back.
 */
const Action = ({ trimmed, label }: { trimmed?: boolean; label: string }) => (
  <button
    type="button"
    className={cn(
      "bg-primary text-primary-foreground inline-flex h-9 items-center gap-2 rounded-md text-sm font-medium",
      trimmed ? "pr-2.5 pl-3" : "px-3"
    )}
  >
    {label}
    <ArrowRight className="size-4" />
  </button>
);

export const IconLabelButtonDemo = () => (
  <div className="flex items-start gap-12">
    <DesignCase note="Even padding" verdict="wrong">
      <Action label="Continue" />
    </DesignCase>
    <DesignCase note="Icon side trimmed" verdict="right">
      <Action label="Continue" trimmed />
    </DesignCase>
  </div>
);
