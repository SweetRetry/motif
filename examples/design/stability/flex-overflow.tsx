import { DesignCase } from "@/components/design-case";
import { cn } from "@/lib/utils";

const NAME = "quarterly-usage-export-2026-09-final-v3.csv";

/**
 * A flex item will not shrink below the width of its own content, and a name
 * with no spaces in it has a wide one. Without `min-w-0` the row grows past its
 * container instead of the name getting an ellipsis.
 */
const Row = ({ fixed }: { fixed?: boolean }) => (
  <div className="border-border flex w-56 items-center gap-2 rounded-lg border p-2">
    <span className="bg-muted size-7 shrink-0 rounded-md" />
    <span className={cn("text-xs", fixed && "min-w-0 truncate")}>{NAME}</span>
    <span className="text-muted-foreground ml-auto shrink-0 text-xs">
      2.4 MB
    </span>
  </div>
);

export const FlexOverflowDemo = () => (
  <div className="flex items-start gap-20">
    <DesignCase note="min-w-auto" verdict="wrong">
      <Row />
    </DesignCase>
    <DesignCase note="min-w-0 truncate" verdict="right">
      <Row fixed />
    </DesignCase>
  </div>
);
