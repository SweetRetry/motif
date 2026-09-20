import { DesignCase } from "@/components/design-case";

/**
 * Five rows rather than three, because the cost of a card per row is height and
 * repetition — and neither shows on a list short enough to read at a glance.
 *
 * The second column is a date, not a state. A state can earn a pill; a date
 * cannot, which is what makes the verdict on the left unambiguous.
 */
const REPORTS = [
  { meta: "2 Sep", title: "Weekly usage" },
  { meta: "31 Aug", title: "Error digest" },
  { meta: "28 Aug", title: "Spend by workspace" },
  { meta: "21 Aug", title: "Latency by region" },
  { meta: "14 Aug", title: "Retention cohort" },
];

const ChromeList = () => (
  <div className="flex w-64 flex-col gap-2">
    {REPORTS.map((report) => (
      <div
        key={report.title}
        className="bg-card border-border flex items-center justify-between rounded-lg border px-3 py-2"
      >
        <span className="text-sm font-medium">{report.title}</span>
        <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs">
          {report.meta}
        </span>
      </div>
    ))}
  </div>
);

const PlainList = () => (
  <div className="flex w-64 flex-col gap-4">
    {REPORTS.map((report) => (
      <div
        key={report.title}
        className="flex items-baseline justify-between gap-6"
      >
        <span className="text-sm font-medium">{report.title}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {report.meta}
        </span>
      </div>
    ))}
  </div>
);

export const ListChromeDemo = () => (
  <div className="flex items-start gap-12">
    <DesignCase note="Card per row" verdict="wrong">
      <ChromeList />
    </DesignCase>
    <DesignCase note="Clean alignment" verdict="right">
      <PlainList />
    </DesignCase>
  </div>
);
