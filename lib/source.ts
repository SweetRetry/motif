import type { InferPageType } from "fumadocs-core/source";
import { loader } from "fumadocs-core/source";

import { docs } from "@/.source/server";
import { ROUTES } from "@/constants/routes";
import { AGENT_DOCS_DIRECTIVE_MARKDOWN } from "@/lib/agent-discovery/directive";
import { docsContentRoute, docsImageRoute } from "@/lib/docs";
import type { PageTreePage } from "@/lib/page-tree";

/** How long after its `added` date a page is flagged as new. */
const NEW_FOR_MS = 14 * 24 * 60 * 60 * 1000;

export const source = loader({
  baseUrl: ROUTES.DOCS,
  pageTree: {
    transformers: [
      {
        file(node, filePath) {
          const file = filePath ? this.storage.read(filePath) : undefined;
          if (
            file?.format !== "page" ||
            Date.now() - Date.parse(file.data.added) > NEW_FOR_MS
          ) {
            return node;
          }
          const page: PageTreePage = { ...node, isNew: true };
          return page;
        },
      },
    ],
  },
  source: docs.toFumadocsSource(),
});

export const getPageImage = (page: InferPageType<typeof source>) => {
  const segments = [...page.slugs, "image.png"];

  return {
    segments,
    url: `${docsImageRoute}/${segments.join("/")}`,
  };
};

export const getPageMarkdownUrl = (page: InferPageType<typeof source>) => {
  const segments = [...page.slugs, "content.md"];

  return {
    segments,
    url: `${docsContentRoute}/${segments.join("/")}`,
  };
};

export const getLLMText = async (page: InferPageType<typeof source>) => {
  const processed = await page.data.getText("processed");

  const sections = [
    page.data.description,
    AGENT_DOCS_DIRECTIVE_MARKDOWN,
    processed,
  ].filter(Boolean);

  return `# ${page.data.title}

${sections.join("\n\n")}`;
};
