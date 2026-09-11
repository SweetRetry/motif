"use client";

import { motion, useReducedMotion } from "motion/react";
import type { Transition } from "motion/react";
import type { KeyboardEvent, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SPRING_LAYOUT } from "@/lib/ease";
import { useHoverCapable } from "@/lib/hooks/use-hover-capable";
import { cn } from "@/lib/utils";

/* -- The dock ----------------------------------------------------------------
 * A row of glyphs that names itself on approach: the icon under the pointer
 * swells a little and its label arrives above it. The bar itself never moves —
 * the plate is fixed, so the row stays put and the eye never has to re-find the
 * glyph it was aiming at.
 *
 * An earlier cut unrolled the label into the row, widening the item and pushing
 * its neighbours across. It reads well in a screenshot and feels like a twitch
 * in the hand: every hover reflows the bar. The name is not worth moving the
 * thing you are pointing at.
 *
 * Most items name themselves on hover and nothing more. A few earn the width —
 * the one action the bar exists for, a filter that is currently on — and those
 * can pin the label into the row with `pinnedLabel`.
 * --------------------------------------------------------------------------- */

/** What an item needs to know about the bar it sits in. */
interface ToolbarMotion {
  /** Whether the pointer can be trusted to hover at all. False on touch. */
  hoverable: boolean;
  /** The curve the glyph swells on — instant under reduced motion. */
  spring: Transition;
}

/* Items placed outside a `Toolbar` still render; the glyph simply holds still,
 * since the hover affordance belongs to the bar rather than to the item. */
const ToolbarContext = createContext<ToolbarMotion>({
  hoverable: false,
  spring: SPRING_LAYOUT,
});

const ITEM_SELECTOR = "[data-toolbar-item]:not(:disabled)";

/* A dock is swept, not pointed at. A beat of delay keeps a pass along the bar
 * from flashing five labels, while still reading as immediate when you stop on
 * one. It overrides the registry tooltip's own zero delay, which is tuned for
 * triggers you approach deliberately. */
const LABEL_DELAY = 200;

const FOCUS_KEYS: Record<string, "first" | "last" | number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  End: "last",
  Home: "first",
};

/** Where a key press lands, given where focus is now. Wraps at both ends. */
const nextIndex = (
  move: "first" | "last" | number,
  start: number,
  length: number
) => {
  if (move === "first") {
    return 0;
  }
  if (move === "last") {
    return length - 1;
  }
  return (start + move + length) % length;
};

/** The plate behind the glyph: held down when current, raised on hover. */
const surfaceClass = ({
  active,
  hovered,
}: {
  active: boolean;
  hovered: boolean;
}) => {
  if (active) {
    return "bg-accent text-foreground";
  }
  if (hovered) {
    return "bg-accent/60 text-foreground";
  }
  return "text-muted-foreground hover:text-foreground";
};

/* `page` is for a link to the view you are on; `true` is the honest answer for
 * anything else that is current, buttons included. Neither is styled — the plate
 * is the visual, this is only what gets announced. */
const currentToken = (active: boolean, href?: string) => {
  if (!active) {
    return;
  }
  return href ? ("page" as const) : ("true" as const);
};

export interface ToolbarProps {
  /** Names the bar for assistive tech, e.g. `"Site"` or `"Canvas tools"`. */
  "aria-label"?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * The surface: a floating pill that keeps its own shape whatever the items do.
 * Arrow keys walk the glyphs left and right, so the row is one object to move
 * through rather than a minefield of tab stops.
 */
export const Toolbar = ({
  "aria-label": ariaLabel,
  children,
  className,
}: ToolbarProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const canHover = useHoverCapable();
  const reduce = useReducedMotion();

  const value = useMemo<ToolbarMotion>(
    () => ({
      hoverable: Boolean(canHover && !reduce),
      spring: reduce ? { duration: 0 } : SPRING_LAYOUT,
    }),
    [canHover, reduce]
  );

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const move = FOCUS_KEYS[event.key];
    if (move === undefined) {
      return;
    }

    // Queried at press time rather than held in state, so the order is whatever
    // the DOM currently says — including items the caller added conditionally.
    const items = [
      ...(ref.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []),
    ];
    if (items.length === 0) {
      return;
    }

    const current = items.indexOf(document.activeElement as HTMLElement);
    const start = current === -1 ? 0 : current;
    const next = nextIndex(move, start, items.length);

    event.preventDefault();
    items[next]?.focus();
  }, []);

  return (
    <ToolbarContext.Provider value={value}>
      <div
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full border border-border/60",
          "bg-card/70 p-1.5 shadow-lg shadow-black/5 backdrop-blur-xl",
          className
        )}
        onKeyDown={handleKeyDown}
        ref={ref}
        role="toolbar"
      >
        {children}
      </div>
    </ToolbarContext.Provider>
  );
};

export interface ToolbarItemProps {
  /** Marks the current destination; the glyph keeps a plate when nothing is hovered. */
  active?: boolean;
  className?: string;
  disabled?: boolean;
  /**
   * A short word to pin into the row instead of holding the name back for the
   * tooltip. Use it where the word is the point: the bar's primary action, or a
   * state the user needs to read without reaching for it. The tooltip stays
   * either way — it is where the unabbreviated name lives.
   */
  pinnedLabel?: string;
  /** Opens `href` in a new tab, with the matching `rel`. */
  external?: boolean;
  /** Renders an anchor rather than a button. */
  href?: string;
  /** The glyph, drawn at 18px in `currentColor`. */
  icon: ReactNode;
  /**
   * The item's full name — the tooltip, and the accessible name. It describes
   * the whole destination, and should carry the visible word inside it, so
   * `"Source on GitHub"` for a pinned `"Source"`.
   */
  label: string;
  /** Called on click for buttons. Anchors are left to the browser. */
  onSelect?: () => void;
}

/**
 * One glyph in the bar: a 36px plate that swells under the pointer while its
 * name arrives above it, or a plate with a pinned word already in it when the
 * caller asks for `pinnedLabel`. Either way the tooltip carries the full name,
 * so a shortened word on the bar is never the only version of it.
 *
 * Nothing about the item changes size with hover, so the row is stable — the
 * only movement is the glyph's own transform, which costs no layout at all.
 */
export const ToolbarItem = ({
  active = false,
  className,
  disabled = false,
  pinnedLabel,
  external = false,
  href,
  icon,
  label,
  onSelect,
}: ToolbarItemProps) => {
  const { hoverable, spring } = useContext(ToolbarContext);
  const [hovered, setHovered] = useState(false);
  const swell = hoverable && hovered;

  const shared = {
    "aria-current": currentToken(active, href),
    /* Always the full name, never the pinned shorthand, so the tooltip and the
     * announcement cannot drift apart however short the row's word is. */
    "aria-label": label,
    className: cn(
      "flex h-9 shrink-0 items-center rounded-full outline-none select-none",
      "transition-colors duration-200",
      "focus-visible:ring-2 focus-visible:ring-ring/60",
      "disabled:pointer-events-none disabled:opacity-40",
      surfaceClass({ active, hovered }),
      className
    ),
    "data-toolbar-item": "",
    onPointerEnter: () => setHovered(true),
    onPointerLeave: () => setHovered(false),
  };

  const content = (
    <>
      <motion.span
        animate={{ scale: swell ? 1.08 : 1 }}
        className="grid size-9 shrink-0 place-items-center [&_svg]:size-[18px]"
        transition={spring}
      >
        {icon}
      </motion.span>

      {pinnedLabel ? (
        <span className="whitespace-nowrap pr-3 pl-0.5 font-medium text-sm">
          {pinnedLabel}
        </span>
      ) : null}
    </>
  );

  const item = href ? (
    <motion.a
      href={disabled ? undefined : href}
      rel={external ? "noreferrer" : undefined}
      target={external ? "_blank" : undefined}
      {...shared}
    >
      {content}
    </motion.a>
  ) : (
    <motion.button
      disabled={disabled}
      onClick={onSelect}
      type="button"
      {...shared}
    >
      {content}
    </motion.button>
  );

  /* The tooltip is built for every item, pinned word or not: it is where the
   * name is spelled out, and a pinned word is only ever a shorthand for it. */
  return (
    <Tooltip delayDuration={LABEL_DELAY}>
      <TooltipTrigger asChild>{item}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
};

export interface ToolbarSeparatorProps {
  className?: string;
}

/** Breaks the row into groups — the mark itself is decoration, the grouping is not. */
export const ToolbarSeparator = ({ className }: ToolbarSeparatorProps) => (
  <span
    aria-orientation="vertical"
    className={cn("mx-0.5 h-5 w-px shrink-0 bg-border", className)}
    role="separator"
  />
);
