import { DesignCase } from "@/components/design-case";

const Nested = () => (
  <div className="bg-card border-border w-56 rounded-xl border p-3">
    <div className="text-xs font-medium">Access</div>
    <div className="bg-card border-border mt-2 rounded-lg border p-3">
      <div className="text-xs font-medium">Roles</div>
      <div className="bg-card border-border text-muted-foreground mt-2 rounded-md border p-2 text-xs">
        Admin, Editor, Viewer
      </div>
    </div>
  </div>
);

const Single = () => (
  <div className="bg-card border-border w-56 rounded-xl border p-3">
    <div className="text-xs font-medium">Access</div>
    <div className="border-border mt-2 border-t pt-2">
      <div className="text-xs font-medium">Roles</div>
      <div className="text-muted-foreground mt-1 text-xs">
        Admin, Editor, Viewer
      </div>
    </div>
  </div>
);

export const NestedSurfacesDemo = () => (
  <div className="flex items-start gap-12">
    <DesignCase note="Nested cards" verdict="wrong">
      <Nested />
    </DesignCase>
    <DesignCase note="Single surface" verdict="right">
      <Single />
    </DesignCase>
  </div>
);
