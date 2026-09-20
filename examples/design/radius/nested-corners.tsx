import { DesignCase } from "@/components/design-case";
import { cn } from "@/lib/utils";

/**
 * The outer corner is 24px and the gap is 16px, so the inner corner has to be
 * 8px to stay concentric. Reusing the outer radius makes the inner box bulge
 * past the arc it sits in.
 */
const Panel = ({ concentric }: { concentric?: boolean }) => (
  <div className="bg-muted rounded-3xl p-4">
    <div
      className={cn(
        "bg-background border-border h-24 w-36 rounded-3xl border",
        concentric && "rounded-md"
      )}
    />
  </div>
);

export const NestedCornersDemo = () => (
  <div className="flex items-start gap-12">
    <DesignCase note="Reused radius" verdict="wrong">
      <Panel />
    </DesignCase>
    <DesignCase note="24 − 16 = 8px" verdict="right">
      <Panel concentric />
    </DesignCase>
  </div>
);
