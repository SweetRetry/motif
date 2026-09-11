import type { ReactNode } from "react";

import { ComponentPreviewFrame } from "@/components/component-preview-frame";
import { ComponentSource } from "@/components/component-source";

const PEEK_LINES = 3;

export const ComponentPreview = ({
  name,
  src,
  title,
  className,
  previewClassName,
  align = "center",
  hideCode = false,
  children,
}: {
  name?: string;
  src?: string;
  title?: string;
  className?: string;
  previewClassName?: string;
  align?: "center" | "start" | "end";
  hideCode?: boolean;
  children?: ReactNode;
}) => (
  <ComponentPreviewFrame
    align={align}
    className={className}
    component={children}
    hideCode={hideCode}
    previewClassName={previewClassName}
    source={
      <ComponentSource
        collapsible={false}
        name={name}
        src={src}
        title={title}
      />
    }
    sourcePreview={
      <ComponentSource
        collapsible={false}
        maxLines={PEEK_LINES}
        name={name}
        src={src}
      />
    }
  />
);
