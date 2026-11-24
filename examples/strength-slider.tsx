"use client";

import { useState } from "react";

import { StrengthSlider } from "@/registry/new-york/strength-slider";

export const StrengthSliderDemo = () => {
  const [strength, setStrength] = useState("Ultra");

  return (
    <div className="w-full max-w-sm">
      <div className="mb-3 font-medium text-muted-foreground text-xs">
        Strength
      </div>
      <StrengthSlider
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

export const StrengthSliderEffortDemo = () => {
  const [effort, setEffort] = useState("Deep");

  return (
    <div className="w-full max-w-sm">
      <div className="mb-3 font-medium text-muted-foreground text-xs">
        Reasoning effort
      </div>
      <StrengthSlider
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
