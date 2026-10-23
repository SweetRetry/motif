"use client";

import { PluginKey } from "@tiptap/pm/state";
import { useCurrentEditor } from "@tiptap/react";
import { Suggestion } from "@tiptap/suggestion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

import type { PromptInputTriggerProps, PromptTriggerItem } from "./types";

interface Menu {
  command: (item: PromptTriggerItem) => void;
  index: number;
  items: PromptTriggerItem[];
}

/**
 * A character that opens a menu inside `PromptInputEditor`, and what picking a row does.
 * `@` offers things to point at and `/` offers things to run; they are the same part with
 * a different character, rows, and `lineStart`.
 *
 * The menu belongs to the caret, not to the card: it opens above the character that
 * summoned it and follows the line as it wraps. Focus never leaves the field — the
 * arrows, Enter, Tab and Escape are taken from the editor while a menu is open — so the
 * user keeps typing to narrow it. With nothing matching, nothing is drawn and the keys
 * go back to the field, so Enter still sends.
 *
 * Picking a row replaces the trigger and what followed it with a mention, plus a space to
 * keep typing in. Without `items` the part is not registered at all.
 */
export const PromptInputTrigger = ({
  char,
  items,
  lineStart = false,
  onSelect,
}: PromptInputTriggerProps) => {
  const { editor } = useCurrentEditor();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const live = useRef<Menu | null>(null);
  const latest = useRef({ items, onSelect });
  useEffect(() => {
    latest.current = { items, onSelect };
  });
  const active = useRef<HTMLLIElement>(null);

  const enabled = items !== undefined;

  useEffect(() => {
    if (!editor || !enabled) {
      return;
    }
    const element = document.createElement("div");
    const key = new PluginKey(`prompt-trigger-${char}`);
    let unmount: (() => void) | undefined;

    const show = (next: Menu | null) => {
      live.current = next;
      setMenu(next);
    };

    const plugin = Suggestion<PromptTriggerItem>({
      // A line start is the start of a paragraph, not of the text node after a mention.
      allow: ({ range, state }) =>
        !lineStart || state.doc.resolve(range.from).parentOffset === 0,
      char,
      command: ({ editor: current, range, props: item }) => {
        const keep = latest.current.onSelect?.(item) !== false;
        const { nodeAfter } = current.state.doc.resolve(range.to);
        const to = nodeAfter?.text?.startsWith(" ") ? range.to + 1 : range.to;
        const chain = current.chain().focus();
        if (keep) {
          chain
            .insertContentAt({ from: range.from, to }, [
              {
                attrs: { id: item.id, label: item.label, trigger: char },
                type: "mention",
              },
              { text: " ", type: "text" },
            ])
            .run();
        } else {
          chain.deleteRange({ from: range.from, to }).run();
        }
      },
      editor,
      items: ({ query }) => {
        const source = latest.current.items;
        if (typeof source === "function") {
          return source(query);
        }
        const needle = query.toLowerCase();
        return (source ?? []).filter((item) =>
          item.label.toLowerCase().includes(needle)
        );
      },
      offset: { crossAxis: 0, mainAxis: 8 },
      placement: "top-start",
      pluginKey: key,
      render: () => ({
        onExit: () => {
          unmount?.();
          unmount = undefined;
          show(null);
        },
        onKeyDown: ({ event }) => {
          const { current } = live;
          if (!current || current.items.length === 0) {
            return false;
          }
          const { length } = current.items;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            const step = event.key === "ArrowDown" ? 1 : -1;
            show({
              ...current,
              index: (current.index + step + length) % length,
            });
            return true;
          }
          if (event.key === "Enter" || event.key === "Tab") {
            current.command(current.items[current.index]);
            return true;
          }
          return false;
        },
        onStart: (props) => {
          unmount = props.mount(element);
          show({ command: props.command, index: 0, items: props.items });
        },
        onUpdate: (props) =>
          show({ command: props.command, index: 0, items: props.items }),
      }),
      startOfLine: lineStart,
    });

    // First in line, so an open menu sees Enter before the field's own binding does.
    editor.registerPlugin(plugin, (added, current) => [added, ...current]);
    setHost(element);
    return () => {
      unmount?.();
      editor.unregisterPlugin(key);
      setHost(null);
      show(null);
    };
  }, [char, editor, enabled, lineStart]);

  // A hover moves the highlight through state, and the keys read it from the ref.
  useEffect(() => {
    live.current = menu;
  }, [menu]);

  useEffect(() => {
    active.current?.scrollIntoView({ block: "nearest" });
  }, [menu?.index]);

  if (!menu || !host || menu.items.length === 0) {
    return null;
  }

  return createPortal(
    <ul
      aria-label={`${char} menu`}
      className="max-h-64 w-72 origin-bottom-left animate-in overflow-y-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-md duration-100 fade-in-0 zoom-in-95 motion-reduce:animate-none"
      role="listbox"
    >
      {menu.items.map((item, index) => (
        <li
          aria-selected={index === menu.index}
          className={cn(
            "flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 text-sm",
            index === menu.index && "bg-accent text-accent-foreground"
          )}
          key={item.id}
          // Down on a row would move focus out of the field, and the menu with it.
          onMouseDown={(event) => {
            event.preventDefault();
            menu.command(item);
          }}
          onMouseMove={() =>
            index !== menu.index && setMenu({ ...menu, index })
          }
          ref={index === menu.index ? active : undefined}
          role="option"
        >
          {item.icon}
          <span className="truncate font-medium">{item.label}</span>
          {item.description ? (
            <span className="truncate text-muted-foreground">
              {item.description}
            </span>
          ) : null}
        </li>
      ))}
    </ul>,
    host
  );
};
