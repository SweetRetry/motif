---
name: delete-comment
description: Sweep a codebase's comments, classify each one, delete the dead weight and move the decisions into ADRs, then tighten the comment ratchet. Use when the user says "delete the comments", "清理注释", "comment sweep", "删掉注释", "comments are dead weight", or wants the comment-ratchet baseline lowered. Also use to finish a partial sweep left by an earlier run.
---

# Deleting comments

Comment removal is not a formatting pass. A comment is one of two things: a restatement of code that should be deleted, or a decision that should be moved to `docs/adr/` and then deleted. There is no third category, and there is no comment worth keeping in source.

The repo's rule lives in [docs/adr/0001-comments-are-deleted-not-written.md](../../../docs/adr/0001-comments-are-deleted-not-written.md). Read it before starting.

## Hard rules

- Never delete a comment you have not classified. The dangerous ones are the rationale comments, not the obvious ones.
- A decision that is deleted without being recorded is a decision the team will re-litigate. Move it first, delete second.
- One writer per repository. This skill edits files, so it cannot run in parallel with another editor over the same tree.
- The inherited template is out of scope. A file that existed at the scaffold commit belongs to the upstream (`git cat-file -e <scaffold-sha>:<path>` exits 0). Sweep only repo-owned files.
- Do not touch `public/r/**` (build output), `video/**`, or any generated file.

## The four categories

Classify every comment block, not every line. A block is a contiguous run of `//`, `/*`, or JSDoc lines.

**REDUNDANT — delete.** Restates what the code already says. `// Increment the counter` over `i++`. A JSDoc that repeats the prop name and nothing else. A comment that would still be true if the line under it were deleted.

**OUTDATED — delete.** Names a file, function, flag, or fact that no longer exists. Commented-out code. A `// TODO` whose target shipped. Verify the claim before deleting: grep for the symbol it names. If it still exists, the comment is not outdated, it is REDUNDANT or a DECISION.

**EXCUSE — delete and file an issue.** The comment is load-bearing for a hack. `// For now we just...`, `// Good enough`, `// This is fine because...` over code that is not fine. The comment is why nobody fixed the hack. Delete the comment, and open an issue that names the hack and the file:line — do not delete the comment and leave the hack silent, and do not fix the hack inside a comment sweep.

**DECISION — move to ADR, then delete.** Records a non-obvious choice: a bug avoided and the exact way it was avoided, a constraint from an external library or the platform, a deliberate inversion of the obvious approach, an SSR/hydration timing reason, an accessibility reason. These are valuable. They are not valuable *in the source*.

A decision comment is only an ADR if it is cross-cutting or surprising. A seconds-long micro-decision that only makes sense inside one function ("the close waits 120ms because...") may not deserve an ADR of its own. Fold it into an existing ADR for that theme, or into the ADR that names the theme. Resist writing 900 ADRs.

## Procedure

**1. Recon.** Find the comment volume per directory:

```sh
node tools/comment-lint/ratchet.mjs --report
```

Sort the output descending. Work the biggest files first; that is where the value and the risk both are.

**2. Confirm scope.** Separate repo-owned files from the inherited template. In this repo `registry/new-york/**` is entirely ours; `components/ui/**`, `components/*.tsx`, `app/**` are the template. Confirm with the scaffold commit check above.

**3. Dump the blocks.** Extract every comment block with its line number into one file, so classification reads as a list rather than as a re-read of each source file:

```sh
node tools/comment-lint/dump.mjs > /tmp/blocks.txt
```

Read it whole. For a large tree, fan out file-by-file to subagents (see below), keeping the classification in the main thread if the tree is small enough to hold.

**4. Classify.** Tag each block with one of the four categories and a one-line reason. Record the tally. If the tree is large, delegate batches of files to a subagent each, and require the same four-category output with `file:line` and a reason per row. Merge the results.

**5. Move the decisions.** Before deleting anything, write the DECISION blocks into `docs/adr/`. One ADR per theme, not per comment: grep the decision comments for repeated phrases ("installs on its own", "server and the client", "never mid-drag") and group them. Each ADR is `NNNN-title.md` with Status, Context, Decision, Consequences, and a row in `docs/adr/README.md`.

**6. Delete in one wave.** Delete every REDUNDANT and OUTDATED block, every EXCUSE block (after filing its issue), and every DECISION block whose content now lives in an ADR. Do it file by file. Keep the diff mechanical: removing comments only, no logic changes. A comment sweep that changes behavior is two changes wearing one commit.

Blank lines left behind by a deletion are format noise; `oxfmt` removes them.

**7. Tighten the ratchet.** The baseline only ever clicks forward:

```sh
node tools/comment-lint/ratchet.mjs --update
```

`--update` rewrites `baseline.json` to the tree's current counts. Run it after every batch. Committing the lowered baseline is what makes the deletion permanent — without it, the next PR can add the comments back.

**8. Verify.** The checks that matter:

```sh
pnpm typecheck
pnpm check
node tools/comment-lint/ratchet.mjs
```

All three pass, and `git diff --stat` shows deletions outnumbering insertions by the comment lines you removed.

## Fan-out for a large tree

Comments are context-heavy: a full sweep of a large repo does not fit one context window. Split by file group and give each subagent the four categories and the output format above. A subagent returns the classification, not edits — the main thread applies the deletions so one writer owns the tree. This is the "advisory subagent" shape the repo's other skills use.

## Exit criteria

- Every comment in scope is classified, with the tally reported.
- Every DECISION is in an ADR or folded into one; none deleted silently.
- Every EXCUSE has an open issue.
- `baseline.json` is at or below the pre-sweep count, committed.
- `pnpm typecheck` and `pnpm check` pass.
- The line reduction is measured and reported (`--report` before minus after).
