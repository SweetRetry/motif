"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FlowEdge } from "@/registry/new-york/flow-edge";

/** Where the line is attached. Both ends get one, so the connection has somewhere to
 *  have come from and somewhere to be going. Each is centred on the corner it sits in,
 *  which is where the path starts and ends. */
const PORT = "absolute size-2 rounded-full bg-foreground/35";

export const FlowEdgeDemo = () => {
  const [active, setActive] = useState(true);

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-8">
      <div className="relative w-full">
        <FlowEdge active={active} className="text-primary" />
        <span
          aria-hidden="true"
          className={`${PORT} bottom-0 left-0 -translate-x-1/2 translate-y-1/2`}
        />
        <span
          aria-hidden="true"
          className={`${PORT} top-0 right-0 translate-x-1/2 -translate-y-1/2`}
        />
      </div>

      <Button
        onClick={() => setActive((current) => !current)}
        size="sm"
        sound="click"
        type="button"
        variant="outline"
      >
        {active ? "Stop the flow" : "Start the flow"}
      </Button>
    </div>
  );
};
