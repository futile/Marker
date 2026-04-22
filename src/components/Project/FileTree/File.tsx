import useStore from "@/store/appStore";

import { showContextMenu } from "@/utils/contextMenu";
import { remove, rename as renameFile } from "@tauri-apps/plugin-fs";
import type { FileEntry } from "@/utils/getFileMeta";
import { confirm } from "@tauri-apps/plugin-dialog";
import { useRef, useState } from "react";
import { join } from "@tauri-apps/api/path";
import removePath from "@/utils/removePath";
import { useShallow } from "zustand/react/shallow";

interface props {
  file: FileEntry;
}
const File: React.FC<props> = ({ file }) => {
  const nameRef = useRef<HTMLInputElement>(null);
  const [showInput, setShowInput] = useState(false);
  const { currFile, fetchDir, setCurrFile, files, setFiles } = useStore(
    useShallow((s) => ({
      currFile: s.currFile,
      setCurrFile: s.setCurrFile,
      setFiles: s.setFiles,
      files: s.files,
      fetchDir: s.fetchDir,
    })),
  );

  async function rename() {
    let name = nameRef.current?.value;
    if (!name) return;

    if (!name.endsWith(".md")) name += ".md";
    const newPath = await join(file.path, "../", name);
    await renameFile(file.path!, newPath);
    await fetchDir();
    setShowInput(false);
    if (currFile?.path == file.path) {
      setCurrFile({
        path: newPath,
        name,
        children: [],
        isDirectory: false,
        isFile: true,
        isSymlink: false,
      });
    }
  }
  async function deleteFile() {
    const confirmed = await confirm("Are you sure?", `Delete ${file.name}`);
    if (!confirmed) return;
    await remove(file.path);
    setFiles(removePath(file.path, files));
  }
  return (
    <div
      onContextMenu={async (e) => {
        e.preventDefault();
        await showContextMenu(
          [
            {
              text: "Rename",
              action: () => setShowInput(true),
            },
            {
              text: "Delete",
              action: deleteFile,
            },
          ],
          { x: e.clientX, y: e.clientY },
        );
      }}
      className={` flex group items-center justify-between -mx-5 px-5 py-2 ${currFile?.path == file.path && "bg-accent"} cursor-pointer has-[.dots:hover]:bg-opacity-0 hover:bg-accent `}
      onClick={() => setCurrFile(file)}
      key={file.path}
    >
      {showInput ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            rename();
          }}
        >
          <input
            ref={nameRef}
            className="w-full overflow-auto text-black"
            defaultValue={file.name}
            onBlur={() => setShowInput(false)}
            autoFocus
          />
        </form>
      ) : (
        <p className="block w-full whitespace-nowrap text-sm select-none">
          {file.name}
        </p>
      )}
    </div>
  );
};
export default File;
