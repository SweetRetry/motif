import { DesignCase } from "@/components/design-case";
import { cn } from "@/lib/utils";

/**
 * Both buttons change colour on hover. The left one also grows, because
 * `transition-all` picked up the padding alongside the colour — so it reflows on
 * every frame and drags its neighbour along with it.
 */
const Action = ({ scoped }: { scoped?: boolean }) => (
  <div className="flex items-center gap-3">
    <button
      type="button"
      className={cn(
        "bg-secondary text-secondary-foreground rounded-md px-3 py-1.5 text-xs font-medium",
        scoped
          ? "transition-colors hover:bg-accent"
          : "transition-all hover:bg-accent hover:px-6"
      )}
    >
      Continue
    </button>
    <span className="text-muted-foreground text-xs">Step 2 of 4</span>
  </div>
);

export const TransitionScopeDemo = () => (
  <div className="flex flex-col gap-10">
    <DesignCase note="transition-all" verdict="wrong">
      <Action />
    </DesignCase>
    <DesignCase note="transition-colors" verdict="right">
      <Action scoped />
    </DesignCase>
  </div>
);
