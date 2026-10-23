import {
  Source,
  SourceLabel,
  SourceList,
  SourceMark,
} from "@/registry/new-york/agents/source";

const SOURCES = [
  {
    href: "https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme",
    title: "color-scheme - CSS: Cascading Style Sheets | MDN",
  },
  {
    href: "https://tailwindcss.com/docs/dark-mode",
    title: "Dark mode - Core concepts - Tailwind CSS",
  },
  {
    href: "https://ui.shadcn.com/docs/theming",
    title: "Theming - shadcn/ui",
  },
];

/** The tags in a row of their own. The host on each is read off its `href`: nothing here
 *  writes a domain, so the one shown is the one the link goes to. The page's title waits
 *  in the tooltip. */
export const SourceDemo = () => (
  <SourceList className="w-full max-w-xl">
    {SOURCES.map((source) => (
      <Source href={source.href} key={source.href} title={source.title}>
        <SourceMark />
        <SourceLabel />
      </Source>
    ))}
  </SourceList>
);

/** A tag is the size of a word, so it sits in a line of text. */
export const SourceInlineDemo = () => (
  <p className="w-full max-w-xl text-sm leading-7">
    A token should name a role, not a colour, because the colour is the
    theme&apos;s to decide{" "}
    <Source href={SOURCES[1].href} title={SOURCES[1].title}>
      <SourceMark />
      <SourceLabel />
    </Source>{" "}
    and a library that names colours has to be rewritten for every theme{" "}
    <Source href={SOURCES[2].href} title={SOURCES[2].title}>
      <SourceLabel>shadcn/ui</SourceLabel>
    </Source>
    .
  </p>
);
