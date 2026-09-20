import { CheckIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const VERDICTS = {
  right: { Icon: CheckIcon, label: "Right", tone: "text-primary" },
  wrong: { Icon: XIcon, label: "Wrong", tone: "text-destructive" },
} as const;

/**
 * One side of a design case: the verdict, what that side is doing, and the thing
 * itself.
 *
 * The verdict is an icon and a word, with colour as a third cue rather than the
 * only one — a case is read in a review, and it has to survive being read
 * without colour vision or under forced colours. Wrong is always on the left, so
 * the two sides do not have to be read to be told apart.
 */
export const DesignCase = ({
  verdict,
  note,
  children,
}: {
  verdict: keyof typeof VERDICTS;
  note: string;
  children: React.ReactNode;
}) => {
  const { Icon, label, tone } = VERDICTS[verdict];

  return (
    <figure className="flex flex-col items-start gap-3">
      <figcaption className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
        <span className={cn("flex items-center gap-1 font-medium", tone)}>
          <Icon className="size-3.5" />
          {label}
        </span>
        <span className="text-muted-foreground">{note}</span>
      </figcaption>
      {children}
    </figure>
  );
};
