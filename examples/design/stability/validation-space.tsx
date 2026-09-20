"use client";

import { useState } from "react";

import { DesignCase } from "@/components/design-case";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MESSAGE = "Enter a workspace name";

/**
 * The message is one line tall. Added on failure it pushes the next field down
 * under the pointer; held open it is already in the layout, and only its ink
 * arrives.
 */
const Form = ({ invalid, held }: { invalid: boolean; held?: boolean }) => (
  <div className="flex w-48 flex-col gap-3">
    <div className="flex flex-col gap-1.5">
      <div className="border-input h-9 rounded-md border" />
      {(held || invalid) && (
        <p className={cn("text-destructive text-xs", !invalid && "invisible")}>
          {MESSAGE}
        </p>
      )}
    </div>
    <div className="border-input h-9 rounded-md border" />
  </div>
);

export const ValidationSpaceDemo = () => {
  const [invalid, setInvalid] = useState(false);

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex items-start gap-12">
        <DesignCase note="Mounted on error" verdict="wrong">
          <Form invalid={invalid} />
        </DesignCase>
        <DesignCase note="Reserved height" verdict="right">
          <Form held invalid={invalid} />
        </DesignCase>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setInvalid((current) => !current)}
      >
        {invalid ? "Clear the error" : "Fail validation"}
      </Button>
    </div>
  );
};
