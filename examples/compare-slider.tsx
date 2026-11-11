"use client";

import {
  CompareSlider,
  CompareSliderAfter,
  CompareSliderBefore,
  CompareSliderHandle,
  CompareSliderLabel,
  useCompare,
} from "@/registry/new-york/compare-slider";

/** One picture, drawn twice. The before is the same file pushed through a blur and a
 *  slight zoom to hide the soft edge — what an upscale is shown against, without a second
 *  asset to keep in step with the first. */
const SRC = "/cover-fan/watercolor-rose.webp";

export const CompareSliderDemo = () => (
  <CompareSlider className="aspect-[3/4] max-w-xs">
    <CompareSliderAfter>
      <img alt="Upscaled rose" className="size-full object-cover" src={SRC} />
      <CompareSliderLabel>Upscaled</CompareSliderLabel>
    </CompareSliderAfter>
    <CompareSliderBefore>
      <img
        alt="Original rose"
        className="size-full scale-110 object-cover blur-sm"
        src={SRC}
      />
      <CompareSliderLabel>Original</CompareSliderLabel>
    </CompareSliderBefore>
    <CompareSliderHandle label="Compare original and upscaled" />
  </CompareSlider>
);

/** A control the component does not ship: the caller reads `useCompare` and moves the
 *  divider from outside the handle. */
const Toggle = () => {
  const { position, setPosition } = useCompare();

  return (
    <button
      className="absolute right-3 bottom-3 rounded-full bg-black/50 px-2.5 py-1 font-medium text-white text-xs backdrop-blur-sm"
      onClick={() => setPosition(position > 0.5 ? 0 : 1)}
      onPointerDown={(event) => event.stopPropagation()}
      type="button"
    >
      Flip
    </button>
  );
};

/** No handle: the divider is set from a button and the frame is still draggable. A
 *  caller who wants a plain before and after, with no grip to explain, leaves the part
 *  out. */
export const CompareSliderToggleDemo = () => (
  <CompareSlider className="aspect-[3/4] max-w-xs" defaultPosition={1}>
    <CompareSliderAfter>
      <img alt="Redrawn rose" className="size-full object-cover" src={SRC} />
      <CompareSliderLabel>Redraw</CompareSliderLabel>
    </CompareSliderAfter>
    <CompareSliderBefore>
      <img
        alt="Draft rose"
        className="size-full scale-110 object-cover grayscale blur-sm"
        src={SRC}
      />
      <CompareSliderLabel>Draft</CompareSliderLabel>
    </CompareSliderBefore>
    <Toggle />
  </CompareSlider>
);
