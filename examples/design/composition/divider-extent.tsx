import { DesignCase } from "@/components/design-case";

const ROWS = [
  { action: "Upgrade", label: "Current plan", value: "Team · Monthly" },
  { action: "Manage", label: "Seats", value: "12 of 15 used" },
  { action: "Cancel", label: "Renewal", value: "2026-10-01" },
];

const RowBody = ({ row }: { row: (typeof ROWS)[number] }) => (
  <>
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="text-sm font-medium">{row.label}</span>
      <span className="text-muted-foreground text-xs">{row.value}</span>
    </span>
    <span className="text-muted-foreground shrink-0 text-xs">{row.action}</span>
  </>
);

/** The padding sits on the row, so the `divide-y` line runs the card's full width: at
 *  that extent it is as wide as the card's own edge, and the one block reads as three
 *  stacked ones. */
const FullBleed = () => (
  <div className="bg-card divide-border w-64 divide-y overflow-hidden rounded-2xl">
    {ROWS.map((row) => (
      <div
        className="flex items-center justify-between gap-4 px-4 py-3"
        key={row.label}
      >
        <RowBody row={row} />
      </div>
    ))}
  </div>
);

/** The padding sits on the card, so the line insets with the content and keeps the same
 *  breathing room at both ends that the text has. */
const Inset = () => (
  <div className="bg-card divide-border w-64 divide-y overflow-hidden rounded-2xl px-4">
    {ROWS.map((row) => (
      <div
        className="flex items-center justify-between gap-4 py-3"
        key={row.label}
      >
        <RowBody row={row} />
      </div>
    ))}
  </div>
);

export const DividerExtentDemo = () => (
  <div className="flex items-start gap-12">
    <DesignCase note="Line spans the row" verdict="wrong">
      <FullBleed />
    </DesignCase>
    <DesignCase note="Line insets with the content" verdict="right">
      <Inset />
    </DesignCase>
  </div>
);
