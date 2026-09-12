"use client";

import { ArrowDown } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ComponentProps, ReactNode, RefObject } from "react";

import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* -- The thread ----------------------------------------------------------------
 * A transcript is a scroll region with a mind of its own. Turns land at the bottom
 * and the reader is usually already there, so the region has to follow its own tail;
 * the moment they scroll up to re-read something it has to stop, or the passage they
 * were reading walks away underneath them.
 *
 * So the root owns one piece of state — whether the reader is at the end — and the
 * follow is written straight into the DOM. Pinning is a `scrollTop` assignment on the
 * frame after a mutation, never a React update: a thread that re-rendered on every
 * streamed token would diff a tree to move one number, and the commit would land in
 * the middle of the scroll it is trying to produce.
 *
 * The parts are the frame and the way back: `Conversation` is the box, the
 * `ConversationContent` viewport is what every part measures against, and the scroll
 * button is the door home. What goes in it — messages, an empty state, a waiting row
 * — is the caller's.
 * --------------------------------------------------------------------------- */

/** A scroll position this close to the end still counts as the end. Sub-pixel layout
 *  means "at the bottom" is rarely exactly zero, and a browser that has just been
 *  pinned has not finished rounding. */
const SLACK = 24;

/** Reduced motion turns a glide into a jump: the position is the information, and a
 *  smooth scroll across half a thread is not worth the wait it costs. */
const prefersJump = () =>
  typeof window !== "undefined" &&
  Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

/** How much of the thread sits below the bottom edge, in px. Negative while the
 *  transcript is shorter than the window and there is nothing to scroll at all. */
const distanceFromEnd = (node: HTMLElement) =>
  node.scrollHeight - node.clientHeight - node.scrollTop;

interface ConversationState {
  /** Whether the viewport is sitting at the end of the thread. */
  atEnd: boolean;
  /** Move to the newest turn and start following again. */
  scrollToEnd: (behavior?: ScrollBehavior) => void;
  /** Re-reads the viewport's position. The content calls it on every scroll. */
  sync: () => void;
  /** The scrolling element, for anything that needs to measure the thread. */
  viewport: RefObject<HTMLDivElement | null>;
}

const ConversationContext = createContext<ConversationState | null>(null);

export const useConversation = () => {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error("Conversation parts must be used within a Conversation.");
  }

  return context;
};

export interface ConversationProps extends ComponentProps<"div"> {
  /** The frame's parts: `ConversationContent`, a scroll button, anything beside them. */
  children: ReactNode;
}

export const Conversation = ({
  children,
  className,
  ...props
}: ConversationProps) => {
  const viewport = useRef<HTMLDivElement>(null);
  // A ref, not state: the follow is read on frames the renderer never sees.
  const following = useRef(true);
  const [atEnd, setAtEnd] = useState(true);

  const scrollToEnd = useCallback((behavior: ScrollBehavior = "smooth") => {
    const node = viewport.current;
    if (!node) {
      return;
    }

    following.current = true;
    setAtEnd(true);
    node.scrollTo({
      behavior: behavior === "smooth" && prefersJump() ? "auto" : behavior,
      top: node.scrollHeight,
    });
  }, []);

  const sync = useCallback(() => {
    const node = viewport.current;
    if (!node) {
      return;
    }

    const next = distanceFromEnd(node) <= SLACK;
    // The ref is what the pin reads; the state only exists for the button. Writing it
    // through a function keeps a scroll frame from re-rendering an unchanged thread.
    following.current = next;
    setAtEnd((previous) => (previous === next ? previous : next));
  }, []);

  // Open on the newest turn, before the first paint, so a long thread does not flash
  // its opening line and then jump a thousand pixels down.
  useLayoutEffect(() => {
    const node = viewport.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, []);

  useEffect(() => {
    const node = viewport.current;
    if (!node) {
      return;
    }

    let frame = 0;
    const pin = () => {
      frame = 0;
      if (following.current) {
        node.scrollTop = node.scrollHeight;
      }
    };
    const schedule = () => {
      if (frame === 0) {
        frame = requestAnimationFrame(pin);
      }
    };

    // Text arrives without a scroll event and a box changes size without a mutation:
    // a webfont swapping in re-wraps every line, an image decodes, Streamdown's styles
    // land. So both reasons are observed, the turns themselves are measured rather than
    // just the viewport that wraps them, and both land on the same frame.
    const box = new ResizeObserver(schedule);
    const observeContent = () => {
      box.observe(node);
      for (const child of node.children) {
        box.observe(child);
      }
    };
    observeContent();

    const content = new MutationObserver(() => {
      // A new turn is a new box to measure.
      observeContent();
      schedule();
    });
    content.observe(node, {
      characterData: true,
      childList: true,
      subtree: true,
    });
    window.addEventListener("resize", schedule);

    return () => {
      if (frame !== 0) {
        cancelAnimationFrame(frame);
      }
      content.disconnect();
      box.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const state = useMemo<ConversationState>(
    () => ({ atEnd, scrollToEnd, sync, viewport }),
    [atEnd, scrollToEnd, sync]
  );

  return (
    <ConversationContext.Provider value={state}>
      <div
        className={cn("relative flex min-h-0 flex-1 flex-col", className)}
        data-slot="conversation"
        {...props}
      >
        {children}
      </div>
    </ConversationContext.Provider>
  );
};

export interface ConversationContentProps extends ComponentProps<"div"> {
  /** The turns. Laid out as a flex column, so `gap` is the spacing between them. */
  children: ReactNode;
}

/**
 * The viewport the whole thread scrolls in. It is the element the follow measures, so
 * a conversation built without it is a conversation that cannot follow — render
 * exactly one, directly inside the root.
 *
 * `overflow-anchor` is off on purpose. The browser's own anchoring would adjust the
 * position behind the pin on every line that wraps, by a different amount each time,
 * and that adjustment is itself a scroll — which is how the button ends up drawn while
 * the reader is still sitting at the end. The position is ours to hold.
 *
 * Chaining is not contained. The thread is usually the page's only scroller, but it is
 * also dropped into previews and panels with a page behind it, and a wheel that has
 * nowhere left to go in the thread should carry on down that page rather than stop.
 */
export const ConversationContent = ({
  children,
  className,
  onScroll,
  ...props
}: ConversationContentProps) => {
  const { sync, viewport } = useConversation();

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-y-auto [overflow-anchor:none]",
        className
      )}
      data-slot="conversation-content"
      onScroll={(event) => {
        onScroll?.(event);
        sync();
      }}
      ref={viewport}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * The way back to the tail. It is drawn only while the reader has left the end — a
 * button that is always there is one more thing to read on a surface whose whole
 * point is the text, and its absence is what says the thread is following along.
 */
export const ConversationScrollButton = ({
  children,
  className,
  ...props
}: ButtonProps) => {
  const { atEnd, scrollToEnd } = useConversation();

  if (atEnd) {
    return null;
  }

  return (
    <Button
      aria-label="Scroll to latest"
      className={cn(
        "absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full shadow-md",
        "animate-in fade-in duration-200 motion-reduce:animate-none",
        className
      )}
      onClick={() => scrollToEnd()}
      size="icon"
      type="button"
      variant="outline"
      {...props}
    >
      {children ?? <ArrowDown className="size-4" />}
    </Button>
  );
};
