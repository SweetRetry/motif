/**
 * Generates the site's favicons from the mark in `constants/logo-mark.ts`, so a change
 * to the mark is one edit and one run:
 *
 *   pnpm icons
 *
 * The SVG favicons are the bare mark, one per tab theme. Every raster fallback puts it
 * on a dark tile instead: a PNG cannot follow the tab's theme, and a bare mark in
 * either colour vanishes on a tab of the same colour. The rasters are drawn by
 * `next/og`, the renderer the OG images use, and the ICO wraps them as PNG entries.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { ImageResponse } from "next/og.js";
import { createElement } from "react";

import { LOGO_DOTS, LOGO_SIZE, logoMarkSvg } from "../constants/logo-mark.ts";

const PUBLIC = join(import.meta.dirname, "..", "public");

/* The dark theme's background and foreground. A favicon sits on browser chrome, not
 * on the page, so it carries literal colours rather than the theme's tokens. */
const INK = "#0a0a0a";
const PAPER = "#fafafa";

/** The mark in light ink on a dark tile. `radius` and `scale` are fractions of the
 *  tile: iOS rounds its own icons, so the touch icon is square. */
const tile = ({ radius, scale }: { radius: number; scale: number }) => {
  const inset = (LOGO_SIZE * (1 - scale)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOGO_SIZE} ${LOGO_SIZE}"><rect width="${LOGO_SIZE}" height="${LOGO_SIZE}" rx="${LOGO_SIZE * radius}" fill="${INK}"/><g transform="translate(${inset} ${inset}) scale(${scale})" fill="${PAPER}">${LOGO_DOTS.map(
    ({ cx, cy, opacity, r }) =>
      `<circle cx="${cx}" cy="${cy}" r="${r}" opacity="${opacity}"/>`
  ).join("")}</g></svg>`;
};

const png = async (svg: string, size: number) => {
  const image = new ImageResponse(
    createElement("img", {
      height: size,
      src: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
      width: size,
    }),
    { height: size, width: size }
  );
  return Buffer.from(await image.arrayBuffer());
};

/** An ICO whose entries are PNGs, which every browser that reads ICO accepts. */
const ico = (entries: { data: Buffer; size: number }[]) => {
  const header = Buffer.alloc(6 + 16 * entries.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = header.length;
  for (const [index, { data, size }] of entries.entries()) {
    const at = 6 + 16 * index;
    header.writeUInt8(size % 256, at);
    header.writeUInt8(size % 256, at + 1);
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(data.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries.map(({ data }) => data)]);
};

const write = (file: string, data: Buffer | string) => {
  writeFileSync(join(PUBLIC, file), data);
  console.log(`icons: public/${file}`);
};

// The light favicon also follows the theme itself, for browsers that skip `media`.
write(
  "favicon.svg",
  logoMarkSvg(INK).replace(
    "<circle",
    `<style>svg{fill:${INK}}@media (prefers-color-scheme:dark){svg{fill:${PAPER}}}</style><circle`
  )
);
write("favicon-dark.svg", logoMarkSvg(PAPER));

const SMALL = tile({ radius: 0.22, scale: 0.78 });
const LARGE = tile({ radius: 0.22, scale: 0.62 });

const small = await Promise.all(
  [16, 32, 48].map(async (size) => ({ data: await png(SMALL, size), size }))
);
write("favicon.ico", ico(small));
write("favicon-16x16.png", small[0].data);
write("favicon-32x32.png", small[1].data);
write("favicon-96x96.png", await png(SMALL, 96));
write("apple-touch-icon.png", await png(tile({ radius: 0, scale: 0.62 }), 180));
write("android-chrome-192x192.png", await png(LARGE, 192));
write("android-chrome-512x512.png", await png(LARGE, 512));
