#!/usr/bin/env node
/** Dump every comment block in the covered tree, one line each, grouped by file.
 *
 * This is the input to a classification pass: a reviewer reads the list, tags each
 * block REDUNDANT / OUTDATED / EXCUSE / DECISION, and only then opens the files to
 * delete. Reading the blocks as a list keeps the decision about a comment separate
 * from the code under it, which is the whole discipline of a sweep.
 *
 * A block is a run of adjacent comment lines with nothing but whitespace between
 * them, so a twelve-line header prints as one line. Blank-line-separated JSDoc and
 * a following `//` print as two, because a reader deletes them separately.
 *
 * Usage: node tools/comment-lint/dump.mjs [path...] > /tmp/blocks.txt
 * With no path it walks the same roots the ratchet covers. */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const here = import.meta.dirname;
const repoRoot = join(here, "..", "..");

const DEFAULT_ROOTS = [
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

const isCommentLine = (line) => {
  const text = line.trim();
  return text.startsWith("//") || text.startsWith("/*") || text.startsWith("*");
};

const blocksIn = (source) => {
  const lines = source.split("\n");
  const blocks = [];
  let current = null;
  for (let index = 0; index < lines.length; index += 1) {
    if (isCommentLine(lines[index])) {
      if (!current) {
        current = { lines: [], start: index + 1 };
      }
      current.lines.push(lines[index].trim());
    } else if (current) {
      blocks.push(current);
      current = null;
    }
  }
  if (current) {
    blocks.push(current);
  }
  return blocks;
};

const targets =
  process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_ROOTS;

let fileCount = 0;
let blockCount = 0;

for (const target of targets) {
  const absolute = join(repoRoot, target);
  if (!statSync(absolute, { throwIfNoEntry: false })) {
    continue;
  }
  const files = statSync(absolute).isDirectory() ? walk(absolute) : [absolute];
  for (const file of files) {
    const blocks = blocksIn(readFileSync(file, "utf-8"));
    if (blocks.length === 0) {
      continue;
    }
    fileCount += 1;
    blockCount += blocks.length;
    console.log(
      `\n##### ${relative(repoRoot, file)} (${blocks.length} blocks)`
    );
    for (const block of blocks) {
      console.log(`@${block.start}: ${block.lines.join(" ").slice(0, 200)}`);
    }
  }
}

console.error(`${blockCount} blocks across ${fileCount} files`);
