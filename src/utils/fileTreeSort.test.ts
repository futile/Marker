import assert from "node:assert/strict";
import test from "node:test";
import type { DirectoryNode, MarkdownFileNode } from "./fileTree.ts";
import { sortFileTreeNodes } from "./fileTreeSort.ts";
import { SortBy, SortType } from "./types.ts";

function markdownFile(name: string): MarkdownFileNode {
  return {
    name,
    path: `/project/${name}`,
    isDirectory: false,
    isFile: true,
    isSymlink: false,
  };
}

function directory(
  name: string,
  containsNoMarkdownFiles: boolean,
  children: Array<DirectoryNode | MarkdownFileNode> = [],
): DirectoryNode {
  return {
    name,
    path: `/project/${name}`,
    isDirectory: true,
    isFile: false,
    isSymlink: false,
    containsNoMarkdownFiles,
    children,
  };
}

test("sortFileTreeNodes can push empty directories after files and non-empty directories", () => {
  const nodes = [
    directory("z-empty", true),
    markdownFile("b-notes.md"),
    directory("a-content", false),
    directory("c-empty", true),
  ];

  const withoutToggle = sortFileTreeNodes(nodes, {
    sortBy: SortBy.Name,
    sortType: SortType.Asc,
    emptyDirectoriesLast: false,
  });
  assert.deepEqual(withoutToggle.map((node) => node.name), [
    "a-content",
    "b-notes.md",
    "c-empty",
    "z-empty",
  ]);

  const withToggle = sortFileTreeNodes(nodes, {
    sortBy: SortBy.Name,
    sortType: SortType.Asc,
    emptyDirectoriesLast: true,
  });
  assert.deepEqual(withToggle.map((node) => node.name), [
    "a-content",
    "b-notes.md",
    "c-empty",
    "z-empty",
  ]);
});

test("sortFileTreeNodes preserves normal ordering except for moving empty directories to the end", () => {
  const nodes = [
    directory("a-empty", true),
    markdownFile("b-notes.md"),
    directory("c-content", false),
  ];

  const sorted = sortFileTreeNodes(nodes, {
    sortBy: SortBy.Name,
    sortType: SortType.Asc,
    emptyDirectoriesLast: true,
  });

  assert.deepEqual(sorted.map((node) => node.name), [
    "b-notes.md",
    "c-content",
    "a-empty",
  ]);
});
