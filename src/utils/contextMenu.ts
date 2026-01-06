import { LogicalPosition } from "@tauri-apps/api/dpi";
import { isTauri } from "@tauri-apps/api/core";
import { Menu } from "@tauri-apps/api/menu";

type ContextMenuItem = {
  text: string;
  enabled?: boolean;
  action: () => void;
};

type ContextMenuPosition = {
  x: number;
  y: number;
};

async function showContextMenu(
  items: ContextMenuItem[],
  position: ContextMenuPosition,
) {
  if (!isTauri()) {
    return;
  }
  const menu = await Menu.new({
    items: items.map((item, index) => ({
      id: `ctx-${index}`,
      text: item.text,
      enabled: item.enabled,
      action: () => item.action(),
    })),
  });

  await menu.popup(new LogicalPosition(position.x, position.y));
}

export { showContextMenu };
