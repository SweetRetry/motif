"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ComponentPreviewFrame = ({
  className,
  previewClassName,
  align = "center",
  hideCode = false,
  component,
  source,
  sourcePreview,
  ...props
}: React.ComponentProps<"div"> & {
  previewClassName?: string;
  align?: "center" | "start" | "end";
  hideCode?: boolean;
  component: ReactNode;
  source: ReactNode;
  sourcePreview?: ReactNode;
}) => {
  const [isCodeVisible, setIsCodeVisible] = useState(false);

  return (
    <div
      data-slot="component-preview"
      className={cn(
        "group/preview relative mt-6 mb-12 flex flex-col overflow-hidden rounded-xl border first:mt-0 md:-mx-1",
        className
      )}
      {...props}
    >
      <div
        data-slot="preview"
        data-align={align}
        className={cn(
          "relative flex min-h-72 w-full justify-center p-6 sm:p-10",
          "data-[align=center]:items-center data-[align=start]:items-start data-[align=end]:items-end",
          previewClassName
        )}
      >
        {component}
      </div>

      {hideCode ? null : (
        <div
          data-slot="code"
          data-code-visible={isCodeVisible}
          className={cn(
            "relative overflow-hidden border-t bg-code text-code-foreground",
            "[&_[data-rehype-pretty-code-figure]]:m-0! [&_[data-rehype-pretty-code-figure]]:mx-0! [&_[data-rehype-pretty-code-figure]]:rounded-none! [&_[data-rehype-pretty-code-figure]]:bg-transparent!",
            "[&_[data-slot=copy-button]]:hidden data-[code-visible=true]:[&_[data-slot=copy-button]]:flex",
            "[&_pre]:max-h-96"
          )}
        >
          {isCodeVisible ? (
            <div className="relative">
              {source}
              <Button
                className="text-muted-foreground absolute top-2 right-11 z-10 h-7 px-2"
                size="sm"
                sound="click"
                type="button"
                variant="ghost"
                onClick={() => setIsCodeVisible(false)}
              >
                Collapse
              </Button>
            </div>
          ) : (
            <div className="relative">
              {sourcePreview}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute inset-0 bg-linear-to-t from-code via-code/60 to-transparent" />
                <Button
                  className="relative z-10 shadow-none"
                  size="sm"
                  sound="click"
                  type="button"
                  variant="outline"
                  onClick={() => setIsCodeVisible(true)}
                >
                  View Code
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
