import { setCurrProject, setSortInfo } from "@/utils/appStore";
import { FileInfo, type FileEntry, getFileMeta } from "@/utils/getFileMeta";
import { Dir, Projects, Settings, SortInfo } from "@/utils/types";
import { readDir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { create } from "zustand";
interface AppState {
  currProject?: Dir;
  projects: Projects;
  files: FileInfo[];
  currFile?: FileInfo;
  sortInfo?: SortInfo;
  settings: Settings;

  setCurrFile: (name?: FileInfo) => void;
  setProjects: (projects: Projects) => void;
  setCurrProject: (project: Dir) => void;
  setFiles: (files: FileInfo[]) => void;
  fetchDir: () => Promise<void>;
  setSortInfo: (sortInfo: SortInfo) => Promise<void>;
  setSettings: (settings: Settings) => void;
}
const useStore = create<AppState>()((set, get) => ({
  currProject: undefined,
  projects: {},
  files: [],
  currFile: undefined,
  settings: localStorage.getItem("settings")
    ? JSON.parse(localStorage.getItem("settings")!)
    : { showTOC: true },

  setCurrFile: (currFile) => set(() => ({ currFile })),
  setCurrProject: async (project) => {
    set(() => ({ currProject: project }));
    await setCurrProject(project);
  },

  setProjects: (projects) => set(() => ({ projects })),
  setFiles: (files) => set(() => ({ files })),

  setSortInfo: async (sortInfo) => {
    set(() => ({
      sortInfo,
    }));
    await setSortInfo(sortInfo);
  },
  fetchDir: async () => {
    const currProject = get().currProject?.dir;
    if (!currProject) return;
    async function processEntries(
      entries: FileEntry[],
      parentPath: string,
      arr: FileInfo[],
    ) {
      for (const entry of entries) {
        if (entry.name?.startsWith(".")) {
          continue;
        }

        const entryPath = await join(parentPath, entry.name);

        if (entry.isDirectory) {
          const children: FileInfo[] = [];
          const childEntries = await readDir(entryPath);
          await processEntries(
            childEntries as FileEntry[],
            entryPath,
            children,
          );
          const dirEntry = { ...entry, path: entryPath, children };
          arr.push({
            ...dirEntry,
            meta: await getFileMeta(dirEntry),
          });
          continue;
        }

        if (!entry.name?.endsWith(".md")) {
          continue;
        }

        const fileEntry = { ...entry, path: entryPath };
        arr.push({ ...fileEntry, meta: await getFileMeta(fileEntry) });
      }
    }
    const entries = (await readDir(currProject)) as FileEntry[];
    const files: FileInfo[] = [];
    await processEntries(entries, currProject, files);
    set(() => ({ files }));
  },
  setSettings: (settings) => {
    localStorage.setItem("settings", JSON.stringify(settings));
    set(() => ({ settings }));
  },
}));

export default useStore;
