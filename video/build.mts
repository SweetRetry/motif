/**
 * Bundles the stage into dist/: one script, one stylesheet, the fonts and a page.
 *
 *   node build.mts
 *
 * Only the shots and what they import are compiled, so this stays a few seconds and a
 * few hundred megabytes. The site's Next server is never started. Capture opens
 * dist/index.html straight off disk.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

const from = join(here, "stage/stage.css");
const css = await postcss([tailwind({ base: repo })]).process(
  readFileSync(from, "utf-8"),
  { from, to: join(dist, "stage.css") }
);
writeFileSync(join(dist, "stage.css"), css.css);

const fonts = join(here, "node_modules/geist/dist/fonts");
for (const file of [
  "geist-sans/Geist-Variable.woff2",
  "geist-mono/GeistMono-Variable.woff2",
]) {
  copyFileSync(join(fonts, file), join(dist, "fonts", file.split("/")[1]));
}

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
