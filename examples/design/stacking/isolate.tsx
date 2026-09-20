import { DesignCase } from "@/components/design-case";
import { cn } from "@/lib/utils";

/**
 * Card B overlaps card A's bottom-right corner, where A's badge hangs outside
 * A's own box. `relative` alone leaves the badge ordered against the whole page,
 * so `z-10` lifts it over B; `isolate` on A keeps the badge inside A's ordering,
 * and B covers it the way DOM order says it should.
 */
const Stack = ({ isolated }: { isolated?: boolean }) => (
  <div className="relative h-48 w-64">
    <div
      className={cn(
        "bg-card border-border absolute top-0 left-0 flex h-28 w-40 items-start rounded-xl border p-3 text-xs",
        isolated && "isolate"
      )}
    >
      Card A
      <span className="bg-primary text-primary-foreground absolute -right-2 -bottom-2 z-10 flex size-6 items-center justify-center rounded-full text-xs">
        3
      </span>
    </div>
    <div className="bg-card border-border absolute top-16 left-20 flex h-28 w-40 items-start rounded-xl border p-3 text-xs">
      Card B
    </div>
  </div>
);

export const IsolateDemo = () => (
  <div className="flex items-start gap-12">
    <DesignCase note="No isolation" verdict="wrong">
      <Stack />
    </DesignCase>
    <DesignCase note="isolate" verdict="right">
      <Stack isolated />
    </DesignCase>
  </div>
);
