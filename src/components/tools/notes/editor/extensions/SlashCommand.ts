import { Editor, Extension, Range } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";

import tippyLite from "./tippyLite";
import { SlashMenu } from "../SlashMenu";
import type { SlashItem, SlashMenuRef } from "../SlashMenu";

interface SlashCommandOptions {
  items: ({ query, editor }: { query: string; editor: Editor }) => SlashItem[];
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: "slashCommand",

  addOptions() {
    return {
      items: () => [],
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        char: "/",
        startOfLine: false,
        allowSpaces: false,
        items: ({ query, editor }) => this.options.items({ query, editor }),
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
        render: () => {
          let component: ReactRenderer<SlashMenuRef> | null = null;
          let popup: ReturnType<typeof tippyLite.create> | null = null;

          const renderProps = (
            items: SlashItem[],
            commandFn: (item: SlashItem) => void,
          ) => ({
            items,
            onSelect: commandFn,
          });

          return {
            onStart(props) {
              const select = (item: SlashItem) =>
                props.command(item as unknown as Parameters<typeof props.command>[0]);
              component = new ReactRenderer(SlashMenu, {
                props: renderProps(props.items as SlashItem[], select),
                editor: props.editor,
              });
              popup = tippyLite.create({
                getReferenceClientRect: () =>
                  props.clientRect?.() ?? new DOMRect(0, 0, 0, 0),
                content: component.element as HTMLElement,
              });
            },
            onUpdate(props) {
              const select = (item: SlashItem) =>
                props.command(item as unknown as Parameters<typeof props.command>[0]);
              component?.updateProps(renderProps(props.items as SlashItem[], select));
              popup?.update({
                getReferenceClientRect: () =>
                  props.clientRect?.() ?? new DOMRect(0, 0, 0, 0),
              });
            },
            onKeyDown(props) {
              if (props.event.key === "Escape") {
                popup?.destroy();
                return true;
              }
              return component?.ref?.onKeyDown(props.event) ?? false;
            },
            onExit() {
              popup?.destroy();
              component?.destroy();
              popup = null;
              component = null;
            },
          };
        },
      }),
    ];
  },
});

/* `Suggestion`'s `command` is invoked with `{ editor, range, props }` where
 * `props` is the *picked item*. The item then has its own `command(editor, range)`
 * applied. We rely on TipTap's plumbing to pre-delete the `/<query>` range
 * — see https://tiptap.dev/docs/editor/api/utilities/suggestion. */
export type { Editor, Range };
