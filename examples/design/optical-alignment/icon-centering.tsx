"use client";

import { Play } from "lucide-react";
import { useState } from "react";

import { DesignCase } from "@/components/design-case";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A play triangle carries its mass on the left of the box it is drawn in, so a
 * box-centred one reads as sitting left of centre. `translate-x-1` is 5% of the
 * glyph here, which is where the triangle's mass actually is.
 */
const PlayButton = ({ optical }: { optical?: boolean }) => (
  <div className="bg-primary text-primary-foreground flex size-40 items-center justify-center rounded-full">
    <Play className={cn("size-20 fill-current", optical && "translate-x-1")} />
  </div>
);

export const IconCenteringDemo = () => {
  const [blurred, setBlurred] = useState(false);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-start gap-16">
        <DesignCase note="Box centered" verdict="wrong">
          <div className={cn(blurred && "blur-lg")}>
            <PlayButton />
          </div>
        </DesignCase>
        <DesignCase note="Optically centered" verdict="right">
          <div className={cn(blurred && "blur-lg")}>
            <PlayButton optical />
          </div>
        </DesignCase>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setBlurred((current) => !current)}
      >
        {blurred ? "Sharpen" : "Blur the shapes"}
      </Button>
    </div>
  );
};
