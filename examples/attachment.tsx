"use client";

import { useEffect, useState } from "react";

import { Attachment } from "@/registry/new-york/attachment";

/** Shipped with the docs so the demo needs no external host — swap in your own `src`. */
const THUMB = "/attachment-demo.jpg";

interface DemoItem {
  id: string;
  /** `live` chips track the shared demo percentage; the rest are static. */
  live?: boolean;
  name: string;
  src?: string;
  status?: "error";
}

const INITIAL: DemoItem[] = [
  { id: "photo", name: "raven.jpg", src: THUMB },
  { id: "photo-upload", live: true, name: "skyline.heic", src: THUMB },
  { id: "photo-error", name: "scan-0421.heic", src: THUMB, status: "error" },
  { id: "upload", live: true, name: "brand-assets.zip" },
  { id: "ready", name: "payrollz-2026-q1-final.xlsx" },
  { id: "error", name: "quarterly-report.pdf", status: "error" },
];

export const AttachmentDemo = () => {
  const [items, setItems] = useState(INITIAL);
  // Stops short of 100 so the uploading chips keep uploading instead of flashing ready.
  const [percent, setPercent] = useState(8);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPercent((current) => (current >= 92 ? 8 : current + 6));
    }, 180);
    return () => window.clearInterval(timer);
  }, []);

  const remove = (id: string) =>
    setItems((current) => current.filter((item) => item.id !== id));

  return (
    <div className="flex w-full flex-wrap items-start gap-4">
      {items.map((item) => (
        <Attachment
          key={item.id}
          name={item.name}
          onRemove={() => remove(item.id)}
          progress={item.live ? percent : undefined}
          src={item.src}
          status={item.status}
        />
      ))}
    </div>
  );
};
