"use client";

import {
  Box,
  Building2,
  ChevronDownIcon,
  Cpu,
  Filter,
  KeyRound,
  Plug,
  Users,
  Wrench,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  SettingsCard,
  SettingsDialog,
  SettingsRow,
  SettingsSection,
} from "@/registry/new-york/settings-dialog";
import type { SettingsNavGroup } from "@/registry/new-york/settings-dialog";

const NAV: SettingsNavGroup[] = [
  {
    items: [
      { icon: Building2, id: "workspace", label: "Workspace" },
      { icon: Users, id: "members", label: "Members" },
      { icon: Plug, id: "integrations", label: "Integrations" },
    ],
  },
  {
    id: "agent",
    items: [
      { icon: Cpu, id: "models", label: "Models" },
      { icon: Wrench, id: "tools", label: "Tools" },
      { icon: Box, id: "sandbox", label: "Sandbox" },
    ],
    label: "Agent",
  },
  {
    id: "files",
    items: [
      { icon: Filter, id: "ignore", label: "Ignore rules" },
      { icon: KeyRound, id: "keys", label: "API keys" },
    ],
    label: "Files",
  },
];

const LABELS = new Map(
  NAV.flatMap((group) => group.items).map((item) => [item.id, item.label])
);

const Choice = ({
  initial,
  options,
}: {
  initial: string;
  options: string[];
}) => {
  const [value, setValue] = useState(initial);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          {value}
          <ChevronDownIcon className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {options.map((option) => (
          <DropdownMenuItem key={option} onSelect={() => setValue(option)}>
            {option}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const WorkspacePanel = () => (
  <>
    <SettingsSection label="Identity">
      <SettingsRow
        description="Shown on every run, and in the audit log."
        title="Workspace name"
      >
        <Input className="w-44" defaultValue="Northwind" />
      </SettingsRow>
      <SettingsRow
        description="Members sign in through this address."
        title="Slug"
      >
        <Input className="w-44" defaultValue="northwind" />
      </SettingsRow>
    </SettingsSection>

    <SettingsSection label="Defaults">
      <SettingsRow
        description="Every new session in this workspace starts here."
        title="Model"
      >
        <Choice
          initial="Claude Sonnet"
          options={["Claude Sonnet", "Claude Opus", "GPT-5"]}
        />
      </SettingsRow>
      <SettingsRow
        description="Let the agent write to a scratch directory it can throw away."
        title="Sandboxed filesystem"
      >
        <Switch defaultChecked />
      </SettingsRow>
    </SettingsSection>

    <SettingsCard className="flex flex-col gap-3 py-5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium">Run history</p>
        <p className="text-muted-foreground text-sm tabular-nums">
          6 h of 10 h kept
        </p>
      </div>
      <div className="bg-background h-1.5 overflow-hidden rounded-full">
        <div className="bg-primary h-full w-3/5 rounded-full" />
      </div>
      <p className="text-muted-foreground text-sm text-balance">
        The oldest runs are dropped first. Export anything you need to keep for
        longer.
      </p>
    </SettingsCard>
  </>
);

const StubPanel = ({ label }: { label: string }) => (
  <SettingsSection label={label}>
    <SettingsRow
      description="Manage defaults for this section."
      title={`${label} settings`}
    >
      <Button size="sm" variant="outline">
        Configure
      </Button>
    </SettingsRow>
    <SettingsRow description="Allow access in this workspace." title="Enabled">
      <Switch defaultChecked />
    </SettingsRow>
  </SettingsSection>
);

export const SettingsDialogDemo = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        Open settings
      </Button>
      <SettingsDialog
        defaultActiveId="workspace"
        description="Preferences for the workspace and the agent that runs in it."
        nav={NAV}
        onOpenChange={setOpen}
        open={open}
      >
        {(id) =>
          id === "workspace" ? (
            <WorkspacePanel />
          ) : (
            <StubPanel label={LABELS.get(id) ?? "Section"} />
          )
        }
      </SettingsDialog>
    </>
  );
};

export const SettingsPanelsDemo = () => (
  <div className="w-full max-w-lg">
    <SettingsSection label="General">
      <SettingsRow
        description="Receive run summaries when a task finishes."
        title="Notifications"
      >
        <Switch defaultChecked />
      </SettingsRow>
      <SettingsRow
        description="Logs are kept for 30 days in this workspace."
        title="Audit retention"
      />
      <SettingsRow
        description="Used when creating new worktrees."
        title="Default branch"
      >
        <Input className="w-32" placeholder="main" />
      </SettingsRow>
    </SettingsSection>
  </div>
);
