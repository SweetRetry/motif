import { useEffect, useState } from "react";

import { Film } from "../film/film";
import { LENGTH } from "../film/timeline";

/** A shot is one thing on stage for a fixed run. The capture script reads `seconds`
 *  off the page, so the length of a clip lives beside what it films. */
interface Shot {
  render: () => React.ReactNode;
  seconds: number;
}

export const SHOTS: Record<string, Shot> = {
  film: { render: () => <Film />, seconds: LENGTH },
};

declare global {
  interface Window {
    __shot?: { seconds: number; start: () => void };
  }
}

/** Holds the shot off stage until the capture script says go, so frame zero is the
 *  frame the component mounts on rather than wherever the page load left it. */
export const Stage = ({ name }: { name: string }) => {
  const [started, setStarted] = useState(false);
  const shot = SHOTS[name];

  useEffect(() => {
    if (shot) {
      window.__shot = { seconds: shot.seconds, start: () => setStarted(true) };
    }
  }, [shot]);

  if (!shot) {
    return <p className="p-8 text-destructive">No shot named “{name}”.</p>;
  }

  return (
    <main className="flex h-dvh w-dvw items-center justify-center bg-background">
      {started ? shot.render() : null}
    </main>
  );
};
