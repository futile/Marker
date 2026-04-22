import { invoke } from "@tauri-apps/api/core";

interface SystemTimestamp {
  secs_since_epoch: number;
}

interface FileMeta {
  updated_at?: SystemTimestamp;
  created_at?: SystemTimestamp;
}

interface FileNode {
  name: string;
  path: string;
  children?: FileNode[];
  isDirectory: boolean;
  isFile: boolean;
  isSymlink: boolean;
  meta?: FileMeta;
}

async function scanMarkdownFileTree(root: string) {
  return (await invoke("scan_markdown_file_tree", {
    root,
  })) as FileNode[];
}

export { scanMarkdownFileTree, type FileNode, type FileMeta };
