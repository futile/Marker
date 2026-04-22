import { readDir, writeTextFile, exists, mkdir } from "@tauri-apps/plugin-fs";
import type { FileEntry, FileInfo } from "@/utils/getFileMeta";

import { join } from "@tauri-apps/api/path";
import {
  setCurrProject as storeVisitedProject,
  getProjects,
} from "@/utils/appStore";

import { useEffect, useState } from "react";
import Editor from "../Editor/Editor";
import { MdKeyboardDoubleArrowLeft } from "react-icons/md";
import { Dir } from "@/utils/types";
import Selector from "./Selector";
import { BsHouse } from "react-icons/bs";
import CommandMenu from "../Settings/CommandMenu";
import useStore from "@/store/appStore";
import { getFileMeta } from "@/utils/getFileMeta";
import Root from "./FileTree/Root";
import { Link } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { Group, Panel, Separator } from "react-resizable-panels";

interface props {
  project: Dir;
}
const App: React.FC<props> = ({ project }) => {
  const {
    files,
    setFiles,
    currFile,
    setCurrFile,
    setCurrProject,
    setProjects,
  } = useStore(
    useShallow((s) => ({
      files: s.files,
      setFiles: s.setFiles,
      currFile: s.currFile,
      setCurrFile: s.setCurrFile,
      setCurrProject: s.setCurrProject,
      setProjects: s.setProjects,
    })),
  );

  const [collapse, setCollapse] = useState(false);
  async function getFiles(path: string) {
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

    const entries = (await readDir(path)) as FileEntry[];
    const files: FileInfo[] = [];
    await processEntries(entries, path, files);
    setFiles(files);
  }
  async function getProject() {
    await getFiles(project.dir);
    setProjects(await getProjects());
  }
  useEffect(() => {
    setCurrFile(undefined);
    storeVisitedProject(project);
    setCurrProject(project);
    getProject();
  }, [project]);

  async function addFileHandler(path: string, filename: string) {
    if (!filename.endsWith(".md")) filename += ".md";
    const newfilePath = await join(path, filename);
    const folder = await join(newfilePath, "../");
    if (!(await exists(folder))) {
      await mkdir(folder, { recursive: true });
    }
    if (newfilePath.endsWith(".md")) {
      await writeTextFile(newfilePath, "");
    }
    await getFiles(project!.dir);
  }
  if (!project) return;
  return (
    <div className="flex h-screen w-full">
      <CommandMenu />
      <Group>
        <Panel
          className={`select-none bg-secondary border-r pt-2 ${collapse && "opacity:50"} flex h-full min-h-0 flex-col overflow-hidden`}
          defaultSize="20%"
        >
          <div
            className={`transition-all duration-50 flex px-2 gap-3
               ml-14 items-center justify-end-safe py-1 shrink-0`}
          >
            <Link
              to="/?home=true"
              className={`cursor-pointer h-fit text-neutral-500`}
            >
              <BsHouse />
            </Link>
            <div
              className={`cursor-pointer h-fit text-neutral-500 ${
                collapse && "rotate-180"
              }`}
              onClick={() => setCollapse((p) => !p)}
            >
              <MdKeyboardDoubleArrowLeft size={20} />
            </div>
          </div>
          <div
            className={`transition-all ease-in-out duration-50 flex min-h-0 flex-1 flex-col overflow-hidden`}
          >
            <div className="min-h-0 flex-1 overflow-hidden pr-3">
              <Root
                addFile={addFileHandler}
                file={{
                  name: "root",
                  path: project!.dir,
                  children: files,
                  isDirectory: true,
                  isFile: false,
                  isSymlink: false,
                }}
              />
            </div>
            <div className="shrink-0">
              <Selector />
            </div>
          </div>
        </Panel>
        <Separator />
        <Panel>
          <div className="w-full h-full">
            {currFile && (
              <Editor
                key={currFile.path ?? currFile.name ?? "editor"}
                file={currFile}
                projectPath={project?.dir || ""}
                collapse={collapse}
              />
            )}
          </div>
        </Panel>
      </Group>
    </div>
  );
};

export default App;
