"use client";

import {
  House,
  LayoutGrid,
  Mail,
  PanelsTopLeft,
  Sparkles,
  Sun,
} from "lucide-react";
import { useState } from "react";

import { GithubIcon } from "@/components/icons";
import {
  Toolbar,
  ToolbarItem,
  ToolbarSeparator,
} from "@/registry/new-york/toolbar";

/** The bar from the reference: three sections, a rule, then the way out. */
export const ToolbarDemo = () => {
  const [section, setSection] = useState<string>("work");

  return (
    <Toolbar aria-label="Sections">
      <ToolbarItem
        active={section === "overview"}
        icon={<House />}
        label="Overview"
        onSelect={() => setSection("overview")}
      />
      <ToolbarItem
        active={section === "work"}
        icon={<LayoutGrid />}
        label="Work"
        onSelect={() => setSection("work")}
      />
      <ToolbarItem
        active={section === "contact"}
        icon={<Mail />}
        label="Contact"
        onSelect={() => setSection("contact")}
      />
      <ToolbarSeparator />
      <ToolbarItem
        pinnedLabel="Source"
        external
        href="https://github.com/shadcn-labs/startercn"
        icon={<GithubIcon />}
        label="Source code on GitHub"
      />
    </Toolbar>
  );
};

/** Short words pinned into the row, each with a longer name in its tooltip. */
export const ToolbarPinnedDemo = () => (
  <Toolbar aria-label="Canvas">
    <ToolbarItem
      icon={<PanelsTopLeft />}
      label="Split the canvas into two panes"
    />
    <ToolbarItem icon={<Sun />} label="Switch to the light theme" />
    <ToolbarSeparator />
    <ToolbarItem
      active
      pinnedLabel="Generate"
      icon={<Sparkles />}
      label="Generate a result from the current prompt"
    />
  </Toolbar>
);
