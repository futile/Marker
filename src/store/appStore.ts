import { setCurrProject, setSortInfo } from "@/utils/appStore";
import { type FileNode, scanMarkdownFileTree } from "@/utils/fileTree";
import { Dir, Projects, Settings, SortInfo } from "@/utils/types";
import { create } from "zustand";
interface AppState {
  currProject?: Dir;
  projects: Projects;
  files: FileNode[];
  currFile?: FileNode;
  sortInfo?: SortInfo;
  settings: Settings;

  setCurrFile: (name?: FileNode) => void;
  setProjects: (projects: Projects) => void;
  setCurrProject: (project: Dir) => void;
  setFiles: (files: FileNode[]) => void;
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
    try {
      const files = await scanMarkdownFileTree(currProject);
      set(() => ({ files }));
    } catch (error) {
      console.error("Failed to refresh markdown file tree", error);
      set(() => ({ files: [] }));
    }
  },
  setSettings: (settings) => {
    localStorage.setItem("settings", JSON.stringify(settings));
    set(() => ({ settings }));
  },
}));

export default useStore;
