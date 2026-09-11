"use client";

import { useEffect, useState } from "react";

import { Attachment } from "@/registry/new-york/attachment";

/** Shipped with the docs so the demo needs no external host — swap in your own `src`. */
const THUMB = "/attachment-demo.jpg";

interface DemoItem {
  id: string;
  kind: "file" | "image" | "uploading";
}

const INITIAL: DemoItem[] = [
  { id: "photo", kind: "image" },
  { id: "upload", kind: "uploading" },
  { id: "ready", kind: "file" },
];

export const AttachmentDemo = () => {
  const [items, setItems] = useState(INITIAL);
  const [percent, setPercent] = useState(8);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPercent((current) => (current >= 100 ? 0 : current + 6));
    }, 180);
    return () => window.clearInterval(timer);
  }, []);

  const remove = (id: string) =>
    setItems((current) => current.filter((item) => item.id !== id));

  return (
    <div className="flex w-full flex-wrap items-start gap-4">
      {items.map((item) => {
        if (item.kind === "image") {
          return (
            <Attachment
              key={item.id}
              name="raven.jpg"
              onRemove={() => remove(item.id)}
              src={THUMB}
            />
          );
        }
        if (item.kind === "uploading") {
          // A live percentage is all "uploading" means — there is no second state.
          return (
            <Attachment
              key={item.id}
              name="brand-assets.zip"
              progress={percent}
            />
          );
        }
        return (
          <Attachment
            key={item.id}
            name="payrollz-2026-q1-final.xlsx"
            onRemove={() => remove(item.id)}
          />
        );
      })}
    </div>
  );
};
