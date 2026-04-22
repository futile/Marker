import { writeTextFile, exists, mkdir } from "@tauri-apps/plugin-fs";

import { join } from "@tauri-apps/api/path";
import {
  setCurrProject as storeVisitedProject,
  getProjects,
} from "@/utils/appStore";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { MdKeyboardDoubleArrowLeft } from "react-icons/md";
import { Dir } from "@/utils/types";
import Selector from "./Selector";
import { BsHouse } from "react-icons/bs";
import useStore from "@/store/appStore";
import { scanMarkdownFileTree, type DirectoryNode } from "@/utils/fileTree";
import Root from "./FileTree/Root";
import { Link } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import {
  Group,
  Panel,
  Separator,
  type PanelImperativeHandle,
} from "react-resizable-panels";

const Editor = lazy(() => import("../Editor/Editor"));
const CommandMenu = lazy(() => import("../Settings/CommandMenu"));

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
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const sidebarPanelRef = useRef<PanelImperativeHandle | null>(null);
  async function getFiles(path: string) {
    setIsLoadingFiles(true);
    try {
      const files = await scanMarkdownFileTree(path);
      setFiles(files);
    } catch (error) {
      console.error("Failed to scan markdown file tree", error);
      setFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
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

  function toggleSidebar() {
    const panel = sidebarPanelRef.current;

    if (!panel) return;

    if (collapse) {
      panel.expand();
      return;
    }

    panel.collapse();
  }
  if (!project) return;
  const rootNode: DirectoryNode = {
    name: "root",
    path: project.dir,
    children: files,
    isDirectory: true,
    isFile: false,
    isSymlink: false,
    containsNoMarkdownFiles: files.every((file) =>
      file.isDirectory ? file.containsNoMarkdownFiles : false,
    ),
  };
  return (
    <div className="flex h-screen w-full">
      <Suspense fallback={null}>
        <CommandMenu />
      </Suspense>
      <Group>
        <Panel
          panelRef={sidebarPanelRef}
          collapsible
          collapsedSize={56}
          minSize={56}
          onResize={(size) => setCollapse(size.inPixels <= 60)}
          className={`select-none bg-secondary border-r pt-8 ${collapse && "opacity:50"} flex h-full min-h-0 flex-col overflow-hidden`}
          defaultSize="20%"
        >
          <div
            className={`transition-all duration-50 flex px-2 gap-3
               relative z-10 items-center py-1 shrink-0 ${
                 collapse ? "justify-center gap-2 px-0" : "ml-14 justify-end-safe"
               }`}
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
              onClick={toggleSidebar}
            >
              <MdKeyboardDoubleArrowLeft size={20} />
            </div>
          </div>
          {!collapse && (
            <div className="transition-all ease-in-out duration-50 flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-hidden pr-0">
                {isLoadingFiles ? (
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="ml-5 shrink-0">
                      <div className="mt-4 mb-2">
                        <h1 className="text-xl">Files</h1>
                      </div>
                      <hr className="-ml-5 -mr-5" />
                    </div>
                    <div className="px-5 py-4 text-sm text-neutral-500">
                      Loading files...
                    </div>
                  </div>
                ) : (
                  <Root addFile={addFileHandler} file={rootNode} />
                )}
              </div>
              <div className="shrink-0">
                <Selector />
              </div>
            </div>
          )}
        </Panel>
        <Separator />
        <Panel>
          <div className="w-full h-full">
            {currFile && (
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                    Loading editor...
                  </div>
                }
              >
                <Editor
                  key={currFile.path ?? currFile.name ?? "editor"}
                  file={currFile}
                  projectPath={project?.dir || ""}
                  collapse={collapse}
                />
              </Suspense>
            )}
          </div>
        </Panel>
      </Group>
    </div>
  );
};

export default App;
