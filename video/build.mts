/**
 * Bundles the stage into dist/: one script, one stylesheet, the fonts and a page.
 *
 *   node build.mts
 *
 * Only the shots and what they import are compiled, so this stays a few seconds and a
 * few hundred megabytes. The site's Next server is never started. Capture opens
 * dist/index.html straight off disk.
 */
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

import tailwind from "@tailwindcss/postcss";
import { build } from "esbuild";
import postcss from "postcss";

const here = import.meta.dirname;
const repo = resolve(here, "..");
const dist = join(here, "dist");
mkdirSync(join(dist, "fonts"), { recursive: true });

await build({
  bundle: true,
  // The site's constants read deploy variables off `process.env`; a stage has none.
  define: { "process.env": "{}", "process.env.NODE_ENV": '"production"' },
  entryPoints: [join(here, "stage/main.tsx")],
  format: "iife",
  jsx: "automatic",
  logLevel: "warning",
  // Every registry file opens with "use client", which means nothing outside Next.
  logOverride: {
    "module level directives cause errors when bundled": "silent",
  },
  outfile: join(dist, "stage.js"),
  tsconfig: join(repo, "tsconfig.json"),
});

// esbuild writes the CSS the bundle imports (React Flow's base sheet) beside the
// script, under the same name the site stylesheet goes to. It is read first and kept
// ahead of the site's, so the site's utilities still win where the two meet.
const imported = join(dist, "stage.css");
const bundled = existsSync(imported) ? readFileSync(imported, "utf-8") : "";
const from = join(here, "stage/stage.css");
const css = await postcss([tailwind({ base: repo })]).process(
  readFileSync(from, "utf-8"),
  { from, to: imported }
);
writeFileSync(imported, `${bundled}\n${css.css}`);

const fonts = join(here, "node_modules/geist/dist/fonts");
for (const file of [
  "geist-sans/Geist-Variable.woff2",
  "geist-mono/GeistMono-Variable.woff2",
]) {
  copyFileSync(join(fonts, file), join(dist, "fonts", file.split("/")[1]));
}

// The loop the film's canvas makes: the portrait cropped wide, pushed in slowly. Cut
// here from the picture the film already shows, so it is one asset and not two.
execFileSync("ffmpeg", [
  "-y",
  "-loglevel",
  "error",
  "-loop",
  "1",
  "-i",
  join(repo, "public/attachment-demo.jpg"),
  "-vf",
  "scale=1280:-2,crop=1280:720,zoompan=z='1+0.0006*on':d=1:s=1280x720:fps=30",
  "-t",
  "4",
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  join(dist, "raven-loop.mp4"),
]);

writeFileSync(
  join(dist, "index.html"),
  `<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="./stage.css" />
  </head>
  <body class="text-foreground font-sans antialiased">
    <div id="root"></div>
    <script src="./stage.js"></script>
  </body>
</html>
`
);

console.log(`stage built → ${dist}`);
