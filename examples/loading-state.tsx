"use client";

import {
  LoadingState,
  LoadingStateClock,
  LoadingStateLabel,
  LoadingStateMark,
} from "@/registry/new-york/agents/loading-state";

export const LoadingStateDemo = () => (
  <LoadingState>
    <LoadingStateMark />
    <LoadingStateLabel>Churning</LoadingStateLabel>
    <LoadingStateClock />
  </LoadingState>
);

/** The same parts with one left out each. The mark alone is the wait before there is
 *  anything to name; the label without a clock is a wait nobody is counting. */
export const LoadingStatePartsDemo = () => (
  <div className="flex flex-col items-start gap-4">
    <LoadingState>
      <LoadingStateMark />
    </LoadingState>
    <LoadingState>
      <LoadingStateMark />
      <LoadingStateLabel>Thinking</LoadingStateLabel>
    </LoadingState>
    <LoadingState>
      <LoadingStateMark />
      <LoadingStateLabel>Searching the web</LoadingStateLabel>
      <LoadingStateClock />
    </LoadingState>
  </div>
);
