import { Store } from "@tauri-apps/plugin-store";
import type { Projects, Dir, SortInfo } from "./types";
import { isTauri } from "./tauri";

let store: Store | null = null;
let storePromise: Promise<Store> | null = null;

async function getStore(): Promise<Store | null> {
  if (!isTauri()) return null;
  if (store) return store;
  if (!storePromise) {
    storePromise = Store.load(".apps.dat");
  }
  store = await storePromise;
  return store;
}

async function getProjects(): Promise<Projects> {
  const store = await getStore();
  if (!store) return {} as Projects;
  return (await store.get("projects")) || ({} as Projects);
}

async function getProject(id: string): Promise<Dir> {
  const projects = await getProjects();
  return projects[id];
}
async function createProject(
  project: Omit<Dir, "id">,
): Promise<{ projects: Projects; newProjectId: string }> {
  const store = await getStore();
  if (!store) {
    return { projects: {}, newProjectId: "0" };
  }
  const projects = await getProjects();
  const currId: string = (await store.get("id")) || "0";
  projects[currId] = { ...project, id: currId };

  await store.set("projects", projects);
  await store.set("id", currId + 1);
  await store.save();

  return { projects, newProjectId: currId };
}

async function deleteProject(id: string) {
  const store = await getStore();
  if (!store) return {} as Projects;
  const projects = await getProjects();
  delete projects[id];

  await store.set("projects", projects);
  await store.save();
  return projects;
}

async function getCurrProject(): Promise<Dir | null> {
  const store = await getStore();
  if (!store) return null;
  return (await store.get("currProject")) ?? null;
}
async function setCurrProject(project: Dir) {
  const store = await getStore();
  if (!store) return;
  await store.set("currProject", project);
  await store.save();
}

async function setSortInfo(sortInfo: SortInfo) {
  const store = await getStore();
  if (!store) return;
  await store.set("sortInfo", sortInfo);
  await store.save();
}

async function getSortInfo(): Promise<SortInfo | null> {
  const store = await getStore();
  if (!store) return null;
  return (await store.get("sortInfo")) ?? null;
}
export {
  getProjects,
  getProject,
  createProject,
  deleteProject,
  getCurrProject,
  setCurrProject,
  getSortInfo,
  setSortInfo,
};
