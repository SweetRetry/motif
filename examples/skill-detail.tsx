"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import {
  SkillCard,
  SkillCode,
  SkillDetailDialog,
} from "@/registry/new-york/agents/skill-detail";
import type { SkillFile } from "@/registry/new-york/agents/skill-detail";

/** Real data: Anthropic's open-source `algorithmic-art` skill, as it stands in
 *  github.com/anthropics/skills. The file list, front matter and excerpts are copied from
 *  that folder. The art is not the skill's output: it was generated with Midjourney V8.2
 *  from the skill's own philosophy examples and ships with the docs so the demo needs no
 *  external host. Two crops of one cover: the card draws 16:9, the panel fills its rail. */
const COVER = "/skill-detail/algorithmic-art.webp";
const COVER_PORTRAIT = "/skill-detail/algorithmic-art-portrait.webp";

/** What the card has room for. */
const SUMMARY =
  "Generative art in p5.js, with seeded randomness and live parameter exploration.";

/** What the panel has room for: the skill's own description. */
const DESCRIPTION =
  "Creating algorithmic art using p5.js with seeded randomness and interactive parameter exploration. Use this when users request creating art using code, generative art, algorithmic art, flow fields, or particle systems.";

/** One per philosophy the skill names as an example. */
const RESULTS = [
  {
    label: "Organic Turbulence",
    src: "/skill-detail/result-organic-turbulence.webp",
  },
  {
    label: "Quantum Harmonics",
    src: "/skill-detail/result-quantum-harmonics.webp",
  },
  {
    label: "Recursive Whispers",
    src: "/skill-detail/result-recursive-whispers.webp",
  },
  {
    label: "Stochastic Crystallization",
    src: "/skill-detail/result-stochastic-crystallization.webp",
  },
];

const FILES: SkillFile[] = [
  { path: "SKILL.md" },
  { path: "LICENSE.txt" },
  { path: "templates/generator_template.js" },
  { path: "templates/viewer.html" },
];

const FRONT_MATTER = `name: algorithmic-art
description: Creating algorithmic art using p5.js with seeded randomness and interactive parameter exploration. Use this when users request creating art using code, generative art, algorithmic art, flow fields, or particle systems. Create original algorithmic art rather than copying existing artists' work to avoid copyright violations.
license: Complete terms in LICENSE.txt`;

const LICENSE = `                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/`;

const GENERATOR = `// ALWAYS use seeded random for Art Blocks-style reproducible output

function initializeSeed(seed) {
    randomSeed(seed);
    noiseSeed(seed);
    // Now all random() and noise() calls will be deterministic
}

function setup() {
    createCanvas(800, 800);

    // Initialize seed first
    initializeSeed(params.seed);
}`;

const VIEWER = `<!-- Seed Section (ALWAYS KEEP THIS) -->
<div class="control-section">
    <h3>Seed</h3>
    <input type="number" id="seed-input" class="seed-input" value="12345" onchange="updateSeed()">
    <div class="seed-controls">
        <button class="button secondary" onclick="previousSeed()">← Prev</button>
        <button class="button secondary" onclick="nextSeed()">Next →</button>
    </div>
    <button class="button tertiary regen-button" onclick="randomSeedAndUpdate()">↻ Random</button>
</div>`;

const Prose = ({ children, title }: { children: ReactNode; title: string }) => (
  <section className="flex flex-col gap-2">
    <h3 className="text-base font-semibold tracking-tight">{title}</h3>
    <p className="text-sm text-muted-foreground">{children}</p>
  </section>
);

/** Stands in for whatever renders the file: the panel hands over the path and takes back
 *  a node, so a markdown pipeline, a diff or an iframe all fit behind the same prop. */
const PREVIEWS: Record<string, ReactNode> = {
  "LICENSE.txt": <SkillCode code={LICENSE} language="TEXT" />,
  "SKILL.md": (
    <div className="flex flex-col gap-6">
      <SkillCode code={FRONT_MATTER} language="YAML" />
      {/* One step under the panel's own heading: a document inside a surface never outranks
          the surface. */}
      <h2 className="text-lg font-semibold tracking-tight">
        Algorithmic Philosophy Creation
      </h2>
      <Prose title="Two steps">
        Algorithmic philosophies are computational aesthetic movements that are
        then expressed through code. First an algorithmic philosophy, written as
        a .md file. Then that philosophy expressed as p5.js generative art, as
        .html and .js files.
      </Prose>
      <Prose title="Variations & exploration">
        The artifact includes seed navigation by default (prev/next/random
        buttons), allowing users to explore variations without creating multiple
        files. This is like creating a series of prints from the same plate -
        the algorithm is consistent, but each seed reveals different facets of
        its potential.
      </Prose>
    </div>
  ),
  "templates/generator_template.js": (
    <SkillCode code={GENERATOR} language="JAVASCRIPT" />
  ),
  "templates/viewer.html": <SkillCode code={VIEWER} language="HTML" />,
};

export const SkillDetailDemo = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex w-full max-w-3xl flex-col items-start gap-4">
      <SkillCard
        className="w-72 shrink-0"
        cover={COVER}
        description={SUMMARY}
        onOpen={() => setOpen(true)}
        title="Algorithmic Art"
      />

      <p className="text-xs text-muted-foreground">
        Press the card to open the panel.
      </p>

      <SkillDetailDialog
        author={{
          href: "https://github.com/anthropics/skills",
          name: "Anthropic",
        }}
        cover={COVER_PORTRAIT}
        defaultEnabled
        description={DESCRIPTION}
        files={FILES}
        folder="algorithmic-art"
        onEnabledChange={(next) =>
          toast(next ? "Enabled for this session" : "Disabled")
        }
        onOpenChange={setOpen}
        onPrompt={(prompt) => toast(`Queued “${prompt}”`)}
        onTry={() => toast("Opening a session")}
        open={open}
        prompts={[
          "Make a flow field where fast particles burn bright and slow ones fade.",
          "Write an algorithmic philosophy for wave interference, then sketch it.",
          "Turn this viewer into a gallery of six seeds side by side.",
        ]}
        renderPreview={(file) => PREVIEWS[file.path] ?? null}
        results={RESULTS}
        resultsNote="Generated with Midjourney V8.2 from the skill\u2019s philosophy examples, not by the skill itself."
        tags={["Creative", "p5.js"]}
        title="Algorithmic Art"
        updatedAt="April 20, 2026"
      />
    </div>
  );
};
