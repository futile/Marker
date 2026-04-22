import { useState, useRef, useEffect } from "react";
import { TiSortAlphabetically } from "react-icons/ti";
import File from "./File";
import CreateFile from "../createFile";
import { DirectoryNode, FileNode } from "@/utils/fileTree";
import Tree from "./Tree";
import { MdFilterList, MdOutlineEditCalendar } from "react-icons/md";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FaRegCalendarPlus,
  FaSortAmountDownAlt,
  FaSortAmountUp,
} from "react-icons/fa";
import SortItem from "./SortItem";
import { SortBy, SortType } from "@/utils/types";
import useStore from "@/store/appStore";
import { useShallow } from "zustand/react/shallow";
import { sortFileTreeNodes } from "@/utils/fileTreeSort";

interface props {
  file: DirectoryNode;
  addFile: (path: string, filename: string) => Promise<void>;
}
const Root: React.FC<props> = ({ file, addFile }) => {
  const { sortBy, sortType, emptyDirectoriesLast, setSortInfo } = useStore(
    useShallow((s) => ({
      sortBy: s.sortInfo?.sortBy,
      sortType: s.sortInfo?.sortType,
      emptyDirectoriesLast: s.sortInfo?.emptyDirectoriesLast ?? false,
      setSortInfo: s.setSortInfo,
    })),
  );
  const filenameRef = useRef<HTMLInputElement>(null);
  const [create, setCreate] = useState(false);
  const [sortedFiles, setSortedFiles] = useState<FileNode[]>();

  function createHandler() {
    setCreate((p) => !p);
  }
  useEffect(() => {
    if (!file.children) return;
    setSortedFiles(
      sortFileTreeNodes(file.children, {
        sortBy,
        sortType,
        emptyDirectoriesLast,
      }),
    );
  }, [sortBy, sortType, emptyDirectoriesLast, file.children]);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="ml-5 shrink-0">
        <div className="flex group justify-between items-center mt-4 mb-2">
          <h1 className="text-xl">Files</h1>
          <div className="flex items-center gap-1">
            <CreateFile onClick={createHandler} root={true} />
            <Popover>
              <PopoverTrigger className="p-1 hover:bg-accent z-20 rounded-md cursor-pointer text-primary">
                <MdFilterList />
              </PopoverTrigger>
              <PopoverContent
                className="text-xs shadow-xl text-neutral-200 p-0 items-start flex flex-col gap-2 mt-[88px] bg-neutral-800 pb-1 min-w-36 duration-50"
                side="right"
                sideOffset={20}
              >
                <h2 className="pl-2 pt-2 pb-0 font-medium text-xs">Sort by:</h2>
                <div className="flex flex-col items-start w-full">
                  <SortItem
                    onClick={() =>
                      setSortInfo({
                        sortBy: SortBy.Name,
                        sortType,
                        emptyDirectoriesLast,
                      })
                    }
                    active={sortBy == SortBy.Name}
                  >
                    <TiSortAlphabetically />
                    Name
                  </SortItem>

                  <SortItem
                    onClick={() =>
                      setSortInfo({
                        sortBy: SortBy.CreatedAt,
                        sortType,
                        emptyDirectoriesLast,
                      })
                    }
                    active={sortBy == SortBy.CreatedAt}
                  >
                    <FaRegCalendarPlus />
                    Created At
                  </SortItem>

                  <SortItem
                    onClick={() =>
                      setSortInfo({
                        sortBy: SortBy.UpdatedAt,
                        sortType,
                        emptyDirectoriesLast,
                      })
                    }
                    active={sortBy == SortBy.UpdatedAt}
                  >
                    <MdOutlineEditCalendar />
                    Updated At
                  </SortItem>
                </div>

                <hr className="w-full border-neutral-400" />
                <h2 className="pl-2 pt-2 pb-0 font-medium text-xs">
                  Sort type:
                </h2>
                <div className="flex flex-col items-start w-full">
                  <SortItem
                    onClick={() =>
                      setSortInfo({
                        sortBy,
                        sortType: SortType.Asc,
                        emptyDirectoriesLast,
                      })
                    }
                    active={sortType == SortType.Asc}
                  >
                    <FaSortAmountDownAlt size={12} />
                    Ascending
                  </SortItem>

                  <SortItem
                    onClick={() =>
                      setSortInfo({
                        sortBy,
                        sortType: SortType.Desc,
                        emptyDirectoriesLast,
                      })
                    }
                    active={sortType == SortType.Desc}
                  >
                    <FaSortAmountUp size={12} />
                    Descending
                  </SortItem>
                </div>
                <hr className="w-full border-neutral-400" />
                <div className="flex flex-col items-start w-full">
                  <SortItem
                    onClick={() =>
                      setSortInfo({
                        sortBy,
                        sortType,
                        emptyDirectoriesLast: !emptyDirectoriesLast,
                      })
                    }
                    active={emptyDirectoriesLast}
                  >
                    Sort non-Markdown Directories Last
                  </SortItem>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <hr className="-ml-5 -mr-5" />
      </div>
      {create && (
        <form
          className="w-full shrink-0"
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
      <div
        data-file-tree-scroller
        className="min-h-0 flex-1 overflow-x-auto overflow-y-auto"
      >
        <div data-file-tree-content className="w-max min-w-full">
          {sortedFiles?.map((file) =>
            file.children ? (
              <Tree addFile={addFile} file={file} key={file.path} />
            ) : (
              <File file={file} key={file.path} />
            ),
          )}
        </div>
      </div>
    </div>
  );
};
export default Root;
