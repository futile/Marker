export type Dir = { name: string; dir: string; id: string };
export type Projects = { [key: string]: Dir };
export type SortInfo = {
  sortBy?: SortBy;
  sortType?: SortType;
  emptyDirectoriesLast?: boolean;
};

export enum SortBy {
  Name,
  CreatedAt,
  UpdatedAt,
}
export enum SortType {
  Asc,
  Desc,
}

export type Settings = {
  showTOC?: boolean;
};
