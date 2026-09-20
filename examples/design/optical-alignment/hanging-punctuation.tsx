import { DesignCase } from "@/components/design-case";
import { cn } from "@/lib/utils";

/**
 * A quotation mark is mostly white space under the glyph, so a line that opens
 * with one starts visually lower and further in than the lines below it. A
 * negative first-line indent walks the mark back out into the margin.
 */
const Quote = ({
  hanging,
  children,
}: {
  hanging?: boolean;
  children: string;
}) => (
  <div className="border-l-2 pl-6">
    <p
      className={cn(
        "text-sm leading-relaxed italic",
        hanging && "indent-[-0.42em]"
      )}
    >
      {children}
    </p>
  </div>
);

const QUOTE =
  "“The mark is the only thing that moves. Every line under it keeps the same left edge, which is what the eye reads as the block.”";

export const HangingPunctuationDemo = () => (
  <div className="grid w-full max-w-xl grid-cols-2 gap-10">
    <DesignCase note="In-flow mark" verdict="wrong">
      <Quote>{QUOTE}</Quote>
    </DesignCase>
    <DesignCase note="Hanging in margin" verdict="right">
      <Quote hanging>{QUOTE}</Quote>
    </DesignCase>
  </div>
);
