"use client";

import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Copy,
  File,
  FileCode,
  FileText,
  Folder,
  FolderOpen,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  LineTabs,
  LineTabsContent,
  LineTabsList,
  LineTabsTrigger,
} from "@/components/ui/motif/line-tabs";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import type {
  SkillAuthor,
  SkillCardProps,
  SkillCodeProps,
  SkillDetailDialogProps,
  SkillDetailProps,
  SkillFile,
} from "./types";

export type {
  SkillAuthor,
  SkillCardProps,
  SkillCodeProps,
  SkillDetailDialogProps,
  SkillDetailProps,
  SkillFile,
  SkillResult,
} from "./types";

// Motion tokens, kept in this file so it installs on its own.
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const SPRING_SWAP = { damping: 30, mass: 0.55, stiffness: 460 } as const;

/** The toolbar's icon buttons and the copy button on a code block are the same control,
 *  so they share one plate. */
const ICON_BUTTON =
  "grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50";

type PanelTab = "files" | "overview";

/** The root of the tree is a row of its own, so it needs a key no path can take. */
const ROOT = "";

/** Expanding a folder is a layout change, so it stays short and eases out. The fade
 *  keeps a row from landing at full strength while its height is still near zero. */
const ROW_SLIDE = { duration: 0.18, ease: EASE_OUT } as const;

/** A file is a place, not a direction: the incoming preview fades rather than sliding in
 *  from one side, and only the incoming one animates so half the duration never lands
 *  between the click and the contents. */
const PREVIEW_FADE = { duration: 0.14, ease: EASE_OUT } as const;

const CODE_EXTENSIONS = new Set([
  "json",
  "js",
  "jsx",
  "py",
  "sh",
  "toml",
  "ts",
  "tsx",
  "yaml",
  "yml",
]);

interface TreeNode {
  children?: TreeNode[];
  file?: SkillFile;
  label: string;
  name: string;
  path: string;
}

interface TreeRow {
  depth: number;
  expandable: boolean;
  file?: SkillFile;
  key: string;
  label: string;
  parentKey?: string;
  posinset: number;
  setsize: number;
}

/** Paths in, tree out: `a/b.md` and `a/c.md` share one `a` folder, and everything stays
 *  in the order `files` was given — nothing here sorts. */
const buildTree = (files: SkillFile[]) => {
  const roots: TreeNode[] = [];

  for (const file of files) {
    const segments = file.path.split("/").filter(Boolean);
    let level = roots;
    const walked: string[] = [];

    for (const [index, name] of segments.entries()) {
      walked.push(name);
      const last = index === segments.length - 1;
      let node = level.find((candidate) => candidate.name === name);

      if (!node) {
        node = { label: name, name, path: walked.join("/") };
        level.push(node);
      }

      if (last) {
        node.file = file;
        node.label = file.label ?? name;
      } else {
        node.children ??= [];
        level = node.children;
      }
    }
  }

  return roots;
};

/** Rows in the order they are drawn, which is the order the arrow keys walk them. The
 *  tree is flattened rather than nested so a collapsing folder can shrink every row it
 *  owns at once, and the levels are named with `aria-level` instead of real nesting. */
const flatten = (
  nodes: TreeNode[],
  folder: string | undefined,
  expanded: ReadonlySet<string>
): TreeRow[] => {
  const rows: TreeRow[] = [];

  const walk = (level: TreeNode[], depth: number, parentKey?: string) => {
    for (const [index, node] of level.entries()) {
      const expandable = Boolean(node.children);
      const open = expandable && expanded.has(node.path);

      rows.push({
        depth,
        expandable,
        file: node.file,
        key: node.path,
        label: node.label,
        parentKey,
        posinset: index + 1,
        setsize: level.length,
      });

      if (open && node.children) {
        walk(node.children, depth + 1, node.path);
      }
    }
  };

  if (folder === undefined) {
    walk(nodes, 0);
    return rows;
  }

  const open = expanded.has(ROOT);
  rows.push({
    depth: 0,
    expandable: true,
    key: ROOT,
    label: folder,
    posinset: 1,
    setsize: 1,
  });

  if (open) {
    walk(nodes, 1, ROOT);
  }

  return rows;
};

const glyphFor = (path: string) => {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  if (CODE_EXTENSIONS.has(extension)) {
    return FileCode;
  }
  return extension === "md" || extension === "txt" ? FileText : File;
};

/** Chevron for a folder, a glyph for a file, and the row's own override above both.
 *  Files keep the chevron's width so every glyph in a level lines up in one column. */
const RowIcon = ({
  expandable,
  file,
  open,
}: {
  expandable: boolean;
  file?: SkillFile;
  open: boolean;
}) => {
  if (expandable) {
    return (
      <>
        <ChevronRight
          className={cn(
            "size-4 shrink-0 transition-transform duration-150",
            open && "rotate-90"
          )}
        />
        {open ? (
          <FolderOpen className="size-4 shrink-0" />
        ) : (
          <Folder className="size-4 shrink-0" />
        )}
      </>
    );
  }

  if (file?.icon) {
    return (
      <>
        <span className="size-4 shrink-0" />
        {file.icon}
      </>
    );
  }

  const Glyph = file ? glyphFor(file.path) : undefined;

  return (
    <>
      <span className="size-4 shrink-0" />
      {Glyph ? <Glyph className="size-4 shrink-0" /> : null}
    </>
  );
};

const IconButton = ({
  className,
  label,
  onClick,
  children,
}: {
  className?: string;
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) => (
  <button
    aria-label={label}
    className={cn(ICON_BUTTON, className)}
    onClick={onClick}
    type="button"
  >
    {children}
  </button>
);

/** The line under a heading: who made it, when it last moved. A real avatar is drawn
 *  when there is one and nothing stands in for it when there is not — a letter in a
 *  rounded square is a logo pretending to be a face. */
const MetaLine = ({
  author,
  className,
  updatedAt,
  updatedLabel,
}: {
  author?: SkillAuthor;
  className?: string;
  updatedAt?: string;
  updatedLabel: string;
}) => (
  <div
    className={cn(
      "flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground",
      className
    )}
  >
    {author ? (
      <span className="flex items-center gap-1.5">
        {author.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="size-4 shrink-0 rounded-full object-cover"
            src={author.avatar}
          />
        ) : null}
        <span className="font-medium">{author.name}</span>
      </span>
    ) : null}
    {author && updatedAt ? <span aria-hidden="true">·</span> : null}
    {updatedAt ? (
      <span>
        {updatedLabel} {updatedAt}
      </span>
    ) : null}
  </div>
);

/** A pane of the workspace. Under a tab strip it is that tab's panel, so Radix ties the
 *  tab to it by id; with no strip there is nothing to tie it to, and it is a plain box. */
const Panel = ({
  children,
  className,
  tabbed,
  value,
}: {
  children: ReactNode;
  className: string;
  tabbed: boolean;
  value: PanelTab;
}) =>
  tabbed ? (
    <LineTabsContent className={className} value={value}>
      {children}
    </LineTabsContent>
  ) : (
    <div className={className}>{children}</div>
  );

/** An example is a line you might have typed, not a card: a number to scan by, the text,
 *  and an arrow that only shows up when the cell is live. Three of them sit across the
 *  panel as one ruled strip — stacked, they were three rows of mostly empty width. */
const PromptCell = ({
  index,
  onSelect,
  prompt,
}: {
  index: number;
  onSelect?: (prompt: string) => void;
  prompt: string;
}) => {
  const body = (
    <>
      <span className="shrink-0 pt-px font-mono text-[11px] text-muted-foreground/70 tabular-nums">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="line-clamp-2 min-w-0 flex-1 text-sm text-pretty text-muted-foreground transition-colors group-hover:text-foreground">
        {prompt}
      </span>
      {onSelect ? (
        <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-40 transition-opacity group-hover:opacity-100" />
      ) : null}
    </>
  );

  if (!onSelect) {
    return <div className="flex items-start gap-2.5 py-3">{body}</div>;
  }

  return (
    <button
      className="group flex cursor-pointer items-start gap-2.5 py-3 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      onClick={() => onSelect(prompt)}
      type="button"
    >
      {body}
    </button>
  );
};

/**
 * The way in: a wide cover, the name, one line of what it does.
 *
 * A card is the summary and nothing else — it holds no actions of its own, because every
 * action a skill has belongs in the panel, where there is room to explain it. Pass `href`
 * if the skill lives on a page of its own and the card should navigate; pass `onOpen` if
 * it opens in place.
 *
 * The cover is drawn at 16:9 whatever the art is, so a portrait poster loses its top and
 * its tail; ship a wide crop with it when the art carries a title.
 */
export const SkillCard = ({
  className,
  cover,
  description,
  href,
  onOpen,
  title,
}: SkillCardProps) => {
  const body = (
    <>
      {cover ? (
        <span className="relative block aspect-video overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            className="size-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:scale-[1.03]"
            src={cover}
          />
        </span>
      ) : null}
      <span className="flex flex-col gap-1.5 p-4">
        <span className="font-medium">{title}</span>
        {description ? (
          <span className="line-clamp-2 text-sm text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </>
  );

  const shell = cn(
    "group flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left outline-none transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    className
  );

  if (href) {
    return (
      <a className={shell} href={href}>
        {body}
      </a>
    );
  }

  return (
    <button
      className={cn(shell, "cursor-pointer")}
      onClick={onOpen}
      type="button"
    >
      {body}
    </button>
  );
};

/** A read-only code block with its language in the corner. Kept deliberately uncoloured:
 *  highlighting would mean a syntax highlighter in the bundle, and a skill's front matter
 *  is four lines that read fine in the foreground. */
export const SkillCode = ({ className, code, language }: SkillCodeProps) => {
  const reduceMotion = useReducedMotion() ?? false;
  const [copied, setCopied] = useState(false);
  // 0 is the "nothing scheduled" handle; clearing it is a no-op.
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard?.writeText(code);
    } catch {
      return;
    }

    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  }, [code]);

  const icon = copied ? (
    <Check className="size-3.5" />
  ) : (
    <Copy className="size-3.5" />
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-muted/40",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 py-1.5 pr-1.5 pl-3">
        <span className="text-xs font-medium text-muted-foreground">
          {language}
        </span>
        <IconButton
          className="size-7"
          label={copied ? "Copied" : "Copy code"}
          onClick={handleCopy}
        >
          {reduceMotion ? (
            icon
          ) : (
            <motion.span
              animate={{ opacity: 1, scale: 1 }}
              initial={{ opacity: 0, scale: 0.7 }}
              key={copied ? "copied" : "copy"}
              transition={SPRING_SWAP}
            >
              {icon}
            </motion.span>
          )}
        </IconButton>
      </div>
      <pre className="overflow-x-auto px-3 pb-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

/**
 * A skill's detail surface: what it is, and what is inside it.
 *
 * Two columns above 56rem of the panel's own width — a rail that answers the first
 * question and a workspace that answers the second — and one column below it. Nothing
 * about the skill is hardcoded beyond that shape: the toolbar draws only the controls you
 * pass a handler for, and the file preview is a render prop, so the panel never has to
 * know what a `.md` is.
 */
export const SkillDetail = ({
  author,
  className,
  cover,
  defaultEnabled,
  defaultSelectedPath,
  description,
  enabled,
  files,
  folder,
  menu,
  onClose,
  onEnabledChange,
  onFileSelect,
  onPrompt,
  onTry,
  prompts,
  promptsLabel = "Start with",
  renderPreview,
  results,
  resultsLabel = "Results",
  resultsNote,
  selectedPath: selectedPathProp,
  tags,
  title,
  tryLabel = "Try it",
  updatedAt,
  updatedLabel = "Updated",
}: SkillDetailProps) => {
  const reduceMotion = useReducedMotion() ?? false;
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());

  const list = useMemo(() => files ?? [], [files]);
  const tree = useMemo(() => buildTree(list), [list]);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set([ROOT])
  );
  const [enabledState, setEnabledState] = useState(defaultEnabled ?? false);
  const [selectedState, setSelectedState] = useState(defaultSelectedPath ?? "");
  const [tab, setTab] = useState<PanelTab>("overview");

  // The first file is selected until told otherwise: a panel that opens with an empty
  // preview pane looks broken rather than unselected.
  const currentPath =
    selectedPathProp ?? (selectedState || list[0]?.path) ?? "";
  const currentFile = list.find((file) => file.path === currentPath);
  const rows = useMemo(
    () => flatten(tree, folder, expanded),
    [tree, folder, expanded]
  );
  const [activeKey, setActiveKey] = useState(currentPath || ROOT);

  const showSwitch = enabled !== undefined || defaultEnabled !== undefined;
  const isEnabled = enabled ?? enabledState;
  const hasPreview = Boolean(renderPreview && currentFile);

  const registerRow = useCallback(
    (key: string, node: HTMLButtonElement | null) => {
      if (node) {
        rowRefs.current.set(key, node);
        return;
      }
      rowRefs.current.delete(key);
    },
    []
  );

  const select = useCallback(
    (path: string) => {
      if (selectedPathProp === undefined) {
        setSelectedState(path);
      }
      onFileSelect?.(path);
    },
    [onFileSelect, selectedPathProp]
  );

  const toggle = useCallback((key: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const focusRow = useCallback((target: TreeRow) => {
    setActiveKey(target.key);
    rowRefs.current.get(target.key)?.focus();
  }, []);

  /** The tree is one tab stop with a roving focus, so the arrows walk it: down and up
   *  move a row at a time, right opens a folder (or steps into it), left closes it (or
   *  steps back out to the folder that owns the row). A key that moves nothing is left
   *  to the page rather than swallowed here. */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const index = rows.findIndex((row) => row.key === activeKey);
      if (index === -1) {
        return;
      }

      const row = rows[index];
      if (!row) {
        return;
      }

      let target: TreeRow | undefined;

      switch (event.key) {
        case "ArrowDown": {
          target = rows[index + 1];
          break;
        }
        case "ArrowUp": {
          target = rows[index - 1];
          break;
        }
        case "ArrowRight": {
          if (row.expandable && !expanded.has(row.key)) {
            event.preventDefault();
            toggle(row.key);
            return;
          }
          target = rows[index + 1];
          break;
        }
        case "ArrowLeft": {
          if (row.expandable && expanded.has(row.key)) {
            event.preventDefault();
            toggle(row.key);
            return;
          }
          target = rows.find((candidate) => candidate.key === row.parentKey);
          break;
        }
        case "End": {
          target = rows.at(-1);
          break;
        }
        case "Home": {
          target = rows.at(0);
          break;
        }
        default: {
          return;
        }
      }

      if (!target) {
        return;
      }

      event.preventDefault();
      focusRow(target);
    },
    [activeKey, expanded, focusRow, rows, toggle]
  );

  const setEnabled = (next: boolean) => {
    if (enabled === undefined) {
      setEnabledState(next);
    }
    onEnabledChange?.(next);
  };

  const toolbar = showSwitch || menu || onClose;
  const workspace = rows.length > 0 || hasPreview;
  // The first tab is what the skill makes, the second is what it is made of. A skill with
  // only one of them draws that one, without a tab strip to switch nothing.
  const hasOverview = Boolean(results?.length || prompts?.length);
  const showTabs = hasOverview && workspace;
  const activeTab: PanelTab =
    !workspace || (hasOverview && tab === "overview") ? "overview" : "files";
  const header = showTabs || toolbar;

  return (
    // Two elements, not one: a container query styles what is inside the container, never
    // the container itself, so the grid that changes shape has to be a child of the box
    // whose width decides it. The same panel sits in a page, a sheet or a dialog, so the
    // break is about its own width. Narrow, the rail is a banner over the workspace; wide,
    // it is a column beside it.
    <div
      className={cn(
        "@container relative h-full min-h-0 w-full overflow-hidden rounded-2xl border border-border bg-card",
        className
      )}
    >
      <div className="grid size-full min-h-0 grid-cols-1 grid-rows-[13rem_minmax(0,1fr)] gap-0 @3xl:grid-cols-[22rem_minmax(0,1fr)] @3xl:grid-rows-1">
        <div
          className={cn(
            "relative flex min-h-0 flex-col gap-3 overflow-hidden p-5 @3xl:gap-4 @3xl:border-r @3xl:border-border @3xl:p-6",
            // Text sits at the foot of the art, where the scrim is; with no art there is
            // nothing to sit on, so it starts at the top like any column.
            cover ? "justify-end" : "justify-start"
          )}
        >
          {cover ? (
            <>
              {/* The art is cropped to the rail, not letterboxed: a cover that keeps its
                own ratio cannot also fill a column whose height is the dialog's. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                className="absolute inset-0 size-full object-cover"
                src={cover}
              />
              {/* Literal black and white: a scrim over user artwork is measured against the
                artwork, not the theme. Heavy at the foot where the text is, gone by the
                top so the art keeps its colour. */}
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(to top, rgb(0 0 0 / 0.92) 0%, rgb(0 0 0 / 0.75) 38%, rgb(0 0 0 / 0.12) 68%, rgb(0 0 0 / 0) 100%)",
                }}
              />
            </>
          ) : null}

          <div
            className={cn(
              "relative flex min-w-0 items-end justify-between gap-4 @3xl:flex-col @3xl:items-stretch @3xl:justify-start @3xl:gap-4",
              cover && "text-white"
            )}
          >
            <div className="flex min-w-0 flex-col items-start gap-2 @3xl:gap-4">
              {tags?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs",
                        cover
                          ? "bg-white/15 text-white backdrop-blur-sm"
                          : "bg-muted text-muted-foreground"
                      )}
                      key={tag}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <h2 className="text-3xl font-semibold tracking-tight text-balance">
                {title}
              </h2>
              {description ? (
                <p
                  className={cn(
                    "hidden max-w-sm text-sm text-pretty @3xl:block",
                    cover ? "text-white/80" : "text-muted-foreground"
                  )}
                >
                  {description}
                </p>
              ) : null}
              {author || updatedAt ? (
                <MetaLine
                  author={author}
                  className={cover ? "text-white/65" : undefined}
                  updatedAt={updatedAt}
                  updatedLabel={updatedLabel}
                />
              ) : null}
            </div>
            {onTry ? (
              <Button
                className="shrink-0 @3xl:w-full"
                onClick={onTry}
                type="button"
              >
                {tryLabel}
              </Button>
            ) : null}
          </div>
        </div>

        <LineTabs
          className="min-h-0 min-w-0"
          onValueChange={(next) => setTab(next as PanelTab)}
          value={activeTab}
        >
          {/* The rail has no room for the sentence in its banner form, so it moves here,
            above the tabs, rather than being dropped. */}
          {description ? (
            <p className="shrink-0 border-b border-border/60 px-5 py-3 text-sm text-pretty text-muted-foreground @3xl:hidden">
              {description}
            </p>
          ) : null}

          {header ? (
            // A header, not a sticky bar: the body is its own scroll box, so nothing passes
            // underneath the controls and there is no translucent corner to get wrong.
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 pr-3 pl-5 @3xl:pl-6">
              {showTabs ? (
                <LineTabsList aria-label="Skill sections">
                  <LineTabsTrigger value="overview">
                    {resultsLabel}
                  </LineTabsTrigger>
                  <LineTabsTrigger value="files">
                    Files
                    <span className="ml-1.5 font-mono text-xs tabular-nums">
                      {list.length}
                    </span>
                  </LineTabsTrigger>
                </LineTabsList>
              ) : (
                <span />
              )}
              {toolbar ? (
                <div className="flex items-center gap-1">
                  {showSwitch ? (
                    <Switch
                      aria-label={`Enable ${title}`}
                      checked={isEnabled}
                      className="mr-1"
                      onCheckedChange={setEnabled}
                    />
                  ) : null}
                  {menu}
                  {onClose ? (
                    <IconButton label="Close" onClick={onClose}>
                      <X className="size-4" />
                    </IconButton>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="min-h-0 flex-1">
            {hasOverview && activeTab === "overview" ? (
              <Panel
                className="flex h-full flex-col gap-6 overflow-y-auto overscroll-contain p-6"
                tabbed={showTabs}
                value="overview"
              >
                {results?.length ? (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3 @xl:grid-cols-4">
                      {results.map((result) => (
                        <figure
                          className="flex min-w-0 flex-col gap-1.5"
                          key={result.src}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt=""
                            className="aspect-[3/4] w-full rounded-xl object-cover ring-1 ring-border"
                            src={result.src}
                          />
                          {result.label ? (
                            <figcaption className="truncate text-xs text-muted-foreground">
                              {result.label}
                            </figcaption>
                          ) : null}
                        </figure>
                      ))}
                    </div>
                    {resultsNote ? (
                      <p className="text-xs text-muted-foreground">
                        {resultsNote}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {prompts?.length ? (
                  <div className="flex flex-col gap-3">
                    <h3 className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                      {promptsLabel}
                    </h3>
                    <div className="divide-border/60 border-border/60 flex flex-col divide-y border-t">
                      {prompts.map((prompt, index) => (
                        <PromptCell
                          index={index}
                          key={prompt}
                          onSelect={onPrompt}
                          prompt={prompt}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </Panel>
            ) : null}

            {workspace && activeTab === "files" ? (
              <Panel
                className={cn(
                  "h-full overflow-y-auto overscroll-contain",
                  hasPreview &&
                    "@xl:grid @xl:grid-cols-[13rem_minmax(0,1fr)] @xl:overflow-hidden"
                )}
                tabbed={showTabs}
                value="files"
              >
                <div
                  aria-label={folder ?? "Skill files"}
                  className={cn(
                    "flex flex-col gap-0.5 p-4",
                    hasPreview &&
                      "border-border/60 border-b @xl:min-h-0 @xl:overflow-y-auto @xl:overscroll-contain @xl:border-r @xl:border-b-0"
                  )}
                  onKeyDown={handleKeyDown}
                  role="tree"
                >
                  <AnimatePresence initial={false}>
                    {rows.map((row) => {
                      const open = row.expandable && expanded.has(row.key);
                      const selected =
                        !row.expandable && row.key === currentPath;

                      return (
                        <motion.div
                          animate={{ height: "auto", opacity: 1 }}
                          className="overflow-hidden"
                          exit={{ height: 0, opacity: 0 }}
                          initial={
                            reduceMotion ? false : { height: 0, opacity: 0 }
                          }
                          key={row.key}
                          role="none"
                          transition={ROW_SLIDE}
                        >
                          <button
                            aria-expanded={row.expandable ? open : undefined}
                            aria-level={row.depth + 1}
                            aria-posinset={row.posinset}
                            aria-selected={
                              row.expandable ? undefined : selected
                            }
                            aria-setsize={row.setsize}
                            className={cn(
                              // The ring is inset: a row is clipped top and bottom by the
                              // height its folder animates, and an outside ring would lose
                              // its two horizontal runs the moment the wrapper clipped.
                              "flex w-full cursor-pointer items-center gap-1.5 rounded-lg py-1.5 pr-2 text-left text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                              selected
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                            onClick={() =>
                              row.expandable ? toggle(row.key) : select(row.key)
                            }
                            onFocus={() => setActiveKey(row.key)}
                            ref={(node) => registerRow(row.key, node)}
                            role="treeitem"
                            style={{ paddingLeft: 8 + row.depth * 14 }}
                            tabIndex={row.key === activeKey ? 0 : -1}
                            type="button"
                          >
                            <RowIcon
                              expandable={row.expandable}
                              file={row.file}
                              open={open}
                            />
                            <span className="truncate">{row.label}</span>
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {hasPreview && renderPreview && currentFile ? (
                  <div className="min-w-0 p-6 @xl:min-h-0 @xl:overflow-y-auto @xl:overscroll-contain">
                    {reduceMotion ? (
                      <div>{renderPreview(currentFile)}</div>
                    ) : (
                      <motion.div
                        animate={{ opacity: 1, y: 0 }}
                        initial={{ opacity: 0, y: 4 }}
                        key={currentFile.path}
                        transition={PREVIEW_FADE}
                      >
                        {renderPreview(currentFile)}
                      </motion.div>
                    )}
                  </div>
                ) : null}
              </Panel>
            ) : null}
          </div>
        </LineTabs>
      </div>
    </div>
  );
};

/**
 * The panel with a dialog around it: the box it is sized into, and the title it is
 * announced by.
 *
 * The panel is not a modal, so this is where modal behaviour is added rather than
 * assumed — leave it out and `SkillDetail` sits in the page just as happily. `SkillCard`
 * is the other half: the summary that opens this.
 */
export const SkillDetailDialog = ({
  className,
  contentClassName,
  defaultOpen,
  onOpenChange,
  open: openProp,
  title,
  ...panel
}: SkillDetailDialogProps) => {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen ?? false);

  const isOpen = openProp ?? uncontrolled;

  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) {
        setUncontrolled(next);
      }
      onOpenChange?.(next);
    },
    [onOpenChange, openProp]
  );

  return (
    <Dialog onOpenChange={setOpen} open={isOpen}>
      <DialogContent
        aria-describedby={undefined}
        className={cn(
          // The panel draws its own chrome, so the dialog is only a box: the padding,
          // the gap, the background and the default close button all come off. The width
          // is what buys the panel its two columns.
          "h-[min(46rem,88dvh)] gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 sm:max-w-5xl",
          contentClassName
        )}
        showCloseButton={false}
      >
        {/* The panel's own heading is the visible one; this names the dialog. */}
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <SkillDetail
          {...panel}
          className={cn("h-full", className)}
          onClose={() => setOpen(false)}
          title={title}
        />
      </DialogContent>
    </Dialog>
  );
};
