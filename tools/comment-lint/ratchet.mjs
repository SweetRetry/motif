#!/usr/bin/env node
/** The comment ratchet.
 *
 * Every file under the covered roots may keep at most the number of comments the
 * baseline records for it. A file that grows past its number fails. A file that
 * comes in under it is a candidate for tightening, and `--update` rewrites the
 * baseline downwards to whatever the tree holds now, so the ratchet only ever
 * clicks forward.
 *
 * Run with no flags to check (exit 1 on growth). Run `--update` after a cleanup
 * pass to lock the new floor in. Run `--report` to see where the comments are.
 *
 * The count is of comments, not lines: a twelve-line block and a one-line `//`
 * are one each, which is the unit a person deletes. */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { ts } from "ts-morph";

import { countsAsComment } from "./classify.mjs";

const here = import.meta.dirname;
const repoRoot = join(here, "..", "..");
const baselinePath = join(here, "baseline.json");

const COVERED_ROOTS = [
  "registry/new-york",
  "app",
  "components",
  "hooks",
  "lib",
];
const EXTENSIONS = /\.(ts|tsx)$/;

const walk = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) {
      continue;
    }
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(path));
    } else if (EXTENSIONS.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
};

/** The scanner hands back every comment token in the file, leading or trailing.
 *  A token the lint rule would not report — an empty spacer, a lint directive —
 *  is not counted here either, so the ratchet and the rule agree on what a
 *  comment is. */
const countComments = (absolutePath) => {
  const source = readFileSync(absolutePath, "utf-8");
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    source
  );
  let count = 0;
  for (
    let token = scanner.scan();
    token !== ts.SyntaxKind.EndOfFileToken;
    token = scanner.scan()
  ) {
    if (
      token !== ts.SyntaxKind.SingleLineCommentTrivia &&
      token !== ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      continue;
    }
    if (countsAsComment(scanner.getTokenText())) {
      count += 1;
    }
  }
  return count;
};

const collect = () => {
  const counts = {};
  for (const root of COVERED_ROOTS) {
    const absolute = join(repoRoot, root);
    if (!statSync(absolute, { throwIfNoEntry: false })) {
      continue;
    }
    for (const file of walk(absolute)) {
      const count = countComments(file);
      if (count > 0) {
        counts[relative(repoRoot, file)] = count;
      }
    }
  }
  return counts;
};

const sum = (counts) => Object.values(counts).reduce((a, b) => a + b, 0);

const loadBaseline = () => {
  try {
    return JSON.parse(readFileSync(baselinePath, "utf-8"));
  } catch {
    return {};
  }
};

const main = () => {
  const flags = new Set(process.argv.slice(2));
  const current = collect();

  if (flags.has("--update")) {
    const sorted = Object.fromEntries(
      Object.entries(current).toSorted(([a], [b]) => a.localeCompare(b))
    );
    writeFileSync(baselinePath, `${JSON.stringify(sorted, null, 2)}\n`);
    console.log(
      `baseline written: ${Object.keys(sorted).length} files, ${sum(sorted)} comments`
    );
    return;
  }

  const baseline = loadBaseline();

  if (flags.has("--report")) {
    const rows = Object.entries(current).toSorted(([, a], [, b]) => b - a);
    for (const [file, count] of rows) {
      console.log(`${String(count).padStart(5)}  ${file}`);
    }
    console.log(`\n${rows.length} files, ${sum(current)} comments`);
    return;
  }

  const grown = [];
  for (const [file, count] of Object.entries(current)) {
    const allowed = baseline[file] ?? 0;
    if (count > allowed) {
      grown.push({ allowed, count, file });
    }
  }

  const burnable =
    sum(baseline) -
    sum(
      Object.fromEntries(
        Object.entries(baseline).map(([file, allowed]) => [
          file,
          Math.min(allowed, current[file] ?? 0),
        ])
      )
    );

  if (grown.length > 0) {
    console.error("Comments were added past the baseline in:\n");
    for (const { allowed, count, file } of grown.toSorted(
      (a, b) => b.count - a.count
    )) {
      console.error(
        `  ${file}: ${count} comments (allowed ${allowed}, +${count - allowed})`
      );
    }
    console.error(
      "\nDelete the new comments. If one records a decision, move it to docs/adr/ first."
    );
    process.exit(1);
  }

  console.log(
    `comments: ${sum(current)} current, ${sum(baseline)} allowed. ` +
      `${burnable > 0 ? `${burnable} below baseline; run --update to tighten.` : "at baseline."}`
  );
};

main();
