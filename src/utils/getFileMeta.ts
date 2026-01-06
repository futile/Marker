import type { DirEntry } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";

interface SystemTime {
  secs_since_epoch: number;
}
interface FileMeta {
  updated_at?: SystemTime;
  created_at?: SystemTime;
}

type FileEntry = DirEntry & {
  path: string;
  children?: FileEntry[];
};

interface FileInfo extends FileEntry {
  meta?: FileMeta;
}
async function getFileMeta(file: FileEntry) {
  return (await invoke("get_file_metadata", {
    filepath: file.path,
  })) as FileMeta;
}

export { getFileMeta, type FileEntry, type FileInfo };
