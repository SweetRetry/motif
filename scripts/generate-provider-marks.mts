/**
 * Generates `registry/new-york/provider-mark.tsx` from `@lobehub/icons-static-svg`.
 *
 * The registry inlines the marks instead of depending on `@lobehub/icons`, whose 9 MB
 * sit behind `antd` and `@lobehub/ui` peer dependencies. The artwork still comes from
 * the icon set — this script copies each mark out of the installed package, markup for
 * markup, and writes it into one component. Run it after bumping the package:
 *
 *   pnpm registry:marks
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const ICONS = join(ROOT, "node_modules/@lobehub/icons-static-svg/icons");
const OUT = join(ROOT, "registry/new-york/provider-mark.tsx");

/** Provider id, display name, and the icon file it is taken from: the coloured cut
 *  wherever the set has one, otherwise the mono cut — which is the whole mark for a
 *  brand that is monochrome to begin with. */
const PROVIDERS: [id: string, name: string, file: string][] = [
  ["alibaba", "Alibaba", "alibaba-color.svg"],
  ["anthropic", "Anthropic", "anthropic.svg"],
  ["bfl", "Black Forest Labs", "bfl.svg"],
  ["bytedance", "ByteDance", "bytedance-color.svg"],
  ["deepseek", "DeepSeek", "deepseek-color.svg"],
  ["gemini", "Gemini", "gemini-color.svg"],
  ["google", "Google", "google-color.svg"],
  ["groq", "Groq", "groq.svg"],
  ["kling", "Kling", "kling-color.svg"],
  ["luma", "Luma", "luma-color.svg"],
  ["meta", "Meta", "meta-color.svg"],
  ["minimax", "MiniMax", "minimax-color.svg"],
  ["mistral", "Mistral", "mistral-color.svg"],
  ["moonshot", "Moonshot", "moonshot.svg"],
  ["ollama", "Ollama", "ollama.svg"],
  ["openai", "OpenAI", "openai.svg"],
  ["openrouter", "OpenRouter", "openrouter-color.svg"],
  ["perplexity", "Perplexity", "perplexity-color.svg"],
  ["pika", "Pika", "pika.svg"],
  ["qwen", "Qwen", "qwen-color.svg"],
  ["runway", "Runway", "runway.svg"],
  ["xai", "xAI", "xai.svg"],
  ["zhipu", "Zhipu", "zhipu-color.svg"],
];

/** The attributes React spells differently. Everything else — `viewBox`, `d`, `id`,
 *  `offset`, `x1`, `gradientUnits`, `stopColor`… — is already the name JSX wants. */
const ATTRS: Record<string, string> = {
  "clip-rule": "clipRule",
  "fill-rule": "fillRule",
  "stop-color": "stopColor",
  "stop-opacity": "stopOpacity",
  "stroke-width": "strokeWidth",
};

/** Dropped: the root's own sizing is the component's, and the title is the model name's
 *  job — the mark sits next to it either way. */
const DROPPED = new Set(["height", "width", "xmlns"]);

/** `mix-blend-mode:screen` is the one style any of these marks carries. */
const styleToObject = (value: string) => {
  const rules = value
    .split(";")
    .filter(Boolean)
    .map((rule) => {
      const [property, setting] = rule.split(":");
      const name = (property ?? "")
        .trim()
        .replaceAll(/-(\w)/g, (_, c: string) => c.toUpperCase());
      return `${name}: "${(setting ?? "").trim()}"`;
    });
  return `{{ ${rules.join(", ")} }}`;
};

interface Element {
  attrs: [string, string][];
  children: Element[];
  tag: string;
}

/** The marks are machine-generated SVG, so this reads the tags rather than parsing XML:
 *  the whole vocabulary is svg, title, path, defs, linearGradient, radialGradient and
 *  stop, and none of them nest inside a path. */
const parse = (source: string) => {
  const root: Element = { attrs: [], children: [], tag: "root" };
  const stack: Element[] = [root];
  const tokens = source.matchAll(
    /<(\/)?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z][a-zA-Z0-9:-]*="[^"]*")*)\s*(\/?)>/g
  );

  for (const [, closing, tag, raw, selfClosing] of tokens) {
    if (closing) {
      stack.pop();
      continue;
    }
    const element: Element = {
      attrs: [
        ...(raw ?? "").matchAll(/([a-zA-Z][a-zA-Z0-9:-]*)="([^"]*)"/g),
      ].map(([, name, value]) => [name as string, value as string]),
      children: [],
      tag: tag as string,
    };
    (stack.at(-1) as Element).children.push(element);
    if (!selfClosing) {
      stack.push(element);
    }
  }

  return root;
};

const INDENT = "  ";

const attrsOf = (element: Element, dropping: string[] = []) =>
  element.attrs
    .filter(([name]) => !(DROPPED.has(name) || dropping.includes(name)))
    .map(([name, value]) =>
      name === "style"
        ? `style=${styleToObject(value)}`
        : `${ATTRS[name] ?? name}="${value}"`
    )
    .join(" ");

const emit = (element: Element, depth: number): string => {
  const pad = INDENT.repeat(depth);
  if (element.tag === "title") {
    return "";
  }

  const children = element.children
    .map((child) => emit(child, depth + 1))
    .filter(Boolean)
    .join("\n");

  // The root keeps the vendor's viewBox and fill; its own sizing and line-height belong
  // to the slot the mark is planted in.
  const attrs = attrsOf(element, element.tag === "svg" ? ["style"] : []);

  if (!children) {
    return `${pad}<${element.tag} ${attrs} />`;
  }

  return `${pad}<${element.tag} ${attrs}>\n${children}\n${pad}</${element.tag}>`;
};

const mark = (file: string) =>
  parse(readFileSync(join(ICONS, file), "utf-8"))
    .children.map((child) => emit(child, 2))
    .filter(Boolean)
    .join("\n")
    .trimEnd();

const available = new Set(readdirSync(ICONS));
const missing = PROVIDERS.filter((provider) => !available.has(provider[2]));
if (missing.length) {
  throw new Error(
    `missing from the package: ${missing.map((provider) => provider[2]).join(", ")}`
  );
}

const source = `import type { ReactElement, SVGProps } from "react";
import { cloneElement } from "react";

import { cn } from "@/lib/utils";

/* -- Provider marks -----------------------------------------------------------
 * A picker has to say *whose* model it is before it says which one, and a wordmark does
 * that badly: "Anthropic" and "OpenAI" are the longest strings in a row and the least
 * useful ones to read every time. A mark carries the same answer in 20px.
 *
 * The artwork is LobeHub's icon set (MIT), the reference for provider marks, in its
 * coloured cut — a model list is a shelf of brands, and the brand is the fastest thing to
 * recognise on it. It is inlined rather than installed: \`@lobehub/icons\` is the obvious
 * dependency and it is 9 MB behind \`antd\` and \`@lobehub/ui\` peer dependencies, which is
 * not a price a picker gets to put on an app. \`icons-static-svg\` ships the same artwork
 * as loose files, and this file is generated from it — \`pnpm registry:marks\`.
 *
 * Every mark below is the vendor's own SVG: same viewBox, same path data, same gradients,
 * colour included, so the shape here is the shape the package draws. Marks whose brand is
 * monochrome (OpenAI, Anthropic, xAI, Groq…) keep \`currentColor\` and take the tone of
 * whatever they are planted in, which is what a caller's \`className\` sets.
 * --------------------------------------------------------------------------- */

export type ProviderId =
${PROVIDERS.map(([id]) => `  | "${id}"`).join("\n")};

/** What each provider is called in a sentence, for a line a mark cannot carry. */
export const PROVIDER_NAMES: Record<ProviderId, string> = {
${PROVIDERS.map(([id, name]) => `  ${id}: "${name}",`).join("\n")}
};

/** One mark each, taken from the icon set verbatim. */
const MARKS: Record<ProviderId, ReactElement<SVGProps<SVGSVGElement>>> = {
${PROVIDERS.map(([id, , icon]) => `  ${id}: (\n${mark(icon)}\n  ),`).join("\n")}
};

export interface ProviderMarkProps extends SVGProps<SVGSVGElement> {
  provider: ProviderId;
}

/**
 * A provider's mark at 20px. Decorative by default — the model name sits next to it, so
 * the mark would only repeat itself — and overridable by whatever is spread in last.
 */
export const ProviderMark = ({ className, provider, ...props }: ProviderMarkProps) =>
  cloneElement(MARKS[provider], {
    "aria-hidden": "true",
    className: cn("size-5 shrink-0", className),
    ...props,
  });
`;

writeFileSync(OUT, source);
console.log(
  `wrote ${OUT}: ${PROVIDERS.length} marks, ${Math.round(source.length / 1024)} KB`
);
