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
import { isMacOS } from "@tiptap/core";
import CommandMenu from "../Settings/CommandMenu";
import useStore from "@/store/appStore";
import { getFileMeta } from "@/utils/getFileMeta";
import Root from "./FileTree/Root";
import { Link } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";

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
    <div className="flex h-full">
      <CommandMenu />
      <div className="group/menu select-none">
        <div
          className={`${
            !collapse && "opacity-0 group-hover/menu:opacity-100"
          } max-w-[210px] w-full px-3 ${
            (isMacOS() || !collapse) && "pl-20"
          } pt-[5px] fixed pb-5 z-10 transition-all duration-100`}
        >
          <div
            className={`transition-all duration-50 flex px-2 gap-3 w-full ${
              collapse ? "ml-0" : "ml-14"
            } items-center mt-1 pb-2`}
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
        </div>
        <div
          className={`transition-all ease-in-out duration-50 max-w-[210px] w-full border-r pt-12 fixed bg-secondary flex flex-col h-screen ${
            collapse ? "-left-[210px]" : "left-0"
          }`}
        >
          <div className="overflow-y-auto h-full pr-3 overflow-x-hidden w-full">
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
          <Selector />
        </div>
      </div>
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
    </div>
  );
};

export default App;
