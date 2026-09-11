import type { ReactNode } from "react";

/** One file inside the skill folder. Folders are implied by the slashes in `path`, so a
 *  tree is just a list of paths in the order you want them drawn. */
export interface SkillFile {
  /** Replaces the glyph on the row. */
  icon?: ReactNode;
  /** Replaces the last segment as the row's label. */
  label?: string;
  /** Path relative to the skill root: `references/api.md`. */
  path: string;
}

export interface SkillAuthor {
  /** Avatar URL. Without one the first letter of `name` stands in. */
  avatar?: string;
  href?: string;
  name: string;
}

export interface SkillCardProps {
  className?: string;
  /** Cover art. Omit it and the card is title and description alone. */
  cover?: string;
  /** One or two lines under the title; the rest is clamped. */
  description?: ReactNode;
  /** Renders the card as a link when you have a page to send people to instead. */
  href?: string;
  onOpen?: () => void;
  title: string;
}

export interface SkillCodeProps {
  className?: string;
  code: string;
  /** Label in the block's top-left corner, e.g. `YAML`. */
  language: string;
}

export interface SkillDetailProps {
  /** Drawn beside the updated line. */
  author?: SkillAuthor;
  className?: string;
  /** Cover art, drawn flat and small beside the heading. */
  cover?: string;
  /** Starts the enable switch on; ignored when `enabled` is passed. */
  defaultEnabled?: boolean;
  /** Selected on first render; defaults to the first file. */
  defaultSelectedPath?: string;
  /** What the skill is for, read directly under the heading. */
  description?: ReactNode;
  /** The enable switch. Passing this or `defaultEnabled` draws it. */
  enabled?: boolean;
  /** Files inside the skill, as paths. Folders are implied. */
  files?: SkillFile[];
  /** Root row of the tree. Without it the top level is the root. */
  folder?: string;
  /** Slot for a "…" menu in the toolbar. */
  menu?: ReactNode;
  /** Drops the close button when omitted. */
  onClose?: () => void;
  onEnabledChange?: (enabled: boolean) => void;
  /** Drops the expand button when omitted. */
  onExpand?: () => void;
  onFileSelect?: (path: string) => void;
  /** Turns the example prompts into buttons. */
  onPrompt?: (prompt: string) => void;
  /** The panel's primary action. Drops the button when omitted. */
  onTry?: () => void;
  /** Example prompts, one row each. */
  prompts?: string[];
  /** Word above the example prompts. */
  promptsLabel?: string;
  /** Contents of the selected file. Without it the tree stands alone. */
  renderPreview?: (file: SkillFile) => ReactNode;
  /** Selected file, when you own the selection. */
  selectedPath?: string;
  /** Pills above the heading. */
  tags?: string[];
  /** The heading. */
  title: string;
  tryLabel?: ReactNode;
  /** Already formatted for the reader — the panel does not touch dates. */
  updatedAt?: string;
  /** Word before `updatedAt`. */
  updatedLabel?: string;
}

export interface SkillDetailDialogProps extends Omit<
  SkillDetailProps,
  "onClose" | "onExpand"
> {
  /** Extra classes for the dialog's own box, not the panel inside it. */
  contentClassName?: string;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}
