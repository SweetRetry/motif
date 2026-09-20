import { DesignCase } from "@/components/design-case";

const LEAD = { label: "Requests", value: "12,480" };

const REST = [
  { label: "Errors", value: "37" },
  { label: "p95", value: "820ms" },
  { label: "Spend", value: "$41.20" },
];

const EqualGrid = () => (
  <div className="grid w-64 grid-cols-2 gap-2">
    {[LEAD, ...REST].map((metric) => (
      <div
        key={metric.label}
        className="bg-card border-border rounded-lg border p-3"
      >
        <div className="text-muted-foreground text-xs">{metric.label}</div>
        <div className="mt-1 text-lg font-semibold tabular-nums">
          {metric.value}
        </div>
      </div>
    ))}
  </div>
);

const LedGrid = () => (
  <div className="flex w-64 flex-col gap-5">
    <div>
      <div className="text-muted-foreground text-xs">{LEAD.label}</div>
      <div className="text-3xl font-semibold tracking-tight tabular-nums">
        {LEAD.value}
      </div>
    </div>
    <div className="flex flex-col gap-2">
      {REST.map((metric) => (
        <div key={metric.label} className="flex items-baseline justify-between">
          <span className="text-muted-foreground text-xs">{metric.label}</span>
          <span className="text-sm tabular-nums">{metric.value}</span>
        </div>
      ))}
    </div>
  </div>
);

export const EqualMetricsDemo = () => (
  <div className="flex items-start gap-12">
    <DesignCase note="Equal cards" verdict="wrong">
      <EqualGrid />
    </DesignCase>
    <DesignCase note="Lead metric" verdict="right">
      <LedGrid />
    </DesignCase>
  </div>
);
