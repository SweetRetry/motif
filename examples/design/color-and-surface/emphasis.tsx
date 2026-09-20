import { DesignCase } from "@/components/design-case";

const ACTIONS = ["Publish", "Preview", "Duplicate", "Archive"];

const Loud = () => (
  <div className="flex w-56 flex-col gap-2">
    {ACTIONS.map((action) => (
      <span
        key={action}
        className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-center text-xs font-medium"
      >
        {action}
      </span>
    ))}
  </div>
);

const Led = () => (
  <div className="flex w-56 flex-col gap-2">
    <span className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-center text-xs font-medium">
      {ACTIONS[0]}
    </span>
    {ACTIONS.slice(1).map((action) => (
      <span
        key={action}
        className="border-border text-muted-foreground rounded-md border px-3 py-2 text-center text-xs"
      >
        {action}
      </span>
    ))}
  </div>
);

export const EmphasisDemo = () => (
  <div className="flex items-start gap-12">
    <DesignCase note="All primary" verdict="wrong">
      <Loud />
    </DesignCase>
    <DesignCase note="Single primary" verdict="right">
      <Led />
    </DesignCase>
  </div>
);
