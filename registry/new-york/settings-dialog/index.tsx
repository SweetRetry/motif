"use client";

import { XIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent } from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

import type {
  SettingsCardProps,
  SettingsDialogProps,
  SettingsNavGroup,
  SettingsNavItem,
  SettingsRowProps,
  SettingsSectionProps,
} from "./types";

export type {
  SettingsCardProps,
  SettingsDialogProps,
  SettingsNavGroup,
  SettingsNavItem,
  SettingsRowProps,
  SettingsSectionProps,
} from "./types";

/** The rail is a tablist, so arrows are handled by hand. Left and right are accepted
 *  alongside up and down: below `md` the rail turns into a horizontal strip, and a key
 *  that moves the way the eye moves costs nothing. */
const NEXT_KEYS = new Set(["ArrowDown", "ArrowRight"]);
const PREVIOUS_KEYS = new Set(["ArrowUp", "ArrowLeft"]);

/** A panel fades in rather than sliding: a section is a place, not a direction. Only the
 *  incoming panel moves — running an exit first would put half of this duration between
 *  the click and the answer. */
const PANEL_FADE = { duration: 0.14, ease: EASE_OUT } as const;

/** The one column the panel's text is set on. Inside the panel's own gutter this padding
 *  lands a heading on the same axis as the rows it introduces: the card draws it for its
 *  rows, the section label above a card draws it, and so does the panel's title. The cards
 *  keep their edges — a heading names what is under it rather than the surface it sits on,
 *  so it belongs with the words, and a panel of text on two axes reads as two panels. */
const CONTENT_COLUMN = "px-5";

interface SettingsTabProps {
  item: SettingsNavItem;
  selected: boolean;
  tabId: string;
  panelId: string;
  onSelect: (id: string) => void;
  registerTab: (id: string, node: HTMLButtonElement | null) => void;
}

const SettingsTab = ({
  item,
  selected,
  tabId,
  panelId,
  onSelect,
  registerTab,
}: SettingsTabProps) => {
  const Icon = item.icon;

  return (
    <button
      aria-controls={selected ? panelId : undefined}
      aria-selected={selected}
      className={cn(
        "focus-visible:ring-ring/50 flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-[3px]",
        selected
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
      id={tabId}
      onClick={() => onSelect(item.id)}
      onFocus={() => onSelect(item.id)}
      ref={(node) => registerTab(item.id, node)}
      role="tab"
      tabIndex={selected ? 0 : -1}
      type="button"
    >
      {Icon ? <Icon className="size-4 shrink-0" /> : null}
      <span>{item.label}</span>
    </button>
  );
};

/**
 * A settings surface: destinations down the left, one panel on the right.
 *
 * The rail owns the selection and the panel is whatever you put there, so the component
 * never has to know what a "setting" is. Rows, cards and sections are exported alongside
 * it — the same pieces the panel is built from — so a surface that outgrows the modal can
 * reuse the layout without the dialog.
 */
export const SettingsDialog = ({
  nav,
  children,
  className,
  open,
  defaultOpen,
  onOpenChange,
  activeId,
  defaultActiveId,
  onActiveChange,
  title = "Settings",
  description,
  panelClassName,
}: SettingsDialogProps) => {
  const baseId = useId();
  const reduceMotion = useReducedMotion() ?? false;
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  const items = useMemo(() => nav.flatMap((group) => group.items), [nav]);
  const [uncontrolled, setUncontrolled] = useState(defaultActiveId ?? "");
  const requested = activeId ?? uncontrolled;
  const current = items.find((item) => item.id === requested) ?? items[0];
  const currentId = current?.id ?? "";

  const select = useCallback(
    (id: string) => {
      if (activeId === undefined) {
        setUncontrolled(id);
      }
      onActiveChange?.(id);
    },
    [activeId, onActiveChange]
  );

  const registerTab = useCallback(
    (id: string, node: HTMLButtonElement | null) => {
      if (node) {
        tabRefs.current.set(id, node);
        return;
      }
      tabRefs.current.delete(id);
    },
    []
  );

  /** A panel is read from the top; landing halfway down the last one is disorienting. */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [currentId]);

  /** Keeps the active destination on screen when the rail is a long column or a strip. */
  useEffect(() => {
    tabRefs.current
      .get(currentId)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [currentId]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const ids = items.map((item) => item.id);
      if (ids.length === 0) {
        return;
      }

      let step = 0;
      if (NEXT_KEYS.has(event.key)) {
        step = 1;
      } else if (PREVIOUS_KEYS.has(event.key)) {
        step = -1;
      }

      const index = ids.indexOf(currentId);
      let next: number | undefined;
      if (step !== 0) {
        next = (index + step + ids.length) % ids.length;
      } else if (event.key === "Home") {
        next = 0;
      } else if (event.key === "End") {
        next = ids.length - 1;
      }

      if (next === undefined) {
        return;
      }

      event.preventDefault();
      const id = ids[next];
      select(id);
      tabRefs.current.get(id)?.focus();
    },
    [currentId, items, select]
  );

  const panel = typeof children === "function" ? children(currentId) : children;

  return (
    <Dialog defaultOpen={defaultOpen} onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={cn(
          "flex h-[min(46rem,88dvh)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl md:grid md:grid-cols-[16rem_1fr] md:grid-rows-[minmax(0,1fr)]",
          className
        )}
        showCloseButton={false}
        {...(description ? {} : { "aria-describedby": undefined })}
      >
        <aside className="border-border/60 flex shrink-0 flex-col border-b md:h-full md:min-h-0 md:border-r md:border-b-0">
          {/* The dialog's name is also the opening group's heading, so it wears what
              every other group heading in the rail wears: same muted line, same left
              edge. A title over a list of labelled groups reads as a fourth kind of
              thing in a rail that already has two. */}
          <DialogTitle className="max-md:sr-only text-muted-foreground shrink-0 px-3 pt-6 pb-1 text-xs font-medium">
            {title}
          </DialogTitle>
          <div
            aria-label={title}
            aria-orientation="vertical"
            className="flex gap-1 overflow-x-auto p-3 md:min-h-0 md:flex-1 md:flex-col md:overflow-x-hidden md:overflow-y-auto"
            onKeyDown={handleKeyDown}
            role="tablist"
          >
            {nav.map((group, index) => (
              <div
                className="flex items-center gap-1 md:flex-col md:items-stretch"
                key={group.id ?? group.label ?? index}
              >
                {group.label ? (
                  <div className="text-muted-foreground hidden px-3 pt-6 pb-1 text-xs font-medium md:block">
                    {group.label}
                  </div>
                ) : null}
                {group.items.map((item) => (
                  <SettingsTab
                    item={item}
                    key={item.id}
                    onSelect={select}
                    panelId={`${baseId}-panel`}
                    registerTab={registerTab}
                    selected={item.id === currentId}
                    tabId={`${baseId}-tab-${item.id}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </aside>

        <div
          aria-labelledby={`${baseId}-tab-${currentId}`}
          className="flex min-h-0 flex-1 flex-col outline-none"
          id={`${baseId}-panel`}
          role="tabpanel"
          tabIndex={-1}
        >
          <header className="flex shrink-0 items-center justify-between gap-4 px-5 pt-5 pb-3 sm:px-6 md:pt-6 md:pb-5">
            <h2
              className={cn("truncate text-lg font-semibold", CONTENT_COLUMN)}
            >
              {current?.label}
            </h2>
            <DialogClose className="bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground focus-visible:ring-ring/50 -mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-[3px]">
              <XIcon className="size-4" />
              <span className="sr-only">Close {title}</span>
            </DialogClose>
          </header>

          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 sm:px-6",
              panelClassName
            )}
            ref={scrollRef}
          >
            {reduceMotion ? (
              <div className="flex flex-col gap-6">{panel}</div>
            ) : (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-6"
                initial={{ opacity: 0, y: 3 }}
                key={currentId}
                transition={PANEL_FADE}
              >
                {panel}
              </motion.div>
            )}
          </div>
        </div>

        {description ? (
          <DialogDescription className="sr-only">
            {description}
          </DialogDescription>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

/**
 * The surface a run of rows sits on. The horizontal padding belongs to the card rather
 * than to the row: a `divide-y` line is drawn at the box of the element it separates, so
 * padding on the row runs every separator to the card's edge and cuts one card into a
 * slab per row. Held here, the lines stop where the text does and the card stays whole.
 */
export const SettingsCard = ({ className, children }: SettingsCardProps) => (
  <div
    className={cn(
      "divide-border/60 bg-muted/50 divide-y rounded-2xl",
      CONTENT_COLUMN,
      className
    )}
  >
    {children}
  </div>
);

/** A card with the section's name above it, on the card's content column. */
export const SettingsSection = ({
  children,
  className,
  label,
  cardClassName,
}: SettingsSectionProps) => (
  <section className={cn("flex flex-col gap-2", className)}>
    {label ? (
      <h3
        className={cn(
          "text-muted-foreground text-sm font-medium",
          CONTENT_COLUMN
        )}
      >
        {label}
      </h3>
    ) : null}
    <SettingsCard className={cardClassName}>{children}</SettingsCard>
  </section>
);

/**
 * One setting: what it is on the left, what changes it on the right. The title stays
 * legible on its own because the description is a second line, not a subtitle — a row
 * read at a glance should be the setting's name. It draws no horizontal padding of its
 * own, so its box is the card's content box and the separator above it lands on the same
 * column; `SettingsCard` holds the padding for every child, row or not.
 */
export const SettingsRow = ({
  title,
  description,
  children,
  className,
  align = "center",
}: SettingsRowProps) => (
  <div
    className={cn(
      "flex justify-between gap-6 py-4",
      align === "start" ? "items-start" : "items-center",
      className
    )}
  >
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-sm font-medium">{title}</span>
      {description ? (
        <span className="text-muted-foreground text-sm text-balance">
          {description}
        </span>
      ) : null}
    </div>
    {children ? (
      <div className="flex shrink-0 items-center">{children}</div>
    ) : null}
  </div>
);
