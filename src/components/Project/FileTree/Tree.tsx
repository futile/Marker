import useStore from "@/store/appStore";
import { useState, useRef } from "react";
import { remove } from "@tauri-apps/plugin-fs";
import { confirm } from "@tauri-apps/plugin-dialog";
import { showContextMenu } from "@/utils/contextMenu";
import File from "./File";
import { IoIosArrowForward } from "react-icons/io";
import CreateFile from "../createFile";
import { FileInfo } from "@/utils/getFileMeta";
import removePath from "@/utils/removePath";
import { useShallow } from "zustand/react/shallow";
import FileTreeLabel from "./FileTreeLabel";

interface props {
  file: FileInfo;
  addFile: (path: string, filename: string) => Promise<void>;
}
const Tree: React.FC<props> = ({ file, addFile }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const { setFiles, files } = useStore(
    useShallow((s) => ({
      setFiles: s.setFiles,
      files: s.files,
    })),
  );
  const [toggle, setToggle] = useState(false);
  const filenameRef = useRef<HTMLInputElement>(null);
  const [create, setCreate] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  function createHandler() {
    setToggle(true);
    setCreate((p) => !p);
  }

  async function deleteFile() {
    const confirmed = await confirm("Are you sure?", `Delete ${file.name}`);
    if (!confirmed) return;
    await remove(file.path, { recursive: true });
    setFiles(removePath(file.path, files));
  }
  return (
    <div>
      <div
        ref={rowRef}
        data-file-tree-directory-row={file.path ?? file.name ?? ""}
        onContextMenu={async (e) => {
          e.preventDefault();
          await showContextMenu(
            [
              {
                text: "Delete",
                action: deleteFile,
              },
            ],
            { x: e.clientX, y: e.clientY },
          );
        }}
        className="flex w-full items-center gap-2 cursor-pointer group hover:bg-accent"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        key={file.path}
      >
        <div
          className="flex min-w-0 flex-1 gap-2 items-center h-full px-4 py-2"
          onClick={() => setToggle((p) => !p)}
        >
          <IoIosArrowForward
            size={15}
            className={`${
              toggle ? "rotate-90" : "rotate-0"
            } transition-all duration-75 text-primary`}
          />
          <FileTreeLabel
            label={file.name ?? ""}
            hovered={isHovered}
            rowRef={rowRef}
          />
        </div>
        <div className="shrink-0 px-2 py-2">
          <CreateFile onClick={createHandler} />
        </div>
      </div>

      {toggle && (
        <div className="border-l border-neutral-300">
          <div className="pl-5">
            {file.children?.map((file) =>
              file.children ? (
                <Tree addFile={addFile} file={file} key={file.path} />
              ) : (
                <File file={file} key={file.path} />
              ),
            )}
          </div>

          {create && (
            <form
              className="w-full"
              onBlur={() => setCreate(false)}
              onSubmit={async (e) => {
                e.preventDefault();
                if (filenameRef.current?.value) {
                  await addFile(file.path, filenameRef.current!.value);
                  filenameRef.current!.value = "";
                }
                setCreate(false);
              }}
            >
              <input
                autoFocus
                ref={filenameRef}
                placeholder="Filename.."
                className="border px-2 py-1 focus:outline-none text-sm w-full"
                spellCheck={false}
              />
            </form>
          )}
        </div>
      )}
    </div>
  );
};
export default Tree;
