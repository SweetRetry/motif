import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** One destination in the rail. `id` is what the panel is keyed by. */
export interface SettingsNavItem {
  id: string;
  label: string;
  icon?: LucideIcon;
}

/** A labelled run of destinations. Leave `label` off for the opening block. */
export interface SettingsNavGroup {
  id?: string;
  label?: string;
  items: SettingsNavItem[];
}

export interface SettingsModalProps {
  /** The rail, top to bottom. The first item is active until told otherwise. */
  nav: SettingsNavGroup[];
  /** The panel for the active destination — a node, or a function that receives its id. */
  children: ReactNode | ((id: string) => ReactNode);
  className?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Controlled active destination. Pair with `onActiveChange`. */
  active?: string;
  defaultActive?: string;
  onActiveChange?: (id: string) => void;
  /** Names the rail, and is the dialog's accessible name. */
  title?: string;
  /** Read by assistive tech, never drawn. */
  description?: string;
  /** Extra classes for the scrolling panel body. */
  panelClassName?: string;
}

export interface SettingsCardProps {
  className?: string;
  children: ReactNode;
}

export interface SettingsSectionProps {
  children: ReactNode;
  className?: string;
  /** Sits above the card; sections without one read as a continuation of the last. */
  label?: string;
  cardClassName?: string;
}

export interface SettingsRowProps {
  title: ReactNode;
  description?: ReactNode;
  /** The control, pinned to the trailing edge. */
  children?: ReactNode;
  className?: string;
  /** Top-align the control with the title, for controls taller than one line. */
  align?: "center" | "start";
}
