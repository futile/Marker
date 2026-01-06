import { isTauri as isTauriApi } from "@tauri-apps/api/core";

export function isTauri(): boolean {
  return isTauriApi();
}
