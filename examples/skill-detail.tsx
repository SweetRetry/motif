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

/** Shipped with the docs so the demo needs no external host — swap in your own covers.
 *  Two crops of one poster: the card draws 16:9, the panel fills the height of its head. */
const COVER = "/skill-detail/invoice-reconciler.svg";
const COVER_PORTRAIT = "/skill-detail/invoice-reconciler-portrait.svg";

/** What the card has room for. */
const SUMMARY =
  "Match a month's invoices against the bank feed and flag what still needs a person.";

/** What the panel has room for. */
const DESCRIPTION =
  "Match a month's invoices against the bank feed and flag what a human still has to look at. Read this skill before touching the ledger: it owns the matching rules, the rounding tolerance and the wording of the report.";

const FILES: SkillFile[] = [
  { path: "SKILL.md" },
  { path: "LICENSE.txt" },
  { path: "references/matching.md" },
  { path: "references/vendors.md" },
  { path: "scripts/reconcile.py" },
];

const FRONT_MATTER = `name: invoice-reconciler
description: Match invoices against the bank feed and flag the ones that need a human
license: Complete terms in LICENSE.txt`;

const SCRIPT = `def reconcile(invoices, feed, tolerance=0.01):
    """Match on amount and date, then fall back to the vendor alias table."""
    return [match(invoice, feed, tolerance) for invoice in invoices]`;

const Prose = ({ children, title }: { children: ReactNode; title: string }) => (
  <section className="flex flex-col gap-2">
    <h3 className="text-base font-semibold tracking-tight">{title}</h3>
    <p className="text-sm text-muted-foreground">{children}</p>
  </section>
);

/** Stands in for whatever renders the file: the panel hands over the path and takes back
 *  a node, so a markdown pipeline, a diff or an iframe all fit behind the same prop. */
const PREVIEWS: Record<string, ReactNode> = {
  "LICENSE.txt": (
    <Prose title="License">
      Complete terms in LICENSE.txt. Redistribution without the notice is not
      permitted.
    </Prose>
  ),
  "SKILL.md": (
    <div className="flex flex-col gap-6">
      <SkillCode code={FRONT_MATTER} language="YAML" />
      {/* One step under the panel's own heading: a document inside a surface never outranks
          the surface. */}
      <h2 className="text-lg font-semibold tracking-tight">
        Invoice Reconciler
      </h2>
      <Prose title="About matching">
        This skill explains how a month's invoices are matched against the bank
        feed: amount and date first, vendor aliases second, and a tolerance of
        one cent for rounding. Anything still unmatched is a question for a
        person, not a guess.
      </Prose>
      <Prose title="Closing a month">
        Run the matcher, read the unmatched list, then write the variance
        report. Never edit the ledger from here — reconciling proposes, the
        accountant disposes.
      </Prose>
    </div>
  ),
  "references/matching.md": (
    <Prose title="Matching">
      Amount and date within three days is a match. Failing that, check the
      alias table before proposing a candidate, and only ever propose one — a
      ranked list of five is a question the reader still has to answer.
    </Prose>
  ),
  "references/vendors.md": (
    <Prose title="Vendors">
      One line per vendor: the name as it is invoiced, the name as it appears on
      the statement, and the account the money actually leaves. Aliases are read
      top down, first hit wins.
    </Prose>
  ),
  "scripts/reconcile.py": <SkillCode code={SCRIPT} language="PYTHON" />,
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
        title="Invoice Reconciler"
      />

      <p className="text-xs text-muted-foreground">
        Press the card to open the panel.
      </p>

      <SkillDetailDialog
        author={{ name: "Tidepool" }}
        cover={COVER_PORTRAIT}
        defaultEnabled
        description={DESCRIPTION}
        files={FILES}
        folder="invoice-reconciler"
        onEnabledChange={(next) =>
          toast(next ? "Enabled for this session" : "Disabled")
        }
        onOpenChange={setOpen}
        onPrompt={(prompt) => toast(`Queued “${prompt}”`)}
        onTry={() => toast("Opening a session")}
        open={open}
        prompts={[
          "Reconcile last month and list what is unmatched.",
          "Why didn't invoice 4821 match? Name the closest.",
          "Write the quarterly variance report, grouped by vendor.",
        ]}
        renderPreview={(file) => PREVIEWS[file.path] ?? null}
        tags={["Finance", "Automation"]}
        title="Invoice Reconciler"
        updatedAt="March 4, 2026"
      />
    </div>
  );
};
