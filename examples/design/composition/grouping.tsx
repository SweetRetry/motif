import { DesignCase } from "@/components/design-case";
import { cn } from "@/lib/utils";

/**
 * A label and its field are one object; two fields are two. Spacing them the
 * same way leaves the reader to guess where one ends and the next begins.
 */
const Field = ({ gap, label }: { gap: string; label: string }) => (
  <div className={cn("flex flex-col", gap)}>
    <span className="text-xs font-medium">{label}</span>
    <div className="border-border h-9 rounded-md border" />
  </div>
);

export const GroupingDemo = () => (
  <div className="flex items-start gap-16">
    <DesignCase note="Uniform spacing" verdict="wrong">
      <div className="flex w-48 flex-col gap-4">
        <Field gap="gap-4" label="Workspace" />
        <Field gap="gap-4" label="Region" />
      </div>
    </DesignCase>
    <DesignCase note="Dual scales" verdict="right">
      <div className="flex w-48 flex-col gap-6">
        <Field gap="gap-1.5" label="Workspace" />
        <Field gap="gap-1.5" label="Region" />
      </div>
    </DesignCase>
  </div>
);
