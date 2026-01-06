import { CharacterCount } from "@tiptap/extension-character-count";
import { useEditor, ReactNodeViewRenderer } from "@tiptap/react";
import { Image } from "@tiptap/extension-image";
import { Heading } from "@tiptap/extension-heading";
import { BulletList } from "@tiptap/extension-bullet-list";
import { ListItem } from "@tiptap/extension-list-item";
import { OrderedList } from "@tiptap/extension-ordered-list";
import { StarterKit } from "@tiptap/starter-kit";
import { Code } from "@tiptap/extension-code";
import { Placeholder } from "@tiptap/extension-placeholder";

import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";

import ImageView from "@/components/Editor/NodeViews/Image/Image";
import CodeBlockLowlight from "@/components/Editor/extensions/CodeBlockLowlight";
import { RichTextLink } from "@/components/Editor/extensions/link-text";
import TableView from "@/components/Editor/NodeViews/TableView";
import { DeleteCells } from "@/lib/tableShortcut";
import TableOfContents from "@/components/Editor/extensions/table-of-contents";
import Metadata from "@/components/Editor/extensions/metadata";

import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { InputRule } from "@tiptap/core";

interface props {
  content: string;
  onUpdate: () => void;
  filePath: string;
  projectDir: string;
  assetsDir?: string;
}
const useTextEditor = ({ content, onUpdate, filePath, projectDir }: props) => {
  const editor = useEditor(
    {
      editorProps: {
        attributes: {
          class: `prose h-full`,
        },
      },
      extensions: [
        Metadata.configure({
          filePath: filePath,
          assetsFolder: "assets",
          projectDir,
        }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.extend({
          addNodeView() {
            return ReactNodeViewRenderer(TableView, {
              contentDOMElementTag: "table",
            });
          },
          addInputRules() {
            const { type } = this;
            return [
              new InputRule({
                find: /table(\r\n|\r|\n)/,
                handler({ state, range, match, commands }) {
                  const { tr } = state;
                  const { $from } = state.selection;
                  const start = range.from;
                  const end = range.to;

                  const isEmptyLine =
                    $from.parent.textContent.trim() === match[0].slice(0, -1);
                  if (isEmptyLine) {
                    tr.delete(tr.mapping.map(start), tr.mapping.map(end));
                    if (!type) return;
                    commands.insertTable({
                      rows: 2,
                      cols: 2,
                      withHeaderRow: true,
                    });
                  }
                },
              }),
            ];
          },
          addKeyboardShortcuts() {
            return {
              ...this.parent?.(),
              Backspace: DeleteCells,
              "Mod-Backspace": DeleteCells,
              Delete: DeleteCells,
              "Mod-Delete": DeleteCells,
            };
          },
        }),
        TableRow,
        TableHeader,
        TableCell,
        Image.extend({
          addNodeView() {
            return ReactNodeViewRenderer(ImageView);
          },
          addInputRules() {
            const { type } = this;
            return [
              new InputRule({
                find: /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/,
                handler({ state, range, match }) {
                  const { tr } = state;
                  const { $from } = state.selection;
                  const start = range.from;
                  const end = range.to;

                  const isEmptyLine =
                    $from.parent.textContent.trim() === match[0].slice(0, -1);
                  if (isEmptyLine) {
                    if (!type) return;
                    //@ts-ignore
                    const node = type.create({
                      src: match[3],
                      alt: match[2],
                      title: match[4],
                    });
                    tr.insert(start - 1, node).delete(
                      tr.mapping.map(start),
                      tr.mapping.map(end),
                    );
                  }
                },
              }),
            ];
          },
        }),
        CharacterCount,
        OrderedList,
        BulletList,
        ListItem,
        Code.configure({
          HTMLAttributes: {
            class: "code",
          },
        }),
        CodeBlockLowlight,
        TableOfContents,
        Heading,
        StarterKit.configure({
          orderedList: false,
          bulletList: false,
          listItem: false,
          codeBlock: false,
          code: false,
          heading: false,
          link: false,
        }),

        RichTextLink.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "link",
          },
        }),
        Placeholder.configure({
          placeholder: "Start writing here...",
        }),
      ],
      content,
      onUpdate,
    },
    [filePath, projectDir],
  );

  return editor;
};
export default useTextEditor;
