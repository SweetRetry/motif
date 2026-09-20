import { DesignCase } from "@/components/design-case";
import { cn } from "@/lib/utils";

const LIGHT_THEME: React.CSSProperties = {
  "--background": "oklch(1 0 0)",
  "--border": "oklch(0.922 0 0)",
  "--card": "oklch(1 0 0)",
  "--card-foreground": "oklch(0.145 0 0)",
  "--foreground": "oklch(0.145 0 0)",
  "--muted": "oklch(0.97 0 0)",
  "--muted-foreground": "oklch(0.556 0 0)",
  backgroundColor: "oklch(1 0 0)",
  borderColor: "oklch(0.922 0 0)",
  color: "oklch(0.145 0 0)",
  colorScheme: "light",
} as React.CSSProperties;

const DARK_THEME: React.CSSProperties = {
  "--background": "oklch(0.145 0 0)",
  "--border": "oklch(1 0 0 / 10%)",
  "--card": "oklch(0.205 0 0)",
  "--card-foreground": "oklch(0.985 0 0)",
  "--foreground": "oklch(0.985 0 0)",
  "--muted": "oklch(0.269 0 0)",
  "--muted-foreground": "oklch(0.708 0 0)",
  backgroundColor: "oklch(0.145 0 0)",
  borderColor: "oklch(1 0 0 / 10%)",
  color: "oklch(0.985 0 0)",
  colorScheme: "dark",
} as React.CSSProperties;

/**
 * A single card on the canvas:
 * - Wrong: borrows `bg-muted` (reads sunken in light, floating in dark).
 * - Right: `bg-card` with `border-border` (stable elevation in both themes).
 * No nested cards within cards.
 */
const CardItem = ({ filled }: { filled?: boolean }) => (
  <div
    className={cn(
      "w-36 rounded-lg p-3 text-xs",
      filled
        ? "bg-muted text-muted-foreground"
        : "bg-card border-border border text-foreground shadow-xs"
    )}
  >
    <div className="font-medium">Usage</div>
    <div className="text-muted-foreground mt-0.5 text-[11px] tabular-nums">
      12,480 requests
    </div>
  </div>
);

const ThemeCanvas = ({
  dark,
  children,
}: {
  dark?: boolean;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col items-center gap-1.5">
    <div
      style={dark ? DARK_THEME : LIGHT_THEME}
      className={cn(
        "flex h-24 w-44 items-center justify-center rounded-lg border",
        dark && "dark"
      )}
    >
      {children}
    </div>
    <span className="text-muted-foreground text-[11px]">
      {dark ? "Dark Canvas" : "Light Canvas"}
    </span>
  </div>
);

export const SurfaceLevelsDemo = () => (
  <div className="flex items-start gap-12">
    <DesignCase note="bg-muted fill" verdict="wrong">
      <div className="flex flex-col gap-3">
        <ThemeCanvas>
          <CardItem filled />
        </ThemeCanvas>
        <ThemeCanvas dark>
          <CardItem filled />
        </ThemeCanvas>
      </div>
    </DesignCase>
    <DesignCase note="bg-card with border" verdict="right">
      <div className="flex flex-col gap-3">
        <ThemeCanvas>
          <CardItem />
        </ThemeCanvas>
        <ThemeCanvas dark>
          <CardItem />
        </ThemeCanvas>
      </div>
    </DesignCase>
  </div>
);
