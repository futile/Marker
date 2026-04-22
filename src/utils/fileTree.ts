import { invoke } from "@tauri-apps/api/core";

interface SystemTimestamp {
  secs_since_epoch: number;
}

interface FileMeta {
  updated_at?: SystemTimestamp;
  created_at?: SystemTimestamp;
}

interface BaseFileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  isSymlink: boolean;
  meta?: FileMeta;
}

interface MarkdownFileNode extends BaseFileNode {
  isDirectory: false;
  isFile: true;
  children?: undefined;
}

interface ScannedDirectoryNode extends BaseFileNode {
  isDirectory: true;
  isFile: false;
  children: ScannedFileNode[];
}

type ScannedFileNode = MarkdownFileNode | ScannedDirectoryNode;

interface DirectoryNode extends BaseFileNode {
  isDirectory: true;
  isFile: false;
  children: FileNode[];
  containsNoMarkdownFiles: boolean;
}

type FileNode = MarkdownFileNode | DirectoryNode;

function deriveFileTree(nodes: ScannedFileNode[]): FileNode[] {
  return nodes.map(deriveNode);
}

function deriveNode(node: ScannedFileNode): FileNode {
  if (!node.isDirectory) {
    return node;
  }

  const children = node.children.map(deriveNode);
  const containsNoMarkdownFiles = children.every((child) =>
    child.isDirectory ? child.containsNoMarkdownFiles : false,
  );

  return {
    ...node,
    children,
    containsNoMarkdownFiles,
  };
}

async function scanMarkdownFileTree(root: string) {
  const nodes = (await invoke("scan_markdown_file_tree", {
    root,
  })) as ScannedFileNode[];

  return deriveFileTree(nodes);
}

export {
  deriveFileTree,
  scanMarkdownFileTree,
  type DirectoryNode,
  type FileNode,
  type FileMeta,
  type MarkdownFileNode,
  type ScannedFileNode,
};
