"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ROUTES } from "@/constants/routes";
import { EXCLUDED_SECTIONS, isComponentsFolder } from "@/lib/docs";
import { getAllPagesFromFolder, getPagesFromFolder } from "@/lib/page-tree";
import type { PageTreeFolder } from "@/lib/page-tree";
import type { source } from "@/lib/source";

const TOP_LEVEL_SECTIONS = [
  { href: ROUTES.DOCS, name: "Introduction" },
  { href: ROUTES.DOCS_INSTALLATION, name: "Installation" },
  { href: ROUTES.DOCS_DESIGN, name: "Design" },
  { href: ROUTES.DOCS_COMPONENTS, name: "Components" },
  { href: ROUTES.LLMS, name: "llms.txt" },
];

const MENU_BUTTON_CLS =
  "relative h-[30px] w-fit overflow-visible border border-transparent text-[0.8rem] font-medium after:absolute after:inset-x-0 after:-inset-y-1 after:z-0 after:rounded-md data-[active=true]:border-accent data-[active=true]:bg-accent 3xl:fixed:w-full 3xl:fixed:max-w-48";

interface SidebarLink {
  url: string;
  name: React.ReactNode;
}

type TransitionTypesByUrl = Map<string, string[]>;

const getSidebarPages = (folder: PageTreeFolder): SidebarLink[] =>
  isComponentsFolder(folder)
    ? getAllPagesFromFolder(folder).filter(
        (page) => page.url !== ROUTES.DOCS_COMPONENTS
      )
    : getPagesFromFolder(folder);

/** Hrefs in the order they appear in the sidebar, used to infer slide direction. */
const getSidebarOrder = (tree: typeof source.pageTree): string[] => {
  const urls: string[] = TOP_LEVEL_SECTIONS.map(({ href }) => href);

  for (const item of tree.children) {
    if (item.type !== "folder" || EXCLUDED_SECTIONS.has(item.$id ?? "")) {
      continue;
    }

    for (const page of getSidebarPages(item)) {
      urls.push(page.url);
    }
  }

  return urls;
};

/**
 * Animates links that move down the sidebar forwards and links that move up
 * backwards. Pages outside the sidebar keep the page's default (no animation).
 */
const getTransitionTypesByUrl = (
  order: string[],
  pathname: string
): TransitionTypesByUrl => {
  const currentIndex = order.indexOf(pathname);
  const map: TransitionTypesByUrl = new Map();

  if (currentIndex === -1) {
    return map;
  }

  for (const [index, url] of order.entries()) {
    if (index !== currentIndex) {
      map.set(url, [index > currentIndex ? "nav-forward" : "nav-back"]);
    }
  }

  return map;
};

const SidebarPageGroup = ({
  label,
  pages,
  pathname,
  transitionTypesByUrl,
}: {
  label: React.ReactNode;
  pages: SidebarLink[];
  pathname: string;
  transitionTypesByUrl: TransitionTypesByUrl;
}) => {
  if (pages.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-muted-foreground font-medium">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {pages.map((page) => (
            <SidebarMenuItem key={page.url}>
              <SidebarMenuButton
                asChild
                className={MENU_BUTTON_CLS}
                isActive={page.url === pathname}
              >
                <Link
                  href={page.url}
                  transitionTypes={transitionTypesByUrl.get(page.url)}
                >
                  <span className="absolute inset-0 flex w-(--sidebar-menu-width) bg-transparent" />
                  {page.name}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

export const DocsSidebar = ({
  tree,
  ...props
}: React.ComponentProps<typeof Sidebar> & { tree: typeof source.pageTree }) => {
  const pathname = usePathname();
  const transitionTypesByUrl = useMemo(
    () => getTransitionTypesByUrl(getSidebarOrder(tree), pathname),
    [tree, pathname]
  );

  return (
    <Sidebar
      className="text-sidebar-foreground sticky top-[calc(var(--header-height)+0.6rem)] z-30 hidden h-[calc(100svh-10rem)] flex-col overscroll-none bg-transparent [--sidebar-menu-width:--spacing(48)] lg:flex"
      collapsible="none"
      {...props}
    >
      <div className="h-9" />
      <div className="absolute top-8 z-10 h-8 w-(--sidebar-menu-width) shrink-0 bg-linear-to-b from-background via-background/80 to-background/50 blur-xs" />
      <div className="absolute top-12 right-2 bottom-0 hidden h-full w-px bg-linear-to-b from-transparent via-border to-transparent lg:flex" />
      <SidebarContent className="mx-auto no-scrollbar w-(--sidebar-menu-width) overflow-x-hidden px-2">
        <SidebarGroup className="pt-6">
          <SidebarGroupLabel className="text-muted-foreground font-medium">
            Sections
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {TOP_LEVEL_SECTIONS.map(({ name, href }) => (
                <SidebarMenuItem key={name}>
                  <SidebarMenuButton
                    asChild
                    className={MENU_BUTTON_CLS}
                    isActive={
                      href === ROUTES.DOCS
                        ? pathname === href
                        : pathname.startsWith(href)
                    }
                  >
                    <Link
                      href={href}
                      transitionTypes={transitionTypesByUrl.get(href)}
                    >
                      <span className="absolute inset-0 flex w-(--sidebar-menu-width) bg-transparent" />
                      {name}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {tree.children.map((item) => {
          if (item.type !== "folder") {
            return null;
          }
          if (EXCLUDED_SECTIONS.has(item.$id ?? "")) {
            return null;
          }

          const pages = getSidebarPages(item);

          return (
            <SidebarPageGroup
              key={item.$id}
              label={item.name}
              pages={pages}
              pathname={pathname}
              transitionTypesByUrl={transitionTypesByUrl}
            />
          );
        })}
        <div className="from-background via-background/80 to-background/50 sticky -bottom-1 z-10 h-16 shrink-0 bg-linear-to-t blur-xs" />
      </SidebarContent>
    </Sidebar>
  );
};
