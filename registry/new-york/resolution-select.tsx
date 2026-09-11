"use client";

import { cn } from "@/lib/utils";

/* -- The glyph -----------------------------------------------------------------
 * Resolution is sampling density, so the glyph is a dot matrix rather than a number
 * in a box: two dots read as standard, three as high, four as retina. The count is
 * positional — tiers are ordered, not named — so any list of resolutions gets the
 * right density without the component knowing what `"2K"` means.
 * --------------------------------------------------------------------------- */

/** Resolutions offered when the caller does not pass their own. */
const DEFAULT_OPTIONS = ["1K", "2K", "4K"] as const;

/** Dot rows per tier, largest last. Two options get the ends; three get the full run. */
const TIERS = [2, 3, 4] as const;

/** Coordinates for each tier's dots, in a 16×16 viewBox, paired with the dot radius. */
const DOTS: Record<
  (typeof TIERS)[number],
  { r: number; points: [number, number][] }
> = {
  2: {
    points: [
      [4.5, 4.5],
      [11.5, 4.5],
      [4.5, 11.5],
      [11.5, 11.5],
    ],
    r: 1.6,
  },
  3: {
    points: [
      [3, 3],
      [8, 3],
      [13, 3],
      [3, 8],
      [8, 8],
      [13, 8],
      [3, 13],
      [8, 13],
      [13, 13],
    ],
    r: 1.1,
  },
  4: {
    points: [
      [2.5, 2.5],
      [6.5, 2.5],
      [10.5, 2.5],
      [14.5, 2.5],
      [2.5, 6.5],
      [6.5, 6.5],
      [10.5, 6.5],
      [14.5, 6.5],
      [2.5, 10.5],
      [6.5, 10.5],
      [10.5, 10.5],
      [14.5, 10.5],
      [2.5, 14.5],
      [6.5, 14.5],
      [10.5, 14.5],
      [14.5, 14.5],
    ],
    r: 0.8,
  },
};

/** Two tiers skip the middle of the run — endpoints only, no false intermediate. */
const tierFor = (index: number, total: number) => {
  if (total <= 2) {
    return index === 0 ? 2 : 4;
  }
  return TIERS[Math.min(index, TIERS.length - 1)];
};

const ResolutionMatrixIcon = ({
  index,
  isSelected,
  total,
}: {
  index: number;
  isSelected: boolean;
  total: number;
}) => {
  const tier = tierFor(index, total);
  const { r, points } = DOTS[tier];

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0 transition-opacity",
        isSelected
          ? "text-foreground opacity-90"
          : "text-muted-foreground opacity-50"
      )}
      viewBox="0 0 16 16"
    >
      {points.map(([cx, cy]) => (
        <circle cx={cx} cy={cy} fill="currentColor" key={`${cx}-${cy}`} r={r} />
      ))}
    </svg>
  );
};

export interface ResolutionSelectProps {
  className?: string;
  /** Heading above the control. Defaults to `"Resolution"`. */
  label?: string;
  /** Called with the chosen resolution, e.g. `"2K"`. */
  onChange: (value: string) => void;
  /** Tiers to offer, low to high. Three is the designed-for count. */
  options?: readonly string[];
  /** The resolution currently in effect. */
  value: string;
}

/**
 * Resolution as a segmented row with a sliding plate. The plate does the moving, so
 * the choice reads as one control changing position rather than one button lighting
 * up and another going dark — and the dot matrix says how much detail each stop buys.
 */
export const ResolutionSelect = ({
  className,
  label = "Resolution",
  onChange,
  options = DEFAULT_OPTIONS,
  value,
}: ResolutionSelectProps) => {
  const selectedIndex = options.indexOf(value);
  const colCount = Math.max(1, options.length);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="font-medium text-muted-foreground text-xs">{label}</div>

      <div className="rounded-xl border border-border/50 bg-muted/20 p-1">
        <div
          className="relative grid gap-1"
          style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
        >
          {selectedIndex === -1 ? null : (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 rounded-lg border border-border/80 bg-accent shadow-xs transition-transform duration-[220ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
              style={{
                // Same 0.25rem gutter the grid uses, so the plate lands exactly on a cell.
                transform: `translateX(calc(${selectedIndex} * (100% + 0.25rem)))`,
                width: `calc((100% - ${(colCount - 1) * 0.25}rem) / ${colCount})`,
              }}
            />
          )}

          {options.map((optionValue, index) => {
            const isSelected = value === optionValue;

            return (
              <button
                aria-pressed={isSelected}
                className={cn(
                  "relative z-10 flex h-8 min-w-0 items-center justify-center gap-1 rounded-lg border border-transparent px-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                  isSelected
                    ? "font-semibold text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                key={optionValue}
                onClick={() => onChange(optionValue)}
                type="button"
              >
                <ResolutionMatrixIcon
                  index={index}
                  isSelected={isSelected}
                  total={colCount}
                />
                <span className="leading-none tracking-tight">
                  {optionValue}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
