"use client";

import { useState } from "react";

import { StrengthSelect } from "@/registry/new-york/strength-select";

export const StrengthSelectDemo = () => {
  // The demo opens at the ceiling: the drift is the one thing about this control you
  // cannot see from a screenshot of its default.
  const [strength, setStrength] = useState("Ultra");

  return (
    <div className="w-full max-w-sm">
      {/* The heading is the caller's: the control ships none, so the words on screen
          and the words a screen reader hears are written in one place. */}
      <div className="mb-3 font-medium text-muted-foreground text-xs">
        Strength
      </div>
      <StrengthSelect
        aria-label="Strength"
        onChange={setStrength}
        value={strength}
      />
      <p className="mt-3 font-mono text-muted-foreground text-xs">
        value: {strength}
      </p>
    </div>
  );
};

/** The count sets the segments, so any ordered list of levels rides the same track. */
export const StrengthSelectEffortDemo = () => {
  const [effort, setEffort] = useState("Deep");

  return (
    <div className="w-full max-w-sm">
      <div className="mb-3 font-medium text-muted-foreground text-xs">
        Reasoning effort
      </div>
      <StrengthSelect
        aria-label="Reasoning effort"
        onChange={setEffort}
        options={["Quick", "Standard", "Deep"]}
        value={effort}
      />
      <p className="mt-3 font-mono text-muted-foreground text-xs">
        value: {effort}
      </p>
    </div>
  );
};
