"use client";

import { useState } from "react";

import { CoverFan } from "@/registry/new-york/cover-fan";
import {
  GRADIENT_COVER_PALETTES,
  GRADIENT_COVER_PATTERNS,
  GradientCover,
  GradientCoverTitle,
  gradientCoverUrl,
} from "@/registry/new-york/gradient-cover";
import type {
  GradientCoverPalette,
  GradientCoverPattern,
} from "@/registry/new-york/gradient-cover";

/** A shelf of newsletters, each with the palette and pattern it was given. */
const SHELF: {
  palette: GradientCoverPalette;
  pattern: GradientCoverPattern;
  title: string;
}[] = [
  { palette: "sunset", pattern: "plain", title: "Product Teardowns" },
  { palette: "lagoon", pattern: "waves", title: "AI Workflow Handbook" },
  { palette: "dusk", pattern: "dots", title: "Late Night Shipping" },
  { palette: "sunset", pattern: "petals", title: "Build in Public" },
  { palette: "lagoon", pattern: "dots", title: "Design Notes" },
  { palette: "dusk", pattern: "waves", title: "Indie Builders Weekly" },
];

export const GradientCoverDemo = () => (
  <div className="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
    {SHELF.map(({ palette, pattern, title }) => (
      <GradientCover
        key={title}
        palette={palette}
        pattern={pattern}
        seed={title}
      >
        <GradientCoverTitle>{title}</GradientCoverTitle>
      </GradientCover>
    ))}
  </div>
);

const PALETTES = Object.keys(GRADIENT_COVER_PALETTES) as GradientCoverPalette[];

/** Every palette against every pattern, one seed throughout. */
export const GradientCoverMatrixDemo = () => (
  <div className="w-full max-w-2xl overflow-x-auto">
    <table className="w-full border-separate border-spacing-1.5 text-xs text-muted-foreground">
      <thead>
        <tr>
          <th scope="col">
            <span className="sr-only">Palette</span>
          </th>
          {GRADIENT_COVER_PATTERNS.map((pattern) => (
            <th className="font-normal" key={pattern} scope="col">
              {pattern}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {PALETTES.map((palette) => (
          <tr key={palette}>
            <th className="pr-1 text-right font-normal" scope="row">
              {palette}
            </th>
            {GRADIENT_COVER_PATTERNS.map((pattern) => (
              <td key={pattern}>
                <GradientCover
                  className="min-w-12 rounded-md"
                  palette={palette}
                  pattern={pattern}
                  seed="matrix"
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const PROJECTS = [
  "Onboarding revamp",
  "Billing v2",
  "Search relevance",
  "Mobile beta",
  "Docs migration",
];

/** No palette, no pattern: the seed picks both. Rename a project to see its cover change. */
export const GradientCoverSeedDemo = () => {
  const [names, setNames] = useState(PROJECTS);

  return (
    <ul className="flex w-full max-w-md flex-col gap-1">
      {names.map((name, index) => (
        <li className="flex items-center gap-3 rounded-lg p-1.5" key={index}>
          <GradientCover className="size-10 shrink-0 rounded-md" seed={name} />
          <input
            aria-label={`Project ${index + 1} name`}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            onChange={(event) =>
              setNames((current) =>
                current.map((value, i) =>
                  i === index ? event.target.value : value
                )
              )
            }
            value={name}
          />
        </li>
      ))}
    </ul>
  );
};

/** The art as an image source, so a Cover Fan can be filled without shipping a single file. */
const STARTERS = [
  { palette: "lagoon", pattern: "waves", title: "Research brief" },
  { palette: "sunset", pattern: "plain", title: "Launch post" },
  { palette: "dusk", pattern: "dots", title: "Weekly digest" },
  { palette: "sunset", pattern: "petals", title: "Design review" },
] as const;

const STARTER_COVERS = STARTERS.map(({ palette, pattern, title }) => ({
  id: title,
  src: gradientCoverUrl({ palette, pattern, seed: title }),
  title,
}));

export const GradientCoverFanDemo = () => {
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-6">
      <CoverFan
        items={STARTER_COVERS}
        onSelect={(item) => setPicked(item.title)}
      />
      <p className="text-xs text-muted-foreground">
        {picked ? `Starting “${picked}”` : "Pick a starting point"}
      </p>
    </div>
  );
};
