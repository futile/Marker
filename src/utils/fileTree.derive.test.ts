import assert from "node:assert/strict";
import test from "node:test";
import { deriveFileTree, type ScannedFileNode } from "./fileTree.ts";

test("deriveFileTree marks only empty directories with containsNoMarkdownFiles", () => {
  const scannedTree: ScannedFileNode[] = [
    {
      name: "content",
      path: "/project/content",
      isDirectory: true,
      isFile: false,
      isSymlink: false,
      children: [
        {
          name: "empty-child",
          path: "/project/content/empty-child",
          isDirectory: true,
          isFile: false,
          isSymlink: false,
          children: [],
        },
        {
          name: "notes.md",
          path: "/project/content/notes.md",
          isDirectory: false,
          isFile: true,
          isSymlink: false,
        },
      ],
    },
    {
      name: "empty-root",
      path: "/project/empty-root",
      isDirectory: true,
      isFile: false,
      isSymlink: false,
      children: [],
    },
  ];

  const tree = deriveFileTree(scannedTree);
  const contentDir = tree[0];
  const emptyRootDir = tree[1];

  assert.equal(contentDir.isDirectory, true);
  assert.equal(contentDir.containsNoMarkdownFiles, false);
  assert.equal(contentDir.children[0].isDirectory, true);
  assert.equal(contentDir.children[0].containsNoMarkdownFiles, true);
  assert.equal(contentDir.children[1].isDirectory, false);
  assert.ok(!("containsNoMarkdownFiles" in contentDir.children[1]));

  assert.equal(emptyRootDir.isDirectory, true);
  assert.equal(emptyRootDir.containsNoMarkdownFiles, true);
});
