"use client";

import { useState } from "react";

import { CoverFan } from "@/registry/new-york/cover-fan";
import type { CoverFanItem } from "@/registry/new-york/cover-fan";

/** Shipped with the docs so the demo needs no external host — swap in your own covers.
 *  Cropped to 3:4, which is the shape the card draws. */
const PRESETS: CoverFanItem[] = [
  {
    id: "watercolor-rose",
    src: "/cover-fan/watercolor-rose.webp",
    title: "Watercolor Rose",
  },
  {
    id: "unbound-bloom",
    src: "/cover-fan/unbound-bloom.webp",
    title: "Unbound Bloom",
  },
  {
    id: "refraction",
    src: "/cover-fan/refraction.webp",
    title: "Refraction",
  },
  {
    id: "verdant-notes",
    src: "/cover-fan/verdant-notes.webp",
    title: "Verdant Notes",
  },
];

export const CoverFanDemo = () => {
  const [picked, setPicked] = useState<CoverFanItem | null>(null);

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-8">
      <CoverFan items={PRESETS} onSelect={setPicked} />
      <p className="text-xs text-muted-foreground">
        {picked ? `Queued “${picked.title}”` : "Pick a cover to start"}
      </p>
    </div>
  );
};

/** The same fan in a narrower column: the container decides the size, so nothing else
 *  has to change. */
export const CoverFanCompactDemo = () => {
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      <CoverFan
        items={PRESETS}
        label="Presets at a smaller size"
        onSelect={(item) => setPicked(item.title)}
      />
      <p className="text-xs text-muted-foreground">
        {picked ?? "Pick a cover to start"}
      </p>
    </div>
  );
};
