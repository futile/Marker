import { type FileNode, type DirectoryNode } from "./fileTree.ts";
import { SortBy, SortType, type SortInfo } from "./types.ts";

function compare(res: boolean, sortType?: SortType) {
  if (sortType === SortType.Asc) {
    return res ? -1 : 1;
  }
  return res ? 1 : -1;
}

function compareBySelectedSort(a: FileNode, b: FileNode, sortInfo?: SortInfo) {
  switch (sortInfo?.sortBy) {
    case SortBy.Name: {
      return compare(a.name < b.name, sortInfo.sortType);
    }
    case SortBy.UpdatedAt: {
      if (!a.meta?.updated_at || !b.meta?.updated_at) return 0;
      return compare(
        a.meta.updated_at.secs_since_epoch > b.meta.updated_at.secs_since_epoch,
        sortInfo.sortType,
      );
    }
    case SortBy.CreatedAt: {
      if (!a.meta?.created_at || !b.meta?.created_at) return 0;
      return compare(
        a.meta.created_at.secs_since_epoch > b.meta.created_at.secs_since_epoch,
        sortInfo.sortType,
      );
    }
    default:
      return 0;
  }
}

function isEmptyDirectory(node: FileNode): node is DirectoryNode {
  return node.isDirectory && node.containsNoMarkdownFiles;
}

function sortFileTreeNodes(nodes: FileNode[], sortInfo?: SortInfo): FileNode[] {
  const sortedNodes = nodes.map((node) =>
    node.isDirectory
      ? {
          ...node,
          children: sortFileTreeNodes(node.children, sortInfo),
        }
      : node,
  );

  sortedNodes.sort((a, b) => {
    if (sortInfo?.emptyDirectoriesLast) {
      const aIsEmptyDir = isEmptyDirectory(a);
      const bIsEmptyDir = isEmptyDirectory(b);

      if (aIsEmptyDir !== bIsEmptyDir) {
        return aIsEmptyDir ? 1 : -1;
      }
    }

    return compareBySelectedSort(a, b, sortInfo);
  });

  return sortedNodes;
}

export { sortFileTreeNodes };
