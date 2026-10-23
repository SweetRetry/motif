"use client";

import type { ComponentProps, ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/* -- A page the agent leans on -------------------------------------------------
 * A search found it, or a sentence of the answer rests on it. The reader's question is
 * "where is that from", and the answer is a word, not a row: a small tag that sits in a
 * line of text or in a wrap of its siblings, says the host, and is a link. It has to be
 * small enough to sit among words and still be something you can press.
 *
 * The title of the page is the second answer, and it waits in the tooltip. A tag that
 * carried a title would stop being small, and the host on its own is what a reader uses
 * to decide whether to go.
 *
 * The root is the link and works out the host from `href` once, so the host the label
 * prints and the address the link goes to cannot disagree. Everything else is a part: a
 * caller with no mark leaves it out, one who wants a site name instead of a domain passes
 * it to the label.
 * --------------------------------------------------------------------------- */

/** What a part reads from the root. Exported with `useSource` so a caller can draw a part
 *  of their own, a count of how many times it was cited, from the same host the shipped
 *  parts use. */
export interface SourceState {
  /** The host the link goes to, without `www.`. The `href` itself when it will not parse. */
  host: string;
  href: string;
}

export interface SourceProps extends Omit<
  ComponentProps<"a">,
  "href" | "title"
> {
  children: ReactNode;
  href: string;
  /** What the page calls itself, shown on hover. Without it the tag has no tooltip. */
  title?: string;
}

export type SourceListProps = ComponentProps<"div">;

export interface SourceMarkProps extends Omit<
  ComponentProps<"span">,
  "children"
> {
  /** The site's icon. Defaults to the host's favicon from Google's favicon service. Pass
   *  your own URL to serve it from somewhere you control, or `false` to draw the host's
   *  first letter and make no request. */
  src?: string | false;
}

export type SourceLabelProps = ComponentProps<"span">;

const hostOf = (href: string) => {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
};

const SourceContext = createContext<SourceState | null>(null);

export const useSource = () => {
  const context = useContext(SourceContext);
  if (!context) {
    throw new Error("Source parts must be used within a Source.");
  }

  return context;
};

/**
 * The root: one tag, one link out to the page.
 *
 * It opens in a new tab and sends no referrer. A source is a page somebody else owns, and
 * leaving the transcript behind to read it is the reader's decision, not the page's.
 *
 * The tag is its own surface, so it is `card` with a border: it reads the same whether it
 * sits in a paragraph on the page or in a card, and it answers the pointer with its
 * border and its text, since a fill would be a guess about what it was drawn on.
 */
export const Source = ({
  children,
  className,
  href,
  title,
  ...props
}: SourceProps) => {
  const state = useMemo<SourceState>(
    () => ({ host: hostOf(href), href }),
    [href]
  );

  const tag = (
    <a
      rel="noreferrer noopener"
      target="_blank"
      {...props}
      className={cn(
        "inline-flex h-6 max-w-full min-w-0 items-center gap-1.5 rounded-full border border-border bg-card px-2 align-middle text-muted-foreground text-xs outline-none transition-colors hover:border-ring/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      data-slot="source"
      href={href}
    >
      {children}
    </a>
  );

  return (
    <SourceContext.Provider value={state}>
      {title ? (
        <Tooltip>
          <TooltipTrigger asChild>{tag}</TooltipTrigger>
          <TooltipContent>{title}</TooltipContent>
        </Tooltip>
      ) : (
        tag
      )}
    </SourceContext.Provider>
  );
};

/** Sources side by side, wrapping. A search that found six pages is six tags in a row of
 *  their own, not a column: the tags are the size of a word and a column would waste the
 *  line. */
export const SourceList = ({ className, ...props }: SourceListProps) => (
  <div
    {...props}
    className={cn("flex flex-wrap items-center gap-1.5", className)}
    data-slot="source-list"
  />
);

/** The favicon for a host, at twice the size it is drawn so it is sharp on a dense
 *  screen. */
const faviconOf = (host: string) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`;

/**
 * The mark: the site's icon, which is what a reader finds a tag by.
 *
 * It falls back to the host's first letter when there is no icon to draw: `src={false}`,
 * or an image that did not load. A tag with a broken-image glyph in it would be worse
 * than one with a letter, and the letter is the same in both themes and says nothing it
 * should not.
 *
 * The default `src` asks Google's favicon service for the icon, which tells it the host of
 * every page the agent read. That is the usual trade, and the reason `src` is here: a
 * product that minds serves its own icons, or passes `false`.
 */
export const SourceMark = ({ className, src, ...props }: SourceMarkProps) => {
  const { host } = useSource();
  const url = src === undefined ? faviconOf(host) : src;
  // Remembers which URL failed rather than that one did, so a new `href` gets its try.
  const [failed, setFailed] = useState<string | null>(null);
  const showImage = url && failed !== url;

  return (
    <span
      {...props}
      aria-hidden="true"
      className={cn(
        "flex size-3.5 shrink-0 items-center justify-center overflow-hidden rounded-[3px] text-[9px] uppercase leading-none",
        !showImage && "border border-border",
        className
      )}
      data-slot="source-mark"
    >
      {showImage ? (
        <img
          alt=""
          className="size-full object-cover"
          height={14}
          onError={() => setFailed(url)}
          src={url}
          width={14}
        />
      ) : (
        host.charAt(0)
      )}
    </span>
  );
};

/** What the tag says. It defaults to the host worked out from `href`, so the address a
 *  reader sees is the address they will arrive at; pass children to name the site instead.
 *  One line, cut with an ellipsis. */
export const SourceLabel = ({
  children,
  className,
  ...props
}: SourceLabelProps) => {
  const { host } = useSource();

  return (
    <span
      {...props}
      className={cn("min-w-0 truncate", className)}
      data-slot="source-label"
    >
      {children ?? host}
    </span>
  );
};
