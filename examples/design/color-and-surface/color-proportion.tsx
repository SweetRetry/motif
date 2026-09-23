import { Sparkles } from "lucide-react";

import { DesignCase } from "@/components/design-case";

/**
 * Wrong: Accent in the shell (~45% accent color).
 * A solid primary header consumes 40% of the card's surface with static decoration,
 * overpowering the interactive CTA button below.
 */
const BannerCard = () => (
  <div className="bg-card border-border flex w-64 flex-col overflow-hidden rounded-xl border shadow-xs">
    <div className="bg-primary text-primary-foreground p-4">
      <div className="flex items-center gap-1.5">
        <Sparkles className="size-3.5" />
        <span className="text-xs font-semibold">Autonomous Agents</span>
      </div>
      <p className="text-primary-foreground/80 mt-1.5 text-[11px] leading-normal">
        Unlimited background tools and deep multi-step reasoning loops.
      </p>
    </div>
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">Compute budget</span>
        <span className="font-medium tabular-nums">100 hrs/mo</span>
      </div>
      <button
        type="button"
        className="bg-primary text-primary-foreground rounded-md py-1.5 text-center text-xs font-medium"
      >
        Upgrade Plan
      </button>
    </div>
  </div>
);

/**
 * Right: The 60-30-10 distribution.
 * 60% neutral surface, 30% structural typography and subtle divider,
 * 10% targeted primary accent strictly on the interactive CTA button.
 */
const BalancedCard = () => (
  <div className="bg-card border-border flex w-64 flex-col rounded-xl border p-4 shadow-xs">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Sparkles className="text-muted-foreground size-3.5" />
        <span className="text-foreground text-xs font-medium">
          Autonomous Agents
        </span>
      </div>
      <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-[10px]">
        Pro
      </span>
    </div>
    <p className="text-muted-foreground mt-1.5 text-[11px] leading-normal">
      Unlimited background tools and deep multi-step reasoning loops.
    </p>
    <div className="border-border mt-4 flex items-baseline justify-between border-t pt-3 text-xs">
      <span className="text-muted-foreground">Compute budget</span>
      <span className="font-medium tabular-nums">100 hrs/mo</span>
    </div>
    <button
      type="button"
      className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-md py-1.5 text-center text-xs font-medium transition-colors"
    >
      Upgrade Plan
    </button>
  </div>
);

export const ColorProportionDemo = () => (
  <div className="flex items-start gap-12">
    <DesignCase note="Accent header banner" verdict="wrong">
      <BannerCard />
    </DesignCase>
    <DesignCase note="60-30-10 distribution" verdict="right">
      <BalancedCard />
    </DesignCase>
  </div>
);
