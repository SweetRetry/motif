"use client";

import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import type { MotionValue } from "motion/react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SPRING_LAYOUT, SPRING_SWAP } from "@/lib/ease";
import { useHoverCapable } from "@/lib/hooks/use-hover-capable";
import { cn } from "@/lib/utils";

import type {
  ScrollRailFocus,
  ScrollRailItem,
  ScrollRailPreviewProps,
  ScrollRailProps,
} from "./types";

export type {
  ScrollRailFocus,
  ScrollRailItem,
  ScrollRailPreviewProps,
  ScrollRailProps,
} from "./types";

/** The rail has one shape: a Gaussian falloff away from the focus. `spread` sets how
 *  far it reaches for the width, `highlight` how far it reaches for the colour. */
const bell = (distance: number, spread: number) =>
  Math.exp(-((distance / spread) ** 2));

/** Reading a preview is deliberate: sweeping down the rail must not open one popover
 *  per tick. A tick has to be held before its preview opens, and it keeps the preview
 *  for a beat after the pointer leaves — long enough to cross the gap into the panel. */
const OPEN_DELAY = 90;
const CLOSE_DELAY = 180;

interface RailConfig {
  highlight: number;
  maxLength: number;
  minLength: number;
  minOpacity: number;
  origin: "left" | "right";
  pitch: number;
  popoverSide: "left" | "right";
  spread: number;
  thickness: number;
}

/**
 * Focus is either a plain number or a motion value. Numbers are copied into a motion
 * value so both kinds follow one code path; the spring is what turns a scroll
 * position into a glide.
 */
function useFocusTrack(focus: ScrollRailFocus | undefined) {
  const reduce = useReducedMotion() ?? false;
  const fallback = useMotionValue(typeof focus === "number" ? focus : 0);

  useEffect(() => {
    if (typeof focus === "number") {
      fallback.set(focus);
    }
  }, [fallback, focus]);

  const source =
    typeof focus === "number" || focus === undefined ? fallback : focus;
  const spring = useSpring(source, SPRING_LAYOUT);

  return reduce ? source : spring;
}

interface TickProps {
  ariaLabel: string;
  canHover: boolean;
  config: RailConfig;
  current: boolean;
  hovered: boolean;
  index: number;
  item: ScrollRailItem;
  onHover: (index: number, over: boolean) => void;
  onRegister: (index: number, node: HTMLButtonElement | null) => void;
  onSelect?: (index: number, item: ScrollRailItem) => void;
  tabIndex: number;
  track: MotionValue<number>;
}

const Tick = memo(function Tick({
  ariaLabel,
  canHover,
  config,
  current,
  hovered,
  index,
  item,
  onHover,
  onRegister,
  onSelect,
  tabIndex,
  track,
}: TickProps) {
  const reduce = useReducedMotion() ?? false;
  const lift = useMotionValue(0);
  // A click focuses a button too. Only keyboard focus should hold a preview open,
  // otherwise the panel Radix restores focus to reopens itself in a loop.
  const keyboard = useRef(false);

  useEffect(() => {
    if (reduce) {
      lift.set(hovered ? 1 : 0);
      return;
    }
    const controls = animate(lift, hovered ? 1 : 0, SPRING_SWAP);
    return () => controls.stop();
  }, [hovered, lift, reduce]);

  // Width and colour are two falloffs of the same distance, composed with the hover
  // lift. Both are written straight to the DOM: no state, no re-render per frame.
  const scaleX = useTransform([track, lift], ([focus, lifted]: number[]) => {
    const distance = Math.abs(index - focus);
    const length =
      config.minLength +
      (config.maxLength - config.minLength) * bell(distance, config.spread);
    return (length + (config.maxLength - length) * lifted) / config.maxLength;
  });

  const opacity = useTransform([track, lift], ([focus, lifted]: number[]) => {
    const distance = Math.abs(index - focus);
    const rest =
      config.minOpacity +
      (1 - config.minOpacity) * bell(distance, config.highlight);
    return rest + (1 - rest) * lifted;
  });

  const trigger = (
    <button
      aria-current={current ? "true" : undefined}
      aria-label={ariaLabel}
      className="group flex h-full w-full cursor-pointer items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => onSelect?.(index, item)}
      onBlur={() => {
        if (keyboard.current) {
          keyboard.current = false;
          onHover(index, false);
        }
      }}
      onFocus={(event) => {
        keyboard.current = event.currentTarget.matches(":focus-visible");
        if (keyboard.current) {
          onHover(index, true);
        }
      }}
      onPointerEnter={canHover ? () => onHover(index, true) : undefined}
      onPointerLeave={canHover ? () => onHover(index, false) : undefined}
      ref={(node) => onRegister(index, node)}
      tabIndex={tabIndex}
      type="button"
    >
      <motion.span
        aria-hidden="true"
        className="block bg-current"
        style={{
          height: config.thickness,
          opacity,
          scaleX,
          transformOrigin: config.origin,
          width: config.maxLength,
        }}
      />
    </button>
  );

  return (
    <li
      className="flex items-center"
      data-slot="scroll-rail-tick"
      style={{ height: config.pitch }}
    >
      {item.preview ? (
        <Popover
          onOpenChange={(open) => {
            if (!open) {
              onHover(index, false);
            }
          }}
          open={canHover && hovered}
        >
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent
            align="center"
            className="w-72 p-3"
            data-slot="scroll-rail-preview"
            onCloseAutoFocus={(event) => event.preventDefault()}
            onOpenAutoFocus={(event) => event.preventDefault()}
            onPointerEnter={() => onHover(index, true)}
            onPointerLeave={() => onHover(index, false)}
            side={config.popoverSide}
            sideOffset={8}
          >
            {item.preview}
          </PopoverContent>
        </Popover>
      ) : (
        trigger
      )}
    </li>
  );
});

/** The standard preview body: the question that opened the turn, then the gist of
 *  the answer. */
export const ScrollRailPreview = ({
  title,
  children,
  className,
}: ScrollRailPreviewProps) => (
  <div className={cn("space-y-1.5 text-left", className)}>
    <p className="font-medium text-sm leading-snug">{title}</p>
    <p className="text-muted-foreground text-sm leading-relaxed">{children}</p>
  </div>
);

export function ScrollRail({
  items,
  focus,
  onSelect,
  side = "left",
  label = "Scroll position",
  pitch = 10,
  thickness = 2,
  minLength = 10,
  maxLength = 28,
  spread = 1.35,
  highlight = 0.45,
  minOpacity = 0.2,
  className,
}: ScrollRailProps) {
  const count = items.length;
  const track = useFocusTrack(focus);
  const canHover = useHoverCapable();
  const nodes = useRef<(HTMLButtonElement | null)[]>([]);

  // Hover is one index for the whole rail, so two previews can never stack. Opening
  // waits for the pointer to settle and closing waits for it to come back — a stale
  // timer can only ever clear the index it was started for.
  const pendingOpen = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingClose = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const [cursor, setCursor] = useState<number | null>(null);
  const [active, setActive] = useState(() => Math.round(track.get()));

  useMotionValueEvent(track, "change", (value) => {
    const next = Math.min(count - 1, Math.max(0, Math.round(value)));
    setActive((previous) => (previous === next ? previous : next));
  });

  const clearTimers = useCallback(() => {
    if (pendingOpen.current !== null) {
      clearTimeout(pendingOpen.current);
      pendingOpen.current = null;
    }
    if (pendingClose.current !== null) {
      clearTimeout(pendingClose.current);
      pendingClose.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const onHover = useCallback(
    (index: number, over: boolean) => {
      clearTimers();

      if (over) {
        pendingOpen.current = setTimeout(() => {
          pendingOpen.current = null;
          setHovered(index);
        }, OPEN_DELAY);
        return;
      }

      pendingClose.current = setTimeout(() => {
        pendingClose.current = null;
        setHovered((previous) => (previous === index ? null : previous));
      }, CLOSE_DELAY);
    },
    [clearTimers]
  );

  const onRegister = useCallback(
    (index: number, node: HTMLButtonElement | null) => {
      nodes.current[index] = node;
    },
    []
  );

  const moveTo = useCallback(
    (next: number) => {
      const bounded = Math.min(count - 1, Math.max(0, next));
      setCursor(bounded);
      nodes.current[bounded]?.focus();
    },
    [count]
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLOListElement>) => {
    const from = cursor ?? active;

    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight": {
        event.preventDefault();
        moveTo(from + 1);
        break;
      }
      case "ArrowUp":
      case "ArrowLeft": {
        event.preventDefault();
        moveTo(from - 1);
        break;
      }
      case "Home": {
        event.preventDefault();
        moveTo(0);
        break;
      }
      case "End": {
        event.preventDefault();
        moveTo(count - 1);
        break;
      }
      default: {
        break;
      }
    }
  };

  const onBlur = (event: React.FocusEvent<HTMLOListElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setCursor(null);
    }
  };

  const config = useMemo<RailConfig>(
    () => ({
      highlight,
      maxLength,
      minLength,
      minOpacity,
      origin: side === "right" ? "right" : "left",
      pitch,
      popoverSide: side === "right" ? "left" : "right",
      spread,
      thickness,
    }),
    [
      highlight,
      maxLength,
      minLength,
      minOpacity,
      pitch,
      side,
      spread,
      thickness,
    ]
  );

  if (count === 0) {
    return null;
  }

  // Without a handler and without previews the rail is a read-out, not a control:
  // hidden from assistive tech, out of the tab order, out of the way of the pointer.
  const interactive = Boolean(onSelect) || items.some((item) => item.preview);

  return (
    <nav
      aria-hidden={interactive ? undefined : true}
      aria-label={interactive ? label : undefined}
      className={cn(
        "text-foreground shrink-0 select-none",
        !interactive && "pointer-events-none",
        className
      )}
      data-slot="scroll-rail"
      style={{ width: maxLength }}
    >
      <ol className="m-0 list-none p-0" onBlur={onBlur} onKeyDown={onKeyDown}>
        {items.map((item, index) => (
          <Tick
            ariaLabel={`${index + 1} of ${count}: ${item.label ?? "Untitled"}`}
            canHover={canHover}
            config={config}
            current={index === active}
            hovered={hovered === index}
            index={index}
            item={item}
            key={item.id}
            onHover={onHover}
            onRegister={onRegister}
            onSelect={onSelect}
            tabIndex={index === (cursor ?? active) ? 0 : -1}
            track={track}
          />
        ))}
      </ol>
    </nav>
  );
}
