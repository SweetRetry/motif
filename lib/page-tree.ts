import type { Node as PageTreeNode } from "fumadocs-core/page-tree";

export type PageTreeFolder = Extract<PageTreeNode, { type: "folder" }>;
/** `isNew` is set by the loader for a page whose `added` date is recent. */
export type PageTreePage = Extract<PageTreeNode, { type: "page" }> & {
  isNew?: true;
};

export const getPagesFromFolder = (folder: PageTreeFolder): PageTreePage[] =>
  folder.children.filter(
    (child): child is PageTreePage => child.type === "page"
  );

export const getAllPagesFromFolder = (
  folder: PageTreeFolder
): PageTreePage[] => {
  const pages: PageTreePage[] = [];

  for (const child of folder.children) {
    if (child.type === "page") {
      pages.push(child);
    } else if (child.type === "folder") {
      pages.push(...getAllPagesFromFolder(child));
    }
  }

  return pages;
};
