"use client";

import { Check, ChevronDown, Info, Target } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { useModelSelect } from "./context";
import type {
  ModelSelectModel,
  ModelSelectProvider,
  ModelSelectSectionData,
} from "./types";

/* -- The parts -----------------------------------------------------------------
 * A model list is long and mostly unread, so it is assembled the way a list of places
 * is: a rail down the side that says what is in the list, and one scroll that holds all
 * of it — what is recommended first, then every maker in turn. The rail is an index, not
 * a filter: it never changes what the list holds, it only says where you are in it, and
 * it follows the scroll so the two can never disagree.
 *
 * The parts below are the whole surface. A caller assembles them, which is what makes a
 * one-maker list, or a picker with the rail left off, the same component arranged
 * differently rather than a second component.
 *
 * The list itself is `cmdk`: filtering, arrow keys, the roving selection and the
 * listbox/option semantics are the primitive's, so a part here only has to say what a row
 * looks like. The query is held by the root and handed back down, so a part that is not
 * the field can still clear it.
 * --------------------------------------------------------------------------- */

/** How far into the list a heading has to have reached to count as the one you are in.
 *  A few pixels of tolerance keeps the marker from flip-flopping on a partial row. */
const STICKY_LEAD = 12;

/** Breathing room left above a section the rail walked to, so its heading is not pinned
 *  to the very edge of the box. */
const WALK_GAP = 6;

/**
 * Which section a row is drawn in. A row's identity has to be unique across the whole
 * list, because a model that is recommended is also in its maker's section — the same
 * model, twice — and the list tracks which row is picked by that string. Two rows sharing
 * one light up together.
 */
const SectionContext = createContext<string | null>(null);

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The maker's mark where the caller gave one, and its initial where they did not: a rail
 * with empty tiles in it is a row of buttons with nothing to aim at, and the initial is
 * the one thing every provider has.
 *
 * The box is the glyph's, not the artwork's — the mark is whatever node the caller passed,
 * and it is stretched to the box this part is drawn in, so one icon can sit in a heading,
 * a rail and a row without the caller sizing it three times.
 */
export const ProviderGlyph = ({
  className,
  provider,
}: {
  className?: string;
  provider?: ModelSelectProvider;
}) => {
  if (!provider) {
    return null;
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-4.5 shrink-0 items-center justify-center font-medium text-[11px] text-muted-foreground [&_img]:size-full [&_svg]:size-full",
        className
      )}
    >
      {provider.icon ?? provider.name.slice(0, 1)}
    </span>
  );
};

export type ModelSelectContentProps = ComponentProps<typeof PopoverContent>;

/**
 * The panel. It draws the surface and the field's chrome and nothing else — what is
 * inside is the caller's arrangement of the search, the rail and the list.
 */
export const ModelSelectContent = ({
  children,
  className,
  ...props
}: ModelSelectContentProps) => (
  <PopoverContent
    align="start"
    className={cn(
      // A floating surface, so `popover`: the panel is nearer than the card it is opened
      // over, in both themes. The height is whatever the window leaves Radix.
      "flex max-h-(--radix-popover-content-available-height) w-[27rem] flex-col overflow-hidden rounded-2xl border-border p-0 shadow-xl",
      // The search row is drawn by `command`'s input, at this panel's scale rather than a
      // form's, and it is laid on the panel's two structural columns rather than the list's:
      // the glyph in the rail's column (19 + 18 + 19 = the rail's 56, so the magnifier is
      // centred on the same line as every mark in the rail), and the text starting exactly
      // on the rail's edge — the line the list beside it starts at.
      "[&_[data-slot=command-input-wrapper]]:h-11 [&_[data-slot=command-input-wrapper]]:gap-4.75 [&_[data-slot=command-input-wrapper]]:border-border [&_[data-slot=command-input-wrapper]]:pr-5 [&_[data-slot=command-input-wrapper]]:pl-4.75 [&_[data-slot=command-input-wrapper]_svg]:size-4.5 [&_[data-slot=command-input]]:h-11 [&_[data-slot=command-input]]:py-0",
      className
    )}
    sideOffset={6}
    {...props}
  >
    <Command className="flex h-full w-full flex-col" loop>
      {children}
    </Command>
  </PopoverContent>
);

/**
 * The way in: one mark, one name, one chevron. The mark is the loud part because it is
 * the part read at a glance; the name sits in the muted tone the rest of the row uses, so
 * the trigger has one subject instead of two.
 */
export interface ModelSelectTriggerProps {
  /** Replaces the face — mark, name, chevron. A caller who wants a different trigger
   *  draws it here and keeps the popover's wiring. */
  children?: ReactNode;
  className?: string;
  /** Said instead of the model name when nothing is selected. */
  placeholder?: string;
}

export const ModelSelectTrigger = ({
  children,
  className,
  placeholder,
}: ModelSelectTriggerProps) => {
  const { disabled, models, providers, triggerPlaceholder, value } =
    useModelSelect();
  const active = models.find((model) => model.id === value);
  const provider = providers.find((item) => item.id === active?.provider);

  return (
    <PopoverTrigger asChild disabled={disabled}>
      <button
        aria-label={active ? `Model: ${active.name}` : undefined}
        className={cn(
          "flex h-10 max-w-52 shrink-0 cursor-pointer items-center gap-2 rounded-full pr-2 pl-2.5 outline-none transition-colors duration-150 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        type="button"
      >
        {children ?? (
          <>
            <ProviderGlyph provider={provider} />
            {/* The name is the part that changes, so it is the part that truncates. */}
            <span className="truncate text-muted-foreground text-sm">
              {active?.name ?? placeholder ?? triggerPlaceholder}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground/60" />
          </>
        )}
      </button>
    </PopoverTrigger>
  );
};

/**
 * The field. It is `command`'s input, which already carries the glyph and the hairline —
 * this part only holds the query in the root, so the rail can clear it and a section can
 * tell whether the list is a search.
 */
export const ModelSelectSearch = ({
  className,
  placeholder = "Search models",
  ...props
}: Omit<ComponentProps<typeof CommandInput>, "onValueChange" | "value">) => {
  const { query, setQuery } = useModelSelect();

  return (
    <CommandInput
      className={cn("text-sm", className)}
      onValueChange={setQuery}
      placeholder={placeholder}
      value={query}
      {...props}
    />
  );
};

/**
 * The rail: one entry per section, in the order the list walks them. It is the index into
 * a list that is already on screen, so an entry walks to its section instead of filtering
 * — and while a search owns the list it marks nothing, because lighting a maker up would
 * claim a position the list does not have.
 */
export const ModelSelectIndex = ({
  className,
  ...props
}: ComponentProps<"div">) => {
  const { activeSection, query, sections, walkTo } = useModelSelect();
  const railRef = useRef<HTMLDivElement>(null);
  const browsing = !query.trim();
  const current = sections.some((section) => section.id === activeSection)
    ? activeSection
    : sections[0]?.id;

  // A long enough rail scrolls, and the arrow keys can walk the list past the entry that
  // marks where you are: the index follows its own highlight the way it follows the scroll.
  useEffect(() => {
    railRef.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [current]);

  return (
    <div
      ref={railRef}
      className={cn(
        "no-scrollbar flex w-14 shrink-0 flex-col items-center gap-1 overflow-y-auto border-border border-r py-2",
        className
      )}
      {...props}
    >
      {sections.map((section) => {
        const on = browsing && current === section.id;

        return (
          <button
            aria-current={on ? "true" : undefined}
            aria-label={section.label}
            className={cn(
              "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl outline-none transition-colors duration-150 focus-visible:bg-accent",
              on
                ? "bg-accent text-foreground"
                : "text-muted-foreground/70 hover:bg-accent/60"
            )}
            key={section.id}
            onClick={() => walkTo(section.id)}
            title={section.label}
            type="button"
          >
            {section.provider ? (
              <ProviderGlyph provider={section.provider} />
            ) : (
              (section.icon ?? <Target className="size-4.5" />)
            )}
          </button>
        );
      })}
    </div>
  );
};

/**
 * One model. The row is the mark, the name with whatever the caller hangs off it, the
 * line under it, and the check that says this is the one in use.
 */
export interface ModelSelectItemProps extends Omit<
  ComponentProps<typeof CommandItem>,
  "value"
> {
  /** Replaces the row's own content — the name, its `meta` and its description. */
  children?: ReactNode;
  model: ModelSelectModel;
}

export const ModelSelectItem = ({
  children,
  className,
  model,
  ...props
}: ModelSelectItemProps) => {
  const section = useContext(SectionContext);
  const { providers, select, value } = useModelSelect();
  const provider = providers.find((item) => item.id === model.provider);

  return (
    <CommandItem
      className={cn(
        "items-start gap-3 rounded-xl px-3 py-2.5 data-[selected=true]:bg-accent data-[selected=true]:text-foreground",
        className
      )}
      // What the search reads: the name first, then everything else that answers "which
      // model is this" — the maker, the line under it, and whatever the caller added.
      keywords={[
        model.name,
        provider?.name ?? model.provider,
        model.description ?? "",
        ...(model.keywords ?? []),
      ]}
      onSelect={() => select(model.id)}
      // Where the row is, not what it says: unique per row, stable across renders.
      value={`${section ?? "catalogue"}:${model.id}`}
      {...props}
    >
      <ProviderGlyph className="mt-0.5" provider={provider} />
      <span className="min-w-0 flex-1">
        {children ?? (
          <>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="truncate font-medium text-[13.5px] text-foreground">
                {model.name}
              </span>
              {model.meta ? (
                <span className="flex shrink-0 items-center gap-1.5">
                  {model.meta}
                </span>
              ) : null}
            </span>
            {model.description ? (
              <span className="mt-1 block truncate text-muted-foreground text-xs">
                {model.description}
              </span>
            ) : null}
          </>
        )}
      </span>
      <span className="mt-0.5 flex w-5 shrink-0 justify-center">
        {value === model.id ? (
          <Check className="size-4 text-foreground" />
        ) : null}
      </span>
    </CommandItem>
  );
};

/**
 * One section of the list: a heading that stays put while its models go by, and the
 * models themselves. The heading is the marker the rail reads and the list spies on, so a
 * caller who replaces the rows keeps the heading they were given.
 */
export interface ModelSelectSectionProps {
  /** Replaces the rows. A caller with their own row content keeps the heading — and the
   *  rail entry — that the section was given. */
  children?: ReactNode;
  className?: string;
  section: ModelSelectSectionData;
}

export const ModelSelectSection = ({
  children,
  className,
  section,
}: ModelSelectSectionProps) => (
  <CommandGroup
    className={cn(
      // The heading is one 36px row — the height of a rail entry, so the first maker lines
      // up with the first icon — and it scrolls with its models. A sticking heading parks
      // itself over the row that came before it, which reads as a broken grid: the row is
      // half covered and nothing above it lines up any more.
      "p-0 pt-2 [&_[cmdk-group-heading]]:flex [&_[cmdk-group-heading]]:h-9 [&_[cmdk-group-heading]]:items-center [&_[cmdk-group-heading]]:gap-3 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:tracking-wide",
      className
    )}
    data-section={section.id}
    heading={
      <>
        {section.provider ? (
          <ProviderGlyph provider={section.provider} />
        ) : (
          (section.icon ?? <Target className="size-4.5" />)
        )}
        {section.label}
        {section.hint ? (
          <span className="text-muted-foreground/60" title={section.hint}>
            <Info className="size-3.5" />
          </span>
        ) : null}
      </>
    }
  >
    <SectionContext.Provider value={section.id}>
      {children ??
        section.models.map((model) => (
          <ModelSelectItem key={model.id} model={model} />
        ))}
    </SectionContext.Provider>
  </CommandGroup>
);

/**
 * The list: the whole catalogue in one scroll, and the spy that reads it. What is at the
 * top of the box is what the rail marks, and a section the rail walked to is brought up
 * here — after the render that un-hid it, never before.
 */
export const ModelSelectList = ({
  children,
  className,
  onScroll,
  ...props
}: ComponentProps<typeof CommandList>) => {
  const {
    clearPendingSection,
    emptyLabel,
    listRef,
    pendingSection,
    query,
    sections,
    setActiveSection,
  } = useModelSelect();

  const read = (event?: React.UIEvent<HTMLDivElement>) => {
    onScroll?.(event as React.UIEvent<HTMLDivElement>);
    const list = listRef.current;
    if (!list) {
      return;
    }

    // Hidden sections are sections a search filtered out; they have no position to spy on.
    const markers = [
      ...list.querySelectorAll<HTMLElement>("[data-section]"),
    ].filter((marker) => !marker.hidden);
    if (!markers.length) {
      return;
    }

    const { top } = list.getBoundingClientRect();
    let current = markers[0]?.dataset.section;
    for (const marker of markers) {
      if (marker.getBoundingClientRect().top - top > STICKY_LEAD) {
        break;
      }
      current = marker.dataset.section;
    }

    // The last section is short, so it can never reach the top on its own: at the end of
    // the box, whatever is left is the one you are looking at.
    if (
      list.scrollHeight > list.clientHeight &&
      list.scrollTop + list.clientHeight >= list.scrollHeight - 2
    ) {
      current = markers.at(-1)?.dataset.section ?? current;
    }

    if (current) {
      setActiveSection(current);
    }
  };

  useLayoutEffect(() => {
    if (!pendingSection) {
      return;
    }

    const list = listRef.current;
    const marker = list?.querySelector<HTMLElement>(
      `[data-section="${pendingSection}"]`
    );
    if (list && marker) {
      const top =
        list.scrollTop +
        marker.getBoundingClientRect().top -
        list.getBoundingClientRect().top -
        WALK_GAP;
      list.scrollTo({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        top: Math.max(0, top),
      });
    }
    clearPendingSection();
  }, [clearPendingSection, listRef, pendingSection]);

  return (
    <CommandList
      className={cn(
        // No top padding: the section carries its own, so the first maker's heading and
        // the rail's first entry land on the same line.
        "no-scrollbar max-h-[26rem] min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 pb-2",
        className
      )}
      onScroll={read}
      ref={listRef}
      {...props}
    >
      {children ??
        sections.map((section) => (
          <ModelSelectSection key={section.id} section={section} />
        ))}
      <CommandEmpty className="px-4 py-10 text-center text-muted-foreground text-xs">
        {emptyLabel} “{query.trim()}”
      </CommandEmpty>
    </CommandList>
  );
};
