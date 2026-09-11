"use client";

import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Paperclip,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type AttachmentStatus = "error" | "ready" | "uploading";

export interface AttachmentProps {
  className?: string;
  /** Replaces the default per-type glyph. */
  icon?: ReactNode;
  /** Used as the label under a file attachment and for assistive tech. */
  name: string;
  onRemove?: () => void;
  /** 0–100. Omit once the upload has finished. */
  progress?: number;
  /** Image attachments render the picture instead of the glyph. */
  src?: string;
  /** Defaults to `uploading` while `progress` is under 100, otherwise `ready`. */
  status?: AttachmentStatus;
}

/**
 * The chip is a container query context and every internal dimension is a share of its
 * own width, so `className="size-20"` scales the whole chip instead of leaving a 56px
 * layout in a bigger box. 56px is the floor: below that the name and the remove button
 * stop being usable. Ratios come from the 112px reference, where 1cqw = 1.12px.
 */
/** The ring traces the card's own border, so the viewBox matches the base size. */
const RING_SIZE = 112;

/** Geometry of the traced rounded rect: inset from the card edge, corner radius and the
 *  stroke weight. */
const RING = { inset: 1.5, radius: 22.5, stroke: 3 } as const;

const RING_EDGE = RING_SIZE - RING.inset;
const RING_CORNER = RING.inset + RING.radius;
const RING_CORNER_END = RING_EDGE - RING.radius;
const arc = `A ${RING.radius} ${RING.radius} 0 0 1`;

/** The rounded rect as an explicit path, starting at the top centre and running
 *  clockwise. A `<rect>` would start just after the top-left corner, which `dashoffset`
 *  cannot fix: with a dash as long as the path the visible run is always pinned to the
 *  path start. */
const RING_PATH = [
  `M ${RING_SIZE / 2} ${RING.inset}`,
  `H ${RING_CORNER_END}`,
  `${arc} ${RING_EDGE} ${RING_CORNER}`,
  `V ${RING_CORNER_END}`,
  `${arc} ${RING_CORNER_END} ${RING_EDGE}`,
  `H ${RING_CORNER}`,
  `${arc} ${RING.inset} ${RING_CORNER_END}`,
  `V ${RING_CORNER}`,
  `${arc} ${RING_CORNER} ${RING.inset}`,
  "Z",
].join(" ");

/** Glyph per file extension; anything unlisted falls back to a plain page. */
const FILE_GLYPHS: Record<string, LucideIcon> = {
  avif: FileImage,
  bmp: FileImage,
  csv: FileSpreadsheet,
  doc: FileText,
  docx: FileText,
  gif: FileImage,
  gz: FileArchive,
  heic: FileImage,
  jpeg: FileImage,
  jpg: FileImage,
  js: FileCode,
  json: FileJson,
  jsx: FileCode,
  m4a: FileAudio,
  md: FileText,
  mov: FileVideo,
  mp3: FileAudio,
  mp4: FileVideo,
  ods: FileSpreadsheet,
  odt: FileText,
  pdf: FileText,
  png: FileImage,
  ppt: FileSpreadsheet,
  pptx: FileSpreadsheet,
  rar: FileArchive,
  rs: FileCode,
  svg: FileImage,
  tar: FileArchive,
  ts: FileCode,
  tsx: FileCode,
  txt: FileText,
  wav: FileAudio,
  webm: FileVideo,
  webp: FileImage,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  zip: FileArchive,
};

const glyphFor = (name: string) => {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return FILE_GLYPHS[extension] ?? File;
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));

const resolveStatus = ({
  progress,
  status,
}: {
  progress?: number;
  status?: AttachmentStatus;
}): AttachmentStatus => {
  if (status) {
    return status;
  }
  if (progress === undefined || progress >= 100) {
    return "ready";
  }
  return "uploading";
};

const resolveA11y = ({
  failed,
  name,
  percent,
  uploading,
}: {
  failed: boolean;
  name: string;
  percent: number;
  uploading: boolean;
}) => {
  if (uploading) {
    return {
      "aria-busy": true,
      "aria-label": name,
      "aria-valuemax": 100,
      "aria-valuemin": 0,
      "aria-valuenow": percent,
      role: "progressbar",
    };
  }
  if (failed) {
    return { "aria-label": name };
  }
  return {};
};

const AttachmentRing = ({
  failed,
  percent,
}: {
  failed: boolean;
  percent: number;
}) => (
  <svg
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 size-full"
    fill="none"
    viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
  >
    {/* `pathLength` normalises the perimeter to 100, so the dash maths is just
        `100 - percent` and the run grows clockwise from the top centre. */}
    <path
      className={cn(
        "transition-[stroke-dashoffset] duration-500 ease-linear",
        failed ? "stroke-destructive" : "stroke-primary"
      )}
      d={RING_PATH}
      pathLength={100}
      strokeDasharray="100"
      strokeDashoffset={100 - percent}
      strokeLinecap="round"
      strokeWidth={RING.stroke}
    />
  </svg>
);

const AttachmentGlyph = ({
  children,
  name,
}: {
  children?: ReactNode;
  name: string;
}) => {
  const Glyph = glyphFor(name);

  if (children) {
    return (
      <span className="shrink-0 text-muted-foreground [&_svg]:size-[28.6cqw]">
        {children}
      </span>
    );
  }

  return (
    <span className="grid size-[28.6cqw] shrink-0 place-items-center rounded-[7.1cqw] bg-muted">
      <span className="relative grid place-items-center">
        {/* White page so the per-type detail lines stay legible on the grey tile. */}
        <Glyph
          className="size-[21.4cqw] fill-card stroke-muted-foreground/40"
          strokeWidth="1.5"
        />
        <span className="absolute -bottom-[3.6cqw] -left-[5.4cqw] grid size-[14.3cqw] place-items-center rounded-full bg-muted">
          <Paperclip className="size-[12.5cqw] stroke-card" strokeWidth="2.5" />
        </span>
      </span>
    </span>
  );
};

const AttachmentFile = ({
  failed,
  icon,
  name,
  percent,
  uploading,
}: {
  failed: boolean;
  icon?: ReactNode;
  name: string;
  percent: number;
  uploading: boolean;
}) => (
  <>
    <div className="flex items-start justify-between gap-2">
      <AttachmentGlyph name={name}>{icon}</AttachmentGlyph>
      {uploading ? (
        <span
          className={cn(
            // Ratios would render 8px type at the 56px floor, so text keeps a minimum.
            "pt-0.5 font-medium text-[max(10px,14.3cqw)] text-primary tabular-nums"
          )}
        >
          {percent}%
        </span>
      ) : null}
    </div>
    <p
      className={cn(
        "mt-auto truncate text-[max(9px,12.5cqw)]",
        failed ? "text-destructive" : "text-muted-foreground"
      )}
    >
      {name}
    </p>
  </>
);

const AttachmentRemove = ({
  image,
  name,
  onRemove,
}: {
  image: boolean;
  name: string;
  onRemove: () => void;
}) => (
  <button
    aria-label={`Remove ${name}`}
    className={cn(
      "absolute top-[3.6cqw] right-[3.6cqw] grid size-[35.7cqw] cursor-pointer place-items-center rounded-full outline-none transition-[background-color,color,scale] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
      image
        ? "bg-white/25 text-white/70 backdrop-blur-md hover:bg-white/40 hover:text-white/95"
        : "text-muted-foreground/40 hover:bg-muted hover:text-foreground"
    )}
    onClick={onRemove}
    type="button"
  >
    <X
      className={cn("size-[17.9cqw]", image && "drop-shadow-sm")}
      strokeWidth="1.75"
    />
  </button>
);

export const Attachment = ({
  className,
  icon,
  name,
  onRemove,
  progress,
  src,
  status,
}: AttachmentProps) => {
  const state = resolveStatus({ progress, status });
  const uploading = state === "uploading";
  const failed = state === "error";
  const percent = clamp(progress ?? 0);
  const image = Boolean(src);
  // The mock keeps the uploading chip bare — relax this if cancelling an upload
  // matters more than matching it.
  const removable = Boolean(onRemove) && !uploading;

  return (
    <div
      {...resolveA11y({ failed, name, percent, uploading })}
      className={cn(
        "@container relative size-14 shrink-0 rounded-[21.4%] border border-border bg-card",
        className
      )}
      data-state={state}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={name}
          className={cn(
            "absolute inset-0 size-full rounded-[21.4%] object-cover",
            uploading && "opacity-40"
          )}
          src={src}
        />
      ) : (
        // Container units resolve against an ancestor container, never the element that
        // declares it, so the padding has to sit one layer in.
        <div className="absolute inset-0 flex flex-col p-[12.5cqw]">
          <AttachmentFile
            failed={failed}
            icon={icon}
            name={name}
            percent={percent}
            uploading={uploading}
          />
        </div>
      )}

      {uploading || failed ? (
        <AttachmentRing failed={failed} percent={failed ? 100 : percent} />
      ) : null}

      {removable && onRemove ? (
        <AttachmentRemove image={image} name={name} onRemove={onRemove} />
      ) : null}
    </div>
  );
};
