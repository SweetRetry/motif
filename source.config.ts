import {
  defineConfig,
  defineDocs,
  frontmatterSchema,
  metaSchema,
} from "fumadocs-mdx/config";
import { rehypePrettyCode } from "rehype-pretty-code";
import { z } from "zod";

import { DOCS_DIR } from "@/lib/docs";
import { transformers } from "@/lib/highlight-code";

export default defineConfig({
  mdxOptions: {
    rehypePlugins: (plugins) => {
      plugins.shift();
      plugins.push([
        rehypePrettyCode,
        {
          theme: {
            dark: "github-dark",
            light: "github-light-default",
          },
          transformers,
        },
      ]);

      return plugins;
    },
  },
});

export const docs = defineDocs({
  dir: DOCS_DIR,
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
    /* `added` is the day the page first shipped. The sidebar flags a page as new
     * for a while after it, so the flag expires on its own instead of being
     * remembered and removed by hand. */
    schema: frontmatterSchema.extend({ added: z.iso.date() }),
  },
  meta: {
    schema: metaSchema,
  },
});
